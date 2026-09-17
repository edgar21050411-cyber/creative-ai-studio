/*
# Create app_config table for API keys

1. Purpose
   Stores third-party API keys (DeepInfra, Fal.ai) in the database so they
   survive project re-imports from GitHub. Keys are never exposed to the
   browser: the table has no SELECT policy, and only a SECURITY DEFINER
   function callable by authenticated users can retrieve a single key by name.

2. New Tables
   - app_config
     - key   (text, primary key) — name of the setting, e.g. "DEEPINFRA_API_KEY"
     - value (text, not null)    — the secret value

3. Security
   - RLS enabled on app_config.
   - No direct SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated:
     the table is invisible to the browser client.
   - SECURITY DEFINER function get_api_secret(p_key text) returns the value
     for a single key. Only authenticated users may call it. The function
     runs with owner privileges (bypassing RLS) so it can read the table.

4. Seed data
   - DEEPINFRA_API_KEY and FAL_KEY inserted with their current values.
*/

CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- No direct-access policies: the table is invisible to anon and authenticated.

-- SECURITY DEFINER function so server-side code can read a key by name.
-- Runs as the table owner (bypasses RLS). Only authenticated may call it.
CREATE OR REPLACE FUNCTION get_api_secret(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT value INTO v_value FROM app_config WHERE key = p_key LIMIT 1;
  RETURN v_value;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_api_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_api_secret(text) TO authenticated;

-- Seed the API keys.
INSERT INTO app_config (key, value) VALUES
  ('DEEPINFRA_API_KEY', 'JyWbVml1f5NsIMWT9rklsUmCQBvxgZyz'),
  ('FAL_KEY', 'c694ba85-5bb4-4d17-8a38-61d965245e98:9dfaa2c2b1c3104e7b1647857c204119')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
