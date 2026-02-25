"""Tests for response formatters.

Formatters are pure functions (dict -> str) so they're straightforward to test
without any mocking or network calls.
"""
import pytest

from formatters import (
    format_search_results,
    format_repositories,
    format_dependency_graph,
    format_code_style,
    format_impact_analysis,
    format_repository_insights,
    format_codebase_dna,
)


# -- Search results (v2 format) --

class TestFormatSearchResults:
    def test_empty_results(self):
        result = {"total": 0, "results": [], "cached": False, "search_version": "v2"}
        output = format_search_results(result)
        assert "Found 0 results" in output
        assert "No results found" in output

    def test_basic_result(self):
        result = {
            "total": 1,
            "cached": False,
            "search_version": "v2",
            "results": [{
                "name": "authenticate",
                "qualified_name": "auth.service.authenticate",
                "file_path": "backend/auth.py",
                "code": "def authenticate(token): ...",
                "signature": "def authenticate(token: str) -> User",
                "language": "python",
                "score": 0.95,
                "line_start": 10,
                "line_end": 20,
                "match_reason": "Semantic match on authentication logic",
            }],
        }
        output = format_search_results(result)
        assert "authenticate" in output
        assert "95% match" in output
        assert "backend/auth.py" in output
        assert "auth.service.authenticate" in output
        assert "Signature" in output
        assert "Why:" in output
        assert "(v2)" in output

    def test_cached_flag(self):
        result = {"total": 0, "results": [], "cached": True, "search_version": "v2"}
        output = format_search_results(result)
        assert "(cached)" in output

    def test_v1_fallback(self):
        """Formatter handles v1-style response with 'count' field."""
        result = {"count": 0, "results": []}
        output = format_search_results(result)
        assert "Found 0 results" in output
        assert "(v1)" in output

    def test_none_score_handled(self):
        """score=None should not crash the formatter."""
        result = {"total": 1, "cached": False, "search_version": "v2", "results": [{
            "name": "test", "file_path": "t.py", "code": "pass",
            "language": "python", "score": None, "line_start": 1, "line_end": 1,
        }]}
        output = format_search_results(result)
        assert "0% match" in output

    def test_no_emoji_in_output(self):
        """CLAUDE.md violation check: no emojis anywhere in formatted output."""
        result = {"total": 1, "cached": True, "search_version": "v2", "results": [{
            "name": "test", "file_path": "test.py", "code": "pass",
            "language": "python", "score": 0.5, "line_start": 1, "line_end": 1,
        }]}
        output = format_search_results(result)
        # Lightning bolt was the specific emoji found in OPE-91 audit
        assert "\u26a1" not in output


# -- Repositories --

class TestFormatRepositories:
    def test_no_repos(self):
        output = format_repositories({"repositories": []})
        assert "No repositories indexed" in output

    def test_repo_listing(self):
        output = format_repositories({
            "repositories": [{
                "id": "abc-123",
                "name": "my-project",
                "status": "indexed",
                "file_count": 1500,
                "branch": "main",
            }]
        })
        assert "my-project" in output
        assert "abc-123" in output
        assert "indexed" in output
        assert "1,500" in output


# -- Dependency graph --

class TestFormatDependencyGraph:
    def test_empty_graph(self):
        output = format_dependency_graph({"nodes": [], "edges": [], "metrics": {}})
        assert "Total Files:** 0" in output

    def test_critical_files_ranked(self):
        output = format_dependency_graph({
            "nodes": [{"id": "a.py"}, {"id": "b.py"}],
            "edges": [
                {"source": "b.py", "target": "a.py"},
                {"source": "c.py", "target": "a.py"},
            ],
            "metrics": {"total_edges": 2, "avg_dependencies": 1.0},
        })
        assert "a.py" in output
        assert "2 dependents" in output


# -- Code style --

class TestFormatCodeStyle:
    def test_basic_summary(self):
        output = format_code_style({
            "summary": {
                "total_files_analyzed": 50,
                "total_functions": 200,
                "async_adoption": "35%",
                "type_hints_usage": "80%",
            },
        })
        assert "50" in output
        assert "200" in output
        assert "35%" in output
        assert "80%" in output


# -- Impact analysis --

class TestFormatImpactAnalysis:
    def test_high_risk(self):
        output = format_impact_analysis({
            "file": "core/engine.py",
            "risk_level": "high",
            "impact_summary": "Central dependency",
            "direct_dependencies": ["utils.py"],
            "all_dependents": ["api.py", "cli.py"],
            "test_files": ["test_engine.py"],
        })
        assert "core/engine.py" in output
        assert "HIGH" in output
        assert "utils.py" in output
        assert "test_engine.py" in output


# -- Repository insights --

class TestFormatRepositoryInsights:
    def test_basic_insights(self):
        output = format_repository_insights({
            "name": "opencodeintel",
            "status": "indexed",
            "functions_indexed": 500,
            "total_files": 80,
            "total_dependencies": 120,
        })
        assert "opencodeintel" in output
        assert "500" in output


# -- Codebase DNA --

class TestFormatCodebaseDna:
    def test_dna_output(self):
        output = format_codebase_dna({
            "dna": "## Patterns\n- Uses FastAPI\n- SQLAlchemy ORM",
            "cached": False,
        })
        assert "Codebase DNA" in output
        assert "FastAPI" in output
        assert "Follow the auth patterns" in output

    def test_dna_cached(self):
        output = format_codebase_dna({"dna": "test", "cached": True})
        assert "(cached)" in output

    def test_no_emoji_in_dna(self):
        output = format_codebase_dna({"dna": "test", "cached": True})
        assert "\u26a1" not in output
