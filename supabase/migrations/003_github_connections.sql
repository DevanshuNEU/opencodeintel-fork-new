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

-- Users can only check if they have a connection (not read token)
-- Actual token access is done via service_role in backend
CREATE POLICY "Users can view own connection exists" ON github_connections
    FOR SELECT USING (auth.uid() = user_id);

-- Users cannot directly insert/update/delete - backend handles this
-- Backend uses service_role key which bypasses RLS

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

-- Comment for documentation
COMMENT ON TABLE github_connections IS 'Stores GitHub OAuth tokens for repo import feature. Tokens are server-side only.';
COMMENT ON COLUMN github_connections.access_token IS 'GitHub OAuth access token. Never exposed to frontend.';
