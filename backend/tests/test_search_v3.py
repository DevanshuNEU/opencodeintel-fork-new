"""
Search V3 Integration Tests
Run with: pytest tests/test_search_v3.py -v
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio

from services.search_v3.query_understanding import QueryUnderstanding, QueryIntent
from services.search_v3.code_graph_ranker import CodeGraphRanker


class TestQueryUnderstanding:
    """Tests for query intent classification and expansion"""
    
    def setup_method(self):
        self.qu = QueryUnderstanding()
    
    def test_detect_find_intent(self):
        """Should detect FIND_IMPLEMENTATION intent"""
        analysis = self.qu.analyze("find authentication handler")
        assert analysis.intent == QueryIntent.FIND_IMPLEMENTATION
    
    def test_detect_explain_intent(self):
        """Should detect EXPLAIN_CODE intent"""
        analysis = self.qu.analyze("how does the auth middleware work")
        assert analysis.intent == QueryIntent.EXPLAIN_CODE
    
    def test_detect_usage_intent(self):
        """Should detect FIND_USAGE intent"""
        analysis = self.qu.analyze("how to use the login function")
        assert analysis.intent == QueryIntent.FIND_USAGE
    
    def test_detect_debug_intent(self):
        """Should detect DEBUG intent"""
        analysis = self.qu.analyze("why is authentication failing")
        assert analysis.intent == QueryIntent.DEBUG
    
    def test_query_expansion(self):
        """Should expand query with synonyms"""
        analysis = self.qu.analyze("json response")
        assert "JSONResponse" in analysis.expanded_query or "json_response" in analysis.expanded_query
    
    def test_include_tests_detection(self):
        """Should detect when tests should be included"""
        analysis = self.qu.analyze("show me test examples for auth")
        assert analysis.should_include_tests == True
        
        analysis = self.qu.analyze("find auth handler")
        assert analysis.should_include_tests == False
    
    def test_keyword_extraction(self):
        """Should extract meaningful keywords"""
        analysis = self.qu.analyze("authentication middleware handler")
        assert "authentication" in analysis.keywords
        assert "middleware" in analysis.keywords
        assert "handler" in analysis.keywords


class TestCodeGraphRanker:
    """Tests for code graph importance ranking"""
    
    def setup_method(self):
        self.ranker = CodeGraphRanker()
    
    def test_detect_test_files(self):
        """Should correctly identify test files"""
        test_files = [
            "tests/test_auth.py",
            "test_auth.py",
            "auth.test.js",
            "auth.spec.ts",
            "__tests__/auth.js",
            "fixtures/auth_fixture.py",
        ]
        for f in test_files:
            assert self.ranker._is_test_file(f) == True, f"Should detect {f} as test"
    
    def test_detect_non_test_files(self):
        """Should correctly identify non-test files"""
        non_test_files = [
            "auth.py",
            "services/auth.py",
            "models/user.py",
            "routes/api.js",
        ]
        for f in non_test_files:
            assert self.ranker._is_test_file(f) == False, f"Should NOT detect {f} as test"
    
    def test_detect_core_files(self):
        """Should identify core files"""
        core_files = [
            "main.py",
            "index.js",
            "app.py",
            "server.ts",
            "routes/api.py",
            "services/auth.py",
        ]
        for f in core_files:
            assert self.ranker._is_core_file(f) == True, f"Should detect {f} as core"
    
    def test_calculate_importance(self):
        """Should calculate importance based on dependencies"""
        file_deps = {
            "main.py": ["auth.py", "db.py"],
            "auth.py": ["utils.py"],
            "db.py": ["utils.py"],
            "utils.py": [],
            "tests/test_auth.py": ["auth.py"],
        }
        
        importance = self.ranker.calculate_importance("test-repo", file_deps)
        
        # utils.py should have high importance (depended by 2 files)
        assert importance["utils.py"].importance_score > importance["main.py"].importance_score
        
        # test file should be marked
        assert importance["tests/test_auth.py"].is_test_file == True
    
    def test_boost_results(self):
        """Should boost results based on importance"""
        results = [
            {"file_path": "tests/test_auth.py", "score": 0.9, "name": "test_auth"},
            {"file_path": "auth.py", "score": 0.8, "name": "auth"},
        ]
        
        file_deps = {
            "auth.py": [],
            "tests/test_auth.py": ["auth.py"],
        }
        
        importance = self.ranker.calculate_importance("test-repo", file_deps)
        boosted = self.ranker.boost_results(results, importance, include_tests=False)
        
        # auth.py should now rank higher due to test penalty
        assert boosted[0]["file_path"] == "auth.py"
    
    def test_filter_test_files(self):
        """Should filter out test files when requested"""
        results = [
            {"file_path": "auth.py", "score": 0.8},
            {"file_path": "tests/test_auth.py", "score": 0.9},
            {"file_path": "main.py", "score": 0.7},
        ]
        
        filtered = self.ranker.filter_test_files(results, include_tests=False)
        
        assert len(filtered) == 2
        assert all("test" not in r["file_path"] for r in filtered)


class TestSearchEngineV3:
    """Integration tests for Search Engine V3"""
    
    @pytest.mark.asyncio
    async def test_search_with_mocked_dependencies(self):
        """Should complete search pipeline with mocked deps"""
        from services.search_v3.search_engine import SearchEngineV3, SearchConfig
        
        # mock embedding provider
        mock_provider = MagicMock()
        mock_provider.model_name = "mock-model"
        mock_provider.dimension = 1024
        mock_provider.embed_query = AsyncMock(return_value=[0.1] * 1024)
        
        # mock pinecone
        mock_pinecone = MagicMock()
        mock_pinecone.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(
                    score=0.9,
                    metadata={
                        "name": "AuthMiddleware",
                        "qualified_name": "auth.AuthMiddleware",
                        "file_path": "auth.py",
                        "code": "class AuthMiddleware: pass",
                        "line_start": 1,
                        "line_end": 10,
                        "type": "class",
                        "language": "python",
                    }
                )
            ]
        ))
        
        # create engine with mocked provider
        with patch.object(SearchEngineV3, '__init__', lambda self, **kwargs: None):
            engine = SearchEngineV3()
            engine.embedding_provider = mock_provider
            engine.query_understanding = QueryUnderstanding()
            engine.code_graph_ranker = CodeGraphRanker()
            engine.cohere_client = None  # disable reranking for test
            
            results = await engine.search(
                query="auth middleware",
                repo_id="test-repo",
                pinecone_index=mock_pinecone,
                config=SearchConfig(use_reranking=False)
            )
            
            assert len(results) == 1
            assert results[0]["name"] == "AuthMiddleware"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
