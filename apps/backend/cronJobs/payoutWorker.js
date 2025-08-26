// apps/backend/cronJobs/payoutWorker.js
import pkg from 'bullmq';
const { Queue, Worker, QueueScheduler } = pkg;

import Stripe from 'stripe';
import pool from '../config/db.js';
import { createRedis } from './redisConnection.js';

// ----- optional quick probe before creating BullMQ objects -----
async function ensureRedisUp(conn) {
  try {
    await conn.connect();
    await conn.ping();
    return true;
  } catch {
    return false;
  }
}

const connection = createRedis(); // ✅ single shared client
const stripeSecret = process.env.STRIPE_SECRET || '';
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null;

// Only build BullMQ objects if Redis is reachable
let payoutsQueue = null;

const startBull = async () => {
  const ok = await ensureRedisUp(connection);
  if (!ok) {
    console.warn('[payouts] Redis not reachable; skipping queue/worker startup.');
    return;
  }

  // v4: QueueScheduler exists; v5: it doesn’t
  if (typeof QueueScheduler === 'function') {
    new QueueScheduler('payouts', { connection });
  } else {
    console.log('[payouts] QueueScheduler not available in this BullMQ version—continuing without it.');
  }

  payoutsQueue = new Queue('payouts', { connection });

  if (process.env.START_PAYOUT_WORKER === 'true') {
    const concurrency = Number(process.env.PAYOUT_WORKER_CONCURRENCY || 2);
    const worker = new Worker('payouts', processor, { connection, concurrency });
    worker.on('completed', (job) => console.log('[payouts] completed', job.id));
    worker.on('failed', (job, err) => console.error('[payouts] failed', job?.id, err?.message));
  }
};

export async function enqueuePayout(payoutId) {
  if (!payoutsQueue) {
    throw new Error('Payout queue is unavailable (Redis down). Try again later.');
  }
  await payoutsQueue.add(
    'process',
    { payoutId },
    { attempts: 6, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 200 }
  );
}

function parseDestination(dest) {
  if (!dest) return {};
  if (typeof dest === 'string') {
    try { return JSON.parse(dest); } catch { return {}; }
  }
  return dest;
}

async function payWithStripe({ amount, currency, stripeConnectId, payoutId }) {
  if (!stripe) throw new Error('Stripe not configured (STRIPE_SECRET).');
  if (!stripeConnectId) throw new Error('Missing stripe_connect_id.');
  if (String(currency).toUpperCase() !== 'USD') {
    throw new Error(`Stripe branch supports USD only (got ${currency}).`);
  }

  const cents = Math.round(Number(amount) * 100);
  const tr = await stripe.transfers.create({
    amount: cents,
    currency: 'usd',
    destination: stripeConnectId,
    description: `Tutor withdrawal ${payoutId}`,
  });
  return tr.id;
}

// TODO: wire real integrations
async function payWithPayPal({ payoutId }) { return `paypal_${payoutId}_placeholder`; }
async function payWithMpesa({ payoutId })  { return `mpesa_${payoutId}_placeholder`; }

async function processor(job) {
  const client = await pool.connect();
  try {
    const { payoutId } = job.data;
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM payouts WHERE id=$1 FOR UPDATE', [payoutId]);
    if (!rows.length) throw new Error('Payout not found');

    const p = rows[0];
    if (p.status !== 'queued') { await client.query('ROLLBACK'); return; }

    const dest     = parseDestination(p.destination);
    const method   = String(p.method || '').toLowerCase();
    const currency = String(p.currency || '').toUpperCase();
    const amount   = Number(p.amount || 0);
    if (!amount || amount <= 0) throw new Error('Invalid payout amount.');

    let providerRef = null;
    if (method === 'stripe') {
      providerRef = await payWithStripe({ amount, currency, stripeConnectId: dest.stripe_connect_id, payoutId: p.id });
    } else if (method === 'paypal') {
      providerRef = await payWithPayPal({ amount, currency, paypalEmail: dest.paypal_email, payoutId: p.id });
    } else if (method === 'mpesa') {
      providerRef = await payWithMpesa({ amount, currency, mpesaPhone: dest.mpesa_phone, payoutId: p.id });
    } else {
      throw new Error(`Unsupported payout method: ${method}`);
    }

    await client.query(
      `UPDATE payouts
         SET status='paid', provider_ref=$2, paid_at=NOW(), updated_at=NOW()
       WHERE id=$1`,
      [payoutId, providerRef]
    );

    await client.query(
      `UPDATE earnings_balances
          SET pending_amount = pending_amount - $3, updated_at = NOW()
        WHERE user_id=$1 AND currency=$2`,
      [p.tutor_id, currency, amount]
    );

    const txId = dest.transaction_id;
    if (txId) {
      await client.query(
        `UPDATE transactions SET status='Completed', updated_at=NOW() WHERE id=$1`,
        [txId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    try {
      const { payoutId } = job.data;
      const { rows: pRows } = await pool.query('SELECT * FROM payouts WHERE id=$1', [payoutId]);
      const p = pRows[0];
      if (p && p.status === 'queued') {
        await pool.query(
          `UPDATE payouts SET status='failed', error=$2, updated_at=NOW() WHERE id=$1`,
          [payoutId, String(err.message).slice(0, 500)]
        );
        if (p.amount > 0) {
          await pool.query(
            `UPDATE earnings_balances
                SET available_amount = available_amount + $3,
                    pending_amount   = GREATEST(pending_amount - $3, 0),
                    updated_at = NOW()
              WHERE user_id=$1 AND currency=$2`,
            [p.tutor_id, String(p.currency || '').toUpperCase(), Number(p.amount)]
          );
        }
        const dest = parseDestination(p.destination);
        if (dest.transaction_id) {
          await pool.query(
            `UPDATE transactions SET status='Failed', updated_at=NOW() WHERE id=$1`,
            [dest.transaction_id]
          );
        }
      }
    } catch (inner) {
      console.error('payoutWorker cleanup error:', inner);
    }
    throw err; // let BullMQ retry
  } finally {
    client.release();
  }
}

// Kick off BullMQ objects (non-blocking)
startBull().catch((e) => console.error('[payouts] start error:', e));
