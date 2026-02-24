"""
GitHub Connection Service
Manages GitHub OAuth connections in the database.

Routes orchestrate HTTP/auth flow. This service handles persistence.
"""
from typing import Optional
from datetime import datetime, timezone

from services.observability import logger
from services.supabase_service import get_supabase_service


def get_connection(user_id: str) -> Optional[dict]:
    """Get user's GitHub connection from database."""
    try:
        db = get_supabase_service().client
        result = db.table("github_connections").select("*").eq("user_id", user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error("Failed to get GitHub connection", error=str(e), user_id=user_id)
        return None


def save_connection(
    user_id: str,
    access_token: str,
    github_user_id: int,
    github_username: str,
    github_avatar_url: Optional[str],
    scope: str,
) -> bool:
    """Save or update GitHub connection in database."""
    try:
        db = get_supabase_service().client

        data = {
            "user_id": user_id,
            "access_token": access_token,
            "github_user_id": github_user_id,
            "github_username": github_username,
            "github_avatar_url": github_avatar_url,
            "token_scope": scope,
        }

        db.table("github_connections").upsert(data, on_conflict="user_id").execute()
        return True
    except Exception as e:
        logger.error("Failed to save GitHub connection", error=str(e), user_id=user_id)
        return False


def delete_connection(user_id: str) -> bool:
    """Remove GitHub connection."""
    try:
        db = get_supabase_service().client
        db.table("github_connections").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        logger.error("Failed to delete GitHub connection", error=str(e), user_id=user_id)
        return False


def update_last_used(user_id: str) -> None:
    """Update last_used_at timestamp."""
    try:
        db = get_supabase_service().client
        db.table("github_connections").update(
            {"last_used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("user_id", user_id).execute()
    except Exception as e:
        logger.debug("Failed to update last_used_at", user_id=user_id, error=str(e))
