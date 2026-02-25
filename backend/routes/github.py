"""
GitHub Integration Routes
Handles OAuth flow and repository listing for one-click import

SECURITY: Token exchange and storage happens server-side only.
Frontend never sees the GitHub access token.
"""
import os
import re
import secrets
import httpx
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel
from urllib.parse import urlencode

from middleware.auth import require_auth, AuthContext
from services.github import GitHubService
from services.github_connections import (
    get_connection, save_connection, delete_connection, update_last_used,
)
from services.observability import logger


router = APIRouter(prefix="/github", tags=["GitHub"])

# GitHub OAuth config - load from env
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:3000/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class GitHubStatusResponse(BaseModel):
    connected: bool
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class GitHubConnectResponse(BaseModel):
    auth_url: str
    state: str


class GitHubCallbackRequest(BaseModel):
    code: str
    state: str


class GitHubRepoResponse(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str]
    html_url: str
    clone_url: str
    default_branch: str
    private: bool
    fork: bool
    stars: int
    language: Optional[str]
    size_kb: int
    owner: str
    owner_avatar: str


@router.get("/status", response_model=GitHubStatusResponse)
async def get_github_status(auth: AuthContext = Depends(require_auth)):
    """Check if user has GitHub connected and token is valid"""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    connection = get_connection(auth.user_id)
    if not connection:
        return GitHubStatusResponse(connected=False)

    # Verify token is still valid by making a test API call
    try:
        github = GitHubService(connection["access_token"])
        is_valid = await github.validate_token()
        
        if not is_valid:
            # Token expired or revoked, clean up
            delete_connection(auth.user_id)
            return GitHubStatusResponse(connected=False)

        return GitHubStatusResponse(
            connected=True,
            username=connection.get("github_username"),
            avatar_url=connection.get("github_avatar_url")
        )
    except Exception as e:
        logger.warning("GitHub token validation failed", error=str(e))
        return GitHubStatusResponse(connected=False)


@router.get("/connect", response_model=GitHubConnectResponse)
async def initiate_github_connect(auth: AuthContext = Depends(require_auth)):
    """
    Start GitHub OAuth flow for repo import
    
    Returns URL to redirect user to GitHub authorization page.
    Frontend should redirect user to this URL.
    """
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    # Generate state token to prevent CSRF
    # In production, store this in Redis/DB with expiry and user_id association
    state = f"{auth.user_id}:{secrets.token_urlsafe(32)}"
    
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo",  # Full repo access for private repos
        "state": state,
        "allow_signup": "false",  # User should already have GitHub account
    }
    
    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    
    return GitHubConnectResponse(auth_url=auth_url, state=state)


@router.post("/callback")
async def github_oauth_callback(
    request: GitHubCallbackRequest,
    auth: AuthContext = Depends(require_auth)
):
    """
    Handle GitHub OAuth callback
    
    Exchanges authorization code for access token and stores it.
    Called by frontend after GitHub redirects back.
    """
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    # Verify state format and user_id match
    # State format: user_id:random_token (where random_token is base64url from token_urlsafe)
    state_parts = request.state.split(":", 1)
    if len(state_parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid state format")
    
    state_user_id, state_token = state_parts
    if state_user_id != auth.user_id:
        raise HTTPException(status_code=400, detail="State user mismatch")
    
    # Validate token portion: token_urlsafe(32) produces 43 chars of URL-safe base64
    if len(state_token) != 43:
        raise HTTPException(status_code=400, detail="Invalid state token length")
    
    # Validate charset (URL-safe base64: A-Z, a-z, 0-9, -, _)
    if not re.match(r'^[A-Za-z0-9_-]+$', state_token):
        raise HTTPException(status_code=400, detail="Invalid state token charset")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": request.code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
            timeout=30.0
        )
        
        if response.status_code != 200:
            logger.error("GitHub token exchange failed", status=response.status_code)
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = response.json()
        
        if "error" in token_data:
            logger.error("GitHub OAuth error", error=token_data.get("error_description"))
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth failed"))
        
        access_token = token_data.get("access_token")
        scope = token_data.get("scope", "")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

    # Get GitHub user info
    github = GitHubService(access_token)
    user_info = await github.get_user()
    
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get GitHub user info")

    # Save connection to database
    saved = save_connection(
        user_id=auth.user_id,
        access_token=access_token,
        github_user_id=user_info.id,
        github_username=user_info.login,
        github_avatar_url=user_info.avatar_url,
        scope=scope
    )
    
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save GitHub connection")

    logger.info("GitHub connected successfully", user_id=auth.user_id, github_user=user_info.login)
    
    return {
        "success": True,
        "username": user_info.login,
        "avatar_url": user_info.avatar_url
    }


@router.delete("/disconnect")
async def disconnect_github(auth: AuthContext = Depends(require_auth)):
    """Remove GitHub connection"""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    deleted = delete_connection(auth.user_id)
    return {"success": deleted}


@router.get("/repos", response_model=list[GitHubRepoResponse])
async def list_github_repos(
    auth: AuthContext = Depends(require_auth),
    include_forks: bool = False,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100)
):
    """
    List user's GitHub repositories for import selection
    
    Returns repos sorted by last updated, excludes forks by default.
    Includes both personal repos and org repos user has access to.
    """
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")

    connection = get_connection(auth.user_id)
    if not connection:
        raise HTTPException(
            status_code=400,
            detail="GitHub not connected. Please connect your GitHub account first."
        )

    try:
        github = GitHubService(connection["access_token"])
        repos = await github.get_repos(
            include_forks=include_forks,
            per_page=per_page,
            page=page
        )

        # Update last used timestamp
        update_last_used(auth.user_id)

        return [
            GitHubRepoResponse(
                id=repo.id,
                name=repo.name,
                full_name=repo.full_name,
                description=repo.description,
                html_url=repo.html_url,
                clone_url=repo.clone_url,
                default_branch=repo.default_branch,
                private=repo.private,
                fork=repo.fork,
                stars=repo.stargazers_count,
                language=repo.language,
                size_kb=repo.size,
                owner=repo.owner_login,
                owner_avatar=repo.owner_avatar
            )
            for repo in repos
        ]
    except Exception as e:
        logger.error("Failed to fetch GitHub repos", error=str(e), user_id=auth.user_id)
        
        # Check if token was revoked
        if "401" in str(e) or "Bad credentials" in str(e):
            delete_connection(auth.user_id)
            raise HTTPException(
                status_code=401,
                detail="GitHub access revoked. Please reconnect your GitHub account."
            )
        
        raise HTTPException(status_code=500, detail="Failed to fetch repositories")
