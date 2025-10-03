// apps/backend/controllers/transcriptsController.js
import Joi from 'joi';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import axios from 'axios';
import pool from '../config/db.js';
import { generateTranscriptPdfBuffer, buildTranscriptOgUrl } from '../services/transcriptService.js';

const genSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

function logErr(tag, err, extra = {}) {
  const x = (err && err.response && err.response.headers) || {};
  const xCld = x['x-cld-error'] || x['X-Cld-Error'];
  console.error(tag, {
    message: err?.message,
    status: err?.status || err?.response?.status,
    x_cld_error: xCld,
    stack: err?.stack,
    ...extra,
  });
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
async function hasOrgCoverForCourse(studentId, courseId) {
  const q = await pool.query(
    `
      SELECT 1
        FROM org_quiz_attempts q
        JOIN org_course_assignments a ON a.id = q.assignment_id
       WHERE q.user_id = $1
         AND q.submitted_at IS NOT NULL
         AND q.passed = TRUE
         AND a.course_id = $2
       LIMIT 1
    `,
    [studentId, courseId]
  );
  return q.rowCount > 0;
}

// ─────────────────────────────────────────────────────────
// POST /api/transcripts/generate
// ─────────────────────────────────────────────────────────
export async function generateTranscript(req, res) {
  const t0 = Date.now();
  try {
    const { error, value } = genSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const studentId = req.user.id;
    const { courseId } = value;

    // ── Gating (Option B strict):
    //  A) Org-covered, OR
    //  B) Extended token issuance for this user/course, OR
    //  C) Fiat cert payment (if REQUIRE_CERT_PAYMENT=true)
    const orgCovered = await hasOrgCoverForCourse(studentId, courseId).catch(() => false);

    if (!orgCovered) {
      // B) Extended token issuance (strict)
      const tokenIssuanceQ = await pool.query(
        `SELECT 1
           FROM ai_certificate_issuances
          WHERE user_id = $1
            AND (course_id IS NULL OR course_id = $2)
            AND (includes_transcript = TRUE OR kind = 'extended')
          LIMIT 1`,
        [studentId, courseId]
      );

      // C) Fiat (optional) – only if explicitly enabled
      let fiatPaidQ = { rowCount: 0 };
      if (process.env.REQUIRE_CERT_PAYMENT === 'true') {
        fiatPaidQ = await pool.query(
          `
            SELECT 1
              FROM payments
             WHERE user_id = $1
               AND status IN ('succeeded','Completed')
               AND (
                     payment_method IN ('PayPal','M-Pesa')
                  OR provider IN ('paypal','mpesa')
               )
               AND COALESCE(meta->>'purpose','')  = 'certificate'
               AND COALESCE(meta->>'courseId','') = $2
             LIMIT 1
          `,
          [studentId, courseId]
        );
      }

      const allowed = tokenIssuanceQ.rowCount > 0 || fiatPaidQ.rowCount > 0;
      if (!allowed) {
        return res.status(402).json({
          error: 'CERT_PAYMENT_REQUIRED',
          message:
            'Please claim the Extended token SKU (or complete the certificate payment) to unlock the transcript.',
        });
      }
    }

    // Fetch names/courses
    const u = await pool.query(`SELECT name FROM users WHERE id = $1`, [studentId]);
    const c = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
    const studentName = u.rows[0]?.name || 'Student';
    const courseTitle = c.rows[0]?.title || 'Course';

    // Scores
    let overallPct = 0;
    let passMark = 70;
    try {
      const g = await pool.query(
        `SELECT score_pct, pass_mark
           FROM grades
          WHERE user_id = $1 AND course_id = $2
          ORDER BY created_at DESC LIMIT 1`,
        [studentId, courseId]
      );
      if (g.rowCount) {
        overallPct = Number(g.rows[0].score_pct || 0);
        passMark = Number(g.rows[0].pass_mark || 70);
      }
    } catch {}

    const sections = [
      {
        sectionTitle: 'Quiz',
        items: [{ label: 'Overall Quiz Score', scorePct: overallPct }],
      },
    ];

    // Upsert transcript row to get UUID
    let inserted;
    try {
      inserted = await pool.query(
        `INSERT INTO transcripts (id, student_id, course_id, url)
         VALUES (gen_random_uuid(), $1, $2, '')
         RETURNING *`,
        [studentId, courseId]
      );
    } catch (e) {
      // Safe reselect without created_at dependency
      inserted = await pool.query(
        `SELECT * FROM transcripts WHERE student_id = $1 AND course_id = $2 LIMIT 1`,
        [studentId, courseId]
      );
      if (inserted.rowCount === 0) throw e;
    }
    const tr = inserted.rows[0];

    // Public verify URL (transcripts)
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${base}/api/transcripts/verify/${tr.id}`;

    // Render transcript PDF
    const buffer = await generateTranscriptPdfBuffer({
      studentName,
      studentId,
      courseTitle,
      courseId,
      overallPct,
      passMark,
      sections,
      verificationUrl: verifyUrl,
    });
    if (!buffer?.length) return res.status(500).json({ error: 'Failed to render transcript' });

    // Upload to Cloudinary as PDF
    const uploadUrl = await new Promise((resolve, reject) => {
      const up = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'transcripts',
          public_id: tr.id,
          format: 'pdf',
          overwrite: true,
        },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      );
      Readable.from(buffer).pipe(up);
    });

    // Save URL and return download_url
    const updated = await pool.query(
      `UPDATE transcripts SET url = $1 WHERE id = $2 RETURNING *`,
      [uploadUrl, tr.id]
    );
    const row = updated.rows[0];
    const download_url = `${base}/api/transcripts/${row.id}/download`;

    console.log('[transcript] done', { id: row.id, ms: Date.now() - t0 });
    return res.json({ ...row, download_url });
  } catch (err) {
    logErr('[transcript] generate error', err);
    return res.status(500).json({ error: err?.message || 'Transcript generation failed' });
  }
}

// ─────────────────────────────────────────────────────────
// GET /api/transcripts/verify/:id  (public)
// ─────────────────────────────────────────────────────────
export async function verifyTranscript(req, res) {
  try {
    const { id } = req.params;
    const q = await pool.query(
      `SELECT t.*, u.name AS student_name, crs.title AS course_title
         FROM transcripts t
         JOIN users   u   ON u.id   = t.student_id
         JOIN courses crs ON crs.id = t.course_id
        WHERE t.id = $1 LIMIT 1`,
      [id]
    );
    if (!q.rowCount) return res.status(404).json({ valid: false, error: 'Transcript not found' });
    return res.json({ valid: true, transcript: q.rows[0] });
  } catch (err) {
    logErr('[transcript] verify error', err);
    return res.status(500).json({ valid: false, error: err?.message || 'server_error' });
  }
}

// ─────────────────────────────────────────────────────────
// GET /api/transcripts/:id/og  (public preview → big “SAMPLE”)
// ─────────────────────────────────────────────────────────
export async function ogPreviewTranscript(req, res) {
  try {
    const { id } = req.params;
    const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return res.status(500).send('Missing Cloudinary cloud name');

    const q = await pool.query(
      `SELECT t.id, u.name AS student_name, crs.title AS course_title
         FROM transcripts t
         JOIN users   u   ON u.id   = t.student_id
         JOIN courses crs ON crs.id = t.course_id
        WHERE t.id = $1 LIMIT 1`,
      [id]
    );

    const row = q.rows[0] || {};
    const url = buildTranscriptOgUrl({
      cloudName,
      transcriptId: id,
      brandPublicId: process.env.CERT_LOGO_PUBLIC_ID || 'branding/logo',
      student: row.student_name || '',
      course: row.course_title || '',
    });

    // Allow cross-origin embedding of the redirected image
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return res.redirect(302, url);
  } catch (err) {
    logErr('[transcript] og error', err);
    return res.status(500).send('OG image unavailable');
  }
}

// ─────────────────────────────────────────────────────────
// GET /api/transcripts/:id/download  (auth)
// ─────────────────────────────────────────────────────────
export async function downloadTranscript(req, res) {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT id, student_id, course_id, url FROM transcripts WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transcript not found' });

    const tr = rows[0];
    if (tr.student_id !== studentId) return res.status(403).json({ error: 'Forbidden' });
    if (!tr.url) return res.status(400).json({ error: 'Transcript has no file URL yet' });

    const streamUrlToClient = async (url, note = 'plain') => {
      const up = await axios.get(url, { responseType: 'stream', validateStatus: () => true });
      if (up.status !== 200) {
        const e = new Error(up.headers?.['x-cld-error'] || `Upstream error ${up.status}`);
        e.status = up.status;
        throw e;
      }
      const filename = `transcript-${tr.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
      up.data.pipe(res);
    };

    try {
      await streamUrlToClient(tr.url, 'public');
      return;
    } catch (e) {
      const cfg = cloudinary.config() || {};
      if (!cfg.api_key || !cfg.api_secret) {
        return res.status(502).json({ error: 'Cloudinary private download needs API credentials.' });
      }
      let publicId = null;
      try {
        const u = new URL(tr.url);
        const parts = u.pathname.split('/');
        const i = parts.findIndex((p) => p === 'transcripts');
        if (i >= 0 && parts[i + 1]) publicId = `transcripts/${parts[i + 1].replace(/\.pdf$/i, '')}`;
      } catch {}
      publicId = publicId || `transcripts/${tr.id}`;

      const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
        resource_type: 'image',
        type: 'authenticated',
        attachment: true,
        attachment_filename: `transcript-${tr.id}.pdf`,
        expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
        sign_url: true,
      });
      await streamUrlToClient(signedUrl, 'signed');
    }
  } catch (err) {
    logErr('[transcript] download error', err);
    return res.status(err?.status || 500).json({ error: err?.message || 'Download failed' });
  }
}
