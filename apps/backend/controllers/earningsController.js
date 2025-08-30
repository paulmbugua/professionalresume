import pool from '../config/db.js';

/**
 * GET /api/earnings/summary
 * Returns net available, pending, and lifetime totals for the tutor.
 */
export const getEarningsSummary = async (req, res) => {
  try {
    if (!req.user?.id || req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Read current balances
    const { rows: balRows } = await pool.query(
      `SELECT currency, available_amount, pending_amount
         FROM earnings_balances
        WHERE user_id = $1`,
      [req.user.id]
    );

    // Sum all completed transactions for lifetime gross/net
    const { rows: txnRows } = await pool.query(
      `SELECT 
          COALESCE(SUM(amount),0) AS total,
          currency
       FROM transactions
      WHERE user_id = $1 AND type = 'Completed Earnings'
      GROUP BY currency`,
      [req.user.id]
    );

    return res.json({
      balances: balRows,   // [{currency, available_amount, pending_amount}]
      lifetime: txnRows,   // [{currency, total}]
    });
  } catch (err) {
    console.error('getEarningsSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/earnings/transactions
 * Returns paginated transaction history.
 */
export const getEarningsTransactions = async (req, res) => {
  try {
    if (!req.user?.id || req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const limit = parseInt(req.query.limit || '20', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const { rows } = await pool.query(
      `SELECT id, type, amount, currency, description, status, date
         FROM transactions
        WHERE user_id = $1
        ORDER BY date DESC
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
 * Returns tutor payout history.
 */
export const getEarningsPayouts = async (req, res) => {
  try {
    if (!req.user?.id || req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT id, amount, currency, method, destination, status, created_at, paid_at
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
