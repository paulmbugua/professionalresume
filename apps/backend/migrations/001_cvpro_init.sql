BEGIN;

CREATE TABLE IF NOT EXISTS cv_templates (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_drafts (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled CV',
  template_key TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_exports (
  id BIGSERIAL PRIMARY KEY,
  draft_id UUID REFERENCES cv_drafts(id) ON DELETE SET NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT NOT NULL,
  bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_drafts_user_updated
  ON cv_drafts(user_id, updated_at DESC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_cv_exports_user_id ON cv_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_exports_file_key ON cv_exports(file_key);

INSERT INTO cv_templates (key, name, description, is_active)
VALUES
  ('ats-minimal', 'ATS Minimal', 'Simple ATS-friendly layout with clean typography.', TRUE),
  ('bold-header', 'Bold Header', 'Statement header with strong section hierarchy.', TRUE),
  ('compact-one-pager', 'Compact One-Pager', 'Dense one-page layout for concise resumes.', TRUE),
  ('creative-timeline', 'Creative Timeline', 'Timeline layout emphasizing career progression.', TRUE),
  ('elegant-serif', 'Elegant Serif', 'Classic serif styling for a timeless look.', TRUE),
  ('modern-sidebar', 'Modern Sidebar', 'Two-column layout for profile-forward resumes.', TRUE)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

COMMIT;
