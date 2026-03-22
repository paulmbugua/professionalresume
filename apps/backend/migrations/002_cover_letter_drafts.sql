BEGIN;

CREATE TABLE IF NOT EXISTS cover_letter_drafts (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Cover Letter',
  template_key TEXT NOT NULL DEFAULT 'classic-cover-letter',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letter_drafts_user_updated
  ON cover_letter_drafts(user_id, updated_at DESC)
  WHERE is_deleted = FALSE;

COMMIT;
