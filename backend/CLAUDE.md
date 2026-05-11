# backend/ Rules

Python 3.11+, FastAPI, async I/O. Supabase (PostgreSQL + RLS), Pinecone (vector store), Redis (cache), tree-sitter (AST), OpenAI (embeddings).

Root rules in `../CLAUDE.md` apply. This file adds backend-specific rules.

## Code

- Type hints on every function signature. No `Any` without a comment explaining why.
- PEP 8, max 120 char lines, snake_case for functions and variables.
- `async def` for any I/O. Sync only for pure CPU work.
- Inside `async def`, never block on sync I/O. Use `httpx.AsyncClient` (not `requests`) and `asyncio.to_thread` for CPU-bound work.
- Prefer files under 200 lines. Existing exceptions documented in root CLAUDE.md.

## Architecture

- Layer order: `routes/` calls `services/`. `services/` may call `middleware/auth.py` via `Depends(require_auth)` or `Depends(public_auth)`. Routes never call Pinecone / Supabase / Redis directly.
- All endpoints under `/api/v1/`. Use `APIRouter(prefix="/api/v1/...")` consistently.
- New services follow the singleton pattern. Canonical example: `services/dependency_analyzer.py`.
- Domain exceptions live in `middleware/auth.py` (auth) or each service module. Use `HTTPException` for API surface errors. Log before re-raise.

## Graceful degradation (documented bug class)

- Wrap optional dependency imports in `try / except ModuleNotFoundError`. Hard imports crash startup. See Bug #3 (tree-sitter-typescript) and Bug #4 (Pinecone init).
- External client init: never run at module scope. Lazy-init or wrap in `try / except` so an unreachable service does not take down the API.

## Auth

- `middleware/auth.py` is off-limits. Read it; never modify it.
- JWT validation MUST return `None` on `AuthenticationError`, never raise. Raising blocks the API-key fallback. See Bug #1.
- API keys: raw key (`ci_*` prefix) returned to user once on creation. Database stores SHA-256 hash only. See Bug #7.

## Supabase

- Row Level Security enabled on every table. New tables get an explicit `user_id = auth.uid()` policy or admin-only policy.
- Never bypass RLS via service-role client unless the route is explicitly admin-scoped (and documented as such).
- IDs: `UUID DEFAULT gen_random_uuid()`. Timestamps: `TIMESTAMPTZ`. No bigint IDs, no naive datetimes.
- Cascade deletes on parent-child relationships to prevent orphan rows.

## Pinecone

- Async upserts. No read-after-write guarantee within a request for the same vector. If a route writes then reads, use Supabase metadata as the authoritative store.
- Connection-refused at module init is a Bug #4 trap. Use a lazy connection.

## include_paths and path filters

- Use `Path.parts` tuple comparison, NEVER `str.startswith`. See Bug #5.
- `[]` is falsy in Python. Use `is not None` to test "configured", not truthiness. See Bug #6.

## Tests

- pytest in `tests/`. Run: `cd backend && pytest tests/ -v`. 392+ tests at HEAD.
- Mock fidelity matters more than coverage: a `Mock(return_value="result")` for Pinecone passes the test but does not reflect production. Reviewer-qa flags this.
- Every authed endpoint needs both a "JWT valid" test AND a "JWT invalid -> API key fallback works" test. The Bug #1 gap was the missing fallback test.

## Off-limits files in backend/

- `middleware/auth.py`
- `config/startup_checks.py`

If an ADR requires changing either, STOP and amend the ADR first.
