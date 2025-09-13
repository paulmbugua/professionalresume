import pool from '../config/db.js';

export async function listIssuedCertificates(req, res) {
  const L = Math.min(Number(req.query.limit) || 50, 200);
  const O = Math.max(Number(req.query.offset) || 0, 0);

  const sql = `
    SELECT id,
           student_id,
           course_id,
           url,
           issued_at,
           quiz_attempt_id,
           status,
           created_at
    FROM public.certificates
    ORDER BY COALESCE(issued_at, created_at) DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const { rows } = await pool.query(sql, [L, O]);
    res.json({ ok: true, items: rows });
  } catch (err) {
    const missing = /relation "([^"]+)"/i.exec(err.message)?.[1];
    console.error('[certs.list] SQL failed', { code: err.code, missing, sql });
    const msg = err.code === '42P01'
      ? `Missing relation${missing ? `: ${missing}` : ''}.`
      : 'Failed to list certificates.';
    res.status(500).json({ ok: false, error: msg });
  }
}

// POST /api/ai/certificates/issue { code, courseId? }
// Deducts tokens; creates issuance row.
export async function issueCertificate(req, res) {
  const userId = req.user?.id;
  const { code, courseId } = req.body || {};
  if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  if (!code)   return res.status(400).json({ ok: false, message: 'Missing certificate code' });

  try {
    const certQ = await pool.query(
      `SELECT id, price_tokens FROM ai_certificates WHERE code = $1 AND active = true`,
      [code]
    );
    if (!certQ.rowCount) {
      return res.status(404).json({ ok: false, message: 'Certificate not found/active' });
    }
    const cert = certQ.rows[0];
    const priceTokens = Number(cert.price_tokens);

    // ─────────────────────────────────────────────────────────────
    // Org coverage: if user passed an org attempt, don't charge
    // ─────────────────────────────────────────────────────────────
    const cov = await pool.query(
      `SELECT 1
         FROM org_quiz_attempts
        WHERE user_id=$1
          AND (submitted_at IS NOT NULL)
          AND passed = TRUE
        ORDER BY submitted_at DESC
        LIMIT 1`,
      [userId]
    );

    if (cov.rowCount) {
      // Covered by org → DON'T charge tokens; still record issuance
      const ins = await pool.query(
        `INSERT INTO ai_certificate_issuances (user_id, course_id, certificate_id, price_tokens)
         VALUES ($1, $2, $3, 0)
         RETURNING id, created_at`,
        [userId, courseId ?? null, cert.id]
      );
      return res.status(200).json({
        ok: true,
        issuanceId: ins.rows[0].id,
        createdAt: ins.rows[0].created_at,
        debitedTokens: 0,
        coveredByOrg: true,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Normal tokens flow
    // ─────────────────────────────────────────────────────────────
    await pool.query('BEGIN');

    const uQ = await pool.query('SELECT tokens FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!uQ.rowCount) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    const current = Number(uQ.rows[0].tokens);
    if (current < priceTokens) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ ok: false, message: 'Insufficient tokens' });
    }

    await pool.query('UPDATE users SET tokens = tokens - $1 WHERE id = $2', [priceTokens, userId]);

    const ins = await pool.query(
      `INSERT INTO ai_certificate_issuances (user_id, course_id, certificate_id, price_tokens)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, courseId ?? null, cert.id, priceTokens]
    );

    await pool.query('COMMIT');
    return res.status(200).json({
      ok: true,
      issuanceId: ins.rows[0].id,
      createdAt: ins.rows[0].created_at,
      debitedTokens: priceTokens,
    });
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[aiCert] issueCertificate:', e);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

// New: return token-priced SKUs (what the frontend expects)
export async function listAICertificateSKUs(req, res) {
  const { rows } = await pool.query(
    `SELECT id, code, title, price_tokens
       FROM ai_certificates
      WHERE active = true
      ORDER BY id DESC`
  );
  res.json({ ok: true, data: rows });
}