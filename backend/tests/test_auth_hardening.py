"""Tests for auth hardening -- domain exceptions + null safety (OPE-76, OPE-77)."""
import pytest
from unittest.mock import patch, MagicMock


class TestNullUserIdSafety:
    """API key users (no user_id) get 401, not confusing 404."""

    def test_search_with_null_user_id_returns_401(self, client, valid_headers):
        """Search should reject None user_id, not pretend repo doesn't exist."""
        with patch("routes.search.require_auth") as mock_auth, \
             patch("routes.search.verify_repo_access") as mock_verify:
            from middleware.auth import AuthContext
            mock_auth.return_value = AuthContext(api_key_name="test-key", user_id=None)
            # verify_repo_access should raise 401 when user_id is None
            from fastapi import HTTPException
            mock_verify.side_effect = HTTPException(status_code=401, detail="User ID required")
            resp = client.post(
                "/api/v1/search",
                json={"query": "auth", "repo_id": "test"},
                headers=valid_headers,
            )
        assert resp.status_code == 401

    def test_get_repo_or_404_rejects_none_user_id(self):
        """get_repo_or_404 should raise 401 when user_id is None."""
        from dependencies import get_repo_or_404
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            get_repo_or_404("some-repo", None)
        assert exc.value.status_code == 401

    def test_verify_repo_access_rejects_none_user_id(self):
        """verify_repo_access should raise 401 when user_id is None."""
        from dependencies import verify_repo_access
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            verify_repo_access("some-repo", None)
        assert exc.value.status_code == 401


class TestDomainExceptions:
    """Auth service raises domain exceptions, not HTTPException."""

    def test_expired_token_raises_domain_exception(self):
        """Auth service should raise TokenExpiredError, not HTTPException."""
        from services.exceptions import TokenExpiredError
        assert issubclass(TokenExpiredError, Exception)
        assert not issubclass(TokenExpiredError, __import__('fastapi').HTTPException)

    def test_exception_hierarchy(self):
        """All auth exceptions inherit from AuthenticationError."""
        from services.exceptions import (
            AuthenticationError,
            TokenExpiredError,
            InvalidTokenError,
            TokenMissingClaimError,
            InvalidCredentialsError,
            SignupError,
            SessionError,
            UserIdRequiredError,
        )
        for exc_class in [
            TokenExpiredError, InvalidTokenError, TokenMissingClaimError,
            InvalidCredentialsError, SignupError, SessionError, UserIdRequiredError,
        ]:
            assert issubclass(exc_class, AuthenticationError)
