-- Migration: Add Direct Rumor Voting
-- Users can now vote directly on rumors (Verify/Debunk) with staking

CREATE TABLE IF NOT EXISTS rumor_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rumor_id UUID REFERENCES rumors(id) ON DELETE CASCADE NOT NULL,
  vote_hash VARCHAR(64) NOT NULL,
  vote_type VARCHAR(20) NOT NULL, -- 'verify' or 'debunk'
  stake_amount INT NOT NULL,
  voter_reputation DECIMAL(4,3),
  vote_weight DECIMAL(6,3),
  was_correct BOOLEAN, -- NULL until rumor resolves
  points_gained INT DEFAULT 0,
  points_lost INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(rumor_id, vote_hash) -- One vote per user per rumor
);

CREATE INDEX IF NOT EXISTS idx_rumor_votes_rumor_id ON rumor_votes(rumor_id);
CREATE INDEX IF NOT EXISTS idx_rumor_votes_vote_hash ON rumor_votes(vote_hash);
CREATE INDEX IF NOT EXISTS idx_rumor_votes_was_correct ON rumor_votes(was_correct);

COMMENT ON TABLE rumor_votes IS 'Direct votes on rumors (Verify/Debunk) with staking';
COMMENT ON COLUMN rumor_votes.vote_type IS 'User prediction: verify or debunk';
COMMENT ON COLUMN rumor_votes.stake_amount IS 'Points staked (1-10)';
COMMENT ON COLUMN rumor_votes.vote_weight IS 'reputation × stake';
COMMENT ON COLUMN rumor_votes.was_correct IS 'Determined when rumor resolves';
