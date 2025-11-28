// apps/backend/controllers/orgAssignmentsController.js
import { nanoid } from 'nanoid';
import pool from '../config/db.js';
import { requireOrgTier } from '../utils/orgTierGuard.js';

export async function createOrgAssignment(req, res) {
  const correlationId = nanoid(8);
  const tag = `[org.assign ${correlationId}]`;
  const { orgId } = req.params;

  const authUserId = req.user?.id ?? null;
  const orgRole = req.user?.orgRole ?? null;

  const {
    courseId,
    title_override,
    pass_mark,
    timer_s,
    max_attempts,
    due_at,
    org_class_label,
    orgClassLabel,
    org_subject_key,
    orgSubjectKey,
  } = req.body || {};

  // Normalize scope fields
  const scopeClassLabel = orgClassLabel ?? org_class_label ?? null;
  const scopeSubjectKey = orgSubjectKey ?? org_subject_key ?? null;

  console.log(`${tag} incoming`, {
    orgId,
    authUserId,
    orgRole,
    courseId,
    title_override,
    pass_mark,
    timer_s,
    max_attempts,
    due_at,
    scopeClassLabel,
    scopeSubjectKey,
  });

  if (!orgId || !authUserId) {
    console.warn(`${tag} missing orgId/auth`, { orgId, authUserId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1) Check membership + role
    const m = await pool.query(
      `
      SELECT role
      FROM org_memberships
      WHERE org_id = $1::uuid
        AND user_id = $2::int
        AND active = TRUE
      `,
      [orgId, authUserId]
    );

    const roles = m.rows.map((r) => r.role);
    console.log(`${tag} membership`, { rowCount: m.rowCount, roles });

    if (!m.rowCount || !roles.some((r) => ['admin', 'owner', 'instructor'].includes(r))) {
      console.warn(`${tag} forbidden – not instructor/admin`, {
        orgId,
        authUserId,
        roles,
      });
      return res.status(403).json({ error: 'Only instructors or admins can create assignments.' });
    }

    // 2) (Optional) Tier check – if needed
    const tier = await requireOrgTier(orgId);
    console.log(`${tag} tier`, { tier });

    if (!courseId) {
      console.warn(`${tag} missing courseId`);
      return res.status(400).json({ error: 'courseId is required' });
    }

    // 3) Upsert into org_assignments
    const sql = `
      INSERT INTO org_assignments (
        org_id,
        course_id,
        title_override,
        pass_mark,
        timer_s,
        max_attempts,
        due_at,
        org_class_label,
        org_subject_key,
        created_by
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10
      )
      RETURNING
        id,
        org_id,
        course_id,
        title_override,
        pass_mark,
        timer_s,
        max_attempts,
        due_at,
        org_class_label,
        org_subject_key,
        created_by,
        created_at,
        updated_at
    `;

    const binds = [
      orgId,
      courseId,
      title_override || null,
      pass_mark ?? null,
      timer_s ?? null,
      max_attempts ?? 2,
      due_at ? new Date(due_at) : null,
      scopeClassLabel,
      scopeSubjectKey,
      authUserId,
    ];

    console.log(`${tag} sql.binds`, {
      valuesCount: binds.length,
      valuesPreview: {
        orgId: binds[0],
        courseId: binds[1],
        pass_mark: binds[3],
        timer_s: binds[4],
        max_attempts: binds[5],
        due_at: binds[6],
        org_class_label: binds[7],
        org_subject_key: binds[8],
        created_by: binds[9],
      },
    });

    const { rows } = await pool.query(sql, binds);
    const a = rows[0];

    console.log(`${tag} assignment.created`, {
      id: a.id,
      org_id: a.org_id,
      course_id: a.course_id,
      title_override: a.title_override,
      pass_mark: a.pass_mark,
      timer_s: a.timer_s,
      max_attempts: a.max_attempts,
      due_at: a.due_at,
      org_class_label: a.org_class_label,
      org_subject_key: a.org_subject_key,
      created_by: a.created_by,
      created_at: a.created_at,
    });

    return res.json(a);
  } catch (err) {
    console.error(`${tag} error`, {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      orgId,
      authUserId,
      courseId,
    });
    return res.status(500).json({ error: 'Failed to create assignment' });
  }
}
