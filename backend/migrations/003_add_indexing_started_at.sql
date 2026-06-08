-- Durable repo-state v0.1 (issue #311)
-- Records when a repo entered the 'indexing' state so the stuck-job reaper can tell a
-- live job from an orphaned one (process died mid-index, leaving status='indexing' forever).

ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS indexing_started_at TIMESTAMPTZ;

-- Partial index: the reaper and the steal-on-retry path only ever scan rows currently indexing.
CREATE INDEX IF NOT EXISTS idx_repositories_indexing_started_at
    ON repositories(indexing_started_at)
    WHERE status = 'indexing';
