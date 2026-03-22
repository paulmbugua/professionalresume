BEGIN;

CREATE TABLE IF NOT EXISTS cv_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_kind TEXT NOT NULL DEFAULT 'cv_export_unlock',
  entitlement_key TEXT NOT NULL DEFAULT 'cv_export_unlock',
  provider TEXT NOT NULL CHECK (provider IN ('MPESA', 'PAYSTACK')),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  checkout_request_id TEXT,
  mpesa_receipt TEXT,
  phone_number TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_payments_user_status ON cv_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cv_payments_provider_reference ON cv_payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_cv_payments_checkout_request_id ON cv_payments(checkout_request_id);

CREATE TABLE IF NOT EXISTS user_entitlements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  source_payment_id BIGINT REFERENCES cv_payments(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entitlement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_key ON user_entitlements(user_id, entitlement_key);

COMMIT;
