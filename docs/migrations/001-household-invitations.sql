-- Migration 001: Household invitations & user roles
-- Run against production DB to add partner/co-parent invitation support

BEGIN;

-- Add role column to users (owner = original creator, member = invited)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

-- Mark existing users as owners (they created their households)
UPDATE users SET role = 'owner'
WHERE id IN (
  SELECT DISTINCT ON (household_id) id
  FROM users
  ORDER BY household_id, created_at ASC
);

-- Household invitations table
CREATE TABLE household_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, revoked, expired
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_household_invitations_token ON household_invitations(token);
CREATE INDEX idx_household_invitations_household ON household_invitations(household_id);
CREATE INDEX idx_household_invitations_email ON household_invitations(email);

-- Prevent duplicate pending invites for same email in same household
CREATE UNIQUE INDEX idx_household_invitations_pending
  ON household_invitations(household_id, email)
  WHERE status = 'pending';

CREATE TRIGGER household_invitations_updated_at
  BEFORE UPDATE ON household_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
