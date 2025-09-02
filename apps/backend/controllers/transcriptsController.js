// apps/backend/controllers/transcriptsController.js
import Joi from 'joi';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import axios from 'axios';
import pool from '../config/db.js';
import { generateTranscriptPdfBuffer } from '../services/transcriptService.js';

const genSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

/** same helper as certs */
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

export async function generateTranscript(req, res) {
  const t0 = Date.now();
  try {
    const { error, value } = genSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const studentId = req.user.id;
    const { courseId } = value;

    // 1) Reuse certificate payment (your request)
    if (process.env.REQUIRE_CERT_PAYMENT === 'true') {
      const payQ = await pool.query(
        `
          SELECT id
            FROM payments
           WHERE user_id = $1
             AND status = 'succeeded'
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
      if (payQ.rowCount === 0) {
        return res.status(402).json({
          error: 'CERT_PAYMENT_REQUIRED',
          message: 'Please complete the certificate payment to download the transcript.',
        });
      }
    }

    // 2) Pull score & details from your data
    //    We look at latest graded attempt in a simple way (adapt as needed).
    const u = await pool.query(`SELECT name FROM users WHERE id = $1`, [studentId]);
    const c = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);

    const studentName = u.rows[0]?.name || 'Student';
    const courseTitle = c.rows[0]?.title || 'Course';

    // If you persist quiz attempts, compute real numbers.
    // Here, try from course_progress or grades table; fallback to 0 if missing.
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
        passMark   = Number(g.rows[0].pass_mark || 70);
      }
    } catch (_) {}

    // Optional breakdown: pull per-question (if you store), here is a light fallback
    const sections = [{
      sectionTitle: 'Quiz',
      items: [
        { label: 'Overall Quiz Score', scorePct: overallPct },
      ],
    }];

    // 3) Insert a row so we have a UUID public_id for Cloudinary
    let inserted;
    try {
      inserted = await pool.query(
        `INSERT INTO transcripts (id, student_id, course_id, url)
         VALUES (gen_random_uuid(), $1, $2, '')
         RETURNING *`,
        [studentId, courseId]
      );
    } catch (e) {
      // idempotency: if exists, just reuse
      inserted = await pool.query(
        `SELECT * FROM transcripts WHERE student_id = $1 AND course_id = $2 LIMIT 1`,
        [studentId, courseId]
      );
      if (inserted.rowCount === 0) throw e;
    }
    const row0 = inserted.rows[0];
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${base}/api/certificates/verify/${row0.id}`; // reuse verifier page; you can create /transcripts/verify if you prefer

    // 4) Render watermarked transcript
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

    // 5) Upload to Cloudinary as PDF, same pattern as certificates
    const uploadUrl = await new Promise((resolve, reject) => {
      const up = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'transcripts',
          public_id: row0.id,
          format: 'pdf',
          overwrite: true,
        },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      );
      Readable.from(buffer).pipe(up);
    });

    // 6) Save URL
    const updated = await pool.query(
      `UPDATE transcripts SET url = $1 WHERE id = $2 RETURNING *`,
      [uploadUrl, row0.id]
    );

    const row = updated.rows[0];
    const download_url = `${base}/api/transcripts/${row.id}/download`;
    return res.json({ ...row, download_url });
  } catch (err) {
    logErr('[transcript] generate error', err);
    return res.status(500).json({ error: err?.message || 'Transcript generation failed' });
  } 
    
  
}

export async function getTranscript(req, res) {
  try {
    const { id } = req.params;
    const q = await pool.query(`SELECT * FROM transcripts WHERE id = $1`, [id]);
    if (!q.rowCount) return res.status(404).json({ error: 'Not found' });
    return res.json(q.rows[0]);
  } catch (err) {
    logErr('[transcript] get error', err);
    return res.status(500).json({ error: err?.message });
  }
}

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

    const streamUrlToClient = async (url) => {
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
      await streamUrlToClient(tr.url); // public
      return;
    } catch (e) {
      // sign (same as certificates)
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
      await streamUrlToClient(signedUrl);
    }
  } catch (err) {
    logErr('[transcript] download error', err);
    return res.status(err?.status || 500).json({ error: err?.message || 'Download failed' });
  }
}
