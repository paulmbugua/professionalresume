// apps/backend/controllers/adminController.js
import pool from '../config/db.js';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';
import { sendOTP } from '../config/emailService.js';

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
/* ----------------------------- PACKAGES ----------------------------- */
/**
 * Create/Update a package **pair** (USD + KES) for the same credits/offer.
 * Body: { credits:number, priceUSD:number, priceKES:number, offer?:string }
 * Returns the two rows.
 */
export async function upsertPackagePair(req, res) {
  try {
    const { credits, priceUSD, priceKES, offer } = req.body || {};
    if (!Number.isFinite(Number(credits))) {
      return res.status(400).json({ success: false, message: 'credits required' });
    }

    const usd = Number(priceUSD);
    const kes = Number(priceKES);
    if (!Number.isFinite(usd) && !Number.isFinite(kes)) {
      return res.status(400).json({ success: false, message: 'At least one price required (USD or KES)' });
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
        if (rows.length) {
          resultRows.push(rows[0]);
          return;
        }

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
      return res.json({ success: true, packages: resultRows });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[admin][upsertPackagePair] tx error', e);
      return res.status(500).json({ success: false, message: 'Failed to save package pair' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[admin][upsertPackagePair]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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
    return res.json({ success: true, packages: rows });
  } catch (err) {
    console.error('[admin][listPackages]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/** Update a single package row by id. Body can include { price, offer, credits }. */
export async function updatePackage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const { price, offer, credits } = req.body || {};
    const fields = [];
    const values = [];
    let idx = 1;

    if (price != null) {
      fields.push(`price = $${idx++}`);
      values.push(Number(price));
    }
    if (offer !== undefined) {
      fields.push(`offer = $${idx++}`);
      values.push(offer || null);
    }
    if (credits != null) {
      fields.push(`credits = $${idx++}`);
      values.push(Number(credits));
    }

    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    const { rows } = await pool.query(
      `UPDATE packages SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Package not found' });
    return res.json({ success: true, package: rows[0] });
  } catch (err) {
    console.error('[admin][updatePackage]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}



/* -------------------------- TRANSACTIONS --------------------------- */
/**
 * Admin list of payments joined with users and packages.
 * Filters:
 *  - ?limit=100
 *  - ?method=paypal|mpesa
 *  - ?status=Pending|Completed|Failed
 *  - ?email=foo@bar.com (matches user_email or payer_email)
 *  - ?currency=USD|KES
 *  - ?since=2025-09-01T00:00:00Z  ?until=2025-09-07T00:00:00Z
 *  - ?q=free text across order/capture/mpesa/email
 */
export async function listTransactions(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const where = [];
    const params = [];
    let i = 1;

    // method filter
    if (req.query.method) {
      where.push(`LOWER(p.payment_method) = $${i++}`);
      params.push(String(req.query.method).toLowerCase() === 'mpesa' ? 'mpesa' : 'paypal');
    }

    // status filter
    if (req.query.status) {
      where.push(`LOWER(p.status) = $${i++}`);
      params.push(String(req.query.status).toLowerCase());
    }

    // email filter (matches user or payer)
    if (req.query.email) {
      where.push(`(LOWER(u.email) = $${i} OR LOWER(COALESCE(p.payer_email,'')) = $${i})`);
      params.push(String(req.query.email).toLowerCase());
      i++;
    }

    // currency filter
    if (req.query.currency) {
      where.push(`UPPER(p.currency) = $${i++}`);
      params.push(String(req.query.currency).toUpperCase());
    }

    // since/until (created_at) — guard invalid dates
    const tryDate = (v) => {
      const d = new Date(String(v));
      return isNaN(+d) ? null : d;
    };
    const since = tryDate(req.query.since);
    const until = tryDate(req.query.until);
    if (since) {
      where.push(`p.created_at >= $${i++}`);
      params.push(since);
    }
    if (until) {
      where.push(`p.created_at < $${i++}`);
      params.push(until);
    }

    // quick search q
    if (req.query.q) {
      const q = `%${String(req.query.q).toLowerCase()}%`;
      where.push(
        `(LOWER(u.email) LIKE $${i}
          OR LOWER(COALESCE(p.payer_email,''))     LIKE $${i}
          OR LOWER(COALESCE(p.transaction_id,''))  LIKE $${i}
          OR LOWER(COALESCE(p.capture_id,''))      LIKE $${i}
          OR LOWER(COALESCE(p.mpesa_reference,'')) LIKE $${i})`
      );
      params.push(q);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        u.email AS user_email,
        u.name  AS user_name,
        p.payment_method,
        p.amount,
        p.currency,
        p.status,
        p.transaction_id AS order_id,      -- PayPal orderId or M-Pesa CheckoutRequestID
        p.capture_id,                       -- PayPal captureId
        p.mpesa_reference,                  -- M-Pesa receipt code
        p.payer_email,
        p.package_id,
        pk.credits,
        pk.offer,
        p.created_at,
        p.updated_at
      FROM payments p
      JOIN users u        ON u.id = p.user_id
      LEFT JOIN packages pk ON pk.id = p.package_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${i}
      `,
      [...params, limit]
    );

    return res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error('[admin][listTransactions] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


/* --------------------------- RECEIPTS/PROOF ------------------------ */
/**
 * GET /api/admin/proof
 * Query: one of
 *   - captureId=...        (PayPal)
 *   - orderId=...          (PayPal order/transaction id)
 *   - mpesaRef=...         (M-Pesa receipt e.g., MKR7... )
 *   - txRef=...            (M-Pesa CheckoutRequestID)
 * Optional:
 *   - email=...            (matches user_email or payer_email)
 *   - format=pdf|json      (default json unless Accept: application/pdf)
 */
export async function proofOfFulfillment(req, res) {
  try {
    const captureId = (req.query.captureId || '').toString().trim() || null;
    const orderId   = (req.query.orderId   || '').toString().trim() || null;
    const mpesaRef  = (req.query.mpesaRef  || '').toString().trim() || null;
    const txRef     = (req.query.txRef     || '').toString().trim() || null;
    const emailRaw  = (req.query.email     || '').toString().trim();
    const email     = emailRaw ? emailRaw.toLowerCase() : null;

    if (!captureId && !orderId && !mpesaRef && !txRef) {
      return res.status(400).json({ success: false, message: 'Provide captureId OR orderId OR mpesaRef OR txRef' });
    }

    const params = [captureId, orderId, mpesaRef, txRef, email];
    const { rows } = await pool.query(
      `
      SELECT
        p.id AS payment_id,
        p.transaction_id AS order_id,
        p.capture_id,
        p.mpesa_reference,
        p.status,
        p.amount,
        p.currency,
        p.payment_method,
        p.user_id,
        u.email AS user_email,
        u.name  AS user_name,
        COALESCE(u.tokens,0) AS user_tokens_current,
        p.payer_email,
        p.phone,
        p.package_id,
        pk.credits AS package_credits,
        pk.price   AS package_price,
        pk.currency AS package_price_currency,
        pk.offer   AS package_offer,
        p.created_at,
        p.updated_at
      FROM payments p
      JOIN users u    ON u.id  = p.user_id
      LEFT JOIN packages pk ON pk.id = p.package_id
      WHERE
        ($1::text IS NULL OR p.capture_id = $1) AND
        ($2::text IS NULL OR p.transaction_id = $2) AND
        ($3::text IS NULL OR p.mpesa_reference = $3) AND
        ($4::text IS NULL OR p.transaction_id = $4) AND
        ($5::text IS NULL OR LOWER(u.email) = $5 OR LOWER(COALESCE(p.payer_email,'')) = $5)
      ORDER BY p.created_at DESC
      LIMIT 1
      `,
      params
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, message: 'No record found for the provided reference(s)' });
    }

    const isMpesa = String(row.payment_method || '').toLowerCase().includes('mpesa');
    const methodLabel = isMpesa ? 'M-Pesa' : 'PayPal';

    const shortNote = isMpesa
      ? `Digital tokens delivered after M-Pesa confirmation ${row.mpesa_reference || row.order_id || '—'}. Credited +${row.package_credits || '?'} tokens to ${row.user_email}.`
      : `Digital tokens delivered instantly after PayPal capture ${row.capture_id || row.order_id || '—'}. Credited +${row.package_credits || '?'} tokens to ${row.user_email}.`;

    // Decide JSON vs PDF
    const wantsPdf =
      String(req.query.format || '').toLowerCase() === 'pdf' ||
      req.accepts(['application/pdf', 'json']) === 'application/pdf';

    if (!wantsPdf) {
      // Helpful SQL (parameterized equivalent) – copy/paste dev aid
      const copyPasteSQL = `
SELECT
  p.id AS payment_id, p.transaction_id AS order_id, p.capture_id, p.mpesa_reference, p.status,
  p.amount, p.currency, p.payment_method, p.user_id,
  u.email AS user_email, u.tokens AS user_tokens_current,
  p.payer_email, p.phone,
  p.package_id, pk.credits AS package_credits, pk.price AS package_price, pk.currency AS package_price_currency, pk.offer AS package_offer,
  p.created_at, p.updated_at
FROM payments p
JOIN users u ON u.id = p.user_id
LEFT JOIN packages pk ON pk.id = p.package_id
WHERE ${captureId ? `p.capture_id = '${captureId}'` : mpesaRef ? `p.mpesa_reference = '${mpesaRef}'` : orderId ? `p.transaction_id = '${orderId}'` : `p.transaction_id = '${txRef}'`}
${email ? `AND (LOWER(u.email)='${email}' OR LOWER(COALESCE(p.payer_email,''))='${email}')` : ''}
LIMIT 1;`.trim();

      return res.json({ success: true, shortNote, proof: row, copyPasteSQL });
    }

    // ────────────────────────────────────────────────────────────────────────────
    //                            BRANDING SETTINGS
    // ────────────────────────────────────────────────────────────────────────────
    const BRAND = {
      company:  'EKAZICONNECT SOLUTIONS LTD',
      platform: 'DayBreak Learner',
      website:  'daybreaklearner.com',
      address:  'Mama Ngina Street, Nairobi, Kenya',
      emails:   ['support@daybreaklearning.com', 'ekazilimited@gmail.com'],
      phones:   ['+254 728 872 800', '+254 720 423 764'],
      colors:   { primary: '#A259FF', plum: '#2A1E5C', softPink: '#FF70A6' }
    };

    // Build Cloudinary URLs for logo & signature (uploaded via seeder)
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME;
    const LOGO_URL = CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/branding/logo`
      : null;
    const SIGN_URL = CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/branding/signature`
      : null;

    async function fetchBuffer(url) {
      if (!url) return null;
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const ab = await r.arrayBuffer();
        return Buffer.from(ab);
      } catch {
        return null;
      }
    }

    // Preload images (non-blocking if they fail)
    const [logoBuf, signBuf] = await Promise.all([fetchBuffer(LOGO_URL), fetchBuffer(SIGN_URL)]);

    // ────────────────────────────────────────────────────────────────────────────
    //                                PDF LAYOUT
    // ────────────────────────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DayBreak_Receipt_${row.capture_id || row.mpesa_reference || row.order_id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    const pageW = doc.page.width;
    const margin = doc.page.margins.left;
    const usableW = pageW - margin * 2;

    // Header bar
    doc.save();
    doc.rect(0, 0, pageW, 90).fill(BRAND.colors.plum);
    doc.restore();

    // Logo (left)
    const headerY = 18;
    if (logoBuf) {
      doc.image(logoBuf, margin, headerY, { fit: [60, 60] });
    }

    // Company + platform (white)
    doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(16).text(BRAND.company, margin + 72, headerY + 6, {
      width: usableW - 72 - 160
    });
    doc.font('Helvetica').fontSize(10).text(`${BRAND.platform} • ${BRAND.website}`, margin + 72, headerY + 28);

    // "RECEIPT" label (right)
    doc.font('Helvetica-Bold').fontSize(20).text('RECEIPT', margin + usableW - 120, headerY + 10, {
      width: 120,
      align: 'right'
    });

    // Date below label
    doc.font('Helvetica').fontSize(9).text(new Date(row.created_at).toLocaleString(), margin + usableW - 170, headerY + 36, {
      width: 170,
      align: 'right'
    });

    // Move top cursor below header
    doc.moveTo(margin, 100);

    // Seller block
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(12).text('Seller');
    doc.font('Helvetica').fontSize(10);
    doc.text(BRAND.company);
    doc.text(BRAND.address);
    doc.text(`Email: ${BRAND.emails.join(' / ')}`);
    doc.text(`Tel: ${BRAND.phones.join(' / ')}`);

    // Receipt details (right column)
    const rightX = margin + usableW / 2 + 20;
    const topY = 110;
    doc.font('Helvetica-Bold').fontSize(12).text('Receipt Details', rightX, topY);
    doc.font('Helvetica').fontSize(10);
    if (row.order_id) doc.text(`Order / Tx Ref: ${row.order_id}`, rightX, doc.y + 2);
    if (row.capture_id) doc.text(`Capture ID: ${row.capture_id}`, rightX);
    if (row.mpesa_reference) doc.text(`M-Pesa Ref: ${row.mpesa_reference}`, rightX);
    doc.text(`Status: ${row.status}`, rightX);
    doc.text(`Method: ${methodLabel}`, rightX);
    doc.text(`Amount: ${row.currency} ${Number(row.amount).toFixed(2)}`, rightX);

    // Buyer block
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(12).text('Buyer');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Name: ${row.user_name || '—'}`);
    doc.text(`Account Email: ${row.user_email}`);
    doc.text(`${isMpesa ? 'M-Pesa Phone' : 'Payer Email'}: ${isMpesa ? row.phone || '—' : row.payer_email || '—'}`);

    // Divider
    doc.moveDown(0.8);
    doc.strokeColor('#DDD').moveTo(margin, doc.y).lineTo(margin + usableW, doc.y).stroke();
    doc.moveDown(0.6);

    // Fulfillment summary
    doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND.colors.primary).text('Digital Fulfillment');
    doc.fillColor('#000').font('Helvetica').fontSize(10);
    doc.text(`Package ID: ${row.package_id}`);
    doc.text(`Package Label: ${row.package_offer || 'Tokens Package'}`);
    doc.text(`Credits Delivered: ${row.package_credits}`);
    doc.text(`Package Price: ${row.package_price_currency} ${Number(row.package_price).toFixed(2)}`);
    doc.text(`User Tokens (post-credit): ${row.user_tokens_current}`);

    // Notes
    doc.moveDown(0.6);
    doc.fillColor('#666').fontSize(9).text(
      shortNote,
      { width: usableW }
    );

    // Signature block (bottom-right)
    const sigStartY = Math.max(doc.y + 16, 420);
    const sigX = margin + usableW - 220;
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(12).text('Authorized Signature', sigX, sigStartY);
    if (signBuf) {
      doc.image(signBuf, sigX, sigStartY + 12, { fit: [180, 60] });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#666').text('(signature on file)', sigX, sigStartY + 30);
    }
    doc.fillColor('#000').font('Helvetica').fontSize(10).text(BRAND.company, sigX, sigStartY + 80);

    // Footer help
    const footerY = doc.page.height - doc.page.margins.bottom - 30;
    doc.font('Helvetica').fontSize(9).fillColor('#666')
      .text(`Need help? Email ${BRAND.emails.join(' or ')} • ${BRAND.website}`, margin, footerY, {
        width: usableW,
        align: 'center'
      });

    doc.end();
  } catch (err) {
    console.error('[admin][proofOfFulfillment]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Unified admin financial feed (payments + tutor withdrawals)
// ?kind=all|payments|withdrawals  (default: all)
export async function listFinancialFeed(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const kind = String(req.query.kind || 'all').toLowerCase();

    const parts = [];

    if (kind === 'all' || kind === 'payments') {
      parts.push(`
        SELECT
          p.id::text                       AS id,
          'payment'                        AS source,
          p.user_id,
          u.email                          AS user_email,
          u.name                           AS user_name,
          p.amount,
          p.currency,
          p.status,
          COALESCE(NULLIF(LOWER(p.payment_method), ''), 'paypal') AS payment_method,
          p.transaction_id                 AS order_id,
          p.capture_id,
          p.mpesa_reference,
          p.payer_email,
          p.phone,
          p.package_id,
          pk.credits,
          pk.offer,
          p.created_at
        FROM payments p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN packages pk ON pk.id = p.package_id
      `);
    }

    if (kind === 'all' || kind === 'withdrawals') {
      parts.push(`
        SELECT
          t.id::text                       AS id,
          'withdrawal'                     AS source,
          t.user_id,
          u.email                          AS user_email,
          u.name                           AS user_name,
          t.amount,
          t.currency,
          t.status,
          LOWER(t.payment_method)          AS payment_method,
          NULL                             AS order_id,
          NULL                             AS capture_id,
          t.reference                      AS mpesa_reference, -- reuse column for display
          NULL                             AS payer_email,
          NULL                             AS phone,
          NULL                             AS package_id,
          NULL                             AS credits,
          NULL                             AS offer,
          t.date                           AS created_at
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        WHERE t.type = 'Withdrawal Request'
      `);
    }

    const unionSql = parts.join(' UNION ALL ');
    const finalSql = `
      ${unionSql}
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const { rows } = await pool.query(finalSql, [limit]);
    return res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error('[admin][listFinancialFeed]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}



export async function listUsers(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const q = String(req.query.q || '').trim().toLowerCase();

    const params = [];
    let i = 1;
    let where = '';

    if (q) {
      where = `WHERE LOWER(u.email) LIKE $${i} OR LOWER(COALESCE(u.name,'')) LIKE $${i}`;
      params.push(`%${q}%`);
      i++;
    }

    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        COALESCE(u.tokens, 0) AS tokens,
        (p.id IS NOT NULL) AS "hasProfile",
        p.id AS "profileId"
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      ${where}
      ORDER BY u.id DESC
      LIMIT $${i}
      `,
      [...params, limit]
    );

    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('[admin][listUsers] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function adminSetRole(req, res) {
  try {
    const { userId, role } = req.body || {};
    const allowed = new Set(['student', 'tutor', 'admin', 'superadmin', null]);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    if (!allowed.has(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, COALESCE(tokens,0) AS tokens',
      [role, userId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    // Does the user have a profile?
    const prof = await pool.query('SELECT id FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    const user = {
      ...rows[0],
      hasProfile: Boolean(prof.rows[0]),
      profileId: prof.rows[0]?.id ?? null,
    };

    return res.json({ success: true, user });
  } catch (err) {
    console.error('[admin][adminSetRole] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function adminAdjustTokens(req, res) {
  try {
    const { userId, op, amount } = req.body || {};
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    let sql;
    if (op === 'add') {
      sql = 'UPDATE users SET tokens = COALESCE(tokens,0) + $1 WHERE id = $2 RETURNING tokens';
    } else if (op === 'sub') {
      sql = 'UPDATE users SET tokens = GREATEST(COALESCE(tokens,0) - $1, 0) WHERE id = $2 RETURNING tokens';
    } else if (op === 'set') {
      sql = 'UPDATE users SET tokens = $1 WHERE id = $2 RETURNING tokens';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid op' });
    }

    const { rows } = await pool.query(sql, [n, userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, tokens: Number(rows[0].tokens) });
  } catch (err) {
    console.error('[admin][adminAdjustTokens] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function adminDeleteUser(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
    const del = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    if (del.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.sendStatus(204);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin][adminDeleteUser] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
}

export async function adminResetPassword(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const email = rows[0].email;
    // Create OTP valid for 10 minutes (reusing your userController logic)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expiry = NOW() + INTERVAL '10 minutes' WHERE id = $2",
      [otp, userId]
    );
    await sendOTP(email, otp);
    return res.json({ success: true });
  } catch (err) {
    console.error('[admin][adminResetPassword] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function adminImpersonateUser(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const token = createToken(userId);
    return res.json({ success: true, token });
  } catch (err) {
    console.error('[admin][adminImpersonateUser] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function upsertPackage(req, res) {
  try {
    const creditsParam = req.params?.credits;
    const {
      credits: bodyCredits,
      priceUSD, priceKES,
      offer = null,
    } = req.body || {};

    // Determine credits value
    const credits = Number(creditsParam ?? bodyCredits);
    if (!Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid credits' });
    }

    const usdPrice = Number(priceUSD);
    const kesPrice = Number(priceKES);
    if (!Number.isFinite(usdPrice) || usdPrice < 0) {
      return res.status(400).json({ success: false, message: 'Invalid USD price' });
    }
    if (!Number.isFinite(kesPrice) || kesPrice < 0) {
      return res.status(400).json({ success: false, message: 'Invalid KES price' });
    }

    // Manual UPSERT without requiring a unique constraint
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updUSD = await client.query(
        `UPDATE packages SET price = $1, offer = $2
           WHERE credits = $3 AND currency = 'USD'
       RETURNING id, credits, price, currency, offer`,
        [usdPrice, offer, credits]
      );
      let usdRow = updUSD.rows[0];
      if (!usdRow) {
        const ins = await client.query(
          `INSERT INTO packages (credits, price, currency, offer)
           VALUES ($1,$2,'USD',$3)
        RETURNING id, credits, price, currency, offer`,
          [credits, usdPrice, offer]
        );
        usdRow = ins.rows[0];
      }

      const updKES = await client.query(
        `UPDATE packages SET price = $1, offer = $2
           WHERE credits = $3 AND currency = 'KES'
       RETURNING id, credits, price, currency, offer`,
        [kesPrice, offer, credits]
      );
      let kesRow = updKES.rows[0];
      if (!kesRow) {
        const ins = await client.query(
          `INSERT INTO packages (credits, price, currency, offer)
           VALUES ($1,$2,'KES',$3)
        RETURNING id, credits, price, currency, offer`,
          [credits, kesPrice, offer]
        );
        kesRow = ins.rows[0];
      }

      await client.query('COMMIT');
      return res.json({
        success: true,
        packages: [usdRow, kesRow],
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[admin][upsertPackage] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * DELETE /api/admin/packages/:credits
 * Deletes BOTH USD & KES rows for a credits tier.
 */
export async function deletePackage(req, res) {
  try {
    const credits = Number(req.params.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid credits' });
    }
    const { rowCount } = await pool.query(
      `DELETE FROM packages WHERE credits = $1`,
      [credits]
    );
    return res.json({ success: true, deleted: rowCount });
  } catch (err) {
    console.error('[admin][deletePackage] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}