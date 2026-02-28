"""Tests for JWT local decode (OPE-75)."""
import pytest
import jwt as pyjwt
import time
from unittest.mock import patch, MagicMock


JWT_SECRET = "test-jwt-secret-for-unit-tests-must-be-32-chars-or-longer"


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
            yield SupabaseAuthService()


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

    def test_expired_token_raises_error(self, auth_service):
        token = _make_token({"sub": "user-789", "exp": int(time.time()) - 60})

        from services.exceptions import TokenExpiredError
        with pytest.raises(TokenExpiredError):
            auth_service.verify_jwt(token)

    def test_wrong_secret_falls_back_not_raises(self, auth_service):
        """Wrong secret should trigger API fallback, not raise."""
        token = _make_token({"sub": "user-000"}, secret="wrong-secret")

        # Set up API fallback mock
        user = MagicMock()
        user.id = "user-000"
        user.email = "fallback@test.com"
        user.user_metadata = {}
        response = MagicMock()
        response.user = user
        auth_service.client.auth.get_user.return_value = response

        result = auth_service.verify_jwt(token)
        assert result["user_id"] == "user-000"
        auth_service.client.auth.get_user.assert_called_once()

    def test_missing_sub_claim_raises_error(self, auth_service):
        token = _make_token({"email": "no-sub@test.com"})

        from services.exceptions import TokenMissingClaimError
        with pytest.raises(TokenMissingClaimError):
            auth_service.verify_jwt(token)

    def test_wrong_audience_falls_back_not_raises(self, auth_service):
        """Wrong audience should trigger API fallback, not raise."""
        payload = {"sub": "user-aud", "aud": "wrong-audience", "exp": int(time.time()) + 3600}
        token = pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

        # Set up API fallback mock
        user = MagicMock()
        user.id = "user-aud"
        user.email = "aud@test.com"
        user.user_metadata = {}
        response = MagicMock()
        response.user = user
        auth_service.client.auth.get_user.return_value = response

        result = auth_service.verify_jwt(token)
        assert result["user_id"] == "user-aud"
        auth_service.client.auth.get_user.assert_called_once()

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

    def test_metadata_null_coalesced_to_empty_dict(self, auth_service):
        """user_metadata can be explicitly null in Supabase JWTs."""
        token = _make_token({"sub": "user-null-meta", "user_metadata": None})
        result = auth_service.verify_jwt(token)

        assert result["metadata"] == {}

    def test_bearer_prefix_case_insensitive(self, auth_service):
        token = _make_token({"sub": "user-case"})
        for prefix in ["Bearer ", "bearer ", "BEARER "]:
            result = auth_service.verify_jwt(f"{prefix}{token}")
            assert result["user_id"] == "user-case"


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

    def test_wrong_secret_falls_back_to_api(self):
        """
        POSTMORTEM TEST -- Feb 2026 production auth outage.
        
        Scenario: SUPABASE_JWT_SECRET is set but WRONG (doesn't match
        what Supabase uses to sign tokens). Local decode fails.
        System MUST fall back to API verification instead of returning 401.
        
        Before this fix, wrong secret = broken auth for all users.
        After this fix, wrong secret = slow auth (API call) but working.
        """
        with patch("services.auth.create_client") as mock_client:
            client = MagicMock()
            user = MagicMock()
            user.id = "fallback-user-456"
            user.email = "fallback@test.com"
            user.user_metadata = {"tier": "pro"}
            response = MagicMock()
            response.user = user
            client.auth.get_user.return_value = response
            mock_client.return_value = client

            with patch.dict("os.environ", {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-key",
                # Real-length secret but WRONG -- simulates production mismatch
                "SUPABASE_JWT_SECRET": "a" * 64,
            }):
                from services.auth import SupabaseAuthService
                service = SupabaseAuthService()
                
                # Token signed with a DIFFERENT secret (like Supabase would)
                token = _make_token(
                    {"sub": "fallback-user-456", "email": "fallback@test.com"},
                    secret="the-real-supabase-secret-that-we-dont-have",
                )
                
                result = service.verify_jwt(token)
                
                # Should succeed via API fallback, not 401
                assert result["user_id"] == "fallback-user-456"
                assert result["email"] == "fallback@test.com"
                # Verify it actually used the API path
                client.auth.get_user.assert_called_once()

    def test_expired_token_does_not_fallback(self):
        """Expired tokens should NOT try API fallback -- expired is expired."""
        with patch("services.auth.create_client") as mock_client:
            mock_client.return_value = MagicMock()

            with patch.dict("os.environ", {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-key",
                "SUPABASE_JWT_SECRET": JWT_SECRET,
            }):
                from services.auth import SupabaseAuthService
                service = SupabaseAuthService()
                
                expired_token = pyjwt.encode(
                    {"sub": "expired-user", "aud": "authenticated",
                     "exp": int(time.time()) - 120, "iat": int(time.time()) - 3720},
                    JWT_SECRET, algorithm="HS256",
                )
                
                from services.exceptions import TokenExpiredError
                with pytest.raises(TokenExpiredError):
                    service.verify_jwt(expired_token)
                
                # Should NOT have tried API fallback
                service.client.auth.get_user.assert_not_called()

    def test_placeholder_secret_nulled_at_startup(self):
        """
        Placeholder secrets like 'dev-secret-key' should be detected
        at init time and nulled out, forcing API verification path.
        """
        with patch("services.auth.create_client") as mock_client:
            client = MagicMock()
            user = MagicMock()
            user.id = "placeholder-user"
            user.email = "ph@test.com"
            user.user_metadata = {}
            response = MagicMock()
            response.user = user
            client.auth.get_user.return_value = response
            mock_client.return_value = client

            with patch.dict("os.environ", {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_ANON_KEY": "test-key",
                "SUPABASE_JWT_SECRET": "dev-secret-key",
            }):
                from services.auth import SupabaseAuthService
                service = SupabaseAuthService()
                
                # Secret should have been nulled out
                assert service.jwt_secret is None
                
                # Should work via API path directly
                result = service.verify_jwt("any-token")
                assert result["user_id"] == "placeholder-user"
                client.auth.get_user.assert_called_once()
