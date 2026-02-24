"""Anonymous indexing routes for the playground."""
import time
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Response, BackgroundTasks
from pydantic import BaseModel, field_validator

from dependencies import indexer, redis_client
from services.observability import logger
from services.anonymous_indexer import AnonymousIndexingJob, run_indexing_job
from routes.playground.helpers import (
    ANONYMOUS_FILE_LIMIT,
    get_client_ip, get_session_token, set_session_cookie, get_limiter,
)
from routes.playground.validation import (
    parse_github_url, fetch_repo_metadata, count_code_files,
)

router = APIRouter()


class IndexRepoRequest(BaseModel):
    """Request body for anonymous repository indexing."""
    github_url: str
    branch: Optional[str] = None
    partial: bool = False

    @field_validator("github_url")
    @classmethod
    def validate_github_url_format(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("GitHub URL is required")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        if "github.com" not in v.lower():
            raise ValueError("URL must be a GitHub repository URL")
        return v


@router.post("/index", status_code=202)
async def start_anonymous_indexing(
    request: IndexRepoRequest,
    req: Request,
    response: Response,
    background_tasks: BackgroundTasks,
) -> dict:
    """Start indexing a public GitHub repository for anonymous users."""
    start_time = time.time()
    limiter = get_limiter()

    # Session validation
    session_token = get_session_token(req)
    client_ip = get_client_ip(req)

    if not session_token:
        session_token = limiter._generate_session_token()
        limiter.create_session(session_token)
        set_session_cookie(response, session_token)
        logger.info("Created new session for indexing",
                    session_token=session_token[:8], client_ip=client_ip)

    # Check if session already has an indexed repo
    session_data = limiter.get_session_data(session_token)

    if session_data.indexed_repo:
        expires_at_str = session_data.indexed_repo.get("expires_at", "")
        is_expired = False
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                # Ensure timezone-aware comparison
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                is_expired = datetime.now(timezone.utc) > expires_at
            except (ValueError, AttributeError, TypeError):
                is_expired = True

        if not is_expired:
            logger.info("Session already has indexed repo",
                        session_token=session_token[:8],
                        existing_repo=session_data.indexed_repo.get("repo_id"))
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "already_indexed",
                    "message": "You already have an indexed repository. Only 1 repo per session allowed.",
                    "indexed_repo": session_data.indexed_repo,
                }
            )
        else:
            logger.info("Existing indexed repo expired, allowing new indexing",
                        session_token=session_token[:8])

    # Validate GitHub URL
    owner, repo_name, parse_error = parse_github_url(request.github_url)
    if parse_error:
        raise HTTPException(status_code=400, detail={
            "error": "validation_failed", "reason": "invalid_url", "message": parse_error
        })

    metadata = await fetch_repo_metadata(owner, repo_name)
    if "error" in metadata:
        error_type = metadata["error"]
        if error_type == "not_found":
            raise HTTPException(status_code=400, detail={
                "error": "validation_failed", "reason": "not_found",
                "message": "Repository not found. Check the URL or ensure it's public."
            })
        elif error_type == "rate_limited":
            raise HTTPException(status_code=429, detail={
                "error": "github_rate_limit", "message": "GitHub API rate limit exceeded. Try again later."
            })
        else:
            raise HTTPException(status_code=502, detail={
                "error": "github_error", "message": metadata.get("message", "Failed to fetch repository info")
            })

    if metadata.get("private", False):
        raise HTTPException(status_code=400, detail={
            "error": "validation_failed", "reason": "private",
            "message": "This repository is private. Anonymous indexing only supports public repositories."
        })

    branch = request.branch or metadata.get("default_branch", "main")
    file_count, count_error = await count_code_files(owner, repo_name, branch)

    if count_error == "truncated":
        repo_size_kb = metadata.get("size", 0)
        file_count = max(repo_size_kb // 3, ANONYMOUS_FILE_LIMIT + 1)
    elif count_error:
        repo_size_kb = metadata.get("size", 0)
        file_count = max(repo_size_kb // 3, 1)

    is_partial = False
    files_to_index = file_count

    if file_count > ANONYMOUS_FILE_LIMIT:
        if request.partial:
            is_partial = True
            files_to_index = ANONYMOUS_FILE_LIMIT
            logger.info("Partial indexing enabled", total_files=file_count, indexing=files_to_index)
        else:
            raise HTTPException(status_code=400, detail={
                "error": "validation_failed", "reason": "too_large",
                "message": f"Repository has {file_count:,} code files. "
                           f"Anonymous limit is {ANONYMOUS_FILE_LIMIT}. "
                           f"Use partial=true to index first {ANONYMOUS_FILE_LIMIT} files.",
                "file_count": file_count, "limit": ANONYMOUS_FILE_LIMIT,
                "hint": "Set partial=true to index a subset of files",
            })

    # Create job and start background indexing
    response_time_ms = int((time.time() - start_time) * 1000)
    if not redis_client:
        raise HTTPException(status_code=503, detail="Indexing service unavailable (Redis down)")
    job_manager = AnonymousIndexingJob(redis_client)
    job_id = job_manager.generate_job_id()

    job_manager.create_job(
        job_id=job_id, session_id=session_token, github_url=request.github_url,
        owner=owner, repo_name=repo_name, branch=branch,
        file_count=file_count, is_partial=is_partial, max_files=files_to_index,
    )

    background_tasks.add_task(
        run_indexing_job,
        job_manager=job_manager, indexer=indexer, limiter=limiter,
        job_id=job_id, session_id=session_token, github_url=request.github_url,
        owner=owner, repo_name=repo_name, branch=branch,
        file_count=files_to_index, max_files=files_to_index if is_partial else None,
    )

    logger.info("Indexing job queued", job_id=job_id, owner=owner, repo=repo_name,
                branch=branch, file_count=files_to_index, is_partial=is_partial,
                session_token=session_token[:8], response_time_ms=response_time_ms)

    estimated_seconds = max(10, int(files_to_index * 0.3))
    result = {
        "job_id": job_id, "status": "queued",
        "estimated_time_seconds": estimated_seconds, "file_count": files_to_index,
        "message": f"Indexing started. Poll /playground/index/{job_id} for status.",
    }

    if is_partial:
        result["partial"] = True
        result["total_files"] = file_count
        result["message"] = (
            f"Partial indexing started ({files_to_index} of {file_count} files). "
            f"Poll /playground/index/{job_id} for status."
        )

    return result


@router.get("/index/{job_id}")
async def get_indexing_status(job_id: str, req: Request) -> dict:
    """Check the status of an anonymous indexing job."""
    if not job_id or not job_id.startswith("idx_"):
        raise HTTPException(status_code=400, detail={
            "error": "invalid_job_id", "message": "Invalid job ID format"
        })

    if not redis_client:
        raise HTTPException(status_code=503, detail="Indexing service unavailable (Redis down)")
    job_manager = AnonymousIndexingJob(redis_client)
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail={
            "error": "job_not_found", "message": "Job not found or has expired. Jobs expire after 1 hour."
        })

    status = job.get("status", "unknown")
    result = {
        "job_id": job_id, "status": status,
        "created_at": job.get("created_at"), "updated_at": job.get("updated_at"),
        "repository": {
            "owner": job.get("owner"), "name": job.get("repo_name"),
            "branch": job.get("branch"), "github_url": job.get("github_url"),
        },
    }

    if job.get("is_partial"):
        result["partial"] = True
        result["max_files"] = job.get("max_files")

    if status == "queued":
        result["message"] = "Job is queued for processing"
    elif status == "cloning":
        result["message"] = "Cloning repository..."
    elif status == "processing":
        result["message"] = "Indexing files..."
        if job.get("progress"):
            progress = job["progress"]
            files_processed = progress.get("files_processed", 0)
            files_total = progress.get("files_total", 1)
            percent = round((files_processed / files_total) * 100) if files_total > 0 else 0
            result["progress"] = {
                "files_processed": files_processed, "files_total": files_total,
                "functions_found": progress.get("functions_found", 0),
                "percent_complete": percent, "current_file": progress.get("current_file"),
            }
    elif status == "completed":
        result["message"] = "Indexing completed successfully"
        result["repo_id"] = job.get("repo_id")
        if job.get("stats"):
            result["stats"] = job["stats"]
    elif status == "failed":
        result["message"] = job.get("error_message", "Indexing failed")
        result["error"] = job.get("error", "unknown_error")
        result["error_message"] = job.get("error_message")

    return result
