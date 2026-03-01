"""Admin routes -- user management, tier control.

Protected by admin email check. Configure ADMIN_EMAILS env var
(comma-separated) to grant access.
"""
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from dependencies import redis_client
from middleware.auth import require_auth, AuthContext
from services.observability import logger
from services.supabase_service import get_supabase_service
from services.user_limits import UserTier, TIER_LIMITS

router = APIRouter(prefix="/admin", tags=["Admin"])

_VALID_TIERS = {t.value for t in UserTier}

ADMIN_EMAILS = set(
    e.strip()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
)


def require_admin(auth: AuthContext = Depends(require_auth)) -> AuthContext:
    """Dependency that ensures the caller is an admin."""
    if not auth.email or auth.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth


# -- Users -------------------------------------------------------------------

@router.get("/users")
def list_users(auth: AuthContext = Depends(require_admin)) -> dict:
    """List all users with tier, repo count, and last sign-in."""
    sb = get_supabase_service()

    # Get user profiles (tier info)
    profiles = {}
    try:
        result = sb.client.table("user_profiles").select("*").execute()
        for p in result.data or []:
            profiles[p.get("user_id")] = p
    except Exception as e:
        logger.warning("Failed to fetch user_profiles", error=str(e))

    # Get repo counts per user
    repo_counts: dict[str, int] = {}
    try:
        result = sb.client.table("repositories").select("user_id").execute()
        for r in result.data or []:
            uid = r.get("user_id")
            if uid:
                repo_counts[uid] = repo_counts.get(uid, 0) + 1
    except Exception as e:
        logger.warning("Failed to fetch repo counts", error=str(e))

    # Get auth users via Supabase admin API
    try:
        auth_response = sb.client.auth.admin.list_users()
        raw_users = (
            auth_response
            if isinstance(auth_response, list)
            else getattr(auth_response, "users", [])
        )
    except Exception as e:
        logger.error("Failed to list auth users", error=str(e))
        raise HTTPException(
            status_code=502, detail="Failed to fetch users from auth provider"
        )

    users = []
    for u in raw_users:
        uid = u.id if hasattr(u, "id") else u.get("id")
        email = u.email if hasattr(u, "email") else u.get("email", "")
        created = u.created_at if hasattr(u, "created_at") else u.get("created_at", "")
        last_sign_in = (
            u.last_sign_in_at
            if hasattr(u, "last_sign_in_at")
            else u.get("last_sign_in_at", "")
        )
        meta = (
            u.user_metadata
            if hasattr(u, "user_metadata")
            else u.get("user_metadata", {})
        )

        profile = profiles.get(uid, {})
        raw_tier = profile.get("tier", meta.get("tier", "free"))
        tier = raw_tier if raw_tier in _VALID_TIERS else UserTier.FREE.value

        users.append({
            "id": uid,
            "email": email,
            "tier": tier,
            "repo_count": repo_counts.get(uid, 0),
            "created_at": str(created) if created else None,
            "last_sign_in": str(last_sign_in) if last_sign_in else None,
        })

    logger.info("Admin listed users", count=len(users), admin=auth.email)
    return {"users": users, "total": len(users)}


# -- Tier management ---------------------------------------------------------

class UpdateTierRequest(BaseModel):
    tier: UserTier


@router.patch("/users/{user_id}/tier")
def update_user_tier(
    user_id: str,
    request: UpdateTierRequest,
    auth: AuthContext = Depends(require_admin),
) -> dict:
    """Update a user's tier. Clears Redis cache so it takes effect immediately."""
    new_tier = request.tier

    sb = get_supabase_service()

    # Upsert into user_profiles
    try:
        sb.client.table("user_profiles").upsert(
            {"user_id": user_id, "tier": new_tier.value},
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        logger.error("Failed to update tier", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update tier")

    # Clear Redis cache so new tier takes effect immediately
    if redis_client:
        try:
            redis_client.delete(f"user:tier:{user_id}")
        except Exception as e:
            logger.warning("Failed to clear tier cache", user_id=user_id, error=str(e))

    limits = TIER_LIMITS[new_tier]
    logger.info(
        "Admin updated user tier",
        admin=auth.email, user_id=user_id,
        new_tier=new_tier.value,
    )

    return {
        "user_id": user_id,
        "tier": new_tier.value,
        "limits": {
            "max_repos": limits.max_repos,
            "max_files_per_repo": limits.max_files_per_repo,
            "max_functions_per_repo": limits.max_functions_per_repo,
        },
    }
