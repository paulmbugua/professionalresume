CREATE TABLE IF NOT EXISTS public.ai_lab_documents (id text PRIMARY KEY, session_id text NOT NULL, source_type text NOT NULL DEFAULT 'education', filename text NOT NULL, mime_type text NOT NULL DEFAULT 'text/plain', content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'));
CREATE TABLE IF NOT EXISTS public.ai_lab_chunks (id text PRIMARY KEY, document_id text NOT NULL REFERENCES public.ai_lab_documents(id) ON DELETE CASCADE, session_id text NOT NULL, chunk_index integer NOT NULL, content text NOT NULL, embedding jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (document_id, chunk_index));
CREATE INDEX IF NOT EXISTS ai_lab_chunks_session_idx ON public.ai_lab_chunks(session_id);
CREATE INDEX IF NOT EXISTS ai_lab_documents_expiry_idx ON public.ai_lab_documents(expires_at);

