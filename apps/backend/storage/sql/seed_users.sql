-- Seed script for CVPro users table (PostgreSQL).
-- Safe to run multiple times; uses IF NOT EXISTS guards and inserts only if missing.

-- 1) Table + constraints
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    name text,
    role text CHECK (role IN ('user', 'admin', 'superadmin')),
    email text NOT NULL,
    password text,
    google_id text,
    otp text,
    otp_expiration timestamp without time zone,
    tokens integer DEFAULT 0,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Case-insensitive unique email for active accounts.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON public.users (lower(email))
  WHERE deleted_at IS NULL;

-- 2) Dev-only seed users
-- Password is "Password123!" (bcrypt hash).
INSERT INTO public.users (name, email, password, role, tokens)
SELECT 'CVPro Admin', 'admin@cvpro.local',
       '$2b$10$y0ft0aMdPrScKaxVTUY0weWeN4HBCeYH2Dg./nPT.8kE.Pg/aElQW',
       'admin', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE lower(email) = 'admin@cvpro.local'
);

INSERT INTO public.users (name, email, password, role, tokens)
SELECT 'CVPro Demo User', 'demo@cvpro.local',
       '$2b$10$y0ft0aMdPrScKaxVTUY0weWeN4HBCeYH2Dg./nPT.8kE.Pg/aElQW',
       'user', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE lower(email) = 'demo@cvpro.local'
);
