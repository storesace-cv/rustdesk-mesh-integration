-- 0001_initial.sql
-- Initial schema for mesh integration

-- Enable pgcrypto for uuid generation (if available)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mesh users table
CREATE TABLE IF NOT EXISTS mesh_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesh_username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Android devices table
CREATE TABLE IF NOT EXISTS android_devices (
  id serial PRIMARY KEY,
  device_id text NOT NULL UNIQUE,
  owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  is_adopted boolean DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_updated_at ON android_devices;
CREATE TRIGGER trg_update_updated_at
BEFORE UPDATE ON android_devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Expanded view
CREATE OR REPLACE VIEW android_devices_expanded AS
SELECT
  d.*,
  u.email AS owner_email,
  u.id AS owner_auth_id
FROM android_devices d
LEFT JOIN auth.users u ON u.id = d.owner;

-- Row level security: allow authenticated users to read their own devices
ALTER TABLE android_devices ENABLE ROW LEVEL SECURITY;

-- Policy: owners can select rows where owner = auth.uid()
CREATE POLICY select_owner ON android_devices
  FOR SELECT
  USING (owner = auth.uid());

-- Allow service role to insert/update/delete (requires service role key)
CREATE POLICY service_role_full_access ON android_devices
  FOR ALL
  USING (current_setting('jwt.claims.role', true) = 'service_role')
  WITH CHECK (current_setting('jwt.claims.role', true) = 'service_role');

-- Note: Policies above assume Supabase's `auth.uid()` and JWT settings are used.

-- Done
