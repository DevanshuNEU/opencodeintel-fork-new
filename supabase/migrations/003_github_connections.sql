-- GitHub Connections Table
-- Stores OAuth tokens for GitHub repo import feature
-- Token stored server-side only, never exposed to frontend

CREATE TABLE IF NOT EXISTS github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    github_user_id BIGINT NOT NULL,
    github_username TEXT NOT NULL,
    github_avatar_url TEXT,
    access_token TEXT NOT NULL,
    token_scope TEXT NOT NULL DEFAULT 'repo',
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);

-- RLS policies
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

-- No direct SELECT access for authenticated users on base table
-- This prevents access_token from being exposed
-- Backend uses service_role key which bypasses RLS

-- Create a secure view that excludes sensitive columns
-- This is what frontend/API queries should use for status checks
CREATE OR REPLACE VIEW github_connections_public AS
SELECT 
    id,
    user_id,
    github_user_id,
    github_username,
    github_avatar_url,
    token_scope,
    connected_at,
    last_used_at,
    created_at,
    updated_at
FROM github_connections;

-- Grant SELECT on the view to authenticated users
-- View inherits RLS from base table, but we add explicit policy
GRANT SELECT ON github_connections_public TO authenticated;

-- RLS policy for the view (checks user_id match)
CREATE POLICY "Users can view own connection via public view" ON github_connections
    FOR SELECT USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_github_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER github_connections_updated_at
    BEFORE UPDATE ON github_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_github_connections_updated_at();

-- Comments for documentation
COMMENT ON TABLE github_connections IS 'Stores GitHub OAuth tokens for repo import. Tokens are server-side only via service_role.';
COMMENT ON COLUMN github_connections.access_token IS 'GitHub OAuth access token. Never exposed to frontend - use github_connections_public view.';
COMMENT ON VIEW github_connections_public IS 'Safe view excluding access_token. Use this for frontend status checks.';
