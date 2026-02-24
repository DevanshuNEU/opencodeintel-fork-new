"""Search route for the playground -- rate-limited, no auth required."""
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from dependencies import indexer, cache, repo_manager
from services.input_validator import InputValidator
from services.observability import logger, capture_exception
from services.playground_limiter import PlaygroundLimiter, IndexedRepoData
from routes.playground.helpers import (
    DEMO_REPO_IDS,
    get_client_ip, get_session_token, set_session_cookie, get_limiter,
)

router = APIRouter()


class PlaygroundSearchRequest(BaseModel):
    query: str
    demo_repo: Optional[str] = None
    repo_id: Optional[str] = None
    max_results: int = 10
    use_v3: bool = True
    include_tests: bool = False


def _resolve_repo_id(
    request: PlaygroundSearchRequest,
    limiter: PlaygroundLimiter,
    limit_result,
    req: Request,
) -> str:
    """
    Resolve which repository to search.
    Priority: repo_id > demo_repo > default "flask"
    """
    if request.repo_id:
        repo_id = request.repo_id
        if repo_id in DEMO_REPO_IDS.values():
            logger.debug("Search on demo repo via repo_id", repo_id=repo_id[:16])
            return repo_id
        return _validate_user_repo_access(repo_id, limiter, limit_result, req)

    demo_name = request.demo_repo or "flask"
    repo_id = DEMO_REPO_IDS.get(demo_name)

    if repo_id:
        logger.debug("Search on demo repo", demo_name=demo_name)
        return repo_id

    repos = repo_manager.list_repos()
    indexed_repos = [r for r in repos if r.get("status") == "indexed"]

    if indexed_repos:
        fallback_id = indexed_repos[0]["id"]
        logger.debug("Using fallback indexed repo", repo_id=fallback_id[:16])
        return fallback_id

    logger.warning("No demo repo available", requested=demo_name)
    raise HTTPException(status_code=404, detail=f"Demo repo '{demo_name}' not available")


def _validate_user_repo_access(
    repo_id: str,
    limiter: PlaygroundLimiter,
    limit_result,
    req: Request,
) -> str:
    """Validate that the session owns the requested user-indexed repo."""
    session_token = limit_result.session_token or get_session_token(req)
    token_preview = session_token[:8] if session_token else "none"

    if not session_token:
        logger.warning("Search denied - no session token", repo_id=repo_id[:16])
        raise HTTPException(
            status_code=403,
            detail={"error": "access_denied", "message": "You don't have access to this repository"}
        )

    session_data = limiter.get_session_data(session_token)
    indexed_repo = session_data.indexed_repo
    session_repo_id = indexed_repo.get("repo_id") if indexed_repo else None

    if not indexed_repo or session_repo_id != repo_id:
        logger.warning("Search denied - repo not owned by session",
                        requested_repo_id=repo_id[:16],
                        session_repo_id=session_repo_id[:16] if session_repo_id else "none",
                        session_token=token_preview)
        raise HTTPException(
            status_code=403,
            detail={"error": "access_denied", "message": "You don't have access to this repository"}
        )

    repo_data = IndexedRepoData.from_dict(indexed_repo)
    if repo_data.is_expired():
        logger.warning("Search denied - repo expired", repo_id=repo_id[:16],
                        expired_at=indexed_repo.get("expires_at"), session_token=token_preview)
        raise HTTPException(
            status_code=410,
            detail={"error": "repo_expired", "message": "Repository index expired. Re-index to continue searching.", "can_reindex": True}
        )

    logger.info("Search on user-indexed repo", repo_id=repo_id[:16],
                repo_name=indexed_repo.get("name"), session_token=token_preview)
    return repo_id


@router.post("/search")
async def playground_search(
    request: PlaygroundSearchRequest,
    req: Request,
    response: Response,
) -> dict:
    """Public playground search - rate limited by session/IP."""
    session_token = get_session_token(req)
    client_ip = get_client_ip(req)

    limiter = get_limiter()
    limit_result = limiter.check_and_record(session_token, client_ip)

    if not limit_result.allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "message": limit_result.reason,
                "remaining": 0,
                "limit": limit_result.limit,
                "resets_at": limit_result.resets_at.isoformat(),
            }
        )

    if limit_result.session_token:
        set_session_cookie(response, limit_result.session_token)

    valid_query, query_error = InputValidator.validate_search_query(request.query)
    if not valid_query:
        raise HTTPException(status_code=400, detail=f"Invalid query: {query_error}")

    repo_id = _resolve_repo_id(request, limiter, limit_result, req)
    start_time = time.time()

    try:
        sanitized_query = InputValidator.sanitize_string(request.query, max_length=200)
        cache_key = f"{sanitized_query}:v3={request.use_v3}:tests={request.include_tests}"

        cached_results = cache.get_search_results(cache_key, repo_id)
        if cached_results is not None:
            return {
                "results": cached_results, "count": len(cached_results),
                "cached": True, "remaining_searches": limit_result.remaining,
                "limit": limit_result.limit,
            }

        if request.use_v3:
            search_results = await indexer.search_v3(
                query=sanitized_query, repo_id=repo_id,
                top_k=min(request.max_results, 10),
                include_tests=request.include_tests, use_reranking=True,
            )
        else:
            search_results = await indexer.search_v2(
                query=sanitized_query, repo_id=repo_id,
                top_k=min(request.max_results, 10), use_reranking=True,
            )

        results = []
        for r in search_results:
            results.append({
                "name": r.get("name", ""),
                "qualified_name": r.get("qualified_name", r.get("name", "")),
                "file_path": r.get("file_path", ""),
                "code": r.get("code", ""),
                "signature": r.get("signature", ""),
                "language": r.get("language", ""),
                "score": r.get("score", 0),
                "line_start": r.get("line_start", 0),
                "line_end": r.get("line_end", 0),
                "type": "function",
                "summary": r.get("summary"),
                "class_name": r.get("class_name"),
                "is_test_file": r.get("is_test_file", False),
            })

        cache.set_search_results(cache_key, repo_id, results, ttl=3600)
        search_time = int((time.time() - start_time) * 1000)

        return {
            "results": results, "count": len(results), "cached": False,
            "remaining_searches": limit_result.remaining, "limit": limit_result.limit,
            "search_time_ms": search_time,
            "search_version": "v3" if request.use_v3 else "v2",
        }
    except HTTPException:
        raise
    except Exception as e:
        capture_exception(e, operation="playground_search")
        logger.error("Playground search failed", error=str(e))
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/repos")
async def list_playground_repos() -> dict:
    """List available demo repositories."""
    return {
        "repos": [
            {"id": "flask", "name": "Flask", "description": "Python web framework", "available": "flask" in DEMO_REPO_IDS},
            {"id": "fastapi", "name": "FastAPI", "description": "Modern Python API", "available": "fastapi" in DEMO_REPO_IDS},
            {"id": "express", "name": "Express", "description": "Node.js framework", "available": "express" in DEMO_REPO_IDS},
        ]
    }


@router.get("/stats")
async def get_playground_stats() -> dict:
    """Get playground usage stats (for monitoring/debugging)."""
    limiter = get_limiter()
    return limiter.get_usage_stats()
