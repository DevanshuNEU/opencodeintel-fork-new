"""Search and explain routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import time

from dependencies import (
    indexer, cache, metrics,
    get_repo_or_404, verify_repo_access
)
from services.input_validator import InputValidator
from middleware.auth import require_auth, AuthContext
from services.observability import (
    logger,
    capture_exception,
    track_time,
    add_breadcrumb,
    set_operation_context
)

router = APIRouter(prefix="", tags=["Search"])


class SearchRequest(BaseModel):
    query: str
    repo_id: str
    max_results: int = 10


class ExplainRequest(BaseModel):
    repo_id: str
    file_path: str
    function_name: Optional[str] = None


@router.post("/search")
async def search_code(
    request: SearchRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Search code semantically with caching."""
    set_operation_context(
        "search",
        user_id=auth.user_id,
        repo_id=request.repo_id,
        query_length=len(request.query)
    )
    add_breadcrumb("Search request received", category="search", repo_id=request.repo_id)
    
    verify_repo_access(request.repo_id, auth.user_id)
    
    # Validate query
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
        # Check cache
        with track_time("search_cache_check", repo_id=request.repo_id):
            cached_results = cache.get_search_results(sanitized_query, request.repo_id)
        
        if cached_results:
            duration = time.time() - start_time
            metrics.record_search(duration, cached=True)
            logger.info(
                "Search completed (cache hit)",
                user_id=auth.user_id,
                repo_id=request.repo_id,
                result_count=len(cached_results),
                duration_ms=round(duration * 1000, 2)
            )
            return {"results": cached_results, "count": len(cached_results), "cached": True}
        
        # Search
        with track_time("semantic_search", repo_id=request.repo_id):
            results = await indexer.semantic_search(
                query=sanitized_query,
                repo_id=request.repo_id,
                max_results=min(request.max_results, 50),
                use_query_expansion=True,
                use_reranking=True
            )
        
        # Cache results
        with track_time("search_cache_set", repo_id=request.repo_id):
            cache.set_search_results(sanitized_query, request.repo_id, results, ttl=3600)
        
        duration = time.time() - start_time
        metrics.record_search(duration, cached=False)
        
        logger.info(
            "Search completed",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            result_count=len(results),
            duration_ms=round(duration * 1000, 2),
            cached=False
        )
        
        return {"results": results, "count": len(results), "cached": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Search failed",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            error=str(e)
        )
        capture_exception(e, operation="search", repo_id=request.repo_id, user_id=auth.user_id)
        raise HTTPException(status_code=500, detail="Search failed")


@router.post("/explain")
async def explain_code(
    request: ExplainRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Generate code explanation."""
    set_operation_context(
        "explain",
        user_id=auth.user_id,
        repo_id=request.repo_id,
        file_path=request.file_path
    )
    add_breadcrumb("Explain request received", category="explain", file_path=request.file_path)
    
    try:
        get_repo_or_404(request.repo_id, auth.user_id)
        
        logger.info(
            "Generating code explanation",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            file_path=request.file_path,
            function_name=request.function_name
        )
        
        with track_time("explain_code", repo_id=request.repo_id, file_path=request.file_path):
            explanation = await indexer.explain_code(
                repo_id=request.repo_id,
                file_path=request.file_path,
                function_name=request.function_name
            )
        
        logger.info(
            "Code explanation generated",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            file_path=request.file_path
        )
        
        return {"explanation": explanation}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Explain failed",
            user_id=auth.user_id,
            repo_id=request.repo_id,
            file_path=request.file_path,
            error=str(e)
        )
        capture_exception(
            e,
            operation="explain",
            repo_id=request.repo_id,
            user_id=auth.user_id,
            file_path=request.file_path
        )
        raise HTTPException(status_code=500, detail="Failed to generate explanation")
