// apps/backend/controllers/orgBillingController.js
import pool from '../config/db.js';
import { resolvePrice, ORG_SEATS } from '../services/orgPricing.js';
import { stkPush } from '../services/mpesaService.js'; // you already have this

// If you already have a PayPal service, wire it here:
async function createPayPalOrderUSD({ amount_cents, orgId, tier, cycle, userId }) {
  // TODO: replace with your existing PayPal 'create order' logic
  // Return { orderId } string
  const orderId = `SIM-PP-${Date.now()}`; 
  return { orderId };
}
async function capturePayPalOrderUSD({ orderId }) {
  // TODO: replace with real capture; return { captureId }
  return { captureId: `SIM-CAP-${orderId}` };
}

/** POST /api/orgs/:orgId/subscribe:init
 * body: { tier: 'pro'|'enterprise', cycle: 'monthly'|'yearly', method: 'MPESA'|'PAYPAL', phone? }
 * Rules: MPESA -> KES; PAYPAL -> USD
 */
export async function initOrgSubscription(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  const { tier, cycle, method, phone } = req.body || {};

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!['pro','enterprise'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
  if (!['monthly','yearly'].includes(cycle)) return res.status(400).json({ message: 'Invalid cycle' });
  if (!['MPESA','PAYPAL'].includes((method||'').toUpperCase())) return res.status(400).json({ message: 'Invalid method' });

  // verify user is owner/admin of org
  const mem = await pool.query(
    `SELECT role FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  const currency = method.toUpperCase() === 'MPESA' ? 'KES' : 'USD';
  const { amount_cents } = resolvePrice(tier, cycle, currency);

  // Create payment row
  const q = await pool.query(
    `INSERT INTO org_subscription_payments (org_id, tier, cycle, currency, amount_cents, provider, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending')
     RETURNING *`,
    [orgId, tier, cycle, currency, amount_cents, method.toUpperCase()]
  );
  const payment = q.rows[0];

  let resp = { quote: { amount_cents, currency, tier, cycle }, paymentId: payment.id };

  if (method.toUpperCase() === 'MPESA') {
    if (!phone) return res.status(400).json({ message: 'Phone required for M-Pesa' });
    // Reuse your STK Push
    const stkReq = { phone, amount: Math.round(amount_cents/100), packageId: `SUB-${tier}-${cycle}` };
    // Keep req.user attached for your mpesa service
    const fakeRes = { status: () => ({ json: (data) => ({ data }) }) };
    const stkData = await stkPush({ ...req, body: stkReq }, fakeRes);
    const provider_txn_id = stkData?.data?.CheckoutRequestID || null;

    await pool.query(
      `UPDATE org_subscription_payments
         SET provider_txn_id=$2, mpesa_reference=NULL
       WHERE id=$1`,
      [payment.id, provider_txn_id]
    );

    resp = { ...resp, method: 'MPESA', checkoutRequestId: provider_txn_id };
  } else {
    // PAYPAL
    const { orderId } = await createPayPalOrderUSD({
      amount_cents, orgId, tier, cycle, userId
    });
    await pool.query(
      `UPDATE org_subscription_payments
         SET provider_order_id=$2
       WHERE id=$1`,
      [payment.id, orderId]
    );
    resp = { ...resp, method: 'PAYPAL', orderId };
  }

  return res.json(resp);
}

/** POST /api/orgs/subscriptions/:paymentId/confirm
 * body: { provider_reference?: string } // M-Pesa receipt or PayPal capture/order id
 * If MPESA: we accept mpesa_reference (and mark completed).
 * If PAYPAL: capture the order, then mark completed.
 */
export async function confirmOrgSubscription(req, res) {
  const userId = req.user?.id;
  const { paymentId } = req.params;
  const { provider_reference } = req.body || {};

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const p = await pool.query(`SELECT * FROM org_subscription_payments WHERE id=$1`, [paymentId]);
  if (!p.rowCount) return res.status(404).json({ message: 'Payment not found' });
  const pay = p.rows[0];

  // Verify admin of org
  const mem = await pool.query(
    `SELECT role FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [pay.org_id, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  if (pay.status !== 'pending') {
    return res.status(400).json({ message: `Payment already ${pay.status}` });
  }

  if (pay.provider === 'MPESA') {
    if (!provider_reference) return res.status(400).json({ message: 'mpesa_reference required' });
    // Trust + audit; if you poll callbacks elsewhere, you can verify here too.
    await pool.query(
      `UPDATE org_subscription_payments
          SET status='completed', mpesa_reference=$2, updated_at=NOW()
        WHERE id=$1`,
      [paymentId, provider_reference]
    );
  } else if (pay.provider === 'PAYPAL') {
    // Capture the order
    const capture = await capturePayPalOrderUSD({ orderId: pay.provider_order_id });
    await pool.query(
      `UPDATE org_subscription_payments
          SET status='completed', provider_txn_id=$2, updated_at=NOW()
        WHERE id=$1`,
      [paymentId, capture.captureId]
    );
  } else {
    return res.status(400).json({ message: 'Unsupported provider' });
  }

  // Activate subscription window now
  const seats = ORG_SEATS[pay.tier];
  const start = new Date();
  const expires = new Date(start);
  if (pay.cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else expires.setFullYear(expires.getFullYear() + 1);

  // Deactivate other active subs
  await pool.query(
    `UPDATE org_subscriptions SET active=FALSE, updated_at=NOW()
      WHERE org_id=$1 AND active=TRUE`,
    [pay.org_id]
  );

  // Upsert new active sub
  const sub = await pool.query(
    `INSERT INTO org_subscriptions (org_id, tier, cycle, seats, currency, amount_cents, active, started_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8)
     RETURNING *`,
    [pay.org_id, pay.tier, pay.cycle, seats, pay.currency, pay.amount_cents, start, expires]
  );

  // Optional: reflect seats on organizations for quick reads
  await pool.query(
    `UPDATE organizations SET updated_at=NOW() WHERE id=$1`,
    [pay.org_id]
  );

  return res.json({ ok: true, subscription: sub.rows[0] });
}
