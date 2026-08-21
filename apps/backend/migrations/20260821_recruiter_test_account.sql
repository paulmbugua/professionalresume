-- Dedicated recruiter QA account for the grounded AI workflows.
-- Password is stored as a bcrypt hash; this migration is idempotent.
BEGIN;

INSERT INTO public.users (name, email, password, role, tokens, must_change_password, is_active)
SELECT
  'Recruiter Test',
  'recruiter@teste.com',
  '$2b$12$6bT87az1iJ9EsXIS5AExNeGJ4zxsYBMGR7/tYrB2FxQeaiB/e9aNC',
  'user',
  100,
  FALSE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE lower(email) = 'recruiter@teste.com'
);

UPDATE public.users
SET name = 'Recruiter Test',
    password = '$2b$12$6bT87az1iJ9EsXIS5AExNeGJ4zxsYBMGR7/tYrB2FxQeaiB/e9aNC',
    role = 'user',
    tokens = GREATEST(COALESCE(tokens, 0), 100),
    must_change_password = FALSE,
    is_active = TRUE,
    deleted_at = NULL,
    updated_at = NOW()
WHERE lower(email) = 'recruiter@teste.com';

COMMIT;
