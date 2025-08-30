// apps/backend/controllers/earningsController.js
import pool from '../config/db.js';

/* ───────────────────────── helpers ───────────────────────── */

const isTutor = (user) =>
  Boolean(user?.id) &&
  typeof user?.role === 'string' &&
  user.role.toLowerCase() === 'tutor';

const upper = (s, fb = '') => String(s ?? fb).toUpperCase();

function chooseCurrency(asked, user, balRows, lifeRows) {
  return (
    upper(asked) ||
    upper(user?.payout_currency || user?.payoutCurrency) ||
    upper(balRows?.[0]?.currency) ||
    upper(lifeRows?.[0]?.currency) ||
    'USD'
  );
}

/* ───────────────────────── controllers ───────────────────────── */

/**
 * GET /api/earnings/summary?currency=USD|KES
 * → { currency, available, pending, total }
 */
export const getEarningsSummary = async (req, res) => {
  try {
    if (!isTutor(req.user)) return res.status(403).json({ message: 'Forbidden' });

    const asked = req.query?.currency;

    // Balances by currency
    const { rows: balRows } = await pool.query(
      `SELECT currency::text AS currency,
              available_amount::numeric AS available_amount,
              pending_amount::numeric   AS pending_amount
         FROM earnings_balances
        WHERE user_id = $1`,
      [req.user.id]
    );

    // Lifetime completed earnings by currency
    const { rows: lifeRows } = await pool.query(
      `SELECT currency::text AS currency,
              COALESCE(SUM(amount), 0)::numeric AS total
         FROM transactions
        WHERE user_id = $1
          AND type = 'Completed Earnings'
        GROUP BY currency`,
      [req.user.id]
    );

    const balBy = Object.fromEntries(balRows.map((r) => [upper(r.currency), r]));
    const lifeBy = Object.fromEntries(lifeRows.map((r) => [upper(r.currency), r]));

    const currency = chooseCurrency(asked, req.user, balRows, lifeRows);
    const bal = balBy[currency] || { available_amount: 0, pending_amount: 0, currency };
    const life = lifeBy[currency] || { total: 0, currency };

    return res.json({
      currency,
      available: Number(bal.available_amount || 0),
      pending: Number(bal.pending_amount || 0),
      total: Number(life.total || 0),
    });
  } catch (err) {
    console.error('getEarningsSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/earnings/transactions?limit=20&offset=0
 * → { data: Transaction[] }
 * Ensures a unified `date` field.
 */
export const getEarningsTransactions = async (req, res) => {
  try {
    if (!isTutor(req.user)) return res.status(403).json({ message: 'Forbidden' });

    const limit = Number.parseInt(req.query.limit ?? '20', 10);
    const offset = Number.parseInt(req.query.offset ?? '0', 10);

    const { rows } = await pool.query(
      `SELECT id,
              type,
              amount::numeric AS amount,
              currency::text  AS currency,
              description,
              status,
              -- prefer explicit date; else fallback to created_at; else now
              COALESCE(date, created_at, NOW()) AS date
         FROM transactions
        WHERE user_id = $1
        ORDER BY COALESCE(date, created_at, NOW()) DESC
        LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error('getEarningsTransactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/earnings/payouts
 * → { data: Payout[] }
 */
export const getEarningsPayouts = async (req, res) => {
  try {
    if (!isTutor(req.user)) return res.status(403).json({ message: 'Forbidden' });

    const { rows } = await pool.query(
      `SELECT id,
              amount::numeric AS amount,
              currency::text  AS currency,
              method,
              destination,
              status,
              created_at,
              paid_at
         FROM payouts
        WHERE tutor_id = $1
        ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error('getEarningsPayouts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
