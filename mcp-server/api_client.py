"""Persistent HTTP client for backend API communication.

Uses a module-level client to avoid creating new TCP connections per tool call.
The client is initialized lazily on first use and reused for all subsequent calls.
Concurrent access is serialized via asyncio.Lock to prevent duplicate clients.

Auth identity is per-request, not per-client. On the remote (http) transport each
MCP request carries the caller's own ci_ key, so we resolve the key at call time
from a ContextVar and send it as a per-request header. The shared client holds NO
Authorization header: baking one in would let concurrent requests race on a single
shared identity, which is a cross-tenant leak. A ContextVar is task-local, so two
in-flight requests can never read each other's key.
"""
import asyncio
import contextvars
from typing import Any, Optional

import httpx

from config import BACKEND_API_URL, API_KEY


# Persistent client reused across all tool calls. Identity-free by design.
_client: Optional[httpx.AsyncClient] = None
_client_lock: asyncio.Lock = asyncio.Lock()

# Per-request caller identity. The MCP server's auth middleware sets this (remote
# transport) before the tool runs; it stays unset on stdio, where the configured
# key is the identity. Task-local, so concurrent requests are isolated.
_request_api_key: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_api_key", default=None
)


def set_request_api_key(key: Optional[str]) -> None:
    """Record the caller's key for the current request context.

    Called by the MCP server's auth middleware on the remote transport.
    """
    _request_api_key.set(key)


def _resolve_key() -> str:
    """Per-request key if present (remote), else the configured key (stdio/admin)."""
    key = _request_api_key.get()
    if key:
        return key
    if API_KEY:
        return API_KEY
    raise ValueError("No API key available for backend call")


def _auth_header() -> dict[str, str]:
    """Build the Authorization header. The space after 'Bearer' is mandatory (PR #292)."""
    return {"Authorization": f"Bearer {_resolve_key()}"}


def _merge_headers(extra: Optional[dict[str, Any]]) -> dict[str, str]:
    headers = _auth_header()
    if extra:
        headers.update(extra)
    return headers


async def get_client() -> httpx.AsyncClient:
    """Get or create the persistent, identity-free HTTP client."""
    global _client
    async with _client_lock:
        if _client is None or _client.is_closed:
            _client = httpx.AsyncClient(
                base_url=BACKEND_API_URL,
                timeout=120.0,
            )
    return _client


async def api_get(path: str, **kwargs: Any) -> dict:
    """Make a GET request to the backend API with the caller's identity."""
    client = await get_client()
    headers = _merge_headers(kwargs.pop("headers", None))
    response = await client.get(path, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()


async def api_post(path: str, json: dict, **kwargs: Any) -> dict:
    """Make a POST request to the backend API with the caller's identity."""
    client = await get_client()
    headers = _merge_headers(kwargs.pop("headers", None))
    response = await client.post(path, json=json, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()


async def api_delete(path: str, **kwargs: Any) -> dict:
    """Make a DELETE request to the backend API with the caller's identity."""
    client = await get_client()
    headers = _merge_headers(kwargs.pop("headers", None))
    response = await client.delete(path, headers=headers, **kwargs)
    response.raise_for_status()
    if response.status_code == 204 or not response.content:
        return {}
    return response.json()


async def close_client() -> None:
    """Close the persistent client. Call on server shutdown."""
    global _client
    async with _client_lock:
        local = _client
        _client = None
    if local and not local.is_closed:
        await local.aclose()
