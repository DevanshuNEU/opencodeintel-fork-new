"""GitHub repository validation for the playground."""
import os
import time
from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from dependencies import cache
from services.observability import logger
from services.repo_validator import RepoValidator
from routes.playground.helpers import (
    GITHUB_URL_PATTERN, GITHUB_API_BASE, GITHUB_API_TIMEOUT,
    ANONYMOUS_FILE_LIMIT, VALIDATION_CACHE_TTL,
)

router = APIRouter()


class ValidateRepoRequest(BaseModel):
    """Request body for GitHub repo validation."""
    github_url: str

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


def parse_github_url(url: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Parse GitHub URL to extract owner and repo. Returns (owner, repo, error)."""
    match = GITHUB_URL_PATTERN.match(url.strip().rstrip("/"))
    if not match:
        return None, None, "Invalid GitHub URL format. Expected: https://github.com/owner/repo"
    return match.group("owner"), match.group("repo"), None


def _github_headers() -> dict:
    """Build GitHub API request headers with optional auth token."""
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "OpenCodeIntel/1.0"}
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"
    return headers


async def fetch_repo_metadata(owner: str, repo: str) -> dict:
    """Fetch repository metadata from GitHub API."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"

    async with httpx.AsyncClient(timeout=GITHUB_API_TIMEOUT) as client:
        try:
            response = await client.get(url, headers=_github_headers())
            if response.status_code == 404:
                return {"error": "not_found", "message": "Repository not found"}
            if response.status_code == 403:
                return {"error": "rate_limited", "message": "GitHub API rate limit exceeded"}
            if response.status_code != 200:
                return {"error": "api_error", "message": f"GitHub API error: {response.status_code}"}
            return response.json()
        except httpx.TimeoutException:
            return {"error": "timeout", "message": "GitHub API request timed out"}
        except Exception as e:
            logger.error("GitHub API request failed", error=str(e))
            return {"error": "request_failed", "message": "Failed to fetch repository metadata"}


async def count_code_files(
    owner: str, repo: str, default_branch: str
) -> tuple[int, Optional[str]]:
    """Count code files using GitHub tree API. Returns (file_count, error)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"

    async with httpx.AsyncClient(timeout=GITHUB_API_TIMEOUT) as client:
        try:
            response = await client.get(url, headers=_github_headers())
            if response.status_code == 404:
                return 0, "Could not fetch repository tree"
            if response.status_code == 403:
                return 0, "GitHub API rate limit exceeded"
            if response.status_code != 200:
                return 0, f"GitHub API error: {response.status_code}"

            data = response.json()
            if data.get("truncated", False):
                return -1, "truncated"

            code_extensions = RepoValidator.CODE_EXTENSIONS
            skip_dirs = RepoValidator.SKIP_DIRS
            count = 0
            for item in data.get("tree", []):
                if item.get("type") != "blob":
                    continue
                path = item.get("path", "")
                path_parts = path.split("/")
                if any(part in skip_dirs for part in path_parts):
                    continue
                ext = "." + path.rsplit(".", 1)[-1] if "." in path else ""
                if ext.lower() in code_extensions:
                    count += 1
            return count, None
        except httpx.TimeoutException:
            return 0, "GitHub API request timed out"
        except Exception as e:
            logger.error("GitHub tree API failed", error=str(e))
            return 0, "error"


@router.post("/validate-repo")
async def validate_github_repo(request: ValidateRepoRequest) -> dict:
    """Validate a GitHub repository URL for anonymous indexing."""
    start_time = time.time()

    cache_key = f"validate:{request.github_url}"
    cached = cache.get(cache_key) if cache else None
    if cached:
        logger.info("Returning cached validation", url=request.github_url[:50])
        return cached

    owner, repo_name, parse_error = parse_github_url(request.github_url)
    if parse_error:
        return {"valid": False, "reason": "invalid_url", "message": parse_error}

    metadata = await fetch_repo_metadata(owner, repo_name)
    if "error" in metadata:
        error_type = metadata["error"]
        if error_type == "not_found":
            return {"valid": False, "reason": "not_found",
                    "message": "Repository not found. Check the URL or ensure it's public."}
        elif error_type == "rate_limited":
            raise HTTPException(status_code=429, detail={"message": "GitHub API rate limit exceeded. Try again later."})
        else:
            raise HTTPException(
                status_code=502,
                detail={"message": metadata.get("message", "Failed to fetch repository info")},
            )

    if metadata.get("private", False):
        return {
            "valid": True, "repo_name": repo_name, "owner": owner, "is_public": False,
            "can_index": False, "reason": "private",
            "message": "This repository is private. Anonymous indexing only supports public repositories.",
        }

    default_branch = metadata.get("default_branch", "main")
    file_count, count_error = await count_code_files(owner, repo_name, default_branch)

    if count_error == "truncated":
        repo_size_kb = metadata.get("size", 0)
        file_count = max(repo_size_kb // 3, ANONYMOUS_FILE_LIMIT + 1)
        logger.info("Using estimated file count for large repo", owner=owner, repo=repo_name, estimated=file_count)
    elif count_error:
        logger.warning("Could not count files", owner=owner, repo=repo_name, error=count_error)
        repo_size_kb = metadata.get("size", 0)
        file_count = max(repo_size_kb // 3, 1)

    response_time_ms = int((time.time() - start_time) * 1000)
    can_index = file_count <= ANONYMOUS_FILE_LIMIT

    result = {
        "valid": True, "repo_name": repo_name, "owner": owner, "is_public": True,
        "default_branch": default_branch, "file_count": file_count,
        "size_kb": metadata.get("size", 0), "language": metadata.get("language"),
        "stars": metadata.get("stargazers_count", 0), "can_index": can_index,
        "response_time_ms": response_time_ms,
    }

    if not can_index:
        result["reason"] = "too_large"
        result["message"] = f"Repository has {file_count:,} code files. Anonymous limit is {ANONYMOUS_FILE_LIMIT}."
        result["limit"] = ANONYMOUS_FILE_LIMIT
    else:
        result["message"] = "Ready to index"

    if cache:
        cache.set(cache_key, result, ttl=VALIDATION_CACHE_TTL)

    logger.info("Validated GitHub repo", owner=owner, repo=repo_name,
                file_count=file_count, can_index=can_index, response_time_ms=response_time_ms)
    return result
