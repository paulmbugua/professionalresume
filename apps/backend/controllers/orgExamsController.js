// apps/backend/controllers/orgExamsController.js
import 'dotenv/config';
import pool from '../config/db.js';
import { requireOrgTier } from '../utils/orgTierGuard.js';
import { getStudentExamCard } from '../services/orgExamCardService.js';
import { renderOrgExamStudentCardPdf } from '../services/orgExamPdfService.js';

// Helper: compute grade from bands
async function pickGrade(orgId, percent) {
  const { rows } = await pool.query(
    `
      SELECT grade, remark
      FROM org_exam_grading_bands
      WHERE org_id = $1
      ORDER BY sort_order ASC, min_percent DESC
    `,
    [orgId]
  );
  for (const row of rows) {
    if (percent >= Number(row.min_percent) && percent <= Number(row.max_percent)) {
      return { grade: row.grade, remark: row.remark || null };
    }
  }
  return { grade: 'N/A', remark: null };
}

/** GET /api/orgs/:orgId/exams/student/:studentId/card?sessionId=... */
export async function getOrgExamStudentCard(req, res, next) {
  try {
    const { orgId, studentId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ ok: false, message: 'sessionId is required' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const card = await getStudentExamCard({
      orgId,
      sessionId,
      studentUserId: Number(studentId),
    });

    if (!card) {
      return res.status(404).json({ ok: false, message: 'Report card not found' });
    }

    // Inject overall grade + remark from grading bands (if totalPercent available)
    if (card.summary && typeof card.summary.totalPercent === 'number') {
      const { grade, remark } = await pickGrade(orgId, card.summary.totalPercent);
      card.summary.overallGrade = card.summary.overallGrade || grade;
      // add remark field for the "Remarks" section on the report
      card.summary.overallRemark = card.summary.overallRemark || remark || null;
    }

    // Preserve previous shape by including ok: true, but now enriched with
    // subjects, positions, progressSeries, attendance, etc. from the service.
    return res.json({
      ok: true,
      ...card,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[getOrgExamStudentCard] error', err);
    return next(err);
  }
}

/** GET /api/orgs/:orgId/exams/student/:studentId/card.pdf?sessionId=... */
export async function downloadOrgExamStudentCardPdf(req, res, next) {
  try {
    const { orgId, studentId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const card = await getStudentExamCard({
      orgId,
      sessionId,
      studentUserId: Number(studentId),
    });

    if (!card) {
      return res.status(404).json({ message: 'Report card not found' });
    }

    // Same grade injection used for JSON, so PDF has consistent grade/remark
    if (card.summary && typeof card.summary.totalPercent === 'number') {
      const { grade, remark } = await pickGrade(orgId, card.summary.totalPercent);
      card.summary.overallGrade = card.summary.overallGrade || grade;
      card.summary.overallRemark = card.summary.overallRemark || remark || null;
    }

    const pdfBuffer = await renderOrgExamStudentCardPdf(card);

    const filenameSafeName = (card.student.name || 'student')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'report';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filenameSafeName}-report-card.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[downloadOrgExamStudentCardPdf] error', err);
    return next(err);
  }
}

// ✅ Backwards-compatible alias if your routes still import getOrgExamStudentCardPdf
export const getOrgExamStudentCardPdf = downloadOrgExamStudentCardPdf;

/** GET /api/orgs/:orgId/exams/config */
export async function getOrgExamConfig(req, res, next) {
  try {
    const { orgId } = req.params;

    await requireOrgTier(orgId, ['pro', 'enterprise']); // 403 if starter

    const [terms, sessions, bands] = await Promise.all([
      pool.query(
        `SELECT id, label, year, is_active, created_at
         FROM org_exam_terms
         WHERE org_id = $1
         ORDER BY year DESC, created_at DESC`,
        [orgId]
      ),
      pool.query(
        `SELECT id, label, term_id, weight, starts_at, ends_at
         FROM org_exam_sessions
         WHERE org_id = $1
         ORDER BY created_at DESC`,
        [orgId]
      ),
      pool.query(
        `SELECT id, scheme_name, grade, min_percent, max_percent, remark, sort_order
         FROM org_exam_grading_bands
         WHERE org_id = $1
         ORDER BY scheme_name, sort_order ASC, min_percent DESC`,
        [orgId]
      ),
    ]);

    return res.json({
      ok: true,
      terms: terms.rows,
      sessions: sessions.rows,
      gradingBands: bands.rows,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/orgs/:orgId/exams/config */
export async function upsertOrgExamConfig(req, res, next) {
  try {
    const { orgId } = req.params;
    const { terms = [], sessions = [], gradingBands = [] } = req.body || {};

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    // ─────────────────────────────────────────────
    // 1) Guard against duplicate (term_id + label)
    // ─────────────────────────────────────────────
    const seenSessionKeys = new Set();
    for (const s of sessions) {
      const termKey = s.term_id || 'no-term';
      const labelKey = String(s.label || '').trim().toLowerCase();
      if (!labelKey) continue;

      const key = `${termKey}::${labelKey}`;
      if (seenSessionKeys.has(key)) {
        const err = new Error(
          `You already have an exam called "${s.label}" under the same term. ` +
            'Please rename or remove duplicate exam entries before saving.'
        );
        err.status = 400;
        throw err;
      }
      seenSessionKeys.add(key);
    }

    await pool.query('BEGIN');

    // 2) Upsert terms (delete + insert)
    await pool.query('DELETE FROM org_exam_terms WHERE org_id = $1', [orgId]);
    for (const t of terms) {
      await pool.query(
        `INSERT INTO org_exam_terms (id, org_id, label, year, is_active)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, COALESCE($5, TRUE))`,
        [t.id || null, orgId, t.label, t.year, t.is_active]
      );
    }

    // 3) Upsert sessions (delete + insert)
    await pool.query('DELETE FROM org_exam_sessions WHERE org_id = $1', [orgId]);
    for (const s of sessions) {
      await pool.query(
        `INSERT INTO org_exam_sessions (id, org_id, term_id, label, weight, starts_at, ends_at)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, COALESCE($5, 1.0), $6, $7)`,
        [
          s.id || null,
          orgId,
          s.term_id || null,
          s.label,
          s.weight,
          s.starts_at || null,
          s.ends_at || null,
        ]
      );
    }

    // 4) Upsert grading bands
    await pool.query('DELETE FROM org_exam_grading_bands WHERE org_id = $1', [orgId]);
    for (const [idx, b] of gradingBands.entries()) {
      await pool.query(
        `INSERT INTO org_exam_grading_bands
           (id, org_id, scheme_name, grade, min_percent, max_percent, remark, sort_order)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, COALESCE($3, 'default'),
                 $4, $5, $6, $7, $8)`,
        [
          b.id || null,
          orgId,
          b.scheme_name || 'default',
          b.grade,
          b.min_percent,
          b.max_percent,
          b.remark || null,
          b.sort_order ?? idx,
        ]
      );
    }

    await pool.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    if (err.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    return next(err);
  }
}

/** GET /api/orgs/:orgId/exams/sheet?sessionId=...&classLabel=... */
export async function getOrgExamSheet(req, res, next) {
  try {
    const { orgId } = req.params;
    const { sessionId, classLabel } = req.query;

    if (!sessionId) {
      return res.status(400).json({ ok: false, message: 'sessionId is required' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const { rows } = await pool.query(
      `SELECT
         r.id,
         r.student_user_id,
         u.name AS student_name,
         u.email AS student_email,
         r.class_label,
         r.subject,
         r.score,
         r.max_score,
         r.percent,
         r.grade,
         r.remark
       FROM org_exam_results r
       JOIN users u ON u.id = r.student_user_id
       WHERE r.org_id = $1
         AND r.session_id = $2
         AND ($3::text IS NULL OR r.class_label = $3)
       ORDER BY student_name ASC, subject ASC`,
      [orgId, sessionId, classLabel || null]
    );

    return res.json({ ok: true, rows });
  } catch (err) {
    next(err);
  }
}

/** POST /api/orgs/:orgId/exams/sheet */
export async function saveOrgExamSheet(req, res) {
  try {
    const paramOrgId = req.params && req.params.orgId;
    const orgId = paramOrgId || (req.org && req.org.id) || req.orgId;

    if (!orgId) {
      return res.status(401).json({ ok: false, message: 'Missing org context' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const { sessionId, classLabel, rows } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ ok: false, message: 'sessionId is required' });
    }
    if (!Array.isArray(rows)) {
      return res.status(400).json({ ok: false, message: 'rows must be an array' });
    }

    if (!rows.length) {
      return res.json({ ok: true, message: 'No rows to save' });
    }

    const normalized = rows
      .map((r) => ({
        student_user_id: Number(r.student_user_id || r.studentId || r.student_userId),
        subject: (r.subject || '').trim(),
        score: r.score == null ? null : Number(r.score),
        max_score: r.max_score == null ? null : Number(r.max_score),
        class_label: (classLabel || r.class_label || r.classLabel || '').trim() || null,
      }))
      .filter((r) => r.student_user_id && r.subject);

    if (!normalized.length) {
      return res.status(400).json({
        ok: false,
        message: 'No valid rows to save (student + subject required).',
      });
    }

    const uniqueStudentIds = [...new Set(normalized.map((r) => r.student_user_id))];
    const { rows: existingRows } = await pool.query(
      'SELECT id FROM users WHERE id = ANY($1::int[])',
      [uniqueStudentIds]
    );
    const existingIds = new Set(existingRows.map((r) => Number(r.id)));
    const missingIds = uniqueStudentIds.filter((id) => !existingIds.has(id));

    if (missingIds.length) {
      return res.status(400).json({
        ok: false,
        message: `Some student IDs do not exist in the system: ${missingIds.join(', ')}`,
        missingStudentIds: missingIds,
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const upsertSql = `
        INSERT INTO org_exam_results (
          org_id, session_id, student_user_id, class_label,
          subject, score, max_score, grade, remark
        )
        SELECT
          $1::uuid                         AS org_id,
          $2::uuid                         AS session_id,
          $3::int                          AS student_user_id,
          $4::text                         AS class_label,
          $5::text                         AS subject,
          $6::numeric                      AS score,
          $7::numeric                      AS max_score,
          COALESCE(b.grade, 'N/A')         AS grade,
          COALESCE(b.remark, '')           AS remark
        FROM (
          SELECT $6::numeric AS score, $7::numeric AS max_score
        ) s
        LEFT JOIN org_exam_grading_bands b
          ON b.org_id = $1::uuid
         AND (
              CASE WHEN $7::numeric > 0
                   THEN ( $6::numeric * 100.0 ) / NULLIF($7::numeric, 0)
                   ELSE 0
              END
         ) BETWEEN b.min_percent AND b.max_percent
        ON CONFLICT (org_id, session_id, student_user_id, subject)
        DO UPDATE SET
          class_label = EXCLUDED.class_label,
          score       = EXCLUDED.score,
          max_score   = EXCLUDED.max_score,
          grade       = EXCLUDED.grade,
          remark      = EXCLUDED.remark,
          updated_at  = NOW()
        ;
      `;

      for (const r of normalized) {
        await client.query(upsertSql, [
          orgId,
          sessionId,
          r.student_user_id,
          r.class_label,
          r.subject,
          r.score ?? 0,
          r.max_score ?? 100,
        ]);
      }

      // Recompute totals + overall grades
      await client.query(
        `
        INSERT INTO org_exam_student_overall (
          org_id, session_id, student_user_id, class_label,
          total_score, total_max, total_percent, overall_grade,
          created_at, updated_at
        )
        SELECT
          r.org_id,
          r.session_id,
          r.student_user_id,
          MAX(r.class_label)                        AS class_label,
          SUM(r.score)                              AS total_score,
          SUM(r.max_score)                          AS total_max,
          CASE WHEN SUM(r.max_score) > 0
               THEN (SUM(r.score) * 100.0) / SUM(r.max_score)
               ELSE 0
          END                                       AS total_percent,
          COALESCE(
            (
              SELECT b.grade
              FROM org_exam_grading_bands b
              WHERE b.org_id = r.org_id
                AND (
                  CASE WHEN SUM(r.max_score) > 0
                       THEN (SUM(r.score) * 100.0) / SUM(r.max_score)
                       ELSE 0
                  END
                ) BETWEEN b.min_percent AND b.max_percent
              ORDER BY b.min_percent DESC
              LIMIT 1
            ),
            'N/A'
          )                                         AS overall_grade,
          NOW()                                     AS created_at,
          NOW()                                     AS updated_at
        FROM org_exam_results r
        WHERE r.org_id = $1::uuid
          AND r.session_id = $2::uuid
          AND ( $3::text IS NULL OR r.class_label = $3::text )
        GROUP BY r.org_id, r.session_id, r.student_user_id
        ON CONFLICT (org_id, session_id, student_user_id)
        DO UPDATE SET
          class_label   = EXCLUDED.class_label,
          total_score   = EXCLUDED.total_score,
          total_max     = EXCLUDED.total_max,
          total_percent = EXCLUDED.total_percent,
          overall_grade = EXCLUDED.overall_grade,
          updated_at    = NOW()
        ;
        `,
        [orgId, sessionId, classLabel || null]
      );

      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[saveOrgExamSheet] error', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[saveOrgExamSheet] outer error', err);
    return res
      .status(400)
      .json({ ok: false, message: err?.message || 'Failed to save exam sheet' });
  }
}

/** POST /api/orgs/:orgId/exams/student/:studentId/notify */
export async function sendOrgExamStudentCardEmail(req, res, next) {
  try {
    const { orgId, studentId } = req.params;
    const { sessionId, toOverride } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ ok: false, message: 'sessionId is required' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const studentRes = await pool.query(
      `SELECT u.id, u.name, u.email, up.guardian_email
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1`,
      [studentId]
    );
    if (studentRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Student not found' });
    }
    const student = studentRes.rows[0];

    const rowsRes = await pool.query(
      `SELECT subject, score, max_score, percent, grade
       FROM org_exam_results
       WHERE org_id = $1
         AND session_id = $2
         AND student_user_id = $3
       ORDER BY subject ASC`,
      [orgId, sessionId, studentId]
    );
    const rows = rowsRes.rows;

    const totalScore = rows.reduce((sum, r) => sum + Number(r.score ?? 0), 0);
    const totalMax = rows.reduce((sum, r) => sum + Number(r.max_score ?? 0), 0);
    const totalPercent = totalMax > 0 ? (totalScore * 100.0) / totalMax : 0;
    const { grade: overallGrade } = await pickGrade(orgId, totalPercent);

    const targetEmail = toOverride || student.guardian_email || student.email;

    if (!targetEmail) {
      return res.status(400).json({
        ok: false,
        message: 'No guardian email or student email available for this learner.',
      });
    }

    // TODO: plug into your mailer service with the new rich card if you want
    // const card = await getStudentExamCard({ orgId, sessionId, studentUserId: Number(studentId) });

    console.log('[sendExamCard] would email', {
      to: targetEmail,
      studentName: student.name,
      totalPercent,
      overallGrade,
    });

    return res.json({ ok: true, to: targetEmail });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orgs/:orgId/exams/analytics?sessionId=... */
export async function getOrgExamAnalytics(req, res, next) {
  try {
    const { orgId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ ok: false, message: 'sessionId is required' });
    }

    await requireOrgTier(orgId, ['pro', 'enterprise']);

    const { rows } = await pool.query(
      `
        SELECT
          subject,
          COUNT(*)                         AS scripts,
          AVG(percent)::numeric(5,2)       AS avg_percent,
          MIN(percent)::numeric(5,2)       AS min_percent,
          MAX(percent)::numeric(5,2)       AS max_percent
        FROM org_exam_results
        WHERE org_id = $1
          AND session_id = $2
        GROUP BY subject
        ORDER BY subject ASC
      `,
      [orgId, sessionId]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
}
