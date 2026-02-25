"""Tests for tool handler dispatch.

Handlers call the API client, so we mock api_get/api_post to test
dispatch logic and error handling without network calls.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import AsyncMock, patch
import httpx
import mcp.types as types

from handlers import call_tool, _safe_error_message


# -- Dispatch --

class TestCallTool:
    @pytest.mark.asyncio
    async def test_unknown_tool(self):
        result = await call_tool("nonexistent_tool", {})
        assert len(result) == 1
        assert "Unknown tool" in result[0].text

    @pytest.mark.asyncio
    @patch("handlers.api_post", new_callable=AsyncMock)
    async def test_search_dispatches_to_v2(self, mock_post):
        """Search handler should call /search/v2, not /search."""
        mock_post.return_value = {
            "total": 0, "results": [], "cached": False, "search_version": "v2"
        }
        await call_tool("search_code", {"query": "test", "repo_id": "abc"})
        mock_post.assert_called_once()
        call_path = mock_post.call_args[0][0]
        assert call_path == "/search/v2"

    @pytest.mark.asyncio
    @patch("handlers.api_post", new_callable=AsyncMock)
    async def test_search_maps_max_results_to_top_k(self, mock_post):
        """Tool schema uses max_results, v2 API expects top_k."""
        mock_post.return_value = {
            "total": 0, "results": [], "cached": False, "search_version": "v2"
        }
        await call_tool("search_code", {
            "query": "auth", "repo_id": "abc", "max_results": 5
        })
        payload = mock_post.call_args[1]["json"]
        assert payload["top_k"] == 5
        assert "max_results" not in payload

    @pytest.mark.asyncio
    @patch("handlers.api_get", new_callable=AsyncMock)
    async def test_list_repos(self, mock_get):
        mock_get.return_value = {"repositories": []}
        result = await call_tool("list_repositories", {})
        assert len(result) == 1
        assert "No repositories indexed" in result[0].text

    @pytest.mark.asyncio
    @patch("handlers.api_get", new_callable=AsyncMock)
    async def test_dna_calls_correct_endpoint(self, mock_get):
        mock_get.return_value = {"dna": "test patterns", "cached": False}
        await call_tool("get_codebase_dna", {"repo_id": "r1"})
        call_path = mock_get.call_args[0][0]
        assert "/repos/r1/dna" in call_path

    @pytest.mark.asyncio
    async def test_none_arguments_handled(self):
        """call_tool(name, None) should not crash."""
        result = await call_tool("list_repositories", None)
        # Will fail on network, but should not crash on None args
        assert len(result) == 1


# -- Error handling --

class TestSafeErrorMessage:
    def test_http_status_error(self):
        response = httpx.Response(403, request=httpx.Request("GET", "http://x"))
        error = httpx.HTTPStatusError("forbidden", request=response.request, response=response)
        msg = _safe_error_message("search_code", {"repo_id": "abc"}, error)
        assert "403" in msg
        assert "search_code" in msg
        assert "abc" in msg
        # Should NOT leak internal details like URLs or stack traces
        assert "http://" not in msg

    def test_timeout_error(self):
        error = httpx.TimeoutException("timed out")
        msg = _safe_error_message("get_codebase_dna", {"repo_id": "r1"}, error)
        assert "timed out" in msg.lower()
        assert "get_codebase_dna" in msg

    def test_connect_error(self):
        error = httpx.ConnectError("connection refused")
        msg = _safe_error_message("search_code", {}, error)
        assert "Cannot connect" in msg

    def test_value_error_passthrough(self):
        """ValueError messages are user-facing (e.g. missing API key)."""
        error = ValueError("No API_KEY configured")
        msg = _safe_error_message("search_code", {}, error)
        assert "No API_KEY configured" in msg

    def test_generic_error_hides_details(self):
        error = RuntimeError("internal traceback info")
        msg = _safe_error_message("search_code", {"repo_id": "r1"}, error)
        assert "internal traceback" not in msg
        assert "Unexpected error" in msg
