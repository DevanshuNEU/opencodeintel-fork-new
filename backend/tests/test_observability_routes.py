"""
Tests for Observability Instrumentation in Routes

Verifies that all routes properly use the observability module for:
- Structured logging
- Sentry context/breadcrumbs
- Performance tracking
- Error capture

Issue: #163
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from fastapi import HTTPException


class TestSearchRouteObservability:
    """Tests for observability in routes/search.py"""

    @pytest.fixture
    def mock_observability(self):
        """Mock all observability functions"""
        with patch("routes.search.logger") as mock_logger, \
             patch("routes.search.capture_exception") as mock_capture, \
             patch("routes.search.track_time") as mock_track, \
             patch("routes.search.add_breadcrumb") as mock_breadcrumb, \
             patch("routes.search.set_operation_context") as mock_context:
            
            # Make track_time work as a context manager
            mock_track.return_value.__enter__ = MagicMock()
            mock_track.return_value.__exit__ = MagicMock(return_value=False)
            
            yield {
                "logger": mock_logger,
                "capture_exception": mock_capture,
                "track_time": mock_track,
                "add_breadcrumb": mock_breadcrumb,
                "set_operation_context": mock_context
            }

    @pytest.fixture
    def mock_dependencies(self):
        """Mock route dependencies"""
        with patch("routes.search.indexer") as mock_indexer, \
             patch("routes.search.cache") as mock_cache, \
             patch("routes.search.metrics") as mock_metrics, \
             patch("routes.search.verify_repo_access") as mock_verify:
            
            mock_indexer.semantic_search = AsyncMock(return_value=[
                {"name": "test_func", "file_path": "test.py", "score": 0.9}
            ])
            mock_cache.get_search_results = MagicMock(return_value=None)
            mock_cache.set_search_results = MagicMock()
            mock_metrics.record_search = MagicMock()
            
            yield {
                "indexer": mock_indexer,
                "cache": mock_cache,
                "metrics": mock_metrics,
                "verify": mock_verify
            }

    @pytest.mark.asyncio
    async def test_search_sets_operation_context(self, mock_observability, mock_dependencies):
        """Search endpoint should set Sentry operation context"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        request = SearchRequest(query="test query", repo_id="test-repo")
        auth = AuthContext(user_id="user-123", email="test@test.com")

        await search_code(request, auth)

        mock_observability["set_operation_context"].assert_called_once()
        call_args = mock_observability["set_operation_context"].call_args
        assert call_args[0][0] == "search"
        assert call_args[1]["user_id"] == "user-123"
        assert call_args[1]["repo_id"] == "test-repo"

    @pytest.mark.asyncio
    async def test_search_adds_breadcrumb(self, mock_observability, mock_dependencies):
        """Search endpoint should add Sentry breadcrumb"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        request = SearchRequest(query="auth function", repo_id="repo-1")
        auth = AuthContext(user_id="user-1", email="test@test.com")

        await search_code(request, auth)

        mock_observability["add_breadcrumb"].assert_called()

    @pytest.mark.asyncio
    async def test_search_logs_completion(self, mock_observability, mock_dependencies):
        """Search endpoint should log successful completion"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        request = SearchRequest(query="test", repo_id="repo")
        auth = AuthContext(user_id="user", email="test@test.com")

        await search_code(request, auth)

        # Check that info was logged with result count
        mock_observability["logger"].info.assert_called()
        info_calls = [c for c in mock_observability["logger"].info.call_args_list]
        assert any("completed" in str(c).lower() for c in info_calls)

    @pytest.mark.asyncio
    async def test_search_tracks_time(self, mock_observability, mock_dependencies):
        """Search endpoint should track operation timing"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        request = SearchRequest(query="test", repo_id="repo")
        auth = AuthContext(user_id="user", email="test@test.com")

        await search_code(request, auth)

        # Should track cache check and semantic search
        track_calls = mock_observability["track_time"].call_args_list
        assert len(track_calls) >= 2  # cache check + search + cache set

    @pytest.mark.asyncio
    async def test_search_captures_exception_on_error(self, mock_observability, mock_dependencies):
        """Search endpoint should capture exceptions to Sentry"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        mock_dependencies["indexer"].semantic_search = AsyncMock(
            side_effect=Exception("Search engine error")
        )

        request = SearchRequest(query="test", repo_id="repo")
        auth = AuthContext(user_id="user", email="test@test.com")

        with pytest.raises(HTTPException):
            await search_code(request, auth)

        mock_observability["capture_exception"].assert_called_once()
        mock_observability["logger"].error.assert_called()

    @pytest.mark.asyncio
    async def test_search_logs_invalid_query_warning(self, mock_observability, mock_dependencies):
        """Search endpoint should warn on invalid queries"""
        from routes.search import search_code, SearchRequest
        from middleware.auth import AuthContext

        # SQL injection attempt
        request = SearchRequest(query="DROP TABLE users;--", repo_id="repo")
        auth = AuthContext(user_id="user", email="test@test.com")

        with pytest.raises(HTTPException) as exc:
            await search_code(request, auth)

        assert exc.value.status_code == 400
        mock_observability["logger"].warning.assert_called()


class TestSearchV2RouteObservability:
    """Tests for observability in routes/search_v2.py"""

    @pytest.fixture
    def mock_observability(self):
        with patch("routes.search_v2.logger") as mock_logger, \
             patch("routes.search_v2.capture_exception") as mock_capture, \
             patch("routes.search_v2.track_time") as mock_track, \
             patch("routes.search_v2.add_breadcrumb") as mock_breadcrumb, \
             patch("routes.search_v2.set_operation_context") as mock_context:
            
            mock_track.return_value.__enter__ = MagicMock()
            mock_track.return_value.__exit__ = MagicMock(return_value=False)
            
            yield {
                "logger": mock_logger,
                "capture_exception": mock_capture,
                "track_time": mock_track,
                "add_breadcrumb": mock_breadcrumb,
                "set_operation_context": mock_context
            }

    @pytest.fixture
    def mock_dependencies(self):
        with patch("routes.search_v2.indexer") as mock_indexer, \
             patch("routes.search_v2.cache") as mock_cache, \
             patch("routes.search_v2.metrics") as mock_metrics, \
             patch("routes.search_v2.verify_repo_access") as mock_verify, \
             patch("routes.search_v2.SEARCH_V2_ENABLED", True):
            
            mock_indexer.search_v2 = AsyncMock(return_value=[
                {
                    "name": "test", "qualified_name": "test", "file_path": "t.py",
                    "code": "def t(): pass", "signature": "def t()", "language": "python",
                    "score": 0.9, "line_start": 1, "line_end": 2
                }
            ])
            mock_cache.get_search_results = MagicMock(return_value=None)
            mock_cache.set_search_results = MagicMock()
            mock_metrics.record_search = MagicMock()
            
            yield {
                "indexer": mock_indexer,
                "cache": mock_cache,
                "metrics": mock_metrics,
                "verify": mock_verify
            }

    @pytest.mark.asyncio
    async def test_search_v2_sets_operation_context(self, mock_observability, mock_dependencies):
        """Search V2 should set operation context with query metadata"""
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext

        request = SearchV2Request(query="authentication", repo_id="repo", top_k=10)
        auth = AuthContext(user_id="user-123", email="test@test.com")

        await search_v2(request, auth)

        mock_observability["set_operation_context"].assert_called_once()
        call_args = mock_observability["set_operation_context"].call_args
        assert call_args[0][0] == "search_v2"
        assert call_args[1]["top_k"] == 10

    @pytest.mark.asyncio
    async def test_search_v2_logs_reranking_status(self, mock_observability, mock_dependencies):
        """Search V2 should log whether reranking was used"""
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext

        request = SearchV2Request(query="test", repo_id="repo", use_reranking=True)
        auth = AuthContext(user_id="user", email="test@test.com")

        await search_v2(request, auth)

        # Check info log includes reranking status
        info_calls = mock_observability["logger"].info.call_args_list
        assert any("reranking" in str(c).lower() for c in info_calls)


class TestAuthRouteObservability:
    """Tests for observability in routes/auth.py"""

    @pytest.fixture
    def mock_observability(self):
        with patch("routes.auth.logger") as mock_logger, \
             patch("routes.auth.capture_exception") as mock_capture, \
             patch("routes.auth.track_time") as mock_track, \
             patch("routes.auth.add_breadcrumb") as mock_breadcrumb, \
             patch("routes.auth.set_operation_context") as mock_context:
            
            mock_track.return_value.__enter__ = MagicMock()
            mock_track.return_value.__exit__ = MagicMock(return_value=False)
            
            yield {
                "logger": mock_logger,
                "capture_exception": mock_capture,
                "track_time": mock_track,
                "add_breadcrumb": mock_breadcrumb,
                "set_operation_context": mock_context
            }

    @pytest.fixture
    def mock_auth_service(self):
        with patch("routes.auth.get_auth_service") as mock:
            service = MagicMock()
            service.signup = AsyncMock(return_value={
                "user": {"id": "user-123", "email": "test@test.com"},
                "session": {"access_token": "token", "refresh_token": "refresh"}
            })
            service.login = AsyncMock(return_value={
                "user": {"id": "user-123", "email": "test@test.com"},
                "session": {"access_token": "token", "refresh_token": "refresh"}
            })
            service.refresh_session = AsyncMock(return_value={"access_token": "new_token"})
            service.logout = AsyncMock(return_value={"message": "success"})
            mock.return_value = service
            yield service

    @pytest.mark.asyncio
    async def test_signup_logs_attempt(self, mock_observability, mock_auth_service):
        """Signup should log the attempt with email"""
        from routes.auth import signup, SignupRequest

        request = SignupRequest(email="new@test.com", password="password123")
        await signup(request)

        mock_observability["logger"].info.assert_called()
        # Check email is logged (but not password!)
        info_calls = str(mock_observability["logger"].info.call_args_list)
        assert "new@test.com" in info_calls
        assert "password" not in info_calls.lower()

    @pytest.mark.asyncio
    async def test_login_tracks_time(self, mock_observability, mock_auth_service):
        """Login should track authentication time"""
        from routes.auth import login, LoginRequest

        request = LoginRequest(email="test@test.com", password="pass")
        await login(request)

        mock_observability["track_time"].assert_called_with("auth_login")

    @pytest.mark.asyncio
    async def test_login_captures_exception_on_failure(self, mock_observability, mock_auth_service):
        """Login should capture exceptions to Sentry"""
        from routes.auth import login, LoginRequest

        mock_auth_service.login = AsyncMock(side_effect=Exception("DB error"))

        request = LoginRequest(email="test@test.com", password="pass")

        with pytest.raises(HTTPException):
            await login(request)

        mock_observability["capture_exception"].assert_called_once()

    @pytest.mark.asyncio
    async def test_auth_sets_breadcrumb(self, mock_observability, mock_auth_service):
        """Auth endpoints should add breadcrumbs"""
        from routes.auth import signup, SignupRequest

        request = SignupRequest(email="test@test.com", password="pass")
        await signup(request)

        mock_observability["add_breadcrumb"].assert_called()
        call_args = mock_observability["add_breadcrumb"].call_args
        assert call_args[1]["category"] == "auth"


class TestApiKeysRouteObservability:
    """Tests for observability in routes/api_keys.py"""

    @pytest.fixture
    def mock_observability(self):
        with patch("routes.api_keys.logger") as mock_logger, \
             patch("routes.api_keys.capture_exception") as mock_capture, \
             patch("routes.api_keys.track_time") as mock_track, \
             patch("routes.api_keys.add_breadcrumb") as mock_breadcrumb, \
             patch("routes.api_keys.set_operation_context") as mock_context:
            
            mock_track.return_value.__enter__ = MagicMock()
            mock_track.return_value.__exit__ = MagicMock(return_value=False)
            
            yield {
                "logger": mock_logger,
                "capture_exception": mock_capture,
                "track_time": mock_track,
                "add_breadcrumb": mock_breadcrumb,
                "set_operation_context": mock_context
            }

    @pytest.fixture
    def mock_dependencies(self):
        with patch("routes.api_keys.api_key_manager") as mock_manager, \
             patch("routes.api_keys.rate_limiter") as mock_limiter, \
             patch("routes.api_keys.metrics") as mock_metrics:
            
            mock_manager.generate_key = MagicMock(return_value="sk-test-key-123")
            mock_limiter.get_usage = MagicMock(return_value={"minute": 5, "hour": 50})
            mock_metrics.get_metrics = MagicMock(return_value={"searches": 100})
            
            yield {
                "api_key_manager": mock_manager,
                "rate_limiter": mock_limiter,
                "metrics": mock_metrics
            }

    @pytest.mark.asyncio
    async def test_generate_key_logs_request(self, mock_observability, mock_dependencies):
        """API key generation should log the request with tier"""
        from routes.api_keys import generate_api_key, CreateAPIKeyRequest
        from middleware.auth import AuthContext

        request = CreateAPIKeyRequest(name="Production Key", tier="pro")
        auth = AuthContext(user_id="user-123", email="test@test.com", tier="pro")

        await generate_api_key(request, auth)

        mock_observability["logger"].info.assert_called()
        info_calls = str(mock_observability["logger"].info.call_args_list)
        assert "pro" in info_calls
        assert "Production Key" in info_calls

    @pytest.mark.asyncio
    async def test_generate_key_sets_context_with_tier(self, mock_observability, mock_dependencies):
        """API key generation should set context with tier info"""
        from routes.api_keys import generate_api_key, CreateAPIKeyRequest
        from middleware.auth import AuthContext

        request = CreateAPIKeyRequest(name="Key", tier="enterprise")
        auth = AuthContext(user_id="user", email="test@test.com", tier="enterprise")

        await generate_api_key(request, auth)

        mock_observability["set_operation_context"].assert_called()
        call_args = mock_observability["set_operation_context"].call_args
        assert call_args[1]["tier"] == "enterprise"

    @pytest.mark.asyncio
    async def test_get_usage_tracks_time(self, mock_observability, mock_dependencies):
        """Get usage should track operation time"""
        from routes.api_keys import get_api_usage
        from middleware.auth import AuthContext

        # AuthContext.identifier is a property that returns user_id or api_key_name
        auth = AuthContext(user_id="user", email="test@test.com", tier="free")

        await get_api_usage(auth)

        mock_observability["track_time"].assert_called_with("get_api_usage")


class TestObservabilityConsistency:
    """Cross-cutting tests to ensure observability is consistent across all routes"""

    def test_all_routes_import_observability(self):
        """All 4 routes should import observability module"""
        import routes.search
        import routes.search_v2
        import routes.auth
        import routes.api_keys

        # Check each module has the observability imports
        for module in [routes.search, routes.search_v2, routes.auth, routes.api_keys]:
            assert hasattr(module, "logger") or "logger" in dir(module)

    def test_observability_module_exports(self):
        """Observability module should export all required functions"""
        from services.observability import (
            logger,
            capture_exception,
            track_time,
            add_breadcrumb,
            set_operation_context
        )
        
        assert logger is not None
        assert callable(capture_exception)
        assert callable(track_time)
        assert callable(add_breadcrumb)
        assert callable(set_operation_context)
