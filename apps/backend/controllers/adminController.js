// apps/backend/controllers/adminController.js
import pool from '../config/db.js';

/* ----------------------------- PACKAGES ----------------------------- */
/**
 * Create/Update a package **pair** (USD + KES) for the same credits/offer.
 * Body: { credits:number, priceUSD:number, priceKES:number, offer?:string }
 * Returns the two rows.
 */
export async function upsertPackagePair(req, res) {
  try {
    const { credits, priceUSD, priceKES, offer } = req.body || {};
    if (!Number.isFinite(Number(credits))) return res.status(400).json({ success:false, message:'credits required' });

    const usd = Number(priceUSD);
    const kes = Number(priceKES);
    if (!Number.isFinite(usd) && !Number.isFinite(kes)) {
      return res.status(400).json({ success:false, message:'At least one price required (USD or KES)' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resultRows = [];

      // helper to upsert single currency row
      async function upsertCurrency(currency, priceVal) {
        if (!Number.isFinite(priceVal)) return; // skip if not provided
        const { rows } = await client.query(
          `WITH existing AS (
             SELECT id FROM packages WHERE credits = $1 AND currency = $2 LIMIT 1
           )
           INSERT INTO packages (credits, price, currency, offer)
           SELECT $1, $3, $2, $4
           WHERE NOT EXISTS (SELECT 1 FROM existing)
           RETURNING *`,
          [credits, currency, priceVal, offer || null]
        );
        if (rows.length) { resultRows.push(rows[0]); return; }

        const upd = await client.query(
          `UPDATE packages
             SET price = $3,
                 offer = $4,
                 updated_at = NOW()
           WHERE credits = $1 AND currency = $2
           RETURNING *`,
          [credits, currency, priceVal, offer || null]
        );
        if (upd.rows[0]) resultRows.push(upd.rows[0]);
      }

      await upsertCurrency('USD', usd);
      await upsertCurrency('KES', kes);

      await client.query('COMMIT');
      return res.json({ success:true, packages: resultRows });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin][upsertPackagePair] tx error', e);
      return res.status(500).json({ success:false, message:'Failed to save package pair' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[admin][upsertPackagePair]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/** List packages (optionally filter by ?currency=USD|KES). */
export async function listPackages(req, res) {
  try {
    const q = (req.query.currency || '').toUpperCase();
    const params = [];
    let sql = `SELECT id, credits, price, currency, offer, created_at, updated_at
               FROM packages`;
    if (q === 'USD' || q === 'KES') {
      sql += ' WHERE currency = $1';
      params.push(q);
    }
    sql += ' ORDER BY credits ASC, currency ASC';
    const { rows } = await pool.query(sql, params);
    return res.json({ success:true, packages: rows });
  } catch (err) {
    console.error('[admin][listPackages]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/** Update a single package row by id. Body can include { price, offer, credits }. */
export async function updatePackage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success:false, message:'Invalid id' });

    const { price, offer, credits } = req.body || {};
    const fields = [];
    const values = [];
    let idx = 1;

    if (price != null) { fields.push(`price = $${idx++}`); values.push(Number(price)); }
    if (offer !== undefined) { fields.push(`offer = $${idx++}`); values.push(offer || null); }
    if (credits != null) { fields.push(`credits = $${idx++}`); values.push(Number(credits)); }

    if (!fields.length) return res.status(400).json({ success:false, message:'No fields to update' });

    const { rows } = await pool.query(
      `UPDATE packages SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Package not found' });
    return res.json({ success:true, package: rows[0] });
  } catch (err) {
    console.error('[admin][updatePackage]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/** Delete a package row by id. */
export async function deletePackage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success:false, message:'Invalid id' });
    const { rowCount } = await pool.query('DELETE FROM packages WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ success:false, message:'Not found' });
    return res.json({ success:true, message:'Deleted' });
  } catch (err) {
    console.error('[admin][deletePackage]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/* -------------------------- TRANSACTIONS --------------------------- */
/** List payments joined with users and packages (for Transactions page). */
export async function listTransactions(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const { rows } = await pool.query(
      `SELECT
         p.id, p.user_id, u.email AS user_email,
         p.payment_method, p.amount, p.currency,
         p.status, p.transaction_id AS order_id,
         p.capture_id, p.created_at, p.updated_at,
         p.package_id, pk.credits
       FROM payments p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN packages pk ON pk.id = p.package_id
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ success:true, transactions: rows });
  } catch (err) {
    console.error('[admin][listTransactions]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/* ----------------------------- USERS ------------------------------- */
/** Minimal users table for Users page. */
export async function listUsers(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const { rows } = await pool.query(
      `SELECT id, email, tokens, role, created_at
         FROM users
       ORDER BY id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ success:true, users: rows });
  } catch (err) {
    console.error('[admin][listUsers]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}

/* --------------------------- RECEIPTS/PROOF ------------------------ */
/**
 * GET /proof?captureId=...&email=optional
 * Returns a single joined object suitable for a "Proof of Fulfillment" receipt.
 */
export async function proofOfFulfillment(req, res) {
  try {
    const captureId = (req.query.captureId || '').toString().trim();
    const email = (req.query.email || '').toString().trim() || null;
    if (!captureId) return res.status(400).json({ success:false, message:'captureId required' });

    const params = [captureId];
    let extra = '';
    if (email) { params.push(email); extra = ` AND u.email = $2`; }

    const { rows } = await pool.query(
      `SELECT
         p.id AS payment_id,
         p.transaction_id AS order_id,
         p.capture_id,
         p.status,
         p.amount,
         p.currency,
         p.payment_method,
         p.user_id,
         u.email AS user_email,
         u.tokens AS user_tokens_current,
         p.package_id,
         pk.credits AS package_credits,
         pk.price AS package_price,
         pk.currency AS package_price_currency,
         pk.offer AS package_offer,
         p.created_at,
         p.updated_at
       FROM payments p
       JOIN users u    ON u.id = p.user_id
       LEFT JOIN packages pk ON pk.id = p.package_id
       WHERE p.capture_id = $1 ${extra}
       LIMIT 1`,
      params
    );

    const row = rows[0] || null;
    if (!row) {
      return res.status(404).json({ success:false, message:'No record found for that captureId (and email, if provided)' });
    }

    const shortNote = `Digital tokens delivered instantly after PayPal capture ${row.capture_id}. Credited +${row.package_credits || '?'} tokens to ${row.user_email}.`;

    const sqlOneRow = `
SELECT
  p.id AS payment_id, p.transaction_id AS order_id, p.capture_id, p.status,
  p.amount, p.currency, p.payment_method, p.user_id,
  u.email AS user_email, u.tokens AS user_tokens_current,
  p.package_id, pk.credits AS package_credits, pk.price AS package_price, pk.currency AS package_price_currency, pk.offer AS package_offer,
  p.created_at, p.updated_at
FROM payments p
JOIN users u ON u.id = p.user_id
LEFT JOIN packages pk ON pk.id = p.package_id
WHERE p.capture_id = '${captureId}'${email ? ` AND u.email = '${email}'` : ''} LIMIT 1;`.trim();

    return res.json({
      success: true,
      shortNote,
      proof: row,
      copyPasteSQL: sqlOneRow,
    });
  } catch (err) {
    console.error('[admin][proofOfFulfillment]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}
