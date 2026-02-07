-- Migration: Add user_credibility column to rumor_votes
-- This tracks the user's wealth-based credibility at the time of voting
-- Credibility is calculated as: log(1 + total_points) / log(1 + 10000)

ALTER TABLE rumor_votes 
ADD COLUMN IF NOT EXISTS user_credibility DECIMAL(5,4) DEFAULT 0.5;

COMMENT ON COLUMN rumor_votes.user_credibility IS 'User wealth-based credibility at time of vote (0-1 scale, based on total_points)';

-- Update vote_weight comment to reflect new formula
COMMENT ON COLUMN rumor_votes.vote_weight IS 'reputation × user_credibility × stake';
