"""Tests for hybrid search and reranking."""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from dataclasses import dataclass

from services.search_v2.hybrid_searcher import HybridSearcher, ScoredResult


@dataclass
class MockMatch:
    metadata: dict
    score: float


@dataclass  
class MockQueryResult:
    matches: list


class TestHybridSearcher:

    @pytest.fixture
    def mock_index(self):
        index = MagicMock()
        index.query = MagicMock(return_value=MockQueryResult(matches=[
            MockMatch(metadata={
                "name": "fetch_users",
                "qualified_name": "UserService.fetch_users",
                "signature": "def fetch_users(self, limit: int):",
                "code": "def fetch_users(self, limit): return self.db.query()",
                "file_path": "services/user.py",
                "language": "python",
                "start_line": 10,
                "end_line": 15,
                "summary": "Fetches users from database with limit",
            }, score=0.92),
            MockMatch(metadata={
                "name": "get_user",
                "qualified_name": "UserService.get_user",
                "signature": "def get_user(self, user_id: int):",
                "code": "def get_user(self, user_id): return self.db.get(user_id)",
                "file_path": "services/user.py",
                "language": "python",
                "start_line": 20,
                "end_line": 25,
                "summary": "Gets single user by ID",
            }, score=0.85),
            MockMatch(metadata={
                "name": "delete_user",
                "qualified_name": "UserService.delete_user",
                "signature": "def delete_user(self, user_id: int):",
                "code": "def delete_user(self, user_id): self.db.delete(user_id)",
                "file_path": "services/user.py",
                "language": "python",
                "start_line": 30,
                "end_line": 35,
                "summary": "Deletes user from database",
            }, score=0.78),
        ]))
        return index

    @pytest.fixture
    def searcher(self, mock_index):
        async def mock_embed(query):
            return [0.1] * 1024

        searcher = HybridSearcher(
            pinecone_index=mock_index,
            embedding_fn=mock_embed,
            cohere_api_key=None,  # disable reranking for basic tests
        )
        searcher.embed = mock_embed
        return searcher

    @pytest.mark.asyncio
    async def test_search_returns_results(self, searcher):
        results = await searcher.search("fetch users", "repo-123", top_k=3, use_reranking=False)

        assert len(results) == 3
        assert results[0].name == "fetch_users"
        assert results[0].qualified_name == "UserService.fetch_users"

    @pytest.mark.asyncio
    async def test_search_applies_bm25(self, searcher):
        # "fetch users" should boost fetch_users over others
        results = await searcher.search("fetch users", "repo-123", top_k=3, use_reranking=False)

        # fetch_users should be top due to BM25 keyword match
        assert results[0].name == "fetch_users"

    @pytest.mark.asyncio
    async def test_search_empty_results(self, mock_index):
        mock_index.query.return_value = MockQueryResult(matches=[])

        async def mock_embed(q):
            return [0.1] * 1024

        searcher = HybridSearcher(mock_index, mock_embed)
        searcher.embed = mock_embed

        results = await searcher.search("nonexistent", "repo-123", use_reranking=False)
        assert results == []

    @pytest.mark.asyncio
    async def test_rrf_fusion(self, searcher):
        candidates = [
            ScoredResult(metadata={"name": "a"}, semantic_score=0.9, bm25_score=0.3),
            ScoredResult(metadata={"name": "b"}, semantic_score=0.7, bm25_score=0.9),
            ScoredResult(metadata={"name": "c"}, semantic_score=0.5, bm25_score=0.5),
        ]

        fused = searcher._rrf_fusion(candidates, semantic_weight=0.6, bm25_weight=0.4)

        # all should have fused scores
        assert all(c.fused_score > 0 for c in fused)

    @pytest.mark.asyncio
    async def test_search_with_reranking(self, mock_index):
        async def mock_embed(q):
            return [0.1] * 1024

        mock_cohere = MagicMock()
        mock_cohere.rerank.return_value = MagicMock(results=[
            MagicMock(index=1, relevance_score=0.95),  # get_user now top
            MagicMock(index=0, relevance_score=0.90),
            MagicMock(index=2, relevance_score=0.70),
        ])

        with patch('services.search_v2.hybrid_searcher.cohere.Client', return_value=mock_cohere):
            searcher = HybridSearcher(mock_index, mock_embed, cohere_api_key="test-key")
            searcher.embed = mock_embed

            results = await searcher.search("get user by id", "repo-123", top_k=3, use_reranking=True)

        # reranking should reorder results
        assert results[0].name == "get_user"
        assert results[0].score == 0.95

    @pytest.mark.asyncio
    async def test_rerank_handles_error(self, searcher):
        # searcher has no cohere client, should gracefully skip reranking
        results = await searcher.search("test", "repo-123", top_k=2, use_reranking=True)
        assert len(results) > 0


class TestScoredResult:

    def test_default_scores(self):
        result = ScoredResult(metadata={"name": "test"})
        assert result.semantic_score == 0.0
        assert result.bm25_score == 0.0
        assert result.rerank_score == 0.0
        assert result.fused_score == 0.0

    def test_with_scores(self):
        result = ScoredResult(
            metadata={"name": "test"},
            semantic_score=0.9,
            bm25_score=0.5,
        )
        assert result.semantic_score == 0.9
        assert result.bm25_score == 0.5
