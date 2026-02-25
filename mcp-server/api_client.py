"""Persistent HTTP client for backend API communication.

Uses a module-level client to avoid creating new TCP connections per tool call.
The client is initialized lazily on first use and reused for all subsequent calls.
"""
from typing import Any, Optional

import httpx

from config import BACKEND_API_URL, API_KEY


# Persistent client reused across all tool calls
_client: Optional[httpx.AsyncClient] = None


def _get_headers() -> dict[str, str]:
    """Build auth headers. Warns if no API key is configured."""
    if not API_KEY:
        raise ValueError(
            "No API_KEY configured. Set API_KEY in .env or environment."
        )
    return {"Authorization": f"Bearer {API_KEY}"}


async def get_client() -> httpx.AsyncClient:
    """Get or create the persistent HTTP client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=BACKEND_API_URL,
            timeout=120.0,
            headers=_get_headers(),
        )
    return _client


async def api_get(path: str, **kwargs: Any) -> dict:
    """Make a GET request to the backend API."""
    client = await get_client()
    response = await client.get(path, **kwargs)
    response.raise_for_status()
    return response.json()


async def api_post(path: str, json: dict, **kwargs: Any) -> dict:
    """Make a POST request to the backend API."""
    client = await get_client()
    response = await client.post(path, json=json, **kwargs)
    response.raise_for_status()
    return response.json()


async def close_client() -> None:
    """Close the persistent client. Call on server shutdown."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
