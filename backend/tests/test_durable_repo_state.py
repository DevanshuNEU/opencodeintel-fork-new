"""Durable repo-state v0.1 (#311): lazy re-clone + stuck-job recovery.

Covers ensure_clone (warm no-op / cold re-clone / concurrency / no git_url) and the
stuck-indexing recovery paths (timestamp stamping, steal-on-retry filter, startup sweep).
"""
import asyncio
import time
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock

import pytest

from services.repo_manager import RepositoryManager, RepoCloneError


def _make_manager(tmp_path) -> RepositoryManager:
    """RepositoryManager with disk scan + Supabase stubbed, repos_dir pointed at a tmp dir."""
    with patch.object(RepositoryManager, "_sync_existing_repos"), \
         patch("services.repo_manager.get_supabase_service") as mock_get_db:
        mock_get_db.return_value = MagicMock()
        mgr = RepositoryManager()
    mgr.repos_dir = Path(tmp_path)
    return mgr


class TestEnsureClone:
    async def test_warm_path_does_not_clone(self, tmp_path):
        """Clone already present -> stat only, no re-clone, no behavior change (AC4)."""
        mgr = _make_manager(tmp_path)
        repo_id = "repo-warm"
        (mgr.repos_dir / repo_id / ".git").mkdir(parents=True)
        repo = {"id": repo_id, "git_url": "https://example.com/x.git", "branch": "main"}

        with patch.object(mgr, "_clone_into_place") as clone:
            path = await mgr.ensure_clone(repo)

        clone.assert_not_called()
        assert path == str(mgr.repos_dir / repo_id)
        assert repo["local_path"] == str(mgr.repos_dir / repo_id)

    async def test_cold_path_reclones(self, tmp_path):
        """Clone missing (redeploy) -> re-clone from git_url@branch (AC1)."""
        mgr = _make_manager(tmp_path)
        repo_id = "repo-cold"
        repo = {"id": repo_id, "git_url": "https://example.com/x.git", "branch": "dev"}

        def fake_clone(rid, url, branch, canonical):
            (canonical / ".git").mkdir(parents=True)

        with patch.object(mgr, "_clone_into_place", side_effect=fake_clone) as clone:
            path = await mgr.ensure_clone(repo)

        clone.assert_called_once()
        rid, url, branch, _canonical = clone.call_args.args
        assert (rid, url, branch) == (repo_id, "https://example.com/x.git", "dev")
        assert (Path(path) / ".git").exists()
        assert repo["local_path"] == str(mgr.repos_dir / repo_id)

    async def test_missing_git_url_raises_actionable_503(self, tmp_path):
        """No usable git_url -> actionable 503, not an opaque 500 or silent 404."""
        mgr = _make_manager(tmp_path)
        repo = {"id": "repo-nourl", "git_url": "unknown", "branch": "main"}
        with pytest.raises(RepoCloneError) as exc:
            await mgr.ensure_clone(repo)
        assert exc.value.status_code == 503
        assert exc.value.detail["error"] == "REPO_UNAVAILABLE"

    async def test_clone_failure_raises_actionable_503(self, tmp_path):
        """A failed clone (private repo / network) surfaces as 503, not a raw 500."""
        mgr = _make_manager(tmp_path)
        repo = {"id": "repo-fail", "git_url": "https://example.com/private.git", "branch": "main"}

        def boom(rid, url, branch, canonical):
            raise RuntimeError("authentication required")

        with patch.object(mgr, "_clone_into_place", side_effect=boom):
            with pytest.raises(RepoCloneError) as exc:
                await mgr.ensure_clone(repo)
        assert exc.value.status_code == 503

    async def test_concurrent_callers_clone_once(self, tmp_path):
        """Two simultaneous ops on the same missing repo clone exactly once (AC2)."""
        mgr = _make_manager(tmp_path)
        repo_id = "repo-race"
        calls = {"n": 0}

        def fake_clone(rid, url, branch, canonical):
            calls["n"] += 1
            time.sleep(0.05)  # widen the window so the second caller is forced to wait on the lock
            (canonical / ".git").mkdir(parents=True)

        repo_a = {"id": repo_id, "git_url": "https://example.com/x.git", "branch": "main"}
        repo_b = {"id": repo_id, "git_url": "https://example.com/x.git", "branch": "main"}

        with patch.object(mgr, "_clone_into_place", side_effect=fake_clone):
            await asyncio.gather(mgr.ensure_clone(repo_a), mgr.ensure_clone(repo_b))

        assert calls["n"] == 1


class TestStuckJobRecovery:
    def _service(self):
        from services.supabase_service import SupabaseService
        svc = SupabaseService()
        svc.client = MagicMock()
        return svc

    def test_update_status_indexing_stamps_started_at(self):
        """Transition to 'indexing' records when it started, for the reaper's clock."""
        svc = self._service()
        svc.update_repository_status("r1", "indexing")
        updates = svc.client.table.return_value.update.call_args.args[0]
        assert updates["status"] == "indexing"
        assert "indexing_started_at" in updates

    def test_update_status_non_indexing_does_not_stamp(self):
        svc = self._service()
        svc.update_repository_status("r1", "indexed")
        updates = svc.client.table.return_value.update.call_args.args[0]
        assert updates == {"status": "indexed"}

    def test_try_set_indexing_steal_filter(self):
        """Steal condition covers fresh-claim, stale, and legacy NULL-timestamp rows (AC5)."""
        svc = self._service()
        exec_result = MagicMock()
        exec_result.data = [{"id": "r1"}]
        svc.client.table.return_value.update.return_value.eq.return_value.or_.return_value.execute.return_value = exec_result

        assert svc.try_set_indexing_status("r1") is True
        or_arg = svc.client.table.return_value.update.return_value.eq.return_value.or_.call_args.args[0]
        assert "status.neq.indexing" in or_arg
        assert "indexing_started_at.is.null" in or_arg
        assert "indexing_started_at.lt." in or_arg

    def test_try_set_indexing_false_when_fresh_job_owns(self):
        """A live, recently-started job is not stealable -> returns False."""
        svc = self._service()
        exec_result = MagicMock()
        exec_result.data = []
        svc.client.table.return_value.update.return_value.eq.return_value.or_.return_value.execute.return_value = exec_result
        assert svc.try_set_indexing_status("r1") is False

    def test_reset_stuck_jobs_resets_indexing_to_error(self):
        """Startup sweep flips every 'indexing' row to 'error' and reports the count (AC6)."""
        svc = self._service()
        exec_result = MagicMock()
        exec_result.data = [{"id": "a"}, {"id": "b"}]
        svc.client.table.return_value.update.return_value.eq.return_value.execute.return_value = exec_result

        count = svc.reset_stuck_indexing_jobs()
        assert count == 2
        assert svc.client.table.return_value.update.call_args.args[0] == {"status": "error"}
        assert svc.client.table.return_value.update.return_value.eq.call_args.args == ("status", "indexing")

    def test_update_status_falls_back_when_column_missing(self):
        """If migration 003 isn't applied, the status update degrades to no-column instead of 500."""
        svc = self._service()
        chain = svc.client.table.return_value.update.return_value.eq.return_value
        chain.execute.side_effect = [Exception("PGRST204 column indexing_started_at not found"), MagicMock()]

        svc.update_repository_status("r1", "indexing")

        calls = svc.client.table.return_value.update.call_args_list
        assert len(calls) == 2
        assert "indexing_started_at" in calls[0].args[0]   # first attempt includes the new column
        assert calls[1].args[0] == {"status": "indexing"}  # retry drops it

    def test_try_set_indexing_falls_back_to_basic_cas_when_column_missing(self):
        """Steal path errors without the column -> fall back to the original atomic CAS."""
        svc = self._service()
        eq_chain = svc.client.table.return_value.update.return_value.eq.return_value
        eq_chain.or_.return_value.execute.side_effect = Exception("PGRST204 column missing")
        fallback = MagicMock()
        fallback.data = [{"id": "r1"}]
        eq_chain.neq.return_value.execute.return_value = fallback

        assert svc.try_set_indexing_status("r1") is True
        eq_chain.neq.assert_called_once_with("status", "indexing")


class TestRouteWiring:
    """Integration: a route actually invokes ensure_clone (guards against the guard being removed)."""

    def test_dependency_route_triggers_ensure_clone(self, client):
        repo = {
            "id": "r-int", "git_url": "https://example.com/x.git", "branch": "main",
            "local_path": "./repos/r-int", "include_paths": None,
            "name": "x", "status": "indexed", "file_count": 0,
        }
        with patch("routes.analysis.get_repo_or_404", return_value=repo), \
             patch("routes.analysis.repo_manager.ensure_clone", new=AsyncMock(return_value="./repos/r-int")) as ensure, \
             patch("routes.analysis.dependency_analyzer.load_from_cache", return_value=None), \
             patch("routes.analysis.dependency_analyzer.build_dependency_graph", return_value={"dependencies": {}, "metrics": {}}), \
             patch("routes.analysis.dependency_analyzer.save_to_cache"):
            resp = client.get("/api/v1/repos/r-int/dependencies?force=true")

        assert resp.status_code == 200
        ensure.assert_awaited_once()
