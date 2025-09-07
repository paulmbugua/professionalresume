\set ON_ERROR_STOP on

CREATE OR REPLACE VIEW public.v_financial_feed AS
  -- Incoming payments
  SELECT
    'payment'::text                          AS kind,
    p.id::text                               AS id,
    p.user_id::text                          AS actor_id,
    COALESCE(p.amount_usd, NULL)::numeric    AS amount,
    COALESCE(p.currency,'USD')::text         AS currency,
    COALESCE(p.method, p.gateway, p.provider)::text AS channel,
    COALESCE(p.reference, p.capture_id, p.transaction_id)::text AS reference,
    COALESCE(p.status,'pending')::text       AS status,
    p.created_at                             AS ts
  FROM public.payments p

  UNION ALL

  -- Tutor payouts
  SELECT
    'payout',
    y.id::text,
    y.tutor_id::text,
    y.amount::numeric,
    COALESCE(y.currency,'USD'),
    COALESCE(y.method, y.provider),
    COALESCE(y.reference, y.transaction_id),
    COALESCE(y.status,'pending'),
    y.created_at
  FROM public.payouts y

  UNION ALL

  -- Course purchases (Railway has tutor_id)
  SELECT
    'course_purchase',
    cp.id::text,
    cp.tutor_id::text,
    COALESCE(cp.price_usd, cp.tokens)::numeric,
    COALESCE(cp.currency,'USD'),
    'course',
    NULL::text,
    'completed',
    cp.created_at
  FROM public.course_purchases cp

  UNION ALL

  -- ClassVault purchases (Railway has tutor_id)
  SELECT
    'classvault_purchase',
    cvp.id::text,
    cvp.tutor_id::text,
    COALESCE(cvp.price_usd, cvp.tokens)::numeric,
    COALESCE(cvp.currency,'USD'),
    'classvault',
    NULL::text,
    'completed',
    cvp.created_at
  FROM public.classvault_purchases cvp;
