// apps/backend/controllers/certificatesController.js
import Joi from 'joi';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import pool from '../config/db.js'; // PG pool
import { generateCertificatePdfBuffer } from '../services/certificateService.js';

// ---------- Validators ----------
const generateSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

// ---------- Helpers ----------
async function hasCourseCompleteAchievement(studentId, courseId) {
  // If you use rule_code, keep it. Otherwise, just check any achievement on that course.
  const q = await pool.query(
    `SELECT 1 FROM achievements
     WHERE student_id = $1 AND course_id = $2
     LIMIT 1`,
    [studentId, courseId]
  );
  return q.rowCount > 0;
}

async function hasCompletedAllWeeks(studentId, courseId) {
  const courseRes = await pool.query(
    `SELECT syllabus FROM courses WHERE id = $1`,
    [courseId]
  );
  if (!courseRes.rowCount) return false;

  const syllabus = courseRes.rows[0].syllabus || [];
  if (!Array.isArray(syllabus) || syllabus.length === 0) return false;

  // Collect weeks expected
  const weeks = syllabus.map((w) => w.week).filter((w) => w != null);

  // Progress table should track per-week status
  const progRes = await pool.query(
    `SELECT week, status FROM course_progress
     WHERE student_id = $1 AND course_id = $2`,
    [studentId, courseId]
  );

  const completedAll = weeks.every((w) =>
    progRes.rows.some((r) => r.week === w && r.status === 'Completed')
  );

  return completedAll;
}

async function isEligibleForCertificate(studentId, courseId) {
  // Strategy: achievements OR all weeks completed
  if (await hasCourseCompleteAchievement(studentId, courseId)) return true;
  if (await hasCompletedAllWeeks(studentId, courseId)) return true;
  return false;
}

// Build a crawler-friendly OG image URL (no client Cloudinary logic).
function buildOgRedirectUrl({ cloudName, certificateId, brandPublicId, student, course }) {
  // We use the PDF's page 1 as a base image and overlay brand & text
  const safeBrand = (brandPublicId || 'branding/logo').replace(/\//g, ':');
  const transforms = [
    'pg_1', 'w_1200,h_630,c_fill',
    `l_${safeBrand},w_180,g_north_west,x_40,y_40`,
  ];

  if (student) {
    const s = encodeURIComponent(student);
    transforms.push(`l_text:Arial_48_bold:${s},g_south_west,x_40,y_120,co_rgb:0D141C`);
  }
  if (course) {
    const c = encodeURIComponent(course);
    transforms.push(`l_text:Arial_36:${c},g_south_west,x_40,y_60,co_rgb:49739C`);
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join('/')}/certificates:${certificateId}.pdf.jpg`;
}

// ---------- Controllers ----------
export async function checkEligibility(req, res) {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const eligible = await isEligibleForCertificate(studentId, courseId);
    res.json({
      eligible,
      reason: eligible ? null : 'Complete all required lessons to unlock the certificate.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listMyCertificates(req, res) {
  try {
    const studentId = req.user.id;
    const { rows } = await pool.query(
      `SELECT * FROM certificates WHERE student_id = $1 ORDER BY issued_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCertificate(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM certificates WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Public verification (no auth)
export async function verifyCertificate(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS student_name, crs.title AS course_title
         FROM certificates c
         JOIN users u    ON u.id   = c.student_id
         JOIN courses crs ON crs.id = c.course_id
        WHERE c.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    return res.json({ valid: true, certificate: rows[0] });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
}

// Public OG image redirect (no auth)
// - Generates a Cloudinary URL with overlays and 302 redirects the crawler/browser.
export async function ogPreview(req, res) {
  try {
    const { id } = req.params;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const brandPublicId = process.env.CERT_LOGO_PUBLIC_ID || 'branding/logo';

    if (!cloudName) {
      return res.status(500).send('Missing CLOUDINARY_CLOUD_NAME in env');
    }

    // (Optional) fetch student & course for nicer text overlays; fallback to minimal
    let student = '';
    let course = '';
    try {
      const { rows } = await pool.query(
        `SELECT u.name AS student_name, crs.title AS course_title
           FROM certificates c
           JOIN users u    ON u.id   = c.student_id
           JOIN courses crs ON crs.id = c.course_id
          WHERE c.id = $1`,
        [id]
      );
      if (rows.length) {
        student = rows[0].student_name || '';
        course  = rows[0].course_title  || '';
      }
    } catch (_) {
      // ignore if DB fails; still show minimal OG
    }

    const url = buildOgRedirectUrl({
      cloudName,
      certificateId: id,
      brandPublicId,
      student,
      course,
    });

    // 302 redirect to actual OG image
    res.redirect(302, url);
  } catch (err) {
    res.status(500).send('OG image unavailable');
  }
}

export async function generateCertificate(req, res) {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const studentId = req.user.id;
    const { courseId } = value;

    // Already exists?
    const existing = await pool.query(
      `SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    if (existing.rowCount > 0) return res.json(existing.rows[0]);

    // Eligibility
    const eligible = await isEligibleForCertificate(studentId, courseId);
    if (!eligible) return res.status(400).json({ error: 'Not eligible for certificate yet' });

    // Names + per-course/tutor signature
    const u = await pool.query(`SELECT name FROM users WHERE id = $1`, [studentId]);
    const c = await pool.query(
      `SELECT title, signature_public_id, tutor_id FROM courses WHERE id = $1`,
      [courseId]
    );
    const studentName = u.rows[0]?.name || 'Student';
    const courseTitle = c.rows[0]?.title || 'Course';
    let tutorSignaturePublicId = c.rows[0]?.signature_public_id || null;

    if (!tutorSignaturePublicId && c.rows[0]?.tutor_id) {
      // Optional: fetch from profiles if you store it there
      try {
        const prof = await pool.query(
          `SELECT signature_public_id FROM profiles WHERE user_id = $1`,
          [c.rows[0].tutor_id]
        );
        tutorSignaturePublicId = prof.rows[0]?.signature_public_id || null;
      } catch (_) {}
    }

    // Create DB row to get UUID
    const inserted = await pool.query(
      `INSERT INTO certificates (id, student_id, course_id, url)
       VALUES (gen_random_uuid(), $1, $2, '')
       RETURNING *`,
      [studentId, courseId]
    );
    const cert = inserted.rows[0];

    // Build a public verification URL (no auth)
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${base}/api/certificates/verify/${cert.id}`;

    // Create in-memory PDF with branding, tutor signature, and QR
    const buffer = await generateCertificatePdfBuffer({
      studentName,
      courseTitle,
      verificationUrl,
      brand: {
        name: process.env.CERT_BRAND_NAME || 'EduConnect',
        logoPublicId: process.env.CERT_LOGO_PUBLIC_ID,           // e.g. branding/logo
        signaturePublicId: process.env.CERT_SIGNATURE_PUBLIC_ID, // registrar/org signature
      },
      tutorSignaturePublicId,
    });

    // Upload to Cloudinary (resource_type raw)
    const url = await new Promise((resolve, reject) => {
  const upload = cloudinary.uploader.upload_stream(
    {
      resource_type: 'raw',     // keep as 'raw' for PDFs
      folder: 'certificates',
      public_id: cert.id,
      format: 'pdf',
    },
    (err, result) => (err ? reject(err) : resolve(result.secure_url))
  );
  Readable.from(buffer).pipe(upload);
});

    const updated = await pool.query(
      `UPDATE certificates SET url = $1 WHERE id = $2 RETURNING *`,
      [url, cert.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('generateCertificate error', err);
    res.status(500).json({ error: err.message });
  }
}
