"""Authentication middleware package"""
from .auth import (
    # New unified auth (recommended)
    AuthContext,
    require_auth,
    public_auth,
    # Legacy (backwards compatibility)
    get_current_user,
    get_optional_user,
)

__all__ = [
    "AuthContext",
    "require_auth", 
    "public_auth",
    "get_current_user",
    "get_optional_user",
]
