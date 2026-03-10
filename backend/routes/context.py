"""Context assembly endpoint.

Provides per-task context packaging via POST /api/v1/context/assemble.
Uses semantic search + dependency graph + project rules to build a
minimal, precise context package for AI coding assistants.
"""
import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from dependencies import get_repo_or_404, verify_repo_access
from middleware.auth import AuthContext, require_auth
from services.observability import (
    add_breadcrumb,
    capture_exception,
    metrics,
    set_operation_context,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["context"])


class AssembleRequest(BaseModel):
    task: str = Field(..., min_length=3, max_length=1000)
    repo_id: str
    token_budget: int = Field(default=1500, ge=100, le=10000)


@router.post("/context/assemble")
async def assemble_context(
    request: AssembleRequest,
    auth: AuthContext = Depends(require_auth),
):
    """Assemble task-specific context from semantic search + deps + rules.

    Returns a markdown context package sized to fit within token_budget,
    containing only the files, dependencies, and project rules relevant
    to the given task description.
    """
    set_operation_context(
        "context_assemble",
        user_id=auth.user_id,
        repo_id=request.repo_id,
    )
    add_breadcrumb("Context assembly requested", category="context", repo_id=request.repo_id)

    verify_repo_access(request.repo_id, auth.user_id)

    from dependencies import context_assembler

    start = time.time()
    try:
        result = await context_assembler.assemble(
            task=request.task,
            repo_id=request.repo_id,
            user_id=auth.user_id,
            token_budget=request.token_budget,
        )

        elapsed = time.time() - start
        logger.info(
            "Context assembled",
            repo_id=request.repo_id,
            files=result["files_found"],
            tokens=result["tokens_used"],
            budget=request.token_budget,
            duration_ms=round(elapsed * 1000),
        )
        metrics.timing("context_assemble_ms", elapsed * 1000)

        return result

    except HTTPException:
        raise
    except Exception as exc:
        capture_exception(exc, operation="context_assemble", repo_id=request.repo_id)
        logger.error("Context assembly failed: %s", exc)
        raise HTTPException(status_code=500, detail="Context assembly failed")
