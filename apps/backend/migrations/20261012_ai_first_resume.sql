BEGIN;
CREATE TABLE IF NOT EXISTS original_resume_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (octet_length(bytes) <= 8388608)
);
CREATE TABLE IF NOT EXISTS original_resume_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES original_resume_files(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS generated_resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL REFERENCES cv_drafts(id) ON DELETE CASCADE,
  original_document_id UUID NOT NULL REFERENCES original_resume_documents(id),
  resume_data JSONB NOT NULL,
  fact_review JSONB NOT NULL,
  job_description TEXT NOT NULL,
  template_metadata JSONB NOT NULL,
  model TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'build',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_original_resume_documents_owner ON original_resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_resume_versions_owner_draft ON generated_resume_versions(user_id, draft_id, created_at DESC);
COMMIT;
