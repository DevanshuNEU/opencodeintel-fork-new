# Example Outputs

Real examples showing OpenCodeIntel's RAG pipeline in action.
These examples use the hosted instance at `mcp.opencodeintel.com`.

---

## Example 1: Per-Task Context Assembly

**User task given to Claude Code:**
```
add rate limiting to the POST /api/v1/settings endpoint
```

**OCI `get_context_for_task` response:**

```
CONTEXT PACKAGE — assembled for: "add rate limiting to the POST /api/v1/settings endpoint"
Token budget: 1500 | Tokens used: 1,387 | Files found: 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE: backend/routes/settings.py  [relevance: 0.94]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/api/v1/settings")
async def update_settings(
    request: SettingsUpdateRequest,
    auth: AuthContext = Depends(require_auth),
):
    ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE: backend/services/user_limits.py  [relevance: 0.87]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class UserLimitsService:
    def check_rate_limit(self, user_id: str, endpoint: str) -> bool:
        ...
    def increment_counter(self, user_id: str, endpoint: str) -> None:
        ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE: backend/middleware/auth.py  [relevance: 0.81]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class AuthContext:
    user_id: str
    repo_id: Optional[str]
    ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES (from AGENTS.md — matched to task)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use LimitCheckError, not HTTPException(429), for rate limit violations
- All user-facing routes must use require_auth dependency
- Never bypass RLS on the users table
- Rate limit keys must be scoped per user_id, not per IP
```

**Result:** Claude generated the correct implementation referencing `UserLimitsService` and `LimitCheckError` on the first attempt, with no hallucinated class names or wrong file paths.

---

## Example 2: Semantic Code Search

**Query:**
```
search_code("authentication middleware JWT validation")
```

**Response:**
```json
{
  "results": [
    {
      "file": "backend/middleware/auth.py",
      "function": "_validate_jwt",
      "score": 0.91,
      "snippet": "def _validate_jwt(token: str) -> Optional[AuthContext]:\n    try:\n        payload = jwt.decode(token, SECRET_KEY, algorithms=[\"HS256\"])\n        return AuthContext(user_id=payload[\"sub\"])\n    except AuthenticationError:\n        return None  # allows API key fallback"
    },
    {
      "file": "backend/middleware/auth.py",
      "function": "require_auth",
      "score": 0.88,
      "snippet": "async def require_auth(request: Request) -> AuthContext:\n    ..."
    },
    {
      "file": "backend/routes/repositories.py",
      "function": "add_repository",
      "score": 0.72,
      "snippet": "async def add_repository(..., auth: AuthContext = Depends(require_auth)):\n    ..."
    }
  ],
  "query_time_ms": 187,
  "total_results": 3
}
```

---

## Example 3: Codebase DNA Extraction

**Query:**
```
get_codebase_dna(repo_id="78aa181e-...")
```

**Response (extracted architectural patterns):**
```
CODEBASE DNA — OpenCodeIntel Backend
Extracted: 2025-04-24

AUTH PATTERNS
  Middleware: require_auth (FastAPI Depends)
  Auth decorators: none (uses DI pattern)
  Ownership checks: auth.user_id == repo.owner_id
  Auth context type: AuthContext dataclass

SERVICE PATTERNS
  Singleton services: OptimizedCodeIndexer, DependencyAnalyzer,
                      DNAExtractor, ContextAssembler
  DI file: backend/dependencies.py
  Injection pattern: FastAPI Depends()

DATABASE PATTERNS
  ORM: Supabase (PostgREST client)
  RLS: enabled on all user tables
  ID type: UUID (uuid4)
  Timestamps: created_at / updated_at (timestamptz)

ERROR PATTERNS
  Exception classes: LimitCheckError, RepoNotFoundError,
                     AuthenticationError, ValidationError
  Format: {"error": "message", "code": "ERROR_CODE"}
  Logging on error: yes (structlog)

NAMING CONVENTIONS
  Python: snake_case functions, PascalCase classes
  Files: snake_case
  API routes: /api/v1/{resource}/{id}
  Async: 78% of service methods are async

TYPE HINTS
  Coverage: 94% of function signatures
  Return types: explicit on all public methods
```

---

## Example 4: Impact Analysis

**Query:**
```
analyze_impact(repo_id="78aa181e-...", file_path="backend/middleware/auth.py")
```

**Response:**
```
IMPACT ANALYSIS — backend/middleware/auth.py

Direct dependents (files that import this):
  backend/routes/repositories.py     [CRITICAL]
  backend/routes/search.py           [CRITICAL]
  backend/routes/analysis.py         [CRITICAL]
  backend/routes/settings.py         [CRITICAL]
  backend/routes/indexing.py         [HIGH]
  backend/dependencies.py            [HIGH]

Indirect dependents (2 hops):
  backend/main.py
  mcp-server/handlers.py

Risk assessment: HIGH
  - 6 direct dependents
  - All core API routes depend on this file
  - Auth changes will affect every protected endpoint
  - Recommendation: run full test suite before merging
```

---

## Example 5: Dependency Graph

**Query:**
```
get_dependency_graph(repo_id="78aa181e-...")
```

**Partial response (most connected nodes):**
```
DEPENDENCY GRAPH — OpenCodeIntel Backend

Most imported files (critical nodes):
  backend/middleware/auth.py          ← imported by 8 files
  backend/services/supabase_service.py ← imported by 7 files
  backend/dependencies.py             ← imported by 6 files
  backend/services/observability.py   ← imported by 11 files

Isolated files (no dependents):
  backend/utils/test_detection.py
  backend/migrations/001_initial.sql

Circular dependencies detected: 0
Total edges: 47
Total nodes: 23
```

---

## Performance Benchmarks

Measured on hosted instance (Railway, 1 vCPU, 512MB RAM):

| Operation | p50 | p95 | p99 |
|---|---|---|---|
| `search_code` (top-10) | 210ms | 380ms | 520ms |
| `get_context_for_task` | 340ms | 580ms | 750ms |
| `get_codebase_dna` | 180ms | 310ms | 420ms |
| `get_dependency_graph` | 95ms | 180ms | 240ms |
| `analyze_impact` | 110ms | 200ms | 290ms |
| Full repo indexing (1k files) | 4.2min | — | — |
| Full repo indexing (10k files) | 38min | — | — |

Embedding model: `text-embedding-3-small` (1536 dimensions)
Vector DB: Pinecone Serverless, AWS us-east-1, cosine similarity
Search recall@10 on internal test set: **87.3%**
Context assembly relevance (human-rated, n=50 tasks): **91%**
