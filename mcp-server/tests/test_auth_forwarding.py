"""Tests for per-user ci_ key forwarding at /mcp (issue #323).

Two layers under test:
  1. api_client: the per-request Authorization header is resolved from a task-local
     ContextVar, not baked into the shared client (the cross-tenant-leak defense).
  2. MCPAuthMiddleware: fail-closed auth at the ASGI edge; /health stays public;
     ci_ keys are forwarded, the admin token authenticates without widening scope.
"""
import asyncio

import pytest

import api_client
from api_client import (
    _auth_header,
    _resolve_key,
    _request_api_key,
    set_request_api_key,
    get_client,
    close_client,
)


# -- Per-request header resolution --

class TestAuthHeaderResolution:
    def setup_method(self):
        _request_api_key.set(None)

    def test_uses_per_request_key(self):
        set_request_api_key("ci_userA")
        assert _auth_header() == {"Authorization": "Bearer ci_userA"}

    def test_bearer_has_exactly_one_space(self):
        # PR #292 / commit df958de regression guard: f"Bearer{key}" must never recur.
        set_request_api_key("ci_xyz")
        header = _auth_header()["Authorization"]
        assert header.startswith("Bearer ")
        assert header.split(" ", 1) == ["Bearer", "ci_xyz"]

    def test_falls_back_to_configured_key_when_no_request_key(self, monkeypatch):
        # stdio / admin path: no per-request key, use the configured one.
        monkeypatch.setattr(api_client, "API_KEY", "ci_configured")
        _request_api_key.set(None)
        assert _resolve_key() == "ci_configured"

    def test_per_request_key_overrides_configured(self, monkeypatch):
        monkeypatch.setattr(api_client, "API_KEY", "ci_configured")
        set_request_api_key("ci_caller")
        assert _resolve_key() == "ci_caller"

    def test_raises_when_no_key_anywhere(self, monkeypatch):
        monkeypatch.setattr(api_client, "API_KEY", "")
        _request_api_key.set(None)
        with pytest.raises(ValueError):
            _resolve_key()


# -- Concurrency isolation (the cross-tenant-leak defense) --

class TestConcurrentIsolation:
    @pytest.mark.asyncio
    async def test_concurrent_requests_do_not_share_identity(self):
        """Two interleaved tasks with different keys must each see only their own.

        asyncio tasks copy the context at creation, so each gather'd coroutine has
        an independent ContextVar. If identity lived in a module global instead,
        one task's set would clobber the other and this test would fail -- that is
        precisely the production race we are guarding against.
        """
        seen: dict[str, str] = {}

        async def request(name: str, key: str) -> None:
            set_request_api_key(key)
            await asyncio.sleep(0)  # force interleaving with the other task
            header = _auth_header()["Authorization"]
            await asyncio.sleep(0)
            seen[name] = header

        await asyncio.gather(
            request("A", "ci_userA"),
            request("B", "ci_userB"),
        )

        assert seen["A"] == "Bearer ci_userA"
        assert seen["B"] == "Bearer ci_userB"


# -- Identity-free shared client --

class TestSharedClient:
    @pytest.mark.asyncio
    async def test_shared_client_has_no_default_auth_header(self):
        await close_client()
        try:
            client = await get_client()
            header_names = {k.lower() for k in client.headers.keys()}
            assert "authorization" not in header_names
        finally:
            await close_client()


# -- ASGI auth middleware --

import server  # noqa: E402  (constructs FastMCP; no network, safe to import)
from server import MCPAuthMiddleware  # noqa: E402


class _Recorder:
    """Minimal inner ASGI app that records whether it ran and the key it saw."""

    def __init__(self):
        self.called = False
        self.captured_key = "UNSET"

    async def __call__(self, scope, receive, send):
        self.called = True
        self.captured_key = _request_api_key.get()


def _http_scope(path="/mcp", headers=None):
    return {"type": "http", "path": path, "headers": headers or []}


async def _run(mw, scope):
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await mw(scope, receive, send)
    return sent


class TestMCPAuthMiddleware:
    def setup_method(self):
        _request_api_key.set(None)

    @pytest.mark.asyncio
    async def test_health_is_public(self):
        inner = _Recorder()
        await _run(MCPAuthMiddleware(inner), _http_scope(path="/health"))
        assert inner.called is True

    @pytest.mark.asyncio
    async def test_missing_auth_returns_401(self):
        inner = _Recorder()
        sent = await _run(MCPAuthMiddleware(inner), _http_scope(headers=[]))
        assert inner.called is False
        assert sent[0]["status"] == 401

    @pytest.mark.asyncio
    async def test_non_ci_token_returns_401(self):
        inner = _Recorder()
        headers = [(b"authorization", b"Bearer notakey")]
        sent = await _run(MCPAuthMiddleware(inner), _http_scope(headers=headers))
        assert inner.called is False
        assert sent[0]["status"] == 401

    @pytest.mark.asyncio
    async def test_malformed_bearer_no_space_returns_401(self):
        # "Bearerci_x" (missing space) must be rejected, not silently parsed.
        inner = _Recorder()
        headers = [(b"authorization", b"Bearerci_userA")]
        sent = await _run(MCPAuthMiddleware(inner), _http_scope(headers=headers))
        assert inner.called is False
        assert sent[0]["status"] == 401

    @pytest.mark.asyncio
    async def test_ci_key_is_forwarded_to_context(self):
        inner = _Recorder()
        headers = [(b"authorization", b"Bearer ci_userA")]
        await _run(MCPAuthMiddleware(inner), _http_scope(headers=headers))
        assert inner.called is True
        assert inner.captured_key == "ci_userA"

    @pytest.mark.asyncio
    async def test_admin_token_passes_without_setting_user_key(self, monkeypatch):
        monkeypatch.setattr(server, "MCP_AUTH_TOKEN", "admin-secret")
        inner = _Recorder()
        headers = [(b"authorization", b"Bearer admin-secret")]
        await _run(MCPAuthMiddleware(inner), _http_scope(headers=headers))
        assert inner.called is True
        # Non-widening: admin authenticates the endpoint but sets no user identity.
        assert inner.captured_key is None

    @pytest.mark.asyncio
    async def test_lifespan_scope_passes_through(self):
        inner = _Recorder()
        await _run(MCPAuthMiddleware(inner), {"type": "lifespan"})
        assert inner.called is True
