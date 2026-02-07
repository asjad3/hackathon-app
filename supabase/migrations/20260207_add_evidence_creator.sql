-- Add creator tracking to evidence table
ALTER TABLE evidence
ADD COLUMN IF NOT EXISTS creator_hash VARCHAR(64);

COMMENT ON COLUMN evidence.creator_hash IS 'SHA256 hash of user who created this evidence (same format as vote_hash)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evidence_creator_hash ON evidence(creator_hash);
