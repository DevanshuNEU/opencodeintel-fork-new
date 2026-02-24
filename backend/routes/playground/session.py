"""Session and rate limit routes for the playground."""
from fastapi import APIRouter, HTTPException, Request, Response

from dependencies import redis_client
from services.observability import logger
from routes.playground.helpers import (
    get_client_ip, get_session_token, set_session_cookie, get_limiter,
)

router = APIRouter()


@router.get("/limits")
async def get_playground_limits(req: Request) -> dict:
    """
    Get current rate limit status for this user.

    Frontend should call this on page load to show accurate remaining count.
    """
    session_token = get_session_token(req)
    client_ip = get_client_ip(req)

    limiter = get_limiter()
    result = limiter.check_limit(session_token, client_ip)

    return {
        "remaining": result.remaining,
        "limit": result.limit,
        "resets_at": result.resets_at.isoformat(),
        "tier": "anonymous",
    }


@router.get("/session")
async def get_session_info(req: Request, response: Response) -> dict:
    """
    Get current session state including indexed repo info.

    Creates a new session if none exists. Returns complete session data
    for frontend state management.
    """
    session_token = get_session_token(req)
    limiter = get_limiter()

    if not redis_client:
        logger.error("Redis unavailable for session endpoint")
        raise HTTPException(
            status_code=503,
            detail={"message": "Service temporarily unavailable", "retry_after": 30}
        )

    session_data = limiter.get_session_data(session_token)

    if session_data.session_id is None:
        new_token = limiter._generate_session_token()

        if limiter.create_session(new_token):
            set_session_cookie(response, new_token)
            session_data = limiter.get_session_data(new_token)
            logger.info("Created new session via /session endpoint",
                        session_token=new_token[:8])
        else:
            raise HTTPException(
                status_code=503,
                detail={"message": "Failed to create session", "retry_after": 30}
            )

    return session_data.to_response(limit=limiter.SESSION_LIMIT_PER_DAY)
