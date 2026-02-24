"""
Shared helpers and constants for playground routes.

All playground sub-modules import from here to avoid circular deps.
"""
import os
import re
from typing import Optional
from fastapi import Request, Response

from dependencies import repo_manager, redis_client
from services.observability import logger
from services.playground_limiter import PlaygroundLimiter, get_playground_limiter

# Demo repo mapping (populated on startup via load_demo_repos)
DEMO_REPO_IDS = {}

# Session cookie config
SESSION_COOKIE_NAME = "pg_session"
SESSION_COOKIE_MAX_AGE = 86400  # 24 hours
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

# GitHub validation config
GITHUB_URL_PATTERN = re.compile(
    r"^https?://github\.com/(?P<owner>[a-zA-Z0-9_.-]+)/(?P<repo>[a-zA-Z0-9_.-]+)/?$"
)
ANONYMOUS_FILE_LIMIT = 200
GITHUB_API_BASE = "https://api.github.com"
GITHUB_API_TIMEOUT = 10.0
VALIDATION_CACHE_TTL = 300  # 5 minutes


async def load_demo_repos() -> None:
    """Load pre-indexed demo repos. Called from main.py on startup."""
    try:
        repos = repo_manager.list_repos()
        for repo in repos:
            name_lower = repo.get("name", "").lower()
            if "flask" in name_lower:
                DEMO_REPO_IDS["flask"] = repo["id"]
            elif "fastapi" in name_lower:
                DEMO_REPO_IDS["fastapi"] = repo["id"]
            elif "express" in name_lower:
                DEMO_REPO_IDS["express"] = repo["id"]
            elif "react" in name_lower:
                DEMO_REPO_IDS["react"] = repo["id"]
        logger.info("Loaded demo repos", repos=list(DEMO_REPO_IDS.keys()))
    except Exception as e:
        logger.warning("Could not load demo repos", error=str(e))


def get_client_ip(req: Request) -> str:
    """Extract client IP from request."""
    client_ip = req.client.host if req.client else "unknown"
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    return client_ip


def get_session_token(req: Request) -> Optional[str]:
    """Get session token from cookie."""
    return req.cookies.get(SESSION_COOKIE_NAME)


def set_session_cookie(response: Response, token: str) -> None:
    """Set httpOnly session cookie."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
    )


def get_limiter() -> PlaygroundLimiter:
    """Get the playground limiter instance."""
    return get_playground_limiter(redis_client)
