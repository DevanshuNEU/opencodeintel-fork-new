"""
Authentication Routes
Handles user signup, login, and session management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from services.auth import get_auth_service
from middleware.auth import get_current_user
from services.observability import (
    logger,
    capture_exception,
    track_time,
    add_breadcrumb,
    set_operation_context
)

# Create router
router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response Models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    github_username: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user: Dict[str, Any]
    session: Dict[str, Any]


# Routes
@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    Sign up a new user with Supabase Auth
    
    - **email**: Valid email address
    - **password**: Password (min 6 characters recommended)
    - **github_username**: Optional GitHub username for profile
    
    Returns user data and session tokens (access_token, refresh_token)
    """
    set_operation_context("auth_signup", email=request.email)
    add_breadcrumb("Signup attempt", category="auth", email=request.email)
    
    logger.info("Signup attempt", email=request.email, has_github=bool(request.github_username))
    
    try:
        auth_service = get_auth_service()
        
        with track_time("auth_signup"):
            result = await auth_service.signup(
                email=request.email,
                password=request.password,
                github_username=request.github_username
            )
        
        logger.info("Signup successful", email=request.email)
        return result
        
    except HTTPException:
        logger.warning("Signup failed (client error)", email=request.email)
        raise
    except Exception as e:
        logger.error("Signup failed", email=request.email, error=str(e))
        capture_exception(e, operation="auth_signup", email=request.email)
        raise HTTPException(status_code=500, detail="Signup failed")


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login with email and password
    
    - **email**: Registered email address
    - **password**: User password
    
    Returns user data and session tokens
    """
    set_operation_context("auth_login", email=request.email)
    add_breadcrumb("Login attempt", category="auth", email=request.email)
    
    logger.info("Login attempt", email=request.email)
    
    try:
        auth_service = get_auth_service()
        
        with track_time("auth_login"):
            result = await auth_service.login(
                email=request.email,
                password=request.password
            )
        
        logger.info("Login successful", email=request.email)
        return result
        
    except HTTPException:
        logger.warning("Login failed (invalid credentials)", email=request.email)
        raise
    except Exception as e:
        logger.error("Login failed", email=request.email, error=str(e))
        capture_exception(e, operation="auth_login", email=request.email)
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/refresh")
async def refresh(request: RefreshRequest):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token from login/signup
    
    Returns new access token
    """
    set_operation_context("auth_refresh")
    add_breadcrumb("Token refresh attempt", category="auth")
    
    logger.debug("Token refresh attempt")
    
    try:
        auth_service = get_auth_service()
        
        with track_time("auth_refresh"):
            result = await auth_service.refresh_session(request.refresh_token)
        
        logger.debug("Token refresh successful")
        return result
        
    except HTTPException:
        logger.warning("Token refresh failed (invalid token)")
        raise
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        capture_exception(e, operation="auth_refresh")
        raise HTTPException(status_code=500, detail="Token refresh failed")


@router.post("/logout")
async def logout(user: Dict = Depends(get_current_user)):
    """
    Logout current user and invalidate session
    
    Requires: Valid JWT token in Authorization header
    """
    user_id = user.get("id") or user.get("user_id")
    set_operation_context("auth_logout", user_id=user_id)
    add_breadcrumb("Logout attempt", category="auth", user_id=user_id)
    
    logger.info("Logout attempt", user_id=user_id)
    
    try:
        auth_service = get_auth_service()
        
        with track_time("auth_logout"):
            result = await auth_service.logout(token="")  # Supabase handles session
        
        logger.info("Logout successful", user_id=user_id)
        return result
        
    except Exception as e:
        logger.error("Logout failed", user_id=user_id, error=str(e))
        capture_exception(e, operation="auth_logout", user_id=user_id)
        raise HTTPException(status_code=500, detail="Logout failed")


@router.get("/me")
async def get_current_user_info(user: Dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Requires: Valid JWT token in Authorization header
    
    Returns user profile data
    """
    user_id = user.get("id") or user.get("user_id")
    set_operation_context("auth_me", user_id=user_id)
    
    logger.debug("User info requested", user_id=user_id)
    
    return {"user": user}
