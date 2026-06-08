"""
Repository Manager (Supabase Edition)
Handles repository CRUD operations with PostgreSQL via Supabase
"""
import asyncio
import os
import shutil
import uuid
from typing import Dict, List, Optional
import git
from pathlib import Path
from fastapi import HTTPException
from services.supabase_service import get_supabase_service
from services.observability import logger, metrics


class RepoCloneError(HTTPException):
    """Repo working tree is missing and could not be restored from its git remote.

    Subclasses HTTPException so it surfaces as an actionable 503 (handlers already re-raise
    HTTPException) instead of an opaque 500. UX matters here: a redeploy is invisible to the
    user, so the message has to tell them what to actually do. (#311)
    """

    def __init__(self, repo_id: str, reason: str = ""):
        super().__init__(
            status_code=503,
            detail={
                "error": "REPO_UNAVAILABLE",
                "repo_id": repo_id,
                "message": (
                    "Repository source files are temporarily unavailable and could not be "
                    "restored from the git remote. Private repositories are not yet supported "
                    "for re-sync; for public repos, please retry shortly."
                ),
            },
        )
        self.reason = reason


class RepositoryManager:
    """Manage repositories with Supabase persistence"""
    
    def __init__(self):
        self.repos_dir = Path("./repos")
        self.repos_dir.mkdir(exist_ok=True)
        self.db = get_supabase_service()

        # Per-repo locks so two concurrent ops on the same missing clone don't both clone.
        # Single uvicorn worker means an in-process lock is sufficient here.
        self._clone_locks: Dict[str, asyncio.Lock] = {}

        # Discover and sync existing repositories on startup
        self._sync_existing_repos()
    
    def _sync_existing_repos(self):
        """
        Scan repos directory and sync with Supabase
        Creates DB records for any repos found on disk but not in DB
        """
        if not self.repos_dir.exists():
            return
        
        logger.info("Syncing repositories from disk")
        
        for repo_path in self.repos_dir.iterdir():
            if not repo_path.is_dir() or repo_path.name.startswith('.'):
                continue
            
            try:
                # Check if already in DB
                existing = self.db.get_repository(repo_path.name)
                if existing:
                    logger.debug("Repo exists in DB", name=existing['name'])
                    continue
                
                # Try to open as git repo
                repo = git.Repo(repo_path)
                
                # Get repo info from git config
                remote_url = None
                if repo.remotes:
                    remote_url = repo.remotes.origin.url
                
                # Extract name from URL or use folder name
                name = remote_url.split('/')[-1].replace('.git', '') if remote_url else repo_path.name
                branch = repo.active_branch.name if not repo.head.is_detached else "main"
                
                # Count code files to estimate if indexed
                code_files = list(repo_path.rglob('*.py')) + list(repo_path.rglob('*.js')) + list(repo_path.rglob('*.ts'))
                file_count = len([f for f in code_files if '.git' not in str(f) and 'node_modules' not in str(f)])
                
                # Create DB record
                self.db.create_repository(
                    repo_id=repo_path.name,
                    name=name,
                    git_url=remote_url or "unknown",
                    branch=branch,
                    local_path=str(repo_path)
                )
                
                self.db.update_last_indexed(
                    repo_path.name,
                    repo.head.commit.hexsha,
                    file_count * 20  # Estimate function count
                )
                
                logger.info("Synced repo from disk", name=name, repo_id=repo_path.name)
                
            except Exception as e:
                logger.warning("Error syncing repo", repo=repo_path.name, error=str(e))
    
    def list_repos(self) -> List[dict]:
        """List all repositories from Supabase"""
        repos = self.db.list_repositories()
        return repos
    
    def list_repos_for_user(self, user_id: str) -> List[dict]:
        """List repositories owned by a specific user"""
        return self.db.list_repositories_for_user(user_id)
    
    def get_repo(self, repo_id: str) -> Optional[dict]:
        """Get repository by ID from Supabase"""
        return self.db.get_repository(repo_id)
    
    def get_repo_for_user(self, repo_id: str, user_id: str) -> Optional[dict]:
        """Get repository only if owned by user"""
        return self.db.get_repository_with_owner(repo_id, user_id)
    
    def verify_ownership(self, repo_id: str, user_id: str) -> bool:
        """Verify user owns repository"""
        return self.db.verify_repo_ownership(repo_id, user_id)
    
    def add_repo(self, name: str, git_url: str, branch: str = "main", user_id: Optional[str] = None, api_key_hash: Optional[str] = None) -> dict:
        """Add a new repository"""
        repo_id = str(uuid.uuid4())
        local_path = self.repos_dir / repo_id
        
        try:
            # Clone the repository
            logger.info("Cloning repository", git_url=git_url, local_path=str(local_path))
            metrics.increment("repos_cloned")
            git.Repo.clone_from(git_url, local_path, branch=branch, depth=1)
            
            # Create DB record with ownership
            repo = self.db.create_repository(
                repo_id=repo_id,
                name=name,
                git_url=git_url,
                branch=branch,
                local_path=str(local_path),
                user_id=user_id,
                api_key_hash=api_key_hash
            )
            
            return repo
            
        except Exception as e:
            # Cleanup on failure
            if local_path.exists():
                shutil.rmtree(local_path)
            raise Exception(f"Failed to clone repository: {str(e)}")

    async def ensure_clone(self, repo: dict) -> str:
        """Guarantee the working tree exists on disk, lazily re-cloning from git_url if needed.

        Railway redeploys wipe ./repos (ephemeral disk) but Pinecone/Supabase survive, so
        local_path is a cache hint, not source of truth -- the git remote is. On a warm hit
        this is a sub-millisecond stat with no behavior change; on a miss it re-clones.
        Returns the canonical local path and refreshes repo['local_path'] in place.
        """
        repo_id = repo["id"]
        canonical = self.repos_dir / repo_id

        # Warm path: clone present. No re-clone, no event-loop work.
        if (canonical / ".git").exists():
            repo["local_path"] = str(canonical)
            return str(canonical)

        git_url = repo.get("git_url")
        if not git_url or git_url == "unknown":
            raise RepoCloneError(repo_id, "no git_url on record")
        branch = repo.get("branch") or "main"

        lock = self._clone_locks.setdefault(repo_id, asyncio.Lock())
        async with lock:
            # Another coroutine may have cloned while we waited for the lock.
            if not (canonical / ".git").exists():
                try:
                    await asyncio.to_thread(self._clone_into_place, repo_id, git_url, branch, canonical)
                except Exception as e:
                    # Private repo (no creds on a fresh container), network failure, deleted
                    # remote: surface as an actionable 503, not an opaque 500.
                    logger.error("Re-clone failed", repo_id=repo_id, git_url=git_url, error=str(e))
                    raise RepoCloneError(repo_id, str(e)) from e
                logger.info("Re-cloned repo on demand (cache miss)", repo_id=repo_id, git_url=git_url)
                metrics.increment("repos_recloned")

        repo["local_path"] = str(canonical)
        return str(canonical)

    def _clone_into_place(self, repo_id: str, git_url: str, branch: str, canonical: Path) -> None:
        """Clone into a temp dir then atomically rename into the canonical path.

        The rename is the correctness guarantee: a crashed or concurrent clone never leaves a
        half-populated canonical dir for a reader to trip over. Runs in a worker thread (git is
        blocking I/O); never call directly on the event loop.
        """
        tmp = self.repos_dir / f".{repo_id}.tmp.{uuid.uuid4().hex}"
        try:
            git.Repo.clone_from(git_url, tmp, branch=branch, depth=1)
            # Clear any leftover partial dir before the atomic swap. Do NOT ignore errors here:
            # a failed removal must surface (the outer except re-raises it, and ensure_clone wraps
            # it into a logged RepoCloneError) rather than letting us rename onto a dir we could
            # not clean, which would fail later with a more confusing error.
            if canonical.exists():
                shutil.rmtree(canonical)
            os.rename(tmp, canonical)  # atomic on the same filesystem
        except Exception:
            if tmp.exists():
                shutil.rmtree(tmp, ignore_errors=True)
            raise

    def update_status(self, repo_id: str, status: str):
        """Update repository status"""
        self.db.update_repository_status(repo_id, status)
    
    def try_set_indexing(self, repo_id: str) -> bool:
        """
        Atomically set status to 'indexing' only if not already indexing.
        
        Returns True if status was set, False if already indexing.
        Use this instead of checking status then updating to prevent race conditions.
        """
        return self.db.try_set_indexing_status(repo_id)
    
    def update_file_count(self, repo_id: str, count: int):
        """Update file count"""
        self.db.update_file_count(repo_id, count)

    def get_last_indexed_commit(self, repo_id: str) -> str:
        """Get last indexed commit SHA"""
        repo = self.db.get_repository(repo_id)
        return repo.get("last_indexed_commit", "") if repo else ""
    
    def update_last_commit(self, repo_id: str, commit_sha: str, function_count: int = 0):
        """Update last indexed commit"""
        self.db.update_last_indexed(repo_id, commit_sha, function_count)
    
    def delete_repo(self, repo_id: str) -> bool:
        """Delete repository and clean up local files"""
        repo = self.get_repo(repo_id)
        if not repo:
            return False
        
        # Clean up local clone first (before DB delete)
        local_path = repo.get("local_path")
        if local_path and Path(local_path).exists():
            try:
                shutil.rmtree(local_path)
                logger.info("Deleted local repo files", repo_id=repo_id, path=local_path)
            except Exception as e:
                logger.warning("Failed to delete local files", repo_id=repo_id, error=str(e))
        
        # Delete from database (cascades to embeddings, dependencies, etc.)
        self.db.delete_repository(repo_id)
        
        logger.info("Deleted repository", repo_id=repo_id)
        return True
