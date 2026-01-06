"""Search V2 API - Function-level semantic search with hybrid ranking."""
import os
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

from dependencies import indexer, cache, metrics, verify_repo_access
from services.input_validator import InputValidator
from middleware.auth import require_auth, AuthContext
from services.observability import (
    logger,
    capture_exception,
    track_time,
    add_breadcrumb,
    set_operation_context
)

router = APIRouter(prefix="/search", tags=["Search V2"])

SEARCH_V2_ENABLED = os.getenv("SEARCH_V2_ENABLED", "true").lower() == "true"


class SearchV2Request(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    repo_id: str
    top_k: int = Field(default=10, ge=1, le=50)
    use_reranking: bool = True


class SearchResultV2(BaseModel):
    name: str
    qualified_name: str
    file_path: str
    code: str
    signature: str
    language: str
    score: float
    line_start: int
    line_end: int
    summary: Optional[str] = None
    class_name: Optional[str] = None
    match_reason: Optional[str] = None


class SearchV2Response(BaseModel):
    results: List[SearchResultV2]
    query: str
    total: int
    cached: bool
    search_version: str = "v2"


@router.post("/v2", response_model=SearchV2Response)
async def search_v2(
    request: SearchV2Request,
    auth: AuthContext = Depends(require_auth)
):
    """Function-level semantic search with hybrid BM25 + vector ranking."""
    set_operation_context(
        "search_v2",
        user_id=auth.user_id,
        repo_id=request.repo_id,
        query_length=len(request.query),
        top_k=request.top_k
    )
    add_breadcrumb("Search V2 request received", category="search_v2", repo_id=request.repo_id)
    
    if not SEARCH_V2_ENABLED:
        logger.warning("Search V2 disabled but request received", user_id=auth.user_id)
        raise HTTPException(status_code=503, detail="Search V2 is not enabled")

    verify_repo_access(request.repo_id, auth.user_id)

    valid_query, query_error = InputValidator.validate_search_query(request.query)
    if not valid_query:
        logger.warning(
            "Invalid search query rejected",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            error=query_error
        )
        raise HTTPException(status_code=400, detail=f"Invalid query: {query_error}")

    sanitized_query = InputValidator.sanitize_string(request.query, max_length=500)
    start_time = time.time()

    try:
        cache_key = f"v2:{sanitized_query}:{request.repo_id}:{request.top_k}"
        
        with track_time("search_v2_cache_check", repo_id=request.repo_id):
            cached = cache.get_search_results(cache_key, request.repo_id)
        
        if cached:
            duration = time.time() - start_time
            metrics.record_search(duration, cached=True)
            logger.info(
                "Search V2 completed (cache hit)",
                user_id=auth.user_id,
                repo_id=request.repo_id,
                result_count=len(cached),
                duration_ms=round(duration * 1000, 2)
            )
            return SearchV2Response(
                results=cached,
                query=sanitized_query,
                total=len(cached),
                cached=True,
            )

        with track_time("search_v2_execution", repo_id=request.repo_id, use_reranking=request.use_reranking):
            results = await indexer.search_v2(
                query=sanitized_query,
                repo_id=request.repo_id,
                top_k=request.top_k,
                use_reranking=request.use_reranking,
            )

        with track_time("search_v2_cache_set", repo_id=request.repo_id):
            cache.set_search_results(cache_key, request.repo_id, results, ttl=3600)
        
        duration = time.time() - start_time
        metrics.record_search(duration, cached=False)
        
        logger.info(
            "Search V2 completed",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            result_count=len(results),
            duration_ms=round(duration * 1000, 2),
            cached=False,
            use_reranking=request.use_reranking
        )

        return SearchV2Response(
            results=results,
            query=sanitized_query,
            total=len(results),
            cached=False,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Search V2 failed",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            error=str(e)
        )
        capture_exception(
            e,
            operation="search_v2",
            repo_id=request.repo_id,
            user_id=auth.user_id
        )
        raise HTTPException(status_code=500, detail=str(e))
