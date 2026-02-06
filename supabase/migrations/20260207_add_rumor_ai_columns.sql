-- AI add-on: rumor summarization + harmful content flag (proposal §7)
-- Run this in Supabase → SQL Editor, then run the script.

ALTER TABLE rumors
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS content_warning boolean DEFAULT false;

COMMENT ON COLUMN rumors.summary IS 'AI-generated 1-2 line summary (Gemini). Optional.';
COMMENT ON COLUMN rumors.content_warning IS 'AI flag for possible harmful content. Warning only, no auto-delete.';
