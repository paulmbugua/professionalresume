// apps/backend/controllers/payoutController.js
import pool from '../config/db.js';
import { normalizePayoutFromBody } from '../utils/payout.js';
import { enqueuePayout } from '../cronJobs/payoutWorker.js';

const MIN_WITHDRAW = { USD: 20, KES: 200 };

export const requestWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    const tutorId  = req.user.id;
    const currency = String(req.body.currency || '').toUpperCase();
    const amount   = Number(req.body.amount || 0);

    if (!['USD', 'KES'].includes(currency)) {
      return res.status(400).json({ message: 'Unsupported currency.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be > 0.' });
    }
    if (amount < MIN_WITHDRAW[currency]) {
      return res.status(400).json({
        message: `Minimum withdrawal is ${MIN_WITHDRAW[currency]} ${currency}.`,
      });
    }

    await client.query('BEGIN');

    // 1) Get payout prefs from profile (must match requested currency)
    //    - wise_email can be stored as a dedicated column OR inside payout_destination JSONB
    //    - mpesa_phone_number may also be stored in JSONB, so coalesce both ways
    const { rows: profRows } = await client.query(
      `
      SELECT
        payout_currency,
        payout_method,
        COALESCE(wise_email, (payout_destination ->> 'wise_email'))       AS wise_email,
        COALESCE(mpesa_phone_number, (payout_destination ->> 'mpesa_phone_number')) AS mpesa_phone_number
      FROM profiles
      WHERE user_id = $1 AND role = 'tutor'
      `,
      [tutorId]
    );
    if (!profRows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Payout preferences not set.' });
    }
    const prefs = profRows[0];

    if (String(prefs.payout_currency).toUpperCase() !== currency) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Withdrawal currency must match your payout currency.' });
    }

    // 2) Normalize/check payout fields (method & destination details)
    //    normalizePayoutFromBody supports wise/mpesa only (per your utils)
    const payout = normalizePayoutFromBody(prefs, 'tutor');
    if (payout.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: payout.error });
    }

    // 3) Check balance and lock the row
    const { rows: balRows } = await client.query(
      `
      SELECT available_amount, pending_amount
      FROM earnings_balances
      WHERE user_id = $1 AND currency = $2
      FOR UPDATE
      `,
      [tutorId, currency]
    );
    if (!balRows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No earnings balance for this currency.' });
    }
    const { available_amount: available } = balRows[0];
    if (available < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient balance.' });
    }

    // 4) Move available → pending
    const upd = await client.query(
      `
      UPDATE earnings_balances
         SET available_amount = available_amount - $1,
             pending_amount   = pending_amount   + $1,
             updated_at       = NOW()
       WHERE user_id = $2 AND currency = $3
      `,
      [amount, tutorId, currency]
    );
    if (upd.rowCount !== 1) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: 'Failed to update balance.' });
    }

    // Pretty label for transactions.payment_method column
    const methodLabel = payout.payout_method === 'mpesa' ? 'M-Pesa' : 'Wise';

    // 5) Transactions row (Pending)
    const desc = `Withdrawal request of ${amount} ${currency} via ${methodLabel}`;
    const { rows: txRows } = await client.query(
      `
      INSERT INTO transactions
        (user_id, type, amount, description, date, status, currency, payment_method, created_at, updated_at)
      VALUES
        ($1, 'Withdrawal Request', $2, $3, NOW(), 'Pending', $4, $5, NOW(), NOW())
      RETURNING id
      `,
      [tutorId, amount, desc, currency, methodLabel]
    );
    const transactionId = txRows[0].id;

    // 6) Payouts row (queued) → RETURNING id so we can enqueue
    //    destination JSON includes only wise/mpesa keys; keep stripe/paypal keys null for backward compat if needed
    const destination = {
      wise_email:        payout.wise_email || null,
      mpesa_phone:       payout.mpesa_phone_number || null,
      // backward-compat placeholders (safe to remove if no longer read anywhere)
      stripe_connect_id: null,
      paypal_email:      null,
      transaction_id:    transactionId,
    };

    const { rows: payoutRows } = await client.query(
      `
      INSERT INTO payouts
        (tutor_id, class_id, purchase_id, net_tokens, currency, method, amount, destination, status, created_at, updated_at)
      VALUES
        ($1, NULL, NULL, NULL, $2, $3, $4, $5, 'queued', NOW(), NOW())
      RETURNING id
      `,
      [tutorId, currency, payout.payout_method, amount, JSON.stringify(destination)]
    );
    const payoutId = payoutRows[0].id;

    await client.query('COMMIT');

    // 7) Kick the worker AFTER commit so it can see the new row
    try {
      await enqueuePayout(payoutId);
    } catch (e) {
      // Non-fatal: the row is queued; a cron/worker can retry.
      console.error('enqueuePayout failed:', e);
    }

    return res.status(202).json({
      message: 'Withdrawal queued.',
      transactionId,
      payoutId,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('requestWithdrawal error:', err);
    return res.status(500).json({ message: 'Server error.' });
  } finally {
    client.release();
  }
};
