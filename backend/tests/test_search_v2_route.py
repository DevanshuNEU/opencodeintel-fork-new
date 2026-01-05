"""Tests for Search V2 API route."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestSearchV2Route:
    """Tests for /api/v1/search/v2 endpoint."""

    @pytest.fixture
    def mock_auth(self):
        with patch("routes.search_v2.require_auth") as mock:
            mock.return_value = MagicMock(user_id="test-user")
            yield mock

    @pytest.fixture
    def mock_indexer(self):
        with patch("routes.search_v2.indexer") as mock:
            mock.search_v2 = AsyncMock(return_value=[
                {
                    "name": "authenticate",
                    "qualified_name": "auth.authenticate",
                    "file_path": "src/auth.py",
                    "code": "def authenticate(): pass",
                    "signature": "def authenticate() -> bool",
                    "language": "python",
                    "score": 0.95,
                    "line_start": 10,
                    "line_end": 20,
                    "summary": "Authenticates user",
                    "class_name": None,
                    "match_reason": None,
                }
            ])
            yield mock

    @pytest.fixture
    def mock_cache(self):
        with patch("routes.search_v2.cache") as mock:
            mock.get_search_results = MagicMock(return_value=None)
            mock.set_search_results = MagicMock()
            yield mock

    @pytest.fixture
    def mock_verify_access(self):
        with patch("routes.search_v2.verify_repo_access") as mock:
            yield mock

    @pytest.fixture
    def mock_metrics(self):
        with patch("routes.search_v2.metrics") as mock:
            mock.record_search = MagicMock()
            yield mock

    @pytest.mark.asyncio
    async def test_search_v2_returns_results(
        self, mock_auth, mock_indexer, mock_cache, mock_verify_access, mock_metrics
    ):
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext

        request = SearchV2Request(
            query="authentication",
            repo_id="test-repo",
            top_k=10,
        )
        auth = AuthContext(user_id="test-user", email="test@test.com")

        response = await search_v2(request, auth)

        assert response.total == 1
        assert response.search_version == "v2"
        assert response.cached is False
        assert response.results[0].name == "authenticate"

    @pytest.mark.asyncio
    async def test_search_v2_uses_cache(
        self, mock_auth, mock_indexer, mock_cache, mock_verify_access, mock_metrics
    ):
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext

        mock_cache.get_search_results.return_value = [
            {"name": "cached_result", "qualified_name": "cached", "file_path": "x.py",
             "code": "", "signature": "", "language": "python", "score": 0.9,
             "line_start": 1, "line_end": 2}
        ]

        request = SearchV2Request(query="test", repo_id="repo", top_k=5)
        auth = AuthContext(user_id="test-user", email="test@test.com")

        response = await search_v2(request, auth)

        assert response.cached is True
        mock_indexer.search_v2.assert_not_called()

    @pytest.mark.asyncio
    async def test_search_v2_rejects_sql_injection(self, mock_auth, mock_verify_access):
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext
        from fastapi import HTTPException

        request = SearchV2Request(query="DROP TABLE users;--", repo_id="repo", top_k=10)
        auth = AuthContext(user_id="test-user", email="test@test.com")

        with pytest.raises(HTTPException) as exc:
            await search_v2(request, auth)
        
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_search_v2_respects_top_k(
        self, mock_auth, mock_indexer, mock_cache, mock_verify_access, mock_metrics
    ):
        from routes.search_v2 import search_v2, SearchV2Request
        from middleware.auth import AuthContext

        request = SearchV2Request(query="test query", repo_id="repo", top_k=25)
        auth = AuthContext(user_id="test-user", email="test@test.com")

        await search_v2(request, auth)

        mock_indexer.search_v2.assert_called_once()
        call_args = mock_indexer.search_v2.call_args
        assert call_args.kwargs["top_k"] == 25
