// apps/backend/controllers/certificatesController.js
import Joi from 'joi';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import axios from 'axios';
import pool from '../config/db.js'; // PG pool
import { generateCertificatePdfBuffer } from '../services/certificateService.js';
import { buildOgRedirectUrlWithSample } from '../services/certificateService.js';

// ---------- Validators ----------
const generateSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
});

// ---------- Utils / Helpers ----------
const isUuid = (v='') =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

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

async function hasOrgCoverForCourse(studentId, courseId) {
  // Prove a submitted, passed org attempt tied to this course
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

function extractPublicIdFromCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    if (!/\.cloudinary\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1);
    const vIdx = afterUpload.findIndex(p => /^v\d+$/i.test(p));
    const afterVersion = vIdx !== -1 ? afterUpload.slice(vIdx + 1) : afterUpload;
    const publicIdWithExt = afterVersion.join('/');
    return publicIdWithExt.replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return null;
  }
}
function publicIdFromPublicIdOrUrl(maybe) {
  if (!maybe) return null;
  return maybe.includes('://') ? extractPublicIdFromCloudinaryUrl(maybe) : maybe;
}


async function hasCourseCompleteAchievement(studentId, courseId) {
  console.time('[cert] hasCourseCompleteAchievement');
  const q = await pool.query(
    `SELECT 1 FROM achievements
     WHERE student_id = $1 AND course_id = $2
     LIMIT 1`,
    [studentId, courseId]
  );
  console.timeEnd('[cert] hasCourseCompleteAchievement');
  return q.rowCount > 0;
}

async function hasCompletedAllWeeks(studentId, courseId) {
  console.time('[cert] hasCompletedAllWeeks:loadCourse');
  const courseRes = await pool.query(`SELECT syllabus FROM courses WHERE id = $1`, [courseId]);
  console.timeEnd('[cert] hasCompletedAllWeeks:loadCourse');
  if (!courseRes.rowCount) return false;

  const syllabus = courseRes.rows[0].syllabus || [];
  if (!Array.isArray(syllabus) || syllabus.length === 0) return false;

  const weeks = syllabus.map((w) => w.week).filter((w) => w != null);

  console.time('[cert] hasCompletedAllWeeks:progress');
  const progRes = await pool.query(
    `SELECT week, status FROM course_progress
     WHERE student_id = $1 AND course_id = $2`,
    [studentId, courseId]
  );
  console.timeEnd('[cert] hasCompletedAllWeeks:progress');

  const completedAll = weeks.every((w) =>
    progRes.rows.some((r) => r.week === w && r.status === 'Completed')
  );

  return completedAll;
}

    async function isEligibleForCertificate(studentId, courseId) {
  console.group('[cert] isEligibleForCertificate');
  const a = await hasCourseCompleteAchievement(studentId, courseId);
  console.log('[cert] hasCourseCompleteAchievement ->', a);
  const b = await hasCompletedAllWeeks(studentId, courseId);
  console.log('[cert] hasCompletedAllWeeks ->', b);
  let c = false;
  try { c = await hasOrgCoverForCourse(studentId, courseId); } catch {}
  console.log('[cert] hasOrgPassedAssignment ->', c);
  console.groupEnd();
  // Eligible if ANY of these are true (achievement OR completed weeks OR org pass)
  return a || b || c;
}
  


// Parse Cloudinary public_id from a secure URL, else null
function publicIdFromCloudinaryUrl(u) {
  try {
    if (!u) return null;
    const url = new URL(u);
    // Expect: /image/upload/<optional transforms>/<publicId>.<ext>
    const parts = url.pathname.split('/');
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx === -1) return null;
    const tail = parts.slice(uploadIdx + 1).join('/');  // "<transforms>/<publicId>.<ext>" OR "<publicId>.<ext>"
    const last = tail.split('/').pop();                 // "<publicId>.<ext>"
    if (!last) return null;
    const publicId = tail.replace(/^(.*\/)?/, '').replace(/\.[a-zA-Z0-9]+$/, ''); // drop transforms + extension
    // If transforms existed, the above loses folders. Safer path:
    const afterUpload = parts.slice(uploadIdx + 1);
    // drop any transformation segments until we hit something with a dot or known folder:
    // We'll rebuild by stripping the final extension only.
    const joined = afterUpload.join('/');
    return joined.replace(/^.*?\/(?=[^/]+\.[a-zA-Z0-9]+$)/, '').replace(/\.[a-zA-Z0-9]+$/, '');
  } catch { return null; }
}

// Get the most recent org (name, logo_url, signature_url, certificate_title) that covered this user/course
async function getOrgBrandForCourse(studentId, courseId) {
  console.time('[cert] getOrgBrandForCourse');
  const q = await pool.query(
    `
      SELECT o.name,
             o.logo_url,
             o.signature_url,
             COALESCE(o.certificate_title, 'Certificate of Completion') AS certificate_title
        FROM org_quiz_attempts q
        JOIN org_course_assignments a ON a.id = q.assignment_id
        JOIN organizations o         ON o.id = COALESCE(a.org_id, q.org_id)
       WHERE q.user_id     = $1
         AND a.course_id   = $2
         AND q.submitted_at IS NOT NULL
         AND q.passed      = TRUE
       ORDER BY q.submitted_at DESC
       LIMIT 1
    `,
    [studentId, courseId]
  );
  console.timeEnd('[cert] getOrgBrandForCourse');

  if (!q.rowCount) {
    console.warn('[cert] getOrgBrandForCourse -> no org brand row found');
    return null;
  }
  const row = q.rows[0];
  console.log('[cert] getOrgBrandForCourse -> org match', {
    name: row.name,
    hasLogo: !!row.logo_url,
    hasSig: !!row.signature_url,
    title: row.certificate_title,
  });
  return row;
}



// ---------- Controllers ----------
export async function checkEligibility(req, res) {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;
    console.log('[cert] checkEligibility', { studentId, courseId });
const a = await hasCourseCompleteAchievement(studentId, courseId);
const b = await hasCompletedAllWeeks(studentId, courseId);

let c = false;
try { c = await hasOrgCoverForCourse(studentId, courseId); } catch (_) {}

const eligible = a || b || c;

let reason = null;
if (!eligible) {
  const missing = [];
  if (!a) missing.push('earn the course completion achievement');
  if (!b) missing.push('complete all required weeks');
  if (!c) missing.push("pass your organization's assignment");

  if (missing.length) {
    const last = missing.pop();
    const joined = missing.length ? `${missing.join(', ')} or ${last}` : last;
    reason = `To unlock your certificate, please ${joined}.`;
  } else {
    reason = 'To unlock your certificate, please meet at least one eligibility condition.';
  }
}

res.json({ eligible, reason });

  } catch (err) {
    logErr('[cert] checkEligibility error', err);
    res.status(500).json({ error: err.message });
  }
}

export async function listMyCertificates(req, res) {
  try {
    const studentId = req.user.id;
    console.log('[cert] listMyCertificates', { studentId });
    console.time('[cert] listMyCertificates:query');

    const { rows } = await pool.query(
      `SELECT * FROM certificates WHERE student_id = $1 ORDER BY issued_at DESC`,
      [studentId]
    );

    console.timeEnd('[cert] listMyCertificates:query');
    console.log('[cert] listMyCertificates -> count', rows.length);
    res.json(rows);
  } catch (err) {
    logErr('[cert] listMyCertificates error', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getCertificate(req, res) {
  try {
    const { id } = req.params;
    console.log('[cert] getCertificate', { id });
     if (!isUuid(id)) {
      return res.status(400).json({ error: 'invalid certificate id' });
    }
    console.time('[cert] getCertificate:query');

    const { rows } = await pool.query(`SELECT * FROM certificates WHERE id = $1`, [id]);

    console.timeEnd('[cert] getCertificate:query');
    if (!rows.length) {
      console.warn('[cert] getCertificate -> not found', { id });
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    logErr('[cert] getCertificate error', err);
    res.status(500).json({ error: err.message });
  }
}

// Public verification (no auth)
export async function verifyCertificate(req, res) {
  try {
    const { id } = req.params;
    console.log('[cert] verifyCertificate', { id });
    console.time('[cert] verifyCertificate:query');

    const { rows } = await pool.query(
      `SELECT c.*, u.name AS student_name, crs.title AS course_title
         FROM certificates c
         JOIN users u    ON u.id   = c.student_id
         JOIN courses crs ON crs.id = c.course_id
        WHERE c.id = $1`,
      [id]
    );

    console.timeEnd('[cert] verifyCertificate:query');
    if (!rows.length) {
      console.warn('[cert] verifyCertificate -> not found', { id });
      return res.status(404).json({ valid: false, error: 'Certificate not found' });
    }
    return res.json({ valid: true, certificate: rows[0] });
  } catch (err) {
    logErr('[cert] verifyCertificate error', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
}

// Public OG image redirect (no auth)
export async function ogPreview(req, res) {
  try {
    const { id } = req.params;
    const cloudName =
      process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
      console.error('[cert] ogPreview missing CLOUDINARY_NAME/CLOUDINARY_CLOUD_NAME');
      return res.status(500).send('Missing Cloudinary cloud name in env');
    }

    // Default fallbacks
    let student = '';
    let course = '';
    let brandPublicId = process.env.CERT_LOGO_PUBLIC_ID || 'branding/logo';

    console.log('[cert] ogPreview start', { id, cloudName, defaultBrandPublicId: brandPublicId });

    // Pull student/course + per-certificate brand logo
    console.time('[cert] ogPreview:lookup');
    const { rows } = await pool.query(
      `SELECT
          u.name AS student_name,
          crs.title AS course_title,
          c.brand_logo_public_id
        FROM certificates c
        JOIN users   u   ON u.id   = c.student_id
        JOIN courses crs ON crs.id = c.course_id
       WHERE c.id = $1
       LIMIT 1`,
      [id]
    );
    console.timeEnd('[cert] ogPreview:lookup');

    if (rows.length) {
      student = rows[0].student_name || '';
      course  = rows[0].course_title || '';
      // Prefer the exact brand public_id saved at generation time
      brandPublicId = rows[0].brand_logo_public_id || brandPublicId;
    } else {
      console.warn('[cert] ogPreview -> certificate not found, using minimal OG', { id });
      // You could return 404 here instead if you prefer:
      // return res.status(404).send('Certificate not found');
    }

    const url = buildOgRedirectUrlWithSample({
      cloudName,
      certificateId: id,
      brandPublicId,
      student,
      course,
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    console.log('[cert] ogPreview redirect', { url, brandPublicId });
    return res.redirect(302, url);
  } catch (err) {
    logErr('[cert] ogPreview error', err);
    return res.status(500).send('OG image unavailable');
  }
}


export async function generateCertificate(req, res) {
  const t0 = Date.now();
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      console.warn('[cert] generateCertificate validation failed', { details: error.message });
      return res.status(400).json({ error: error.message });
    }

    const studentId = req.user.id;
    const { courseId } = value;
    console.log('[cert] generateCertificate start', { studentId, courseId });

    // 0) Quick Cloudinary config sanity log
    const cldcfg = cloudinary.config() || {};
    console.log('[cert] cloudinary config snapshot', {
      cloud_name: cldcfg.cloud_name,
      has_api_key: !!cldcfg.api_key,
      has_api_secret: !!cldcfg.api_secret,
    });

    // 1) If a cert already exists, return it
    console.time('[cert] generate:existing');
    const existing = await pool.query(
      `SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    console.timeEnd('[cert] generate:existing');

    const existingRow = existing.rows[0];

// Compute the org brand we would like to use now (same as later in the handler)
let currentOrgBrand = null;
try { currentOrgBrand = await getOrgBrandForCourse(studentId, courseId); } catch {}
const desiredLogoId = publicIdFromPublicIdOrUrl(
  (currentOrgBrand?.logo_url || process.env.CERT_LOGO_PUBLIC_ID) || ''
);
const hasCorrectBrand =
  existingRow?.brand_logo_public_id &&
  desiredLogoId &&
  existingRow.brand_logo_public_id === desiredLogoId;

if (existing.rowCount > 0 && hasCorrectBrand) {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  console.log('[cert] generateCertificate -> already exists with matching brand, returning row', { id: existingRow.id });
  return res.json({ ...existingRow, download_url: `${base}/api/certificates/${existingRow.id}/download` });
}
// else: fall through to regenerate & overwrite to pick up org branding


    // 2) Eligibility
    console.time('[cert] generate:eligibility');
    const eligible = await isEligibleForCertificate(studentId, courseId);
    console.timeEnd('[cert] generate:eligibility');
    if (!eligible) {
      console.warn('[cert] generateCertificate -> not eligible', { studentId, courseId });
      return res.status(400).json({ error: 'Not eligible for certificate yet' });
    }

    // 2.5) Token-paid issuance gate (unless org covered)
    const orgCovered = await hasOrgCoverForCourse(studentId, courseId).catch(() => false);
    if (process.env.REQUIRE_CERT_TOKENS === 'true' && !orgCovered) {
      console.time('[cert] generate:tokenIssuanceCheck');
      const issuQ = await pool.query(
        `SELECT 1
           FROM ai_certificate_issuances i
          WHERE i.user_id = $1
            AND (i.course_id IS NULL OR i.course_id = $2)
          LIMIT 1`,
        [studentId, courseId]
      );
      console.timeEnd('[cert] generate:tokenIssuanceCheck');

      let legacyOk = false;
      if (!issuQ.rowCount && process.env.ALLOW_LEGACY_CERT_PAY === 'true') {
        console.time('[cert] generate:legacyPaymentCheck]');
        const payQ = await pool.query(
          `
            SELECT 1
              FROM payments
             WHERE user_id = $1
               AND status IN ('succeeded','Completed')
               AND COALESCE(meta->>'purpose','')  = 'certificate'
               AND COALESCE(meta->>'courseId','') = $2
             LIMIT 1
          `,
          [studentId, courseId]
        );
        legacyOk = payQ.rowCount > 0;
        console.timeEnd('[cert] generate:legacyPaymentCheck]');
      }

      if (!issuQ.rowCount && !legacyOk) {
        return res.status(402).json({
          error: 'CERT_PAYMENT_REQUIRED',
          message: 'Please use tokens to claim your certificate first.',
        });
      }
    }

    // 3) Names + per-course/tutor signature
    console.time('[cert] generate:lookupUserCourse');
    const u = await pool.query(`SELECT name FROM users WHERE id = $1`, [studentId]);
    const c = await pool.query(
      `SELECT title, signature_public_id, tutor_id FROM courses WHERE id = $1`,
      [courseId]
    );
    console.timeEnd('[cert] generate:lookupUserCourse');

    const studentName = u.rows[0]?.name || 'Student';
    const courseTitle = c.rows[0]?.title || 'Course';
    let tutorSignaturePublicId = c.rows[0]?.signature_public_id || null;

    if (!tutorSignaturePublicId && c.rows[0]?.tutor_id) {
      try {
        console.time('[cert] generate:lookupTutorSig');
        const prof = await pool.query(
          `SELECT signature_public_id FROM profiles WHERE user_id = $1`,
          [c.rows[0].tutor_id]
        );
        console.timeEnd('[cert] generate:lookupTutorSig');
        tutorSignaturePublicId = prof.rows[0]?.signature_public_id || null;
      } catch (e) {
        console.warn('[cert] tutor signature lookup failed', e?.message);
      }
    }

    // 3.5) Org branding override (if user/course was covered by an org)
    let orgBrand = null;
    try {
      orgBrand = await getOrgBrandForCourse(studentId, courseId);
    } catch (e) {
      console.warn('[cert] org brand lookup failed', e?.message);
    }

    // Prefer org values; fall back to ENV
    const brandName =
      (orgBrand?.name && String(orgBrand.name).trim()) ||
      process.env.CERT_BRAND_NAME ||
      'DayBreak Academy';

    // Accept public_id OR full URL (the PDF service handles both)
    const logoSource = orgBrand?.logo_url || process.env.CERT_LOGO_PUBLIC_ID;
    const registrarSigSource = orgBrand?.signature_url || process.env.CERT_SIGNATURE_PUBLIC_ID;

    const headerTitle = orgBrand?.certificate_title || 'Certificate of Completion';

    // Build a single brand object so we reuse it for PDF and OG storage
    const brand = {
      name: brandName,
      logoPublicId: logoSource,
      signaturePublicId: registrarSigSource,
    };

    // 4) Create DB row to get UUID (handle rare duplicate by reselecting)
    console.time('[cert] generate:insertRow');
    let inserted;
    try {
      inserted = await pool.query(
        `INSERT INTO certificates (id, student_id, course_id, url)
         VALUES (gen_random_uuid(), $1, $2, '')
         RETURNING *`,
        [studentId, courseId]
      );
    } catch (e) {
      console.warn('[cert] insert race? reselecting existing row', e?.message);
      inserted = await pool.query(
        `SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2`,
        [studentId, courseId]
      );
      if (inserted.rowCount === 0) throw e; // real error
    }
    console.timeEnd('[cert] generate:insertRow');

    const cert = inserted.rows[0];
    console.log('[cert] generateCertificate inserted row', { certId: cert.id });

    // 5) Build a public verification URL (no auth)
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${base}/api/certificates/verify/${cert.id}`;

    // 6) Create in-memory PDF (branded for org when present)
    console.time('[cert] generate:renderPdf');
    const buffer = await generateCertificatePdfBuffer({
      studentName,
      courseTitle,
      verificationUrl,
      titleText: headerTitle,
      brand, // <-- unified brand payload
      tutorSignaturePublicId,
      tiledWatermark: true,
    });
    console.timeEnd('[cert] generate:renderPdf');
    console.log('[cert] pdf buffer bytes', { size: buffer?.byteLength ?? 0 });

    if (!buffer || !buffer.length) {
      console.error('[cert] empty PDF buffer generated');
      return res.status(500).json({ error: 'Failed to generate certificate PDF' });
    }

    // 7) Upload to Cloudinary
    console.time('[cert] generate:cloudinaryUpload');
    const uploadPromise = new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image', // supports pg_1 & overlays on PDFs
          folder: 'certificates',
          public_id: cert.id,
          format: 'pdf',
          overwrite: true,
        },
        (err, result) => {
          if (err) {
            console.error('[cert] cloudinary upload error', err);
            reject(err);
          } else {
            console.log('[cert] cloudinary upload success', {
              public_id: result?.public_id,
              version: result?.version,
              secure_url: result?.secure_url,
            });
            resolve(result.secure_url);
          }
        }
      );
      Readable.from(buffer).pipe(upload);
    });

    const uploadTimeoutMs = Number(process.env.CERT_UPLOAD_TIMEOUT_MS || 45000);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cloudinary upload timed out')), uploadTimeoutMs)
    );

    const url = await Promise.race([uploadPromise, timeoutPromise]);
    console.timeEnd('[cert] generate:cloudinaryUpload');

    if (!url) {
      console.error('[cert] upload returned empty url');
      return res.status(502).json({ error: 'Upload failed' });
    }

    // 8) Save URL + per-certificate brand logo public_id for OG previews
    // Prefer a real public_id derived from what we actually used; fallback to env default.
    const brandLogoPublicIdForOg =
      publicIdFromPublicIdOrUrl(brand.logoPublicId) ||
      process.env.CERT_LOGO_PUBLIC_ID ||
      'branding/logo';

    console.time('[cert] generate:updateUrl');
    const updated = await pool.query(
      `UPDATE certificates
          SET url = $1,
              brand_logo_public_id = $2
        WHERE id = $3
      RETURNING *`,
      [url, brandLogoPublicIdForOg, cert.id]
    );
    console.timeEnd('[cert] generate:updateUrl');

    const row = updated.rows[0];
    const download_url = `${base}/api/certificates/${row.id}/download`;

    console.log('[cert] generateCertificate done', {
      certId: cert.id,
      totalMs: Date.now() - t0,
    });

    return res.json({ ...row, download_url });
  } catch (err) {
    try {
      const cfg = cloudinary.config();
      console.error('[cert] generateCertificate error', err, {
        cloudinary_cloud_name: cfg?.cloud_name,
        has_api_key: !!cfg?.api_key,
        has_api_secret: !!cfg?.api_secret,
      });
    } catch {
      console.error('[cert] generateCertificate error (no cfg)', err);
    }
    return res.status(500).json({ error: err?.message || 'Failed to generate certificate' });
  }
}

export async function downloadCertificate(req, res) {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    console.log('[cert] downloadCertificate start', { studentId, id });

    console.time('[cert] download:lookup');
    const { rows } = await pool.query(
      `SELECT id, student_id, course_id, url
         FROM certificates
        WHERE id = $1`,
      [id]
    );
    console.timeEnd('[cert] download:lookup');

    if (!rows.length) {
      console.warn('[cert] downloadCertificate -> not found', { id });
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = rows[0];
    if (cert.student_id !== studentId) {
      console.warn('[cert] downloadCertificate -> forbidden', { studentId, owner: cert.student_id });
      return res.status(403).json({ error: 'Not allowed to download this certificate' });
    }
    if (!cert.url) {
      console.warn('[cert] downloadCertificate -> empty url', { id });
      return res.status(400).json({ error: 'Certificate has no file URL yet' });
    }

    // Friendly filename
    let suggestedFilename = `certificate-${cert.id}.pdf`;
    try {
      console.time('[cert] download:courseTitle');
      const meta = await pool.query(`SELECT title FROM courses WHERE id = $1`, [cert.course_id]);
      console.timeEnd('[cert] download:courseTitle');
      if (meta.rowCount) {
        const clean = String(meta.rows[0].title || 'course')
          .replace(/[^\w\s.-]+/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase();
        suggestedFilename = `${clean}-${cert.id}.pdf`;
      }
    } catch (e) {
      console.warn('[cert] download:courseTitle lookup failed', e?.message);
    }

    const streamUrlToClient = async (url, note = 'plain') => {
      console.log('[cert] streaming from Cloudinary', { note, url });
      console.time(`[cert] download:cloudinaryFetch:${note}`);
      const upstream = await axios.get(url, {
        responseType: 'stream',
        validateStatus: () => true,
      });
      console.timeEnd(`[cert] download:cloudinaryFetch:${note}`);

      if (upstream.status !== 200) {
        const xErr = upstream.headers?.['x-cld-error'];
        const err = new Error(xErr ? `Cloudinary error: ${xErr}` : `Upstream fetch failed (${upstream.status})`);
        err.status = upstream.status;
        throw err;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${suggestedFilename}"`);

      const len = upstream.headers['content-length'];
      if (len) res.setHeader('Content-Length', len);

      upstream.data.on('error', (e) => {
        logErr('[cert] stream error', e);
        if (!res.headersSent) res.status(502).end('Failed to fetch certificate file');
        else res.end();
      });

      upstream.data.pipe(res);
    };

    try {
      // Try public delivery
      await streamUrlToClient(cert.url, 'public');
      console.log('[cert] downloadCertificate success (public)', { id });
      return;
    } catch (e) {
      if (e?.status !== 401) {
        logErr('[cert] downloadCertificate upstream error (non-401)', e);
        throw e;
      }

      // ACL / authenticated delivery → sign and retry (robust)
const cfg = cloudinary.config() || {};
if (!cfg.api_key || !cfg.api_secret) {
  console.error('[cert] Missing Cloudinary API credentials for private download URL', {
    cloud_name: cfg.cloud_name,
    has_api_key: !!cfg.api_key,
    has_api_secret: !!cfg.api_secret,
  });
  return res.status(502).json({
    error:
      'Cloudinary private download requires API credentials. Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET and restart the server.',
  });
}

// Derive public_id, e.g. "certificates/<uuid>"
let publicId = null;
try {
  const urlObj = new URL(cert.url);
  const parts = urlObj.pathname.split('/');
  const idx = parts.findIndex((p) => p === 'certificates');
  if (idx >= 0 && parts[idx + 1]) {
    publicId = `certificates/${parts[idx + 1].replace(/\.pdf$/i, '')}`;
  }
} catch (_) {}
if (!publicId) {
  console.warn('[cert] Could not parse public_id from URL; using DB id fallback');
  publicId = `certificates/${cert.id}`;
}

const tryPrivateDownload = async (dlType) => {
  const privateUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'image',          // you uploaded as resource_type image
    type: dlType,                    // 'upload' | 'authenticated' | 'private'
    attachment: true,
    attachment_filename: suggestedFilename,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    sign_url: true,
  });
  console.log('[cert] streaming via private_download_url', { publicId, type: dlType });
  await streamUrlToClient(privateUrl, `private-download-${dlType}`);
};

// Try types in order; many setups will be 'authenticated'
const typesToTry = ['upload', 'authenticated', 'private'];
let ok = false;
for (const t of typesToTry) {
  try {
    await tryPrivateDownload(t);
    ok = true;
    console.log('[cert] downloadCertificate success (private-download)', { id, type: t });
    break;
  } catch (e2) {
    if (e2?.status && e2.status !== 404 && e2.status !== 401) throw e2; // non-ACL/non-not-found error
    console.warn('[cert] private_download_url failed; trying next type', { type: t, status: e2?.status });
  }
}

if (!ok) {
  // Final fallback: build a signed delivery URL for type 'authenticated' (works when folder is authenticated)
  // You can include the version from the stored URL to avoid cache issues.
  const urlObj = new URL(cert.url);
  const verMatch = urlObj.pathname.match(/\/v(\d+)\//);
  const version = verMatch ? verMatch[1] : undefined;

  const signedDeliveryUrl = cloudinary.utils.url(publicId, {
    resource_type: 'image',
    type: 'authenticated',
    format: 'pdf',
    sign_url: true,
    version, // include if present
    // Force attachment filename client-side by setting header here instead of fl_attachment in URL:
    // we already set Content-Disposition on the response, so no need to add flags.
  });

  console.log('[cert] streaming via signed delivery URL (authenticated)', { publicId, version });
  await streamUrlToClient(signedDeliveryUrl, 'signed-delivery-authenticated');
  console.log('[cert] downloadCertificate success (signed-delivery)', { id });
}
    }
  } catch (err) {
    logErr('[cert] downloadCertificate error', err);
    const status = (err && err.status) || 500;
    return res.status(status).json({ error: err?.message || 'Download failed' });
  }
}

// Authenticated: poll current user’s certificate status for a course
export async function getCertificateStatus(req, res) {
  try {
    const studentId = req.user.id;
    const { courseId } = req.query;
    console.log('[cert] getCertificateStatus', { studentId, courseId });
    if (!isUuid(courseId)) {
      return res.status(400).json({ error: 'invalid courseId' });
    }

    console.time('[cert] status:query');
    const r = await pool.query(
      `SELECT id, url, created_at, issued_at
         FROM certificates
        WHERE student_id = $1 AND course_id = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [studentId, courseId]
    );
    console.timeEnd('[cert] status:query');

    if (r.rowCount === 0) {
      return res.json({ status: 'none' });
    }
    const row = r.rows[0];
    // url present → uploaded → ready
    const status = row.url ? 'ready' : 'processing';
    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const download_url = row.url ? `${base}/api/certificates/${row.id}/download` : null;
    return res.json({
      status,
      id: row.id,
      url: row.url,
      download_url,
      created_at: row.created_at,
      issued_at: row.issued_at
    });
  } catch (err) {
    logErr('[cert] getCertificateStatus error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

