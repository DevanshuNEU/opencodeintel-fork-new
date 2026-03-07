-- Migration: Create api_keys table for MCP authentication
-- Run this in Supabase SQL Editor
--
-- API keys use the format ci_<hex> and are stored as SHA-256 hashes.
-- The backend validates keys by hashing the incoming token and looking
-- up the hash in this table.

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  tier text DEFAULT 'free',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Index for fast hash lookups during auth
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active
  ON api_keys (key_hash) WHERE active = true;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can deactivate own keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (backend) has full access via service_role key
-- No explicit policy needed; service_role bypasses RLS
