"""API key management and metrics routes."""
from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from dependencies import api_key_manager, rate_limiter, metrics
from middleware.auth import require_auth, AuthContext
from services.observability import (
    logger,
    capture_exception,
    track_time,
    add_breadcrumb,
    set_operation_context
)

router = APIRouter(prefix="", tags=["API Keys"])


MAX_KEYS_PER_USER = 5


class CreateAPIKeyRequest(BaseModel):
    name: str


@router.get("/metrics")
async def get_performance_metrics(
    auth: AuthContext = Depends(require_auth)
):
    """Get performance metrics and monitoring data."""
    set_operation_context("get_metrics", user_id=auth.user_id)
    
    logger.debug("Metrics requested", user_id=auth.user_id)
    
    try:
        with track_time("get_metrics"):
            result = metrics.get_metrics()
        
        return result
    except Exception as e:
        logger.error("Failed to get metrics", user_id=auth.user_id, error=str(e))
        capture_exception(e, operation="get_metrics", user_id=auth.user_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")


@router.post("/keys/generate")
async def generate_api_key(
    request: CreateAPIKeyRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Generate a new API key."""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    set_operation_context("generate_api_key", user_id=auth.user_id, tier=auth.tier)
    add_breadcrumb("API key generation requested", category="api_keys", tier=auth.tier)
    
    logger.info(
        "API key generation requested",
        user_id=auth.user_id,
        key_name=request.name,
        tier=auth.tier
    )
    
    # Tier is locked to the user's auth tier (no self-escalation)
    tier = auth.tier or "free"

    # Enforce key limit per user
    key_count = api_key_manager.count_keys(auth.user_id)
    if key_count >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=403,
            detail=f"Maximum {MAX_KEYS_PER_USER} active API keys allowed. Revoke an existing key first."
        )

    try:
        with track_time("generate_api_key", tier=tier):
            result = api_key_manager.generate_key(
                name=request.name,
                tier=tier,
                user_id=auth.user_id
            )
        
        logger.info(
            "API key generated successfully",
            user_id=auth.user_id,
            key_name=request.name,
            tier=tier
        )
        
        return {
            "api_key": result["key"],
            "id": result["id"],
            "tier": tier,
            "name": request.name,
            "message": "Save this key securely - it won't be shown again"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "API key generation failed",
            user_id=auth.user_id,
            key_name=request.name,
            error=str(e)
        )
        capture_exception(
            e,
            operation="generate_api_key",
            user_id=auth.user_id,
            key_name=request.name
        )
        raise HTTPException(status_code=500, detail="Failed to generate API key")


@router.get("/keys")
async def list_api_keys(
    auth: AuthContext = Depends(require_auth)
) -> Dict[str, Any]:
    """List all API keys for the authenticated user."""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    try:
        keys = api_key_manager.list_keys(auth.user_id)
        return {"keys": keys}
    except Exception as e:
        logger.error("Failed to list API keys", user_id=auth.user_id, error=str(e))
        capture_exception(e, operation="list_api_keys", user_id=auth.user_id)
        raise HTTPException(status_code=500, detail="Failed to list API keys")


@router.delete("/keys/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    auth: AuthContext = Depends(require_auth)
) -> Dict[str, Any]:
    """Revoke an API key by ID. Soft-deletes (sets active=false)."""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    try:
        success = api_key_manager.revoke_key_by_id(str(key_id), auth.user_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="API key not found or not owned by you"
            )
        logger.info("API key revoked", user_id=auth.user_id, key_id=key_id)
        return {"message": "API key revoked", "key_id": key_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to revoke API key", user_id=auth.user_id, error=str(e))
        capture_exception(e, operation="revoke_api_key", user_id=auth.user_id)
        raise HTTPException(status_code=500, detail="Failed to revoke API key")


@router.get("/keys/usage")
async def get_api_usage(
    auth: AuthContext = Depends(require_auth)
):
    """Get current API usage stats."""
    set_operation_context("get_api_usage", user_id=auth.user_id, tier=auth.tier)
    
    logger.debug("API usage requested", user_id=auth.user_id, tier=auth.tier)
    
    try:
        with track_time("get_api_usage"):
            usage = rate_limiter.get_usage(auth.identifier)
        
        return {
            "tier": auth.tier,
            "limits": {
                "free": {"minute": 20, "hour": 200, "day": 1000},
                "pro": {"minute": 100, "hour": 2000, "day": 20000},
                "enterprise": {"minute": 500, "hour": 10000, "day": 100000}
            }[auth.tier],
            "usage": usage
        }
    except Exception as e:
        logger.error("Failed to get API usage", user_id=auth.user_id, error=str(e))
        capture_exception(e, operation="get_api_usage", user_id=auth.user_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve usage data")
