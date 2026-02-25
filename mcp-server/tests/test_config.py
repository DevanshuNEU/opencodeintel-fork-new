"""Tests for MCP server configuration."""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import API_PREFIX, SERVER_NAME, SERVER_VERSION, BACKEND_API_URL


class TestConfig:
    def test_api_prefix_format(self):
        """API prefix must match /api/v{n} pattern."""
        assert API_PREFIX.startswith("/api/v")

    def test_server_name(self):
        assert SERVER_NAME == "codeintel-mcp"

    def test_server_version_semver(self):
        """Version should be semver-like (x.y.z)."""
        parts = SERVER_VERSION.split(".")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)

    def test_backend_url_has_prefix(self):
        """BACKEND_API_URL should include the API prefix for direct use."""
        assert BACKEND_API_URL.endswith(API_PREFIX)
