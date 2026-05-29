BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cv_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled CV',
  template_key TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_drafts_user_updated
  ON cv_drafts(user_id, updated_at DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_cv_drafts_client_draft_id
  ON cv_drafts(user_id, (data_json->>'clientDraftId'))
  WHERE is_deleted = FALSE AND data_json ? 'clientDraftId';

CREATE TABLE IF NOT EXISTS cover_letter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Cover Letter',
  template_key TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letter_drafts_user_updated
  ON cover_letter_drafts(user_id, updated_at DESC)
  WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS document_exports (
  id BIGSERIAL PRIMARY KEY,
  document_kind TEXT NOT NULL CHECK (document_kind IN ('cv', 'cover_letter')),
  draft_id UUID,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_exports_user_file_key
  ON document_exports(user_id, file_key);

CREATE INDEX IF NOT EXISTS idx_document_exports_draft
  ON document_exports(document_kind, draft_id);

COMMIT;
