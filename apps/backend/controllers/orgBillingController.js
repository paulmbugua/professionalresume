// apps/backend/controllers/orgBillingController.js
import fetch from 'node-fetch';
import pool from '../config/db.js';
import { resolvePrice, ORG_SEATS } from '../services/orgPricing.js';
import { stkPushOrgSubscription } from '../services/mpesaOrgService.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

/* ------------------------------------------------------------------ */
/* PayPal REST helpers (org subscriptions)                            */
/* ------------------------------------------------------------------ */
const PAYPAL_ENV = (process.env.PAYPAL_ENV || 'sandbox').trim().toLowerCase();
const PP_BASE =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || '').trim();

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  throw new Error(`[paypal] Missing CLIENT_ID/CLIENT_SECRET. ENV=${PAYPAL_ENV}`);
}

async function getAccessToken() {
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('[paypal][oauth] failed', r.status, text);
    throw new Error(`oauth failed: ${r.status}`);
  }
  const j = await r.json();
  return j.access_token;
}

function usdFromCents(amount_cents) {
  if (amount_cents == null) throw new Error('Missing amount_cents');
  return (Number(amount_cents) / 100).toFixed(2);
}

async function createPayPalOrderUSD({ amount_cents, orgId, tier, cycle, userId, paymentId }) {
  const access = await getAccessToken();
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: 'USD', value: usdFromCents(amount_cents) },
        description: `Org ${String(tier).toUpperCase()} (${cycle})`,
        reference_id: `orgsub:${paymentId}:org:${orgId}:user:${userId}`,
      },
    ],
    application_context: {
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
    },
  };

  const r = await fetch(`${PP_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) {
    console.error('[paypal][create-order] error', r.status, j);
    throw new Error(`create-order failed: ${r.status}`);
  }
  return { orderId: j.id };
}

async function capturePayPalOrderUSD({ orderId }) {
  const access = await getAccessToken();
  const r = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
  });
  const j = await r.json();
  if (!r.ok) {
    console.error('[paypal][capture] error', r.status, j);
    throw new Error(`capture failed: ${r.status}`);
  }
  const pu = j?.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  return {
    captureId: cap?.id,
    amount: cap?.amount?.value ?? pu?.amount?.value ?? null, // "99.00"
    currency: cap?.amount?.currency_code ?? 'USD',
    payerEmail: j?.payer?.email_address || cap?.payer?.email_address || null,
    raw: j,
  };
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                 */
/* ------------------------------------------------------------------ */
function validateOrgSubInit({ tier, cycle, method, phone }) {
  const validTier = ['pro', 'enterprise'];
  const validCycle = ['monthly', 'yearly'];
  const validMethod = ['MPESA', 'PAYPAL'];

  if (!validTier.includes((tier || '').toLowerCase())) {
    return { ok: false, message: 'Invalid tier' };
  }
  if (!validCycle.includes((cycle || '').toLowerCase())) {
    return { ok: false, message: 'Invalid cycle' };
  }
  const m = (method || '').toUpperCase();
  if (!validMethod.includes(m)) {
    return { ok: false, message: 'Invalid method' };
  }
  if (m === 'MPESA' && !phone) {
    return { ok: false, message: 'Phone required for M-Pesa' };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* POST /api/orgs/:orgId/subscribe/init                               */
/* Body: { tier: 'pro'|'enterprise', cycle: 'monthly'|'yearly',       */
/*         method: 'MPESA'|'PAYPAL', phone? }                         */
/* ------------------------------------------------------------------ */
export async function initOrgSubscription(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  let { tier, cycle, method, phone } = req.body || {};

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // normalize
  tier = String(tier || '').toLowerCase();
  cycle = String(cycle || '').toLowerCase();
  method = String(method || '').toUpperCase();
  if (method === 'MPESA' && phone) phone = normalizePhoneNumber(phone);

  const v = validateOrgSubInit({ tier, cycle, method, phone });
  if (!v.ok) return res.status(400).json({ message: v.message });

  // must be owner/admin on this org
  const mem = await pool.query(
    `SELECT role FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  const currency = method === 'MPESA' ? 'KES' : 'USD';
  const { amount_cents } = resolvePrice(tier, cycle, currency);

  // create pending intent
  const q = await pool.query(
    `INSERT INTO org_subscription_payments (org_id, tier, cycle, currency, amount_cents, provider, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending')
     RETURNING *`,
    [orgId, tier, cycle, currency, amount_cents, method]
  );
  const payment = q.rows[0];

  let resp = {
    paymentId: payment.id,
    method,
    quote: { amount_cents, currency, tier, cycle },
  };

  try {
    if (method === 'MPESA') {
      const amountKES = Math.round(amount_cents / 100);

      const stk = await stkPushOrgSubscription({
        phone,
        amount: amountKES,
        accountReference: `ORG:${orgId}:${tier}:${cycle}`,
        description: `${tier.toUpperCase()} ${cycle} subscription`,
        // callbackUrl: process.env.MPESA_ORG_CALLBACK_URL, // optional per-env override
      });

      const checkoutId = stk?.CheckoutRequestID || null;
      if (!checkoutId) {
        await pool.query(
          `UPDATE org_subscription_payments
             SET status='failed', updated_at=NOW()
           WHERE id=$1`,
          [payment.id]
        );
        return res.status(502).json({ message: 'Invalid response from M-Pesa', response: stk || null });
      }

      await pool.query(
        `UPDATE org_subscription_payments
           SET provider_txn_id=$2, mpesa_reference=NULL, updated_at=NOW()
         WHERE id=$1`,
        [payment.id, checkoutId]
      );

      resp = { ...resp, checkoutRequestId: checkoutId };
      return res.json(resp);
    }

    // PAYPAL
    const { orderId } = await createPayPalOrderUSD({
      amount_cents, orgId, tier, cycle, userId, paymentId: payment.id,
    });

    await pool.query(
      `UPDATE org_subscription_payments
         SET provider_order_id=$2, updated_at=NOW()
       WHERE id=$1`,
      [payment.id, orderId]
    );

    resp = { ...resp, orderId };
    return res.json(resp);
  } catch (err) {
    console.error('[orgBilling][init] error', err?.message || err);
    await pool.query(
      `UPDATE org_subscription_payments
         SET status='failed', updated_at=NOW()
       WHERE id=$1`,
      [payment.id]
    );
    return res.status(502).json({ message: 'Failed to initialize payment', error: err?.message || 'unknown' });
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/orgs/subscriptions/:paymentId/confirm                    */
/* Body (MPESA): { provider_reference: 'MPESA-RECEIPT' }              */
/* Body (PAYPAL): {} (server captures using stored provider_order_id) */
/* ------------------------------------------------------------------ */
export async function confirmOrgSubscription(req, res) {
  const userId = req.user?.id;
  const { paymentId } = req.params;
  const { provider_reference } = req.body || {};

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // fetch payment row
  const p = await pool.query(
    `SELECT * FROM org_subscription_payments WHERE id=$1`,
    [paymentId]
  );
  if (!p.rowCount) return res.status(404).json({ message: 'Payment not found' });
  const pay = p.rows[0];

  // must be admin/owner on that org
  const mem = await pool.query(
    `SELECT role FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [pay.org_id, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  if (pay.status !== 'pending') {
    return res.status(400).json({ message: `Payment already ${pay.status}` });
  }

  // complete provider side
  if (pay.provider === 'MPESA') {
    if (!provider_reference) {
      return res.status(400).json({ message: 'mpesa_reference required' });
    }
    await pool.query(
      `UPDATE org_subscription_payments
         SET status='completed', mpesa_reference=$2, updated_at=NOW()
       WHERE id=$1`,
      [paymentId, provider_reference]
    );
  } else if (pay.provider === 'PAYPAL') {
    try {
      const capture = await capturePayPalOrderUSD({ orderId: pay.provider_order_id });

      // sanity-check (non-fatal)
      try {
        const capturedCents = Math.round(Number(capture.amount || '0') * 100);
        if (capture.currency !== pay.currency || capturedCents !== Number(pay.amount_cents)) {
          console.warn('[paypal][amount-mismatch]', {
            paymentId,
            expected: { c: pay.currency, a: pay.amount_cents },
            got: { c: capture.currency, a: capturedCents },
          });
        }
      } catch { /* ignore */ }

      await pool.query(
        `UPDATE org_subscription_payments
           SET status='completed', provider_txn_id=$2, updated_at=NOW()
         WHERE id=$1`,
        [paymentId, capture.captureId]
      );
    } catch (e) {
      console.error('[paypal][confirm] capture error', e?.message || e);
      return res.status(502).json({ message: 'Failed to capture PayPal order' });
    }
  } else {
    return res.status(400).json({ message: 'Unsupported provider' });
  }

  // activate subscription
  const seats = ORG_SEATS[pay.tier];
  const start = new Date();
  const expires = new Date(start);
  if (pay.cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else expires.setFullYear(expires.getFullYear() + 1);

  // deactivate previous actives
  await pool.query(
    `UPDATE org_subscriptions
        SET active=FALSE, updated_at=NOW()
      WHERE org_id=$1 AND active=TRUE`,
    [pay.org_id]
  );

  // create the new active subscription row
  const sub = await pool.query(
    `INSERT INTO org_subscriptions (org_id, tier, cycle, seats, currency, amount_cents, active, started_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8)
     RETURNING *`,
    [pay.org_id, pay.tier, pay.cycle, seats, pay.currency, pay.amount_cents, start, expires]
  );

  // optional touch on org
  await pool.query(
    `UPDATE organizations SET updated_at=NOW() WHERE id=$1`,
    [pay.org_id]
  );

  return res.json({ ok: true, subscription: sub.rows[0] });
}
