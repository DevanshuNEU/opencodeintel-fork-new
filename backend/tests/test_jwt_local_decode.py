"""Tests for JWT local decode (OPE-75)."""
import pytest
import jwt as pyjwt
import time
from unittest.mock import patch, MagicMock


JWT_SECRET = "test-jwt-secret-for-unit-tests"


def _make_token(payload: dict, secret: str = JWT_SECRET) -> str:
    """Create a signed JWT for testing."""
    defaults = {
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "role": "authenticated",
    }
    return pyjwt.encode({**defaults, **payload}, secret, algorithm="HS256")


@pytest.fixture
def auth_service():
    """Create auth service with local JWT secret configured."""
    with patch("services.auth.create_client") as mock_client:
        mock_client.return_value = MagicMock()
        with patch.dict("os.environ", {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-key",
            "SUPABASE_JWT_SECRET": JWT_SECRET,
        }):
            from services.auth import SupabaseAuthService
            return SupabaseAuthService()


class TestLocalJWTDecode:
    """Verify local JWT decode works without network calls."""

    def test_valid_token_returns_user_data(self, auth_service):
        token = _make_token({"sub": "user-123", "email": "dev@test.com", "user_metadata": {"tier": "pro"}})
        result = auth_service.verify_jwt(token)

        assert result["user_id"] == "user-123"
        assert result["email"] == "dev@test.com"
        assert result["metadata"]["tier"] == "pro"

    def test_bearer_prefix_stripped(self, auth_service):
        token = _make_token({"sub": "user-456", "email": "a@b.com"})
        result = auth_service.verify_jwt(f"Bearer {token}")

        assert result["user_id"] == "user-456"

    def test_expired_token_raises_401(self, auth_service):
        token = _make_token({"sub": "user-789", "exp": int(time.time()) - 10})

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            auth_service.verify_jwt(token)
        assert exc.value.status_code == 401
        assert "expired" in exc.value.detail.lower()

    def test_wrong_secret_raises_401(self, auth_service):
        token = _make_token({"sub": "user-000"}, secret="wrong-secret")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            auth_service.verify_jwt(token)
        assert exc.value.status_code == 401

    def test_missing_sub_claim_raises_401(self, auth_service):
        token = _make_token({"email": "no-sub@test.com"})

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            auth_service.verify_jwt(token)
        assert exc.value.status_code == 401
        assert "subject" in exc.value.detail.lower()

    def test_wrong_audience_raises_401(self, auth_service):
        payload = {"sub": "user-aud", "aud": "wrong-audience", "exp": int(time.time()) + 3600}
        token = pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            auth_service.verify_jwt(token)
        assert exc.value.status_code == 401

    def test_no_network_call_made(self, auth_service):
        """The whole point of OPE-75: verify_jwt should NOT hit the network."""
        token = _make_token({"sub": "user-net", "email": "net@test.com"})

        auth_service.verify_jwt(token)

        # get_user should never be called when jwt_secret is available
        auth_service.client.auth.get_user.assert_not_called()

    def test_metadata_defaults_to_empty_dict(self, auth_service):
        token = _make_token({"sub": "user-no-meta", "email": "x@y.com"})
        result = auth_service.verify_jwt(token)

        assert result["metadata"] == {}


class TestAPIFallback:
    """When JWT secret is not configured, fall back to Supabase API."""

    def test_falls_back_to_api_when_no_secret(self):
        with patch("services.auth.create_client") as mock_client:
            client = MagicMock()
            user = MagicMock()
            user.id = "api-user-123"
            user.email = "api@test.com"
            user.user_metadata = {"tier": "free"}
            response = MagicMock()
            response.user = user
            client.auth.get_user.return_value = response
            mock_client.return_value = client

            with patch.dict("os.environ", {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-key",
                "SUPABASE_JWT_SECRET": "",
            }):
                from services.auth import SupabaseAuthService
                service = SupabaseAuthService()
                result = service.verify_jwt("some-token")

                assert result["user_id"] == "api-user-123"
                client.auth.get_user.assert_called_once_with("some-token")
