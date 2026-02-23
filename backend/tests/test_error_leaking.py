"""Tests that 500 errors don't leak internal details (OPE-79)."""
import pytest
from unittest.mock import patch, MagicMock


class TestErrorResponsesHideInternals:
    """Verify 500 responses return generic messages, not str(e)."""

    def test_search_error_hides_details(self, client, valid_headers):
        """Search failure should not expose Pinecone/OpenAI error strings."""
        with patch("routes.search.indexer") as mock_indexer, \
             patch("routes.search.cache") as mock_cache:
            mock_cache.get_search_results.return_value = None
            mock_indexer.semantic_search.side_effect = RuntimeError(
                "Pinecone connection refused at pinecone-prod.svc.us-east1.aws:443"
            )
            with patch("routes.search.verify_repo_access"):
                resp = client.post(
                    "/api/v1/search",
                    json={"query": "auth middleware", "repo_id": "test-repo"},
                    headers=valid_headers,
                )

        assert resp.status_code == 500
        body = resp.json()["detail"]
        assert body == "Search failed"
        assert "Pinecone" not in body
        assert "pinecone-prod" not in body

    def test_dependency_graph_error_hides_details(self, client, valid_headers):
        """Dependency graph failure should not expose file paths."""
        with patch("routes.analysis.get_repo_or_404") as mock_repo:
            mock_repo.return_value = {"local_path": "/srv/repos/abc", "name": "test"}
            with patch("routes.analysis.dependency_analyzer") as mock_dep:
                mock_dep.load_from_cache.return_value = None
                mock_dep.build_dependency_graph.side_effect = FileNotFoundError(
                    "/srv/repos/abc/.git/config not found"
                )
                resp = client.get(
                    "/api/v1/repos/test-repo/dependencies",
                    headers=valid_headers,
                )

        assert resp.status_code == 500
        body = resp.json()["detail"]
        assert body == "Failed to build dependency graph"
        assert "/srv/repos" not in body

    def test_repo_add_error_hides_details(self, client, valid_headers):
        """Add repo failure should not expose git credentials or paths."""
        with patch("routes.repos.repo_manager") as mock_rm, \
             patch("routes.repos.user_limits") as mock_limits:
            limit_check = MagicMock()
            limit_check.allowed = True
            mock_limits.check_repo_count.return_value = limit_check
            mock_rm.add_repo.side_effect = Exception(
                "Authentication failed for https://user:ghp_secret@github.com/org/repo.git"
            )
            resp = client.post(
                "/api/v1/repos",
                json={"name": "test", "git_url": "https://github.com/org/repo", "branch": "main"},
                headers=valid_headers,
            )

        assert resp.status_code == 500
        body = resp.json()["detail"]
        assert body == "Failed to add repository"
        assert "ghp_secret" not in body
