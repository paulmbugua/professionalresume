// apps/backend/controllers/adminController.js
import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';
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
    const emailRaw  = (req.query.email || '').toString().trim();
    const email     = emailRaw ? emailRaw.toLowerCase() : null;

    if (!captureId) {
      return res.status(400).json({ success:false, message:'captureId required' });
    }

    // ── Load payment/user/package (email optional; matches app or payer email)
    const params = [captureId, email];
    const { rows } = await pool.query(
      `
      SELECT
        p.id AS payment_id,
        p.transaction_id AS order_id,
        p.capture_id,
        p.status,
        p.amount,
        p.currency,
        p.payment_method,
        p.user_id,
        u.email AS user_email,
        u.name  AS user_name,
        COALESCE(u.tokens,0) AS user_tokens_current,
        p.payer_email,
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
      WHERE p.capture_id = $1
        AND (
          $2::text IS NULL
          OR LOWER(u.email) = $2
          OR LOWER(COALESCE(p.payer_email,'')) = $2
        )
      LIMIT 1
      `,
      params
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success:false, message:'No record found for that captureId (and email, if provided)' });
    }

    const shortNote = `Digital tokens delivered instantly after PayPal capture ${row.capture_id}. Credited +${row.package_credits || '?'} tokens to ${row.user_email}.`;

    // ── Decide JSON vs PDF
    const wantsPdf =
      String(req.query.format || '').toLowerCase() === 'pdf' ||
      req.accepts(['application/pdf', 'json']) === 'application/pdf';

    if (!wantsPdf) {
      const sqlOneRow = `
SELECT
  p.id AS payment_id, p.transaction_id AS order_id, p.capture_id, p.status,
  p.amount, p.currency, p.payment_method, p.user_id,
  u.email AS user_email, u.tokens AS user_tokens_current,
  p.payer_email,
  p.package_id, pk.credits AS package_credits, pk.price AS package_price, pk.currency AS package_price_currency, pk.offer AS package_offer,
  p.created_at, p.updated_at
FROM payments p
JOIN users u ON u.id = p.user_id
LEFT JOIN packages pk ON pk.id = p.package_id
WHERE p.capture_id = '${captureId}'${email ? ` AND (LOWER(u.email) = '${email}' OR LOWER(COALESCE(p.payer_email,'')) = '${email}')` : ''} LIMIT 1;`.trim();

      return res.json({ success:true, shortNote, proof: row, copyPasteSQL: sqlOneRow });
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
      } catch { return null; }
    }

    // Preload images (non-blocking if they fail)
    const [logoBuf, signBuf] = await Promise.all([
      fetchBuffer(LOGO_URL),
      fetchBuffer(SIGN_URL),
    ]);

    // ────────────────────────────────────────────────────────────────────────────
    //                                PDF LAYOUT
    // ────────────────────────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DayBreak_Receipt_${row.capture_id}.pdf"`
    );

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
    doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(16)
      .text(BRAND.company, margin + 72, headerY + 6, { width: usableW - 72 - 160 });
    doc.font('Helvetica').fontSize(10)
      .text(`${BRAND.platform} • ${BRAND.website}`, margin + 72, headerY + 28);

    // "RECEIPT" label (right)
    doc.font('Helvetica-Bold').fontSize(20)
      .text('RECEIPT', margin + usableW - 120, headerY + 10, { width: 120, align: 'right' });

    // Date below label
    doc.font('Helvetica').fontSize(9)
      .text(new Date(row.created_at).toLocaleString(), margin + usableW - 170, headerY + 36, { width: 170, align: 'right' });

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
    doc.text(`Order ID: ${row.order_id}`, rightX, doc.y + 2);
    doc.text(`Capture ID: ${row.capture_id}`, rightX);
    doc.text(`Status: ${row.status}`, rightX);
    doc.text(`Method: ${row.payment_method}`, rightX);
    doc.text(`Amount: ${row.currency} ${Number(row.amount).toFixed(2)}`, rightX);

    // Buyer block
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(12).text('Buyer');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Name: ${row.user_name || '—'}`);
    doc.text(`Account Email: ${row.user_email}`);
    doc.text(`PayPal Payer Email: ${row.payer_email || '—'}`);

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
      'Notes: Tokens were credited to the buyer account automatically once PayPal capture succeeded.',
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
      .text(`Need help? Email ${BRAND.emails.join(' or ')} • ${BRAND.website}`, margin, footerY, { width: usableW, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[admin][proofOfFulfillment]', err);
    return res.status(500).json({ success:false, message:'Server error' });
  }
}
