-- Migration: Create api_keys table for MCP authentication
-- Run this in Supabase SQL Editor
--
-- API keys use the format ci_<hex> and are stored as SHA-256 hashes.
-- The backend validates keys by hashing the incoming token and looking
-- up the hash in this table.

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- NULL user_id = system/service key (e.g. dogfood-mcp).
  -- RLS policies using auth.uid() = user_id will NOT match these rows;
  -- only the service_role (backend) can access system keys.
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  tier text DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- Index for fast hash lookups during auth
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active
  ON api_keys (key_hash) WHERE active = true;

-- Prevent users from modifying sensitive columns via UPDATE.
-- Only active and last_used_at can change; key_hash, tier, name are immutable.
-- Service role (backend/admin) bypasses this check.
CREATE OR REPLACE FUNCTION protect_api_key_immutable_cols()
RETURNS TRIGGER AS $fn$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.key_hash IS DISTINCT FROM OLD.key_hash THEN
    RAISE EXCEPTION 'Cannot modify key_hash';
  END IF;
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    RAISE EXCEPTION 'Cannot modify tier';
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'Cannot modify name';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_immutable_guard
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION protect_api_key_immutable_cols();

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

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

-- No DELETE policy: users cannot hard-delete keys.
-- Deactivation (active=false) is the intended revocation mechanism.
-- Service role (backend) can hard-delete for compliance if needed.
-- Service role has full access via service_role key; bypasses RLS.
