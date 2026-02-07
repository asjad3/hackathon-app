-- Migration: Anonymous Auth System with Email OTP
-- Users are identified by hashed emails (NOT reversible)
-- Email addresses are NEVER stored

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL, -- Generated from email hash (e.g., "SEECS-A7F4B2C9")
  email_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of email (one-way, cannot be reversed)
  password_hash TEXT NOT NULL, -- Bcrypt hash of generated password
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_email_hash UNIQUE(email_hash),
  CONSTRAINT unique_user_id UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_user_id ON auth_users(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_email_hash ON auth_users(email_hash);

COMMENT ON TABLE auth_users IS 'Anonymous authentication - emails are hashed, not stored';
COMMENT ON COLUMN auth_users.user_id IS 'User-friendly ID generated from email hash';
COMMENT ON COLUMN auth_users.email_hash IS 'SHA-256 hash of email - one-way, cannot recover original email';
COMMENT ON COLUMN auth_users.password_hash IS 'Bcrypt hash of randomly generated password sent via email';
