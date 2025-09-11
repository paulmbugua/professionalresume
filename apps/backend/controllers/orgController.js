// apps/backend/controllers/orgController.js
import pool from '../config/db.js';
import { sendOTP as sendEmail } from '../config/emailService.js'; // reuse simple sender name
import { ensureCourse } from '../services/courseEnsure.js';
import crypto from 'crypto';
import { ensureOrgForUser } from '../services/orgBootstrap.js';
// Helpers
const nowPlusSec = (sec) => new Date(Date.now() + (sec * 1000));

async function getSeatLimit(client, orgId) {
  const q = await client.query(
    `SELECT
       COALESCE(s.seats,
         CASE
           WHEN LOWER(COALESCE(s.tier,'starter')) IN ('start','starter') THEN 50
           WHEN LOWER(s.tier)='pro' THEN 500
           WHEN LOWER(s.tier)='enterprise' THEN 5000
           ELSE 50
         END
       ) AS seat_limit
     FROM organizations o
     LEFT JOIN org_subscriptions s
       ON s.org_id = o.id AND s.active = TRUE
    WHERE o.id = $1
    LIMIT 1`,
    [orgId]
  );
  return q.rows[0]?.seat_limit ?? 50;
}

export async function createOrg(req, res) {
  const userId = req.user?.id;
  const { name, slug } = req.body || {};
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!name)   return res.status(400).json({ message: 'Missing name' });

  const { rows } = await pool.query(
    `INSERT INTO organizations (owner_user_id, name, slug)
     VALUES ($1, $2, $3) RETURNING id, name, slug`,
    [userId, name, slug || null]
  );
  // auto-membership owner
  await pool.query(
    `INSERT INTO org_memberships (org_id, user_id, role, invited_by, joined_at)
     VALUES ($1, $2, 'owner', $2, NOW())`,
    [rows[0].id, userId]
  );
  return res.json(rows[0]);
}

export async function updateOrgBranding(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  const { name, logo_url, signature_url, certificate_title, default_pass_mark, quiz_time_limit_s, allow_retry, email_domain } = req.body || {};

  // verify admin
  const mem = await pool.query(
    `SELECT 1 FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  const { rows } = await pool.query(
    `UPDATE organizations
       SET name            = COALESCE($2, name),
           logo_url        = COALESCE($3, logo_url),
           signature_url   = COALESCE($4, signature_url),
           certificate_title   = COALESCE($5, certificate_title),
           default_pass_mark   = COALESCE($6, default_pass_mark),
           quiz_time_limit_s   = COALESCE($7, quiz_time_limit_s),
           allow_retry         = COALESCE($8, allow_retry),
           email_domain        = COALESCE($9, email_domain),
           updated_at      = NOW()
     WHERE id=$1
     RETURNING *`,
    [orgId, name, logo_url, signature_url, certificate_title, default_pass_mark, quiz_time_limit_s, allow_retry, email_domain]
  );
  res.json(rows[0]);
}

// IDP: idempotent create (UPSERT) so (org_id, course_id) won't 23505
export async function createAssignment(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  const { courseId, title_override, pass_mark, timer_s, max_attempts = 1, due_at } = req.body || {};
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // admin/instructor only
  const mem = await pool.query(
    `SELECT role FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin','instructor')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  const invite = crypto.randomBytes(10).toString('base64url');

  try {
    const q = await pool.query(
      `
      INSERT INTO org_course_assignments
        (org_id, course_id, title_override, pass_mark, timer_s, max_attempts, due_at, invite_code, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7,
         COALESCE((SELECT invite_code FROM org_course_assignments WHERE org_id=$1 AND course_id=$2), $8),
         $9, NOW(), NOW())
      ON CONFLICT (org_id, course_id) DO UPDATE
         SET title_override = COALESCE(EXCLUDED.title_override, org_course_assignments.title_override),
             pass_mark      = COALESCE(EXCLUDED.pass_mark,      org_course_assignments.pass_mark),
             timer_s        = COALESCE(EXCLUDED.timer_s,        org_course_assignments.timer_s),
             max_attempts   = COALESCE(EXCLUDED.max_attempts,   org_course_assignments.max_attempts),
             due_at         = COALESCE(EXCLUDED.due_at,         org_course_assignments.due_at),
             updated_at     = NOW()
      RETURNING *;
      `,
      [
        orgId,
        courseId,
        title_override || null,
        pass_mark || null,
        timer_s || null,
        max_attempts,
        due_at || null,
        invite,
        userId,
      ]
    );

    const row = q.rows[0];
    return res.json(row); // FE builds /org/join/:invite
  } catch (e) {
    console.error('[createAssignment]', e);
    return res.status(500).json({ message: 'Failed to create/update assignment' });
  }
}


export async function resolveInvite(req, res) {
  // GET /api/orgs/invite/:code → returns assignment + org branding (for landing)
  const { code } = req.params;
  const q = await pool.query(
     `SELECT a.*,
           o.name AS org_name,
           o.logo_url,
           o.signature_url,
           o.certificate_title,
           o.default_pass_mark,
           o.quiz_time_limit_s
       FROM org_course_assignments a
       JOIN organizations o ON o.id = a.org_id
      WHERE a.invite_code = $1`,
    [code]
  );
  if (!q.rowCount) return res.status(404).json({ message: 'Invite not found' });
  res.json(q.rows[0]);
}

// controllers/orgController.js (acceptInvite)
export async function acceptInvite(req, res) {
  const userId = req.user?.id;
  const { code } = req.body || {};
  if (!userId || !code) return res.status(400).json({ message: 'Bad request' });

  const a = await pool.query(
    `SELECT * FROM org_course_assignments WHERE invite_code=$1`,
    [code]
  );
  if (!a.rowCount) return res.status(404).json({ message: 'Invite not found' });
  const assignment = a.rows[0];

  const u = await pool.query(`SELECT id, email FROM users WHERE id=$1`, [userId]);
  const userEmail = (u.rows[0]?.email || '').toLowerCase();

  await pool.query('BEGIN');
  try {
    // 🔒 concurrency guard per org — use a stable hash of the UUID into the two-int advisory lock variant
    await pool.query(
      `SELECT pg_advisory_xact_lock(
         ('x'||substr(md5($1::text),1,8))::bit(32)::int,
         ('x'||substr(md5($1::text),9,8))::bit(32)::int
       )`,
      [assignment.org_id]
    );

    // 🚦 check current learners vs seat limit
    const seatLimit = await getSeatLimit(pool, assignment.org_id);
    const learnersQ = await pool.query(
      `SELECT COUNT(*)::int AS c
         FROM org_memberships
        WHERE org_id=$1::uuid AND role='learner'`,
      [assignment.org_id]
    );
    const learnersUsed = learnersQ.rows[0].c;

    // If this user is already staff, don't count them against seats
    const existing = await pool.query(
      `SELECT role FROM org_memberships WHERE org_id=$1::uuid AND user_id=$2`,
      [assignment.org_id, userId]
    );
    const isAlreadyMember = !!existing.rowCount;
    const isStaff = isAlreadyMember && ['owner','admin','instructor'].includes(existing.rows[0].role);

    if (!isStaff && !isAlreadyMember && learnersUsed >= seatLimit) {
      await pool.query('ROLLBACK');
      return res.status(403).json({
        ok: false,
        message: 'Seat limit reached. Upgrade your plan to add more learners.',
        code: 'SEAT_LIMIT_REACHED',
      });
    }

    // Upgrade email-based invite if it exists
    if (userEmail) {
      await pool.query(
        `UPDATE org_memberships
            SET user_id = COALESCE(user_id, $2),
                role    = CASE
                           WHEN role IN ('owner','admin','instructor') THEN role
                           ELSE 'learner'
                          END,
                joined_at = COALESCE(joined_at, NOW()),
                invited_at = COALESCE(invited_at, NOW())
          WHERE org_id=$1::uuid AND LOWER(COALESCE(email,''))=$3`,
        [assignment.org_id, userId, userEmail]
      );
    }

    // Ensure membership row; do not downgrade staff
    await pool.query(
      `INSERT INTO org_memberships (org_id, user_id, role, invited_by, invited_at, joined_at)
       VALUES ($1::uuid,$2,'learner',$3,NOW(),NOW())
       ON CONFLICT (org_id, user_id) DO UPDATE
         SET role = CASE
                     WHEN org_memberships.role IN ('owner','admin','instructor') THEN org_memberships.role
                     ELSE 'learner'
                    END,
             joined_at = COALESCE(org_memberships.joined_at, EXCLUDED.joined_at)`,
      [assignment.org_id, userId, assignment.created_by]
    );

    // ... keep your existing dueAt/attempt logic
    const org = await pool.query(
      `SELECT quiz_time_limit_s, default_pass_mark FROM organizations WHERE id=$1::uuid`,
      [assignment.org_id]
    );
    const limit = assignment.timer_s || org.rows[0].quiz_time_limit_s || 900;
    const dueAt = assignment.due_at ? new Date(assignment.due_at) : new Date(Date.now() + limit * 1000);

    const attempt = await pool.query(
      `INSERT INTO org_quiz_attempts (org_id, assignment_id, user_id, due_at, pass_mark)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5)
       ON CONFLICT (assignment_id, user_id) DO UPDATE SET due_at=EXCLUDED.due_at
       RETURNING *`,
      [assignment.org_id, assignment.id, userId, dueAt, assignment.pass_mark || org.rows[0].default_pass_mark]
    );

    await pool.query('COMMIT');
    return res.json({ ok: true, attempt: attempt.rows[0] });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('[acceptInvite] failed', e);
    return res.status(500).json({ message: 'Failed to accept invite' });
  }
}


// Called by your quiz "Submit" button (org flow)
export async function submitAttempt(req, res) {
  const userId = req.user?.id;
  const { assignmentId, answers } = req.body || {};
  if (!userId || !assignmentId) return res.status(400).json({ message: 'Bad request' });

  const a = await pool.query(
    `SELECT qa.*, a.course_id, a.max_attempts, o.allow_retry
       FROM org_quiz_attempts qa
       JOIN org_course_assignments a ON a.id = qa.assignment_id
       JOIN organizations o ON o.id = qa.org_id
      WHERE qa.assignment_id=$1 AND qa.user_id=$2`,
    [assignmentId, userId]
  );
  if (!a.rowCount) return res.status(404).json({ message: 'Attempt not found' });
  const att = a.rows[0];

  if (att.status !== 'active') {
    return res.status(403).json({ message: 'Attempt is not active.' });
  }
  if (new Date(att.due_at).getTime() < Date.now()) {
    await pool.query(`UPDATE org_quiz_attempts SET status='expired' WHERE id=$1`, [att.id]);
    return res.status(403).json({ message: 'Time expired. Attempt locked.' });
  }

  // 🔗 Reuse your existing grading pipeline (assume a helper gradeQuiz(courseId, answers))
  // If you have an existing route for grading, import its internal function;
  // here we stub the outcome:
  const grade = await fakeGrade(att.course_id, answers); // { scorePct, passed, passMark }

  await pool.query(
    `UPDATE org_quiz_attempts
        SET submitted_at=NOW(),
            status='submitted',
            score_pct=$2,
            passed=$3,
            answers=$4
      WHERE id=$1`,
    [att.id, grade.scorePct, grade.passed, JSON.stringify(answers || [])]
  );

  // email learner & notify admins (basic)
  try {
    const u = await pool.query(`SELECT email, name FROM users WHERE id=$1`, [userId]);
    if (u.rowCount && u.rows[0].email) {
      await sendEmail(u.rows[0].email, `Quiz result: ${grade.scorePct}%`, `You scored ${grade.scorePct}% ${grade.passed ? '✅ (passed)' : '❌ (not passed)'}.`);
    }
  } catch (e) {
    console.warn('[email] result mail failed', e?.message);
  }

  return res.json({ ok: true, grade });
}

// Simple stub: replace with your real grading service
async function fakeGrade(courseId, answers) {
  const correct = Array.isArray(answers) ? Math.max(0, Math.min(answers.length, Math.round(answers.length * 0.8))) : 0;
  const scorePct = answers?.length ? Math.round((correct / answers.length) * 100) : 0;
  const passMark = 70;
  return { scorePct, passed: scorePct >= passMark, passMark };
}

export async function orgAnalytics(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  const { period = 'month' } = req.query; // 'month' | 'term' | 'year'
  const mem = await pool.query(
    `SELECT 1 FROM org_memberships WHERE org_id=$1 AND user_id=$2 AND role IN ('owner','admin','instructor')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  // month/term/year bucketing (keep it simple: month & year; term=4-month bucket)
  const bucket = period === 'year'
    ? `date_trunc('year', started_at)`
    : period === 'term'
      ? `date_trunc('quarter', started_at)`  //term-ish
      : `date_trunc('month', started_at)`;

  const { rows } = await pool.query(
    `SELECT ${bucket} AS bucket,
            COUNT(*) AS attempts,
            AVG(score_pct) AS avg_score,
            SUM(CASE WHEN passed THEN 1 ELSE 0 END) AS passes
       FROM org_quiz_attempts
      WHERE org_id=$1
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 36`,
    [orgId]
  );
  res.json({ ok: true, data: rows });
}

export async function getMyOrg(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // Pick the first org the user belongs to (prefer owner/admin)
  const q = await pool.query(
    `SELECT o.*,
            CASE
              WHEN LOWER(COALESCE(s.tier,'')) IN ('start','starter') THEN 'starter'
              WHEN LOWER(COALESCE(s.tier,'')) = 'pro' THEN 'pro'
              WHEN LOWER(COALESCE(s.tier,'')) = 'enterprise' THEN 'enterprise'
              ELSE COALESCE(s.tier, 'starter')
            END AS tier,
            s.seats,
            u.email AS owner_email,
            m.role AS my_role
       FROM organizations o
       JOIN org_memberships m ON m.org_id = o.id
  LEFT JOIN org_subscriptions s ON s.org_id = o.id AND s.active = TRUE
  LEFT JOIN users u ON u.id = o.owner_user_id
      WHERE m.user_id = $1
      ORDER BY CASE WHEN m.role IN ('owner','admin') THEN 0 ELSE 1 END,
               o.created_at DESC
      LIMIT 1`,
    [userId]
  );

  if (!q.rowCount) return res.status(404).json({ message: 'No organization for user' });
  return res.json(q.rows[0]);
}

// controllers/orgController.js
export async function getOrgUsage(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // must be a member of this org
  const mem = await pool.query(
    `SELECT 1 FROM org_memberships WHERE org_id=$1 AND user_id=$2`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  // seats = learners only
  const r = await pool.query(
    `SELECT COUNT(*)::int AS seats_used
       FROM org_memberships
      WHERE org_id=$1 AND role='learner'`,
    [orgId]
  );
  return res.json({ seats_used: r.rows[0]?.seats_used ?? 0 });
}



export async function bootstrapMyOrg(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const org = await ensureOrgForUser(userId);
    return res.json(org);
  } catch (e) {
    console.error('[bootstrapMyOrg]', e);
    return res.status(500).json({ message: 'Failed to bootstrap org' });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Ensure (idempotent) shareable assignment and return inviteUrl
export async function ensureShareableAssignment(req, res) {
  const userId = req.user?.id;
  const { orgId } = req.params;
   const {
    courseId,
    title,
    courseSize, minutes,
    title_override, pass_mark, timer_s,
    max_attempts = 1, due_at,
    locked_config,
  } = req.body || {};

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // permission
  const mem = await pool.query(
    `SELECT role FROM org_memberships
      WHERE org_id=$1 AND user_id=$2
        AND role IN ('owner','admin','instructor')`,
    [orgId, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  try {
    // 🔒 Tier-aware minutes clamp (defensive): Starter fixes minutes (<=30)
    const tierQ = await pool.query(
      `SELECT COALESCE(LOWER(s.tier), 'starter') AS tier
         FROM organizations o
    LEFT JOIN org_subscriptions s ON s.org_id=o.id AND s.active=TRUE
        WHERE o.id=$1
        LIMIT 1`,
      [orgId]
    );
    const tier = tierQ.rows[0]?.tier || 'starter';
    const isStarter = tier === 'starter' || tier === 'start';
    const safeMinutes = isStarter ? Math.min(Number(minutes ?? 30), 30) : Number(minutes ?? 20);

    // 1) Ensure course exists
    const course = await ensureCourse({ courseId, title, courseSize, minutes: safeMinutes });
    const cid = course.id;

    // 2) Upsert assignment (keep existing invite_code)
    const invite = crypto.randomBytes(10).toString('base64url');
    const lockedJSON =
   locked_config && typeof locked_config === 'object'
     ? JSON.stringify(locked_config)
     : null
    const q = await pool.query(
      `
      INSERT INTO org_course_assignments
        (org_id, course_id, title_override, pass_mark, timer_s, max_attempts, due_at, invite_code, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7,
         COALESCE((SELECT invite_code FROM org_course_assignments WHERE org_id=$1 AND course_id=$2), $8),
         $9, NOW(), NOW())
      ON CONFLICT (org_id, course_id) DO UPDATE
         SET title_override = COALESCE(EXCLUDED.title_override, org_course_assignments.title_override),
             pass_mark      = COALESCE(EXCLUDED.pass_mark,      org_course_assignments.pass_mark),
             timer_s        = COALESCE(EXCLUDED.timer_s,        org_course_assignments.timer_s),
             max_attempts   = COALESCE(EXCLUDED.max_attempts,   org_course_assignments.max_attempts),
             due_at         = COALESCE(EXCLUDED.due_at,         org_course_assignments.due_at),
             locked_config  = COALESCE(EXCLUDED.locked_config,  org_course_assignments.locked_config),
             updated_at     = NOW()
      RETURNING *;
      `,
      [orgId, cid, title_override || null, pass_mark || null, timer_s || null, max_attempts, due_at || null, invite, userId, lockedJSON]
    );

    const assignment = q.rows[0];

    // Build invite URL robustly (works if WEB_BASE_URL is not set)
    // prefer explicit WEB_BASE_URL, then Origin/Referer, fallback to frontend dev port
const base =
  process.env.WEB_BASE_URL ||
  req.get('origin') ||
  req.get('referer') ||
  'http://localhost:5173';

const inviteUrl = `${base.replace(/\/$/, '')}/org/join/${assignment.invite_code}`;

return res.json({
  ok: true,
  courseId: cid,
  courseTitle: course.title,
  assignment,
  inviteUrl,
});

  } catch (e) {
    if (
      e.message === 'COURSE_NOT_FOUND' ||
      e.message === 'TITLE_REQUIRED' ||
      e.message === 'INVALID_SIZE'
    ) {
      return res.status(400).json({ message: e.message });
    }
    console.error('[org] ensureShareableAssignment error', e);
    return res.status(500).json({ message: 'Failed to ensure assignment' });
  }
}
