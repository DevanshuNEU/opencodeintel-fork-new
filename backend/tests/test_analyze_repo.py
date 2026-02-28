"""Tests for POST /repos/analyze -- pre-clone directory analysis (OPE-109)."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import ValidationError

# Import after conftest patches external services
from routes.repos import (
    _fetch_directory_tree,
    _GITHUB_URL_RE,
    AnalyzeRepoRequest,
    IndexConfig,
)


# -- URL regex tests ----------------------------------------------------------

class TestGitHubUrlRegex:
    def test_standard_url(self):
        match = _GITHUB_URL_RE.match("https://github.com/Effect-TS/effect")
        assert match is not None
        assert match.group("owner") == "Effect-TS"
        assert match.group("repo") == "effect"

    def test_url_with_trailing_slash(self):
        match = _GITHUB_URL_RE.match("https://github.com/owner/repo/")
        assert match is not None

    def test_http_url(self):
        match = _GITHUB_URL_RE.match("http://github.com/owner/repo")
        assert match is not None

    def test_rejects_non_github(self):
        assert _GITHUB_URL_RE.match("https://gitlab.com/owner/repo") is None

    def test_rejects_subpath(self):
        assert _GITHUB_URL_RE.match("https://github.com/owner/repo/tree/main") is None

    def test_rejects_no_repo(self):
        assert _GITHUB_URL_RE.match("https://github.com/justowner") is None


# -- AnalyzeRepoRequest validation --------------------------------------------

class TestAnalyzeRepoRequest:
    def test_valid_url(self):
        req = AnalyzeRepoRequest(github_url="https://github.com/owner/repo")
        assert req.github_url == "https://github.com/owner/repo"

    def test_strips_whitespace_and_slash(self):
        req = AnalyzeRepoRequest(github_url="  https://github.com/owner/repo/  ")
        assert req.github_url == "https://github.com/owner/repo"

    def test_rejects_empty(self):
        with pytest.raises(ValidationError):
            AnalyzeRepoRequest(github_url="")

    def test_rejects_non_github(self):
        with pytest.raises(ValidationError):
            AnalyzeRepoRequest(github_url="https://gitlab.com/owner/repo")

    def test_rejects_malformed_github_domain(self):
        with pytest.raises(ValidationError):
            AnalyzeRepoRequest(github_url="https://fakegithub.com/owner/repo")


# -- IndexConfig validation (from PR #266) ------------------------------------

class TestIndexConfig:
    def test_valid_paths(self):
        cfg = IndexConfig(include_paths=["packages/effect", "packages/schema"])
        assert cfg.include_paths == ["packages/effect", "packages/schema"]

    def test_normalizes_slashes(self):
        cfg = IndexConfig(include_paths=["/packages/effect/", " src "])
        assert cfg.include_paths == ["packages/effect", "src"]

    def test_normalizes_backslashes(self):
        cfg = IndexConfig(include_paths=["packages\\effect"])
        assert cfg.include_paths == ["packages/effect"]

    def test_rejects_empty_string(self):
        with pytest.raises(ValidationError):
            IndexConfig(include_paths=["packages/effect", "  "])

    def test_rejects_path_traversal(self):
        with pytest.raises(ValidationError):
            IndexConfig(include_paths=["../etc/passwd"])

    def test_rejects_nested_traversal(self):
        with pytest.raises(ValidationError):
            IndexConfig(include_paths=["packages/../../etc"])

    def test_rejects_non_string(self):
        with pytest.raises(ValidationError):
            IndexConfig(include_paths=[123])

    def test_none_is_valid(self):
        cfg = IndexConfig()
        assert cfg.include_paths is None


# -- _fetch_directory_tree grouping logic -------------------------------------

# Build a fake GitHub tree response for testing grouping
def _make_tree(paths: list[str]) -> dict:
    """Build a mock GitHub Tree API response from file paths."""
    return {
        "truncated": False,
        "tree": [{"path": p, "type": "blob"} for p in paths],
    }


class TestFetchDirectoryTree:
    """Test directory grouping logic with mocked GitHub API."""

    @pytest.mark.asyncio
    async def test_flat_repo_groups_by_top_dir(self):
        tree = _make_tree([
            "src/main.py",
            "src/utils.py",
            "tests/test_main.py",
            "README.md",
        ])
        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        dir_names = [d["name"] for d in result["directories"]]
        assert "src" in dir_names
        assert result["total_files"] == 3  # README.md has no code ext

    @pytest.mark.asyncio
    async def test_includes_estimated_functions(self):
        tree = _make_tree([
            "src/main.py",
            "src/utils.py",
            "lib/helpers.ts",
        ])
        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        # 3 files * 25 avg functions per file = 75
        assert result["total_estimated_functions"] == 75
        src_dir = next(d for d in result["directories"] if d["name"] == "src")
        assert src_dir["estimated_functions"] == 50  # 2 files * 25
        lib_dir = next(d for d in result["directories"] if d["name"] == "lib")
        assert lib_dir["estimated_functions"] == 25  # 1 file * 25

    @pytest.mark.asyncio
    async def test_monorepo_groups_at_package_level(self):
        tree = _make_tree([
            "packages/core/src/index.ts",
            "packages/core/src/utils.ts",
            "packages/cli/src/main.ts",
            "scripts/build.ts",
        ])
        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        dir_names = [d["name"] for d in result["directories"]]
        # Should group at packages/core level, not just packages
        assert "packages/core" in dir_names
        assert "packages/cli" in dir_names
        assert "scripts" in dir_names

    @pytest.mark.asyncio
    async def test_skips_node_modules(self):
        tree = _make_tree([
            "src/index.ts",
            "node_modules/lodash/index.js",
        ])
        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        assert result["total_files"] == 1

    @pytest.mark.asyncio
    async def test_large_repo_suggestion(self):
        # 600 TypeScript files across 15 packages
        paths = [f"packages/pkg{i}/src/file{j}.ts" for i in range(15) for j in range(40)]
        tree = _make_tree(paths)

        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        assert result["suggestion"] == "large_repo"
        assert result["total_files"] == 600

    @pytest.mark.asyncio
    async def test_small_repo_no_suggestion(self):
        tree = _make_tree(["src/main.py", "src/utils.py"])

        with patch("routes.repos.httpx.AsyncClient") as mock_client:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = tree
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))

            result = await _fetch_directory_tree("owner", "repo", "main")

        assert result["suggestion"] is None
