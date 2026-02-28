"""Repository management routes - CRUD and indexing."""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, BackgroundTasks
from pydantic import BaseModel, field_validator
from typing import List, Optional
from pathlib import Path
import hashlib
import os
import re
import time
import asyncio
import git
import httpx

from dependencies import (
    indexer, repo_manager, metrics, redis_client,
    get_repo_or_404, user_limits, repo_validator
)
from services.input_validator import InputValidator
from services.indexing_events import get_event_publisher, IndexingStats
from middleware.auth import require_auth, AuthContext
from services.observability import logger, capture_exception

router = APIRouter(prefix="/repos", tags=["Repositories"])


class AddRepoRequest(BaseModel):
    name: str
    git_url: str
    branch: str = "main"


@router.get("")
async def list_repositories(auth: AuthContext = Depends(require_auth)):
    """List all repositories for authenticated user."""
    if not auth.user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    repos = repo_manager.list_repos_for_user(auth.user_id)
    return {"repositories": repos}


@router.post("")
async def add_repository(
    request: AddRepoRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Add a new repository with validation and tier-based limits."""
    user_id = auth.user_id or auth.identifier
    
    # Validate user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # Validate inputs
    valid_name, name_error = InputValidator.validate_repo_name(request.name)
    if not valid_name:
        raise HTTPException(status_code=400, detail=f"Invalid repository name: {name_error}")
    
    valid_url, url_error = InputValidator.validate_git_url(request.git_url)
    if not valid_url:
        raise HTTPException(status_code=400, detail=f"Invalid Git URL: {url_error}")
    
    # Check repo count limit (tier-aware) - #95
    repo_count_check = user_limits.check_repo_count(user_id)
    if not repo_count_check.allowed:
        raise HTTPException(
            status_code=403,
            detail=repo_count_check.to_dict()
        )
    
    try:
        # Clone repo first
        user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()
        repo = repo_manager.add_repo(
            name=request.name,
            git_url=request.git_url,
            branch=request.branch,
            user_id=user_id,
            api_key_hash=user_id_hash
        )
        
        # Analyze repo size - #94
        analysis = repo_validator.analyze_repo(repo["local_path"])
        
        # Fail CLOSED if analysis failed (security: don't allow unknown-size repos)
        if not analysis.success:
            logger.error(
                "Repo analysis failed - removing repo",
                user_id=user_id,
                repo_id=repo["id"],
                error=analysis.error
            )
            # Clean up: delete the repo we just created
            try:
                repo_manager.delete_repo(repo["id"])
            except Exception as del_err:
                logger.warning("Failed to cleanup failed analysis repo", error=str(del_err))
            
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "ANALYSIS_FAILED",
                    "message": f"Repository analysis failed: {analysis.error}"
                }
            )
        
        # Check repo size against tier limits
        size_check = user_limits.check_repo_size(
            user_id,
            analysis.file_count,
            analysis.estimated_functions
        )
        
        if not size_check.allowed:
            # Repo too large - delete the entry and return error
            logger.info(
                "Repo too large for user tier - removing",
                user_id=user_id,
                repo_id=repo["id"],
                file_count=analysis.file_count,
                estimated_functions=analysis.estimated_functions,
                tier=size_check.tier
            )
            # Clean up: delete the repo we just created
            try:
                repo_manager.delete_repo(repo["id"])
            except Exception as del_err:
                logger.warning("Failed to cleanup rejected repo", error=str(del_err))
            
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "REPO_TOO_LARGE",
                    "analysis": analysis.to_dict(),
                    "limit_check": size_check.to_dict(),
                    "message": size_check.message
                }
            )
        
        return {
            "repo_id": repo["id"],
            "status": "added",
            "indexing_blocked": False,
            "analysis": analysis.to_dict(),
            "message": "Repository added successfully. Ready for indexing."
        }
    except HTTPException:
        raise  # Re-raise HTTPExceptions (like REPO_TOO_LARGE) as-is
    except Exception as e:
        logger.error("Failed to add repository", error=str(e), user_id=user_id)
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to add repository")


# -- GitHub API helpers for pre-clone analysis --------------------------------

_GITHUB_API_BASE = "https://api.github.com"
_GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[a-zA-Z0-9_.\-]+)/(?P<repo>[a-zA-Z0-9_.\-]+)/?$"
)


def _github_headers() -> dict:
    """Build GitHub API request headers with optional auth token."""
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "OpenCodeIntel/1.0"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


async def _fetch_directory_tree(
    owner: str, repo: str, branch: str,
    client: Optional[httpx.AsyncClient] = None,
) -> dict:
    """Fetch directory structure from GitHub Tree API.

    Returns a dict with directories (name, path, file_count) grouped
    at the most useful level -- top-level for flat repos, package-level
    for monorepos with a packages/ directory.

    Args:
        client: Reuse an existing httpx client to avoid opening a second
            connection. If None, creates and closes its own.
    """
    from services.repo_validator import RepoValidator

    url = f"{_GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"

    async def _get(c: httpx.AsyncClient) -> httpx.Response:
        return await c.get(url, headers=_github_headers())

    if client:
        response = await _get(client)
    else:
        async with httpx.AsyncClient(timeout=15.0) as c:
            response = await _get(c)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Repository or branch not found")
    if response.status_code == 403:
        raise HTTPException(status_code=429, detail="GitHub API rate limit exceeded")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {response.status_code}")

    data = response.json()
    truncated = data.get("truncated", False)

    code_extensions = RepoValidator.CODE_EXTENSIONS
    skip_dirs = RepoValidator.SKIP_DIRS

    # Count code files per top-level directory
    dir_counts: dict[str, int] = {}
    total_files = 0

    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        parts = path.split("/")
        if any(part in skip_dirs for part in parts):
            continue
        ext = "." + path.rsplit(".", 1)[-1] if "." in path else ""
        if ext.lower() not in code_extensions:
            continue

        total_files += 1

        # Group by top-level dir, or "(root)" for root-level files
        if len(parts) == 1:
            dir_counts["(root)"] = dir_counts.get("(root)", 0) + 1
        else:
            top = parts[0]
            # For monorepos: if top is packages/libs/apps, group one level deeper
            if top in ("packages", "libs", "apps", "modules", "crates") and len(parts) >= 3:
                key = f"{parts[0]}/{parts[1]}"
            else:
                key = top
            dir_counts[key] = dir_counts.get(key, 0) + 1

    # Indexing is function-level, not file-level. Estimate function counts
    # using the same multiplier the tier system uses for limit checks.
    avg_fn = RepoValidator.AVG_FUNCTIONS_PER_FILE  # 25

    # Build sorted directory list with estimated function counts
    directories = sorted(
        [
            {
                "name": d, "path": d,
                "file_count": c,
                "estimated_functions": c * avg_fn,
            }
            for d, c in dir_counts.items() if d != "(root)"
        ],
        key=lambda x: -x["file_count"],
    )

    root_files = dir_counts.get("(root)", 0)
    if root_files > 0:
        directories.append({
            "name": "(root files)", "path": ".",
            "file_count": root_files,
            "estimated_functions": root_files * avg_fn,
        })

    total_estimated = total_files * avg_fn

    # Suggest directory picker for large repos
    suggestion = None
    if total_files > 500 or len(directories) > 10:
        suggestion = "large_repo"

    return {
        "directories": directories,
        "total_files": total_files,
        "total_estimated_functions": total_estimated,
        "total_directories": len(directories),
        "truncated": truncated,
        "suggestion": suggestion,
    }


class AnalyzeRepoRequest(BaseModel):
    """Request body for pre-clone repo analysis."""
    github_url: str

    @field_validator("github_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not v:
            raise ValueError("GitHub URL is required")
        if "github.com" not in v.lower():
            raise ValueError("Only GitHub URLs are supported")
        return v


_ANALYZE_CACHE_TTL = 86400  # 24 hours -- directory structure rarely changes


@router.post("/analyze")
async def analyze_repository(request: AnalyzeRepoRequest) -> dict:
    """Analyze a GitHub repo's directory structure WITHOUT cloning.

    Returns directory tree with file counts so the user can select
    which directories to index (monorepo subset selection).

    Results are cached for 5 minutes to avoid redundant GitHub API calls.
    """
    match = _GITHUB_URL_RE.match(request.github_url)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Expected: https://github.com/owner/repo",
        )

    owner = match.group("owner")
    repo_name = match.group("repo").removesuffix(".git")

    # Check cache first (same pattern as validate-repo)
    from dependencies import cache
    cache_key = f"analyze:{owner}/{repo_name}"
    cached = cache.get(cache_key) if cache else None
    if cached:
        logger.info("Returning cached analysis", owner=owner, repo=repo_name)
        return cached

    # Single httpx client for both GitHub API calls
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch repo metadata for default branch and size
        meta_resp = await client.get(
            f"{_GITHUB_API_BASE}/repos/{owner}/{repo_name}",
            headers=_github_headers(),
        )

        if meta_resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Repository not found")
        if meta_resp.status_code == 403:
            raise HTTPException(status_code=429, detail="GitHub API rate limit exceeded")
        if meta_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch repository metadata")

        metadata = meta_resp.json()
        default_branch = metadata.get("default_branch", "main")

        # 2. Fetch directory tree (reuse same client)
        tree_data = await _fetch_directory_tree(owner, repo_name, default_branch, client=client)

    logger.info(
        "Analyzed repo structure",
        owner=owner, repo=repo_name,
        total_files=tree_data["total_files"],
        dirs=tree_data["total_directories"],
        suggestion=tree_data.get("suggestion"),
    )

    result = {
        "owner": owner,
        "repo": repo_name,
        "default_branch": default_branch,
        "size_kb": metadata.get("size", 0),
        "stars": metadata.get("stargazers_count", 0),
        "language": metadata.get("language"),
        **tree_data,
    }

    # Cache for 5 minutes
    if cache:
        cache.set(cache_key, result, ttl=_ANALYZE_CACHE_TTL)

    return result


@router.delete("/{repo_id}")
async def delete_repository(
    repo_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Delete a repository and all its indexed data."""
    user_id = auth.user_id
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    # Verify ownership (raises 404 if not found)
    get_repo_or_404(repo_id, user_id)
    
    try:
        success = repo_manager.delete_repo(repo_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete repository")
        
        logger.info("Repository deleted", repo_id=repo_id, user_id=user_id)
        return {"message": "Repository deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete repository", repo_id=repo_id, error=str(e))
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to delete repository")


def _scan_directories(local_path: Path) -> List[dict]:
    """Scan top-level directories and count code files in each.

    Runs synchronously -- call via asyncio.to_thread() from async handlers
    to avoid blocking the event loop on large repos.
    """
    skip = {"node_modules", ".git", "__pycache__", "venv", ".next", "dist", "build"}
    extensions = {".py", ".js", ".jsx", ".ts", ".tsx"}
    dirs = []
    for item in sorted(local_path.iterdir()):
        if item.is_dir() and item.name not in skip and not item.name.startswith("."):
            file_count = sum(
                1 for f in item.rglob("*")
                if f.is_file() and f.suffix in extensions
                and not any(s in f.parts for s in skip)
            )
            dirs.append({
                "name": item.name,
                "path": str(item.relative_to(local_path)),
                "file_count": file_count,
            })
    return dirs


@router.get("/{repo_id}/directories")
async def get_repo_directories(
    repo_id: str,
    auth: AuthContext = Depends(require_auth),
) -> dict:
    """Return the top-level directory tree of a cloned repo.

    Used for monorepo subset selection -- lets the user pick which
    directories to index instead of the entire repo.
    """
    repo = get_repo_or_404(repo_id, auth.user_id)
    local_path = Path(repo["local_path"])

    if not local_path.exists():
        raise HTTPException(status_code=404, detail="Repo not cloned yet")

    dirs = await asyncio.to_thread(_scan_directories, local_path)

    return {
        "repo_id": repo_id,
        "repo_name": repo.get("name", local_path.name),
        "directories": dirs,
        "total_directories": len(dirs),
    }


@router.post("/{repo_id}/index")
async def index_repository(
    repo_id: str,
    incremental: bool = True,
    auth: AuthContext = Depends(require_auth)
):
    """Trigger indexing for a repository with tier-based size limits."""
    start_time = time.time()
    user_id = auth.user_id
    
    # Validate user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        repo = get_repo_or_404(repo_id, user_id)
        
        # Re-check size limits before indexing (in case tier changed or repo updated)
        analysis = repo_validator.analyze_repo(repo["local_path"])
        
        # Fail CLOSED if analysis failed
        if not analysis.success:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "ANALYSIS_FAILED",
                    "analysis": analysis.to_dict(),
                    "message": f"Cannot index: {analysis.error}"
                }
            )
        
        size_check = user_limits.check_repo_size(
            user_id,
            analysis.file_count,
            analysis.estimated_functions
        )
        
        if not size_check.allowed:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "REPO_TOO_LARGE",
                    "analysis": analysis.to_dict(),
                    "limit_check": size_check.to_dict(),
                    "message": size_check.message
                }
            )
        
        repo_manager.update_status(repo_id, "indexing")
        
        # Check for incremental
        last_commit = repo_manager.get_last_indexed_commit(repo_id)
        
        if incremental and last_commit:
            logger.info("Using INCREMENTAL indexing", repo_id=repo_id, last_commit=last_commit[:8])
            total_functions = await indexer.incremental_index_repository(
                repo_id,
                repo["local_path"],
                last_commit
            )
            index_type = "incremental"
        else:
            logger.info("Using FULL indexing", repo_id=repo_id)
            total_functions = await indexer.index_repository(repo_id, repo["local_path"])
            index_type = "full"
        
        # Update metadata
        git_repo = git.Repo(repo["local_path"])
        current_commit = git_repo.head.commit.hexsha
        
        repo_manager.update_status(repo_id, "indexed")
        repo_manager.update_file_count(repo_id, total_functions)
        repo_manager.update_last_commit(repo_id, current_commit)
        
        duration = time.time() - start_time
        metrics.record_indexing(repo_id, duration, total_functions)
        
        return {
            "status": "indexed",
            "repo_id": repo_id,
            "functions": total_functions,
            "duration": f"{duration:.2f}s",
            "index_type": index_type,
            "commit": current_commit[:8]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Indexing failed", repo_id=repo_id, error=str(e))
        capture_exception(e)
        repo_manager.update_status(repo_id, "error")
        raise HTTPException(status_code=500, detail="Indexing failed")


async def _run_async_indexing(
    repo_id: str,
    repo: dict,
    user_id: str,
    incremental: bool = True,
    include_paths: Optional[List[str]] = None,
):
    """
    Background task for async indexing with real-time progress.
    
    Publishes events to Redis pub/sub for WebSocket clients.
    """
    start_time = time.time()
    publisher = get_event_publisher(redis_client)
    
    try:
        # Wait for WebSocket client to connect and subscribe
        # Redis pub/sub doesn't buffer - events sent before subscription are lost
        # TODO: Consider Redis Streams or initial state fetch to avoid timing dependency
        await asyncio.sleep(1.5)
        
        repo_manager.update_status(repo_id, "indexing")
        
        # Publish initial progress to confirm connection
        if publisher:
            publisher.publish_progress(repo_id, 0, 1, 0, "Starting...")
        
        # Check for incremental
        # Skip incremental when include_paths is set -- incremental_index_repository
        # uses git diff which doesn't understand subset boundaries
        last_commit = repo_manager.get_last_indexed_commit(repo_id)
        can_incremental = incremental and last_commit and not include_paths
        
        if can_incremental:
            logger.info("Async INCREMENTAL indexing", repo_id=repo_id, last_commit=last_commit[:8])
            total_functions = await indexer.incremental_index_repository(
                repo_id,
                repo["local_path"],
                last_commit
            )
            index_type = "incremental"
            # For incremental, get file count from repo or analyze
            total_files = repo.get("file_count", 0)
            if not total_files:
                analysis = repo_validator.analyze_repo(repo["local_path"])
                total_files = analysis.file_count if analysis and analysis.success else 0
        else:
            logger.info("Async FULL indexing with progress", repo_id=repo_id)
            
            # Track total_files from progress callback
            tracked_total_files = 0
            
            # Progress callback that publishes to Redis
            async def progress_callback(
                files_processed: int,
                functions_found: int,
                total_files: int,
                current_file: str = None,
                functions_total: int = 0
            ):
                nonlocal tracked_total_files
                tracked_total_files = total_files
                if publisher:
                    logger.info(
                        "Publishing progress event",
                        repo_id=repo_id,
                        files=f"{files_processed}/{total_files}",
                        functions=f"{functions_found}/{functions_total}" if functions_total else str(functions_found),
                        file=current_file
                    )
                    publisher.publish_progress(
                        repo_id,
                        files_processed,
                        total_files,
                        functions_found,
                        current_file,
                        functions_total
                    )
            
            total_functions = await indexer.index_repository_with_progress(
                repo_id,
                repo["local_path"],
                progress_callback,
                include_paths=include_paths,
            )
            total_files = tracked_total_files
            index_type = "full"
        
        # Update metadata
        git_repo = git.Repo(repo["local_path"])
        current_commit = git_repo.head.commit.hexsha
        
        repo_manager.update_status(repo_id, "indexed")
        repo_manager.update_file_count(repo_id, total_files)
        repo_manager.update_last_commit(repo_id, current_commit)
        
        duration = time.time() - start_time
        metrics.record_indexing(repo_id, duration, total_functions)
        
        # Publish completion event
        if publisher:
            publisher.publish_completed(
                repo_id,
                repo_id,
                IndexingStats(
                    files_processed=total_files,
                    functions_indexed=total_functions,
                    indexing_time_seconds=duration
                )
            )
        
        logger.info(
            "Async indexing complete",
            repo_id=repo_id,
            functions=total_functions,
            duration=f"{duration:.2f}s",
            index_type=index_type
        )
        
    except Exception as e:
        logger.error("Async indexing failed", repo_id=repo_id, error=str(e))
        capture_exception(e)
        repo_manager.update_status(repo_id, "error")
        
        # Publish error event
        if publisher:
            publisher.publish_error(
                repo_id,
                error="indexing_failed",
                message="An error occurred during indexing",
                recoverable=True
            )


class IndexConfig(BaseModel):
    """Optional config for indexing -- supports monorepo subset selection."""
    include_paths: Optional[List[str]] = None  # e.g. ["packages/effect", "packages/schema"]
    incremental: bool = True

    @field_validator("include_paths", mode="before")
    @classmethod
    def sanitize_paths(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Reject path traversal, empty strings, and normalize slashes."""
        if v is None:
            return v
        cleaned = []
        for item in v:
            if not isinstance(item, str):
                raise ValueError(f"include_paths entries must be strings, got {type(item).__name__}")
            item = item.replace("\\", "/").strip().strip("/")
            if not item:
                raise ValueError("include_paths entries must not be empty")
            if ".." in item.split("/"):
                raise ValueError(f"Path traversal not allowed: {item}")
            cleaned.append(item)
        return cleaned


@router.post("/{repo_id}/index/async", status_code=202)
async def index_repository_async(
    repo_id: str,
    background_tasks: BackgroundTasks,
    config: IndexConfig = IndexConfig(),
    auth: AuthContext = Depends(require_auth)
):
    """
    Trigger async indexing for a repository.
    
    Returns immediately with status 202. Connect to WebSocket at
    /api/v1/ws/repos/{repo_id}/indexing to receive real-time progress updates.
    """
    user_id = auth.user_id
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        repo = get_repo_or_404(repo_id, user_id)
        
        # Re-check size limits
        analysis = repo_validator.analyze_repo(repo["local_path"])
        
        if not analysis.success:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "ANALYSIS_FAILED",
                    "message": f"Cannot index: {analysis.error}"
                }
            )
        
        size_check = user_limits.check_repo_size(
            user_id,
            analysis.file_count,
            analysis.estimated_functions
        )
        
        if not size_check.allowed:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "REPO_TOO_LARGE",
                    "limit_check": size_check.to_dict(),
                    "message": size_check.message
                }
            )
        
        # Atomic check-and-set: only set 'indexing' if not already indexing
        # This prevents TOCTOU race where two requests both see status != 'indexing'
        if not repo_manager.try_set_indexing(repo_id):
            raise HTTPException(
                status_code=409,
                detail="Repository is already being indexed"
            )
        
        # Schedule background task
        background_tasks.add_task(
            _run_async_indexing,
            repo_id,
            repo,
            user_id,
            incremental=config.incremental,
            include_paths=config.include_paths,
        )
        
        return {
            "status": "indexing",
            "repo_id": repo_id,
            "message": "Indexing started. Connect to WebSocket for progress.",
            "websocket_url": f"/api/v1/ws/repos/{repo_id}/indexing",
            "include_paths": config.include_paths,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to start async indexing", repo_id=repo_id, error=str(e))
        capture_exception(e)
        raise HTTPException(status_code=500, detail="Failed to start indexing")


async def _authenticate_websocket(websocket: WebSocket) -> Optional[dict]:
    """Authenticate WebSocket via query parameter token."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return None
    
    try:
        from services.auth import get_auth_service
        auth_service = get_auth_service()
        return auth_service.verify_jwt(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return None


# Note: WebSocket routes need to be registered on the main app, not router
# This function is exported and called from main.py
async def websocket_index(websocket: WebSocket, repo_id: str):
    """Real-time repository indexing with progress updates.

    NOTE: This WebSocket-direct-indexing path does NOT support include_paths
    (monorepo subset selection). Use the HTTP async endpoint instead:
    POST /repos/{id}/index/async with IndexConfig body.
    This handler is the older pattern -- kept for backward compatibility.
    """
    user = await _authenticate_websocket(websocket)
    if not user:
        return
    
    user_id = user.get("user_id")
    if not user_id:
        await websocket.close(code=4001, reason="User ID required")
        return
    
    repo = repo_manager.get_repo_for_user(repo_id, user_id)
    if not repo:
        await websocket.close(code=4004, reason="Repository not found")
        return
    
    # Check size limits before WebSocket indexing
    analysis = repo_validator.analyze_repo(repo["local_path"])
    
    # Fail CLOSED if analysis failed
    if not analysis.success:
        await websocket.close(code=4005, reason=f"Analysis failed: {analysis.error}")
        return
    
    size_check = user_limits.check_repo_size(
        user_id,
        analysis.file_count,
        analysis.estimated_functions
    )
    
    if not size_check.allowed:
        await websocket.close(code=4003, reason=size_check.message)
        return
    
    await websocket.accept()
    
    try:
        repo_manager.update_status(repo_id, "indexing")
        
        async def progress_callback(files_processed: int, functions_indexed: int, total_files: int):
            try:
                await websocket.send_json({
                    "type": "progress",
                    "files_processed": files_processed,
                    "functions_indexed": functions_indexed,
                    "total_files": total_files,
                    "progress_pct": int((files_processed / total_files) * 100) if total_files > 0 else 0
                })
            except Exception:
                pass
        
        total_functions = await indexer.index_repository_with_progress(
            repo_id,
            repo["local_path"],
            progress_callback
        )
        
        repo_manager.update_status(repo_id, "indexed")
        repo_manager.update_file_count(repo_id, total_functions)
        
        try:
            await websocket.send_json({
                "type": "complete",
                "total_functions": total_functions
            })
        except Exception:
            pass
        
    except WebSocketDisconnect:
        logger.debug("WebSocket disconnected", repo_id=repo_id)
    except Exception as e:
        logger.error("WebSocket indexing error", repo_id=repo_id, error=str(e))
        capture_exception(e, operation="websocket_indexing", repo_id=repo_id)
        try:
            await websocket.send_json({"type": "error", "message": "An error occurred during indexing"})
        except Exception:
            pass
        repo_manager.update_status(repo_id, "error")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
