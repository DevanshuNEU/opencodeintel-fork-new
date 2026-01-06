"""API key management and metrics routes."""
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


class CreateAPIKeyRequest(BaseModel):
    name: str
    tier: str = "free"


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
    set_operation_context("generate_api_key", user_id=auth.user_id, tier=request.tier)
    add_breadcrumb("API key generation requested", category="api_keys", tier=request.tier)
    
    logger.info(
        "API key generation requested",
        user_id=auth.user_id,
        key_name=request.name,
        tier=request.tier
    )
    
    try:
        with track_time("generate_api_key", tier=request.tier):
            new_key = api_key_manager.generate_key(
                name=request.name,
                tier=request.tier,
                user_id=auth.user_id
            )
        
        logger.info(
            "API key generated successfully",
            user_id=auth.user_id,
            key_name=request.name,
            tier=request.tier
        )
        
        return {
            "api_key": new_key,
            "tier": request.tier,
            "name": request.name,
            "message": "Save this key securely - it won't be shown again"
        }
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
