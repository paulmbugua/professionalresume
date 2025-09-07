-- ─────────────────────────────────────────────────────────
-- DayBreak / mytutorapp: Minimal schema alignment for Railway
-- Safe, idempotent: only ADDs columns and sets defaults if missing.
-- ─────────────────────────────────────────────────────────
BEGIN;

-- ========== PAYMENTS ==========
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS amount_usd numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill amount_usd if you already have a generic "amount" column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='amount'
  ) THEN
    EXECUTE $i$
      UPDATE public.payments
      SET amount_usd = amount
      WHERE (currency IS NULL OR currency = 'USD')
        AND amount_usd IS NULL
    $i$;
  END IF;
END$$;

-- Helpful index for feed ordering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='idx_payments_created_at' AND n.nspname='public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_payments_created_at ON public.payments (created_at DESC)';
  END IF;
END$$;

-- ========== PAYOUTS ==========
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS tutor_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='idx_payouts_created_at' AND n.nspname='public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_payouts_created_at ON public.payouts (created_at DESC)';
  END IF;
END$$;

-- ========== COURSE PURCHASES ==========
ALTER TABLE public.course_purchases
  ADD COLUMN IF NOT EXISTS price_usd numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tokens numeric,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill price_usd from existing "price" if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='course_purchases' AND column_name='price'
  ) THEN
    EXECUTE $i$
      UPDATE public.course_purchases
      SET price_usd = price
      WHERE (currency IS NULL OR currency = 'USD')
        AND price_usd IS NULL
    $i$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='idx_course_purchases_created_at' AND n.nspname='public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_course_purchases_created_at ON public.course_purchases (created_at DESC)';
  END IF;
END$$;

-- ========== CLASSVAULT PURCHASES ==========
ALTER TABLE public.classvault_purchases
  ADD COLUMN IF NOT EXISTS price_usd numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tokens numeric,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='classvault_purchases' AND column_name='price'
  ) THEN
    EXECUTE $i$
      UPDATE public.classvault_purchases
      SET price_usd = price
      WHERE (currency IS NULL OR currency = 'USD')
        AND price_usd IS NULL
    $i$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='idx_classvault_purchases_created_at' AND n.nspname='public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_classvault_purchases_created_at ON public.classvault_purchases (created_at DESC)';
  END IF;
END$$;

COMMIT;
