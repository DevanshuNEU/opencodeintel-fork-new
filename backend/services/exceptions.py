"""
Domain exceptions for authentication.

Services raise these; the middleware/route layer translates them to HTTP responses.
This decouples business logic from the HTTP framework.
"""


class AuthenticationError(Exception):
    """Base auth error. All auth exceptions inherit from this."""


class TokenExpiredError(AuthenticationError):
    """JWT token has expired."""


class InvalidTokenError(AuthenticationError):
    """JWT token is malformed, wrong signature, or invalid audience."""


class TokenMissingClaimError(AuthenticationError):
    """JWT token is missing a required claim (e.g., sub)."""

    def __init__(self, claim: str = "sub"):
        super().__init__(f"Token missing required claim: {claim}")
        self.claim = claim


class InvalidCredentialsError(AuthenticationError):
    """Login failed due to wrong email/password."""


class SignupError(AuthenticationError):
    """User registration failed."""


class SessionError(AuthenticationError):
    """Token refresh or logout failed."""


class UserIdRequiredError(AuthenticationError):
    """Operation requires a user_id but auth context has None (e.g., API key without user)."""
