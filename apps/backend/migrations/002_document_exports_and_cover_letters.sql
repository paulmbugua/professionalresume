CREATE TABLE IF NOT EXISTS document_exports (
  id BIGSERIAL PRIMARY KEY,
  document_kind TEXT NOT NULL CHECK (document_kind IN ('cv', 'cover_letter')),
  draft_id UUID NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL UNIQUE,
  public_url TEXT,
  mime_type TEXT NOT NULL,
  bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_exports_user_id
  ON document_exports(user_id);

CREATE INDEX IF NOT EXISTS idx_document_exports_file_key
  ON document_exports(file_key);

INSERT INTO document_exports (document_kind, draft_id, user_id, file_key, public_url, mime_type, bytes, created_at)
SELECT 'cv', draft_id, user_id, file_key, public_url, mime_type, bytes, created_at
FROM cv_exports
ON CONFLICT (file_key) DO NOTHING;
