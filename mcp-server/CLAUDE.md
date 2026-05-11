# mcp-server/ Rules

FastMCP, dual transport (stdio + streamable-http), deployed to Railway as `marvelous-endurance` at `mcp.opencodeintel.com`.

Root rules in `../CLAUDE.md` apply. This file adds MCP-server-specific rules.

## Stack

- `mcp>=1.25.0,<2.0.0` PINNED. Uses the private `_mcp_server` API. Do NOT upgrade to 2.x without a strategic ADR.
- Python 3.11+, type hints, async I/O.
- httpx for backend calls (`httpx.AsyncClient`). Never `requests`.
- pytest for tests.

## File layout

- `server.py` - entrypoint. Sets up dual transport. Wires handlers. Keep thin.
- `tools.py` - tool DEFINITIONS only (name, description, input schema). One source of truth for what tools exist.
- `handlers.py` - tool IMPLEMENTATION. Each handler maps to one tool definition.
- `api_client.py` - the HTTP client wrapping the backend's `/api/v1/*` API. All backend calls go through here.
- `formatters.py` - output formatting helpers.
- `config.py` - env validation, config dataclass.

Never inline tool logic in `server.py`. The schema/handler split is the contract.

## Transport

- Dual transport: stdio (local Claude Desktop / Cursor / Cline) and streamable-http (production).
- Any change to handlers must work on BOTH. If a tool's response is large and uses streaming, document which transport supports it.
- stdio cannot stream cleanly. Tools that return async generators break local clients.

## Auth and env

- `MCP_API_KEY`, NEVER `API_KEY`. Railway shares env vars across services; backend uses `API_KEY=dev-secret-key` and an MCP-server `API_KEY` reference will collide. See Bug #2.
- `Authorization: Bearer {key}` header MUST include the space. `f"Bearer{key}"` is the PR #292 / commit `df958de` regression. Use f-strings carefully or extract to a helper.
- Every tool call goes through auth. No "trusted MCP context" that bypasses validation.

## Tool design

- Tool names are verbs (`search_code`, `analyze_impact`, `get_codebase_dna`), not nouns. Agent prompts read better.
- Every tool declares a JSON input schema with required fields, types, and enums. No `Any`.
- Tool output: deterministic string OR structured JSON. Never a generator unless the transport supports streaming AND the tool is documented as streaming-only.
- Idempotency: a tool called twice with the same input produces the same output (or the same structured error). Stateful tools must declare their stateful nature in the schema description.
- Tool composability: if tool A's output is intended as tool B's input, the schemas must align explicitly. Drift here breaks agent chaining.

## Errors

- Structured errors, never stack traces. A tool that raises `Exception` to the MCP transport leaks internals and crashes the agent. Catch, classify, return `{"error": "...", "code": "..."}`.
- Backend unreachable: return a structured error within 2s. Never hang on the default httpx 30s timeout.
- Rate-limited by backend: propagate the rate-limit signal to the agent (MCP-level retry hint), not a 500.

## Latency budget

- Tools used in agent loops (search, get_codebase_dna): target p95 < 500ms.
- Search currently inherits Cohere reranking (3.6s p95, OPE-121). Any new tool that wraps search inherits this problem until the bottleneck is fixed.
- Document the latency profile per tool in the schema description if it exceeds 500ms.

## Tests

- pytest in `tests/`. Run: `cd mcp-server && pytest tests/ -v`. 45+ tests at HEAD.
- Schema validation tests: every tool must have a test for malformed input that returns a structured error (not a crash).
- If a change touches transport code, test both stdio and streamable-http paths.
- Authorization header test: explicit regression for `Bearer {key}` with the space. The PR #292 bug must never recur.

## Off-limits files in mcp-server/

None at the module level. Treat the `mcp>=1.25.0,<2.0.0` pin in `requirements.txt` as off-limits without an ADR.
