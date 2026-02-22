"""
Supabase Authentication Service
Handles JWT verification and user management
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import os
import jwt
from datetime import datetime
from supabase import create_client, Client

from services.observability import logger


class SupabaseAuthService:
    """Supabase authentication and user management"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("Supabase credentials not configured")
        
        if not self.jwt_secret:
            logger.warning("SUPABASE_JWT_SECRET not set -- falling back to API-based verification")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
    
    def verify_jwt(self, token: str) -> Dict[str, Any]:
        """
        Verify Supabase JWT token locally using the signing secret.
        
        No network call required -- instant verification using HS256.
        Falls back to Supabase API call if JWT_SECRET is not configured.
        """
        if token.lower().startswith("bearer "):
            token = token[7:]
        
        # local decode when secret is available (fast path, no network)
        if self.jwt_secret:
            return self._verify_local(token)
        
        # fallback: API call to Supabase (slow path, requires network)
        return self._verify_via_api(token)
    
    def _verify_local(self, token: str) -> Dict[str, Any]:
        """Decode and verify JWT locally with HS256 secret."""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing subject claim",
                )
            
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "metadata": payload.get("user_metadata") or {},
            }
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )
        except jwt.InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
            )
        except jwt.InvalidTokenError as e:
            logger.debug("JWT decode failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    
    def _verify_via_api(self, token: str) -> Dict[str, Any]:
        """Fallback: verify via Supabase API call (requires network)."""
        try:
            response = self.client.auth.get_user(token)
            
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                )
            
            return {
                "user_id": response.user.id,
                "email": response.user.email,
                "metadata": response.user.user_metadata or {},
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.debug("API-based JWT verification failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed",
            )
    
    async def signup(self, email: str, password: str, github_username: Optional[str] = None) -> Dict[str, Any]:
        """
        Sign up a new user with Supabase Auth
        
        Args:
            email: User email
            password: User password (min 6 chars)
            github_username: Optional GitHub username
            
        Returns:
            Dict with user data and session tokens
        """
        try:
            # Create user with Supabase Auth
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "github_username": github_username
                    }
                }
            })
            
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Signup failed"
                )
            
            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "github_username": github_username
                },
                "session": {
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None,
                    "expires_at": response.session.expires_at if response.session else None
                }
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Signup failed: {str(e)}"
            )
    
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login user with email and password
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Dict with user data and session tokens
        """
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            return {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "github_username": response.user.user_metadata.get("github_username")
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at
                }
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {str(e)}"
            )
    
    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        try:
            response = self.client.auth.refresh_session(refresh_token)
            
            if not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token refresh failed"
                )
            
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Refresh failed: {str(e)}"
            )
    
    async def logout(self, token: str) -> Dict[str, str]:
        """Sign out user and invalidate session"""
        try:
            await self.client.auth.sign_out()
            return {"message": "Logged out successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Logout failed: {str(e)}"
            )


# Global instance
_auth_service: Optional[SupabaseAuthService] = None


def get_auth_service() -> SupabaseAuthService:
    """Get or create auth service singleton"""
    global _auth_service
    if _auth_service is None:
        _auth_service = SupabaseAuthService()
    return _auth_service
