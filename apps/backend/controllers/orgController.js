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
// controllers/orgController.js (excerpt)
// ... keep existing imports & helpers (pool, getSeatLimit, etc.)

export async function acceptInvite(req, res) {
  const userId = req.user?.id;
  const { code } = req.body || {};

  // ── Correlation / logging helpers ─────────────────────────────────────────
  let rid = req.get?.('x-request-id') || req.headers?.['x-request-id'] || null;
  if (!rid) {
    try {
      const { randomUUID, randomBytes } = await import('crypto');
      rid = (typeof randomUUID === 'function' && randomUUID()) || randomBytes(6).toString('hex');
    } catch {
      rid = Math.random().toString(36).slice(2, 10);
    }
  }
  const tag = (m) => `[org.acceptInvite ${rid}] ${m}`;
  const log  = (...a) => console.log(tag(''), ...a);
  const warn = (...a) => console.warn(tag('WARN'), ...a);
  const err  = (...a) => console.error(tag('ERROR'), ...a);

  // ── Fast param check ──────────────────────────────────────────────────────
  if (!userId || !code) {
    warn('bad request', { userId: !!userId, hasCode: !!code });
    return res.status(400).json({ message: 'Bad request' });
  }
  log('begin', { userId, code });

  try {
    // 1) Resolve assignment by invite code
    const a = await pool.query(
      `SELECT *
         FROM org_course_assignments
        WHERE invite_code = $1
        LIMIT 1`,
      [code]
    );
    if (!a.rowCount) {
      warn('invite not found', { code });
      return res.status(404).json({ message: 'Invite not found' });
    }
    const assignment = a.rows[0];
    log('assignment', {
      id: assignment.id,
      org_id: assignment.org_id,
      course_id: assignment.course_id,
      max_attempts: assignment.max_attempts,
      timer_s: assignment.timer_s,
      due_at: assignment.due_at,
    });

    // 2) Get user email (optional upgrade path)
    const u = await pool.query(`SELECT id, email FROM users WHERE id=$1 LIMIT 1`, [userId]);
    const userEmail = (u.rows[0]?.email || '').toLowerCase();
    log('user', { userId, hasEmail: Boolean(userEmail) });

    // 3) Transaction + org advisory lock
    await pool.query('BEGIN');
    log('tx:BEGIN');

    await pool.query(
      `SELECT pg_advisory_xact_lock(
         ('x'||substr(md5($1::text),1,8))::bit(32)::int,
         ('x'||substr(md5($1::text),9,8))::bit(32)::int
       )`,
      [assignment.org_id]
    );
    log('advisory lock acquired', { org_id: assignment.org_id });

    // 4) Seat limits (learners only). Staff do not count against seats.
    const seatLimit = await getSeatLimit(pool, assignment.org_id).catch((e) => {
      err('getSeatLimit failed', { message: e?.message, code: e?.code });
      return 50; // safe fallback
    });
    const learnersQ = await pool.query(
      `SELECT COUNT(*)::int AS c
         FROM org_memberships
        WHERE org_id=$1::uuid AND role='learner'`,
      [assignment.org_id]
    );
    const learnersUsed = learnersQ.rows[0]?.c ?? 0;

    const existing = await pool.query(
      `SELECT role
         FROM org_memberships
        WHERE org_id=$1::uuid AND user_id=$2
        LIMIT 1`,
      [assignment.org_id, userId]
    );
    const isAlreadyMember = !!existing.rowCount;
    const existingRole = existing.rows[0]?.role || null;
    const isStaff = ['owner', 'admin', 'instructor'].includes((existingRole || '').toLowerCase());

    log('seats', {
      seatLimit,
      learnersUsed,
      isAlreadyMember,
      existingRole,
      isStaff,
    });

    if (!isStaff && !isAlreadyMember && learnersUsed >= seatLimit) {
      await pool.query('ROLLBACK');
      warn('seat limit reached', { seatLimit, learnersUsed });
      return res.status(403).json({
        ok: false,
        message: 'Seat limit reached. Upgrade your plan to add more learners.',
        code: 'SEAT_LIMIT_REACHED',
      });
    }

    // 5) Email-based upgrade: if there was a pending invite row for this email, attach user_id + normalize role to learner (but do not downgrade staff)
    if (userEmail) {
      const up = await pool.query(
        `UPDATE org_memberships
            SET user_id   = COALESCE(user_id, $2),
                role      = CASE
                             WHEN role IN ('owner','admin','instructor') THEN role
                             ELSE 'learner'
                           END,
                joined_at = COALESCE(joined_at, NOW()),
                invited_at= COALESCE(invited_at, NOW())
          WHERE org_id=$1::uuid
            AND LOWER(COALESCE(email,''))=$3`,
        [assignment.org_id, userId, userEmail]
      );
      log('email upgrade', { userEmail, updated: up.rowCount });
    } else {
      log('email upgrade skipped (no email)');
    }

    // 6) Ensure membership row for this user. Don’t downgrade staff on conflict.
    const ins = await pool.query(
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
    log('membership upsert', { insertedOrUpdated: ins.rowCount });

    // 7) (Optional) fetch final org defaults (good for UI) — not strictly needed but useful for logs/response
    const org = await pool.query(
      `SELECT quiz_time_limit_s, default_pass_mark, name
         FROM organizations
        WHERE id=$1::uuid
        LIMIT 1`,
      [assignment.org_id]
    );
    const orgDefaults = org.rows[0] || {};
    log('org defaults', {
      orgName: orgDefaults.name || null,
      quiz_time_limit_s: orgDefaults.quiz_time_limit_s ?? null,
      default_pass_mark: orgDefaults.default_pass_mark ?? null,
    });

    await pool.query('COMMIT');
    log('tx:COMMIT');

    // 8) Return enrollment info; attempts will be handled by /api/orgs/attempts/start
    const payload = {
      ok: true,
      enrollment: {
        orgId: assignment.org_id,
        assignmentId: assignment.id,
        userId,
        passMark: assignment.pass_mark ?? orgDefaults.default_pass_mark ?? 70,
        timerS: assignment.timer_s ?? orgDefaults.quiz_time_limit_s ?? 900,
        maxAttempts: assignment.max_attempts ?? 1,
        dueAt: assignment.due_at, // may be null; /attempts/start will compute an active due
      },
    };
    log('success', payload.enrollment);
    return res.json(payload);
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch {}
    err('failed', {
      message: e?.message,
      code: e?.code,
      severity: e?.severity,
      detail: e?.detail,
      constraint: e?.constraint,
      stack: e?.stack,
    });
    // Bubble a clean error to the client, keep details in logs
    return res.status(500).json({ message: 'Failed to accept invite' });
  }
}



// Called by your quiz "Submit" button (org flow)
// controllers/orgController.js
export async function submitAttempt(req, res) {
  const userId = req.user?.id;
  const { assignmentId, attemptId, answers } = req.body || {};
  if (!userId || (!assignmentId && !attemptId)) {
    return res.status(400).json({ message: 'Bad request' });
  }

  // Load the learner's active attempt (by attemptId if provided, else by assignmentId)
  const params = attemptId
    ? [attemptId, userId]
    : [assignmentId, userId];

  const whereClause = attemptId
    ? 'qa.id=$1 AND qa.user_id=$2'
    : 'qa.assignment_id=$1 AND qa.user_id=$2';

  const q = await pool.query(
    `
    SELECT qa.*,
           a.course_id,
           a.max_attempts,
           o.allow_retry
      FROM org_quiz_attempts qa
      JOIN org_course_assignments a ON a.id = qa.assignment_id
      JOIN organizations o          ON o.id = qa.org_id
     WHERE ${whereClause}
     ORDER BY qa.created_at DESC
     LIMIT 1
    `,
    params
  );

  if (!q.rowCount) return res.status(404).json({ message: 'Attempt not found' });

  const att = q.rows[0];

  // Hard stop if time is up
  const nowMs = Date.now();
  const dueMs = att.due_at ? new Date(att.due_at).getTime() : 0;
  if (dueMs && dueMs < nowMs) {
    await pool.query(`UPDATE org_quiz_attempts SET status='expired' WHERE id=$1`, [att.id]);
    return res.status(403).json({ message: 'Time expired. Attempt locked.' });
  }

  // If already submitted and passed, no further submits
  if (att.status !== 'active' && att.passed) {
    return res.status(403).json({ message: 'Attempt is already submitted.' });
  }

  // TODO: replace with your real grading
  const grade = await fakeGrade(att.course_id, answers); // { scorePct, passed, passMark }

  // Persist: always finalize the attempt on submit so "used attempts" is accurate
  const allowRetry = att.allow_retry !== false; // default true
  const sql = `
    UPDATE org_quiz_attempts
       SET submitted_at = NOW(),
           status      = 'submitted',
           score_pct   = $2,
           passed      = $3,
           answers     = $4
     WHERE id = $1
     RETURNING id, assignment_id, org_id, user_id, status, score_pct, passed, due_at
  `;


  const { rows: upRows } = await pool.query(sql, [
    att.id,
    grade.scorePct,
    grade.passed,
    JSON.stringify(answers || []),
  ]);

    // How many attempts are now used (submitted/expired)?
  const usedQ = await pool.query(
    `SELECT COUNT(*)::int AS used
       FROM org_quiz_attempts
      WHERE assignment_id=$1 AND user_id=$2
        AND status IN ('submitted','expired')`,
    [att.assignment_id, userId]
  );
  const used = usedQ.rows[0]?.used ?? 0;
  const maxAttempts = att.max_attempts || 1;
  const attemptsLeft = Math.max(0, maxAttempts - used);
  const canRetry = allowRetry && !grade.passed && attemptsLeft > 0;

  // Optional: mail only when finalized (passed or no-retry)
  try {
    if (shouldFinalize) {
      const u = await pool.query(`SELECT email, name FROM users WHERE id=$1`, [userId]);
      if (u.rowCount && u.rows[0].email) {
        await sendEmail(
          u.rows[0].email,
          `Quiz result: ${grade.scorePct}%`,
          `You scored ${grade.scorePct}% ${grade.passed ? '✅ (passed)' : '❌ (not passed)'}.`
        );
      }
    }
  } catch (e) {
    console.warn('[email] result mail failed', e?.message);
  }

  return res.json({
    ok: true,
    grade,
    attempt: upRows[0],
    attempts: { used, max: maxAttempts, left: attemptsLeft, canRetry },
  });
}

// Simple stub: replace with your real grading service
async function fakeGrade(courseId, answers) {
  const correct = Array.isArray(answers)
    ? Math.max(0, Math.min(answers.length, Math.round(answers.length * 0.8)))
    : 0;
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
  ? `date_trunc('year', created_at)`
  : period === 'term'
    ? `date_trunc('quarter', created_at)`
    : `date_trunc('month', created_at)`;


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
    courseSize,
    minutes,
    title_override,
    pass_mark,
    timer_s,
    max_attempts = 1,
    due_at,
    locked_config,
  } = req.body || {};

  // ── Logging helpers (no TS types; ESM-safe crypto) ───────────────────────
  let rid = req.get?.('x-request-id') || null;
  if (!rid) {
    try {
      const { randomUUID, randomBytes } = await import('crypto');
      rid = (typeof randomUUID === 'function' && randomUUID()) || randomBytes(6).toString('hex');
    } catch {
      rid = Math.random().toString(36).slice(2, 10);
    }
  }
  const tag = (msg) => `[org.share ${rid}] ${msg}`;
  const log = (...args) => console.log(tag(''), ...args);
  const warn = (...args) => console.warn(tag('WARN'), ...args);
  const errlog = (...args) => console.error(tag('ERROR'), ...args);

  log('incoming', {
    orgId,
    userId,
    body: {
      courseId,
      title,
      courseSize,
      minutes,
      title_override,
      pass_mark,
      timer_s,
      max_attempts,
      due_at,
      locked_config_type: typeof locked_config,
    },
  });

  if (!userId) {
    warn('unauthorized: missing userId');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // ── Permission check ──────────────────────────────────────────────────────
  const mem = await pool.query(
    `SELECT role FROM org_memberships
      WHERE org_id=$1 AND user_id=$2
        AND role IN ('owner','admin','instructor')`,
    [orgId, userId]
  );
  log('membership', { rowCount: mem.rowCount, roles: mem.rows?.map((r) => r.role) });
  if (!mem.rowCount) {
    warn('forbidden: not owner/admin/instructor');
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    // ── Tier clamp ──────────────────────────────────────────────────────────
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
    log('tier', { tier, isStarter, inputMinutes: minutes, safeMinutes });

    // ── Ensure course (create/lookup) ───────────────────────────────────────
    const course = await ensureCourse({ courseId, title, courseSize, minutes: safeMinutes });
    const cid = course.id;
    log('course.ensure', { ensuredId: cid, ensuredTitle: course?.title, size: courseSize, minutes: safeMinutes });

    // ── Existing invite (for visibility) ────────────────────────────────────
    const existingInviteQ = await pool.query(
      `SELECT invite_code FROM org_course_assignments WHERE org_id=$1 AND course_id=$2 LIMIT 1`,
      [orgId, cid]
    );
    const existingInvite = existingInviteQ.rows[0]?.invite_code || null;
    log('existingInvite', { exists: Boolean(existingInvite), invite_code: existingInvite });

    // ── Upsert assignment (includes locked_config) ──────────────────────────
    const { randomBytes } = await import('crypto');
    const invite = randomBytes(10).toString('base64url');
    const lockedJSON =
      locked_config && typeof locked_config === 'object' ? JSON.stringify(locked_config) : null;

    const text = `
      INSERT INTO org_course_assignments
        (
          org_id,
          course_id,
          title_override,
          pass_mark,
          timer_s,
          max_attempts,
          due_at,
          locked_config,
          invite_code,
          created_by,
          created_at,
          updated_at
        )
      VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8,
          COALESCE(
            (SELECT invite_code FROM org_course_assignments WHERE org_id=$1 AND course_id=$2),
            $9
          ),
          $10, NOW(), NOW()
        )
      ON CONFLICT (org_id, course_id) DO UPDATE
         SET title_override = COALESCE(EXCLUDED.title_override, org_course_assignments.title_override),
             pass_mark      = COALESCE(EXCLUDED.pass_mark,      org_course_assignments.pass_mark),
             timer_s        = COALESCE(EXCLUDED.timer_s,        org_course_assignments.timer_s),
             max_attempts   = COALESCE(EXCLUDED.max_attempts,   org_course_assignments.max_attempts),
             due_at         = COALESCE(EXCLUDED.due_at,         org_course_assignments.due_at),
             locked_config  = COALESCE(EXCLUDED.locked_config,  org_course_assignments.locked_config),
             updated_at     = NOW()
      RETURNING *;
    `;

    const values = [
      orgId,                 // $1
      cid,                   // $2
      title_override || null,// $3
      pass_mark || null,     // $4
      timer_s || null,       // $5
      max_attempts,          // $6
      due_at || null,        // $7
      lockedJSON,            // $8
      invite,                // $9 (fallback if none exists)
      userId,                // $10
    ];

    // Verbose bind logging + sanity check
    const placeholders = [...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    const maxIndex = placeholders.length ? Math.max(...placeholders) : 0;
    log('sql.binds', {
      maxPlaceholder: maxIndex,
      uniquePlaceholders: Array.from(new Set(placeholders)).sort((a, b) => a - b),
      valuesCount: values.length,
    });
    values.forEach((v, i) => log(`sql.bind $${i + 1}`, v));

    if (maxIndex !== values.length) {
      throw new Error(`SQL placeholder/value count mismatch: ${maxIndex} vs ${values.length}`);
    }

    const q = await pool.query({ text, values, name: 'ensure_shareable_assignment_v2' });
    const assignment = q.rows[0];

    log('assignment.upserted', {
      id: assignment?.id,
      org_id: assignment?.org_id,
      course_id: assignment?.course_id,
      title_override: assignment?.title_override ?? null,
      pass_mark: assignment?.pass_mark ?? null,
      timer_s: assignment?.timer_s ?? null,
      max_attempts: assignment?.max_attempts ?? null,
      due_at: assignment?.due_at ?? null,
      invite_code: assignment?.invite_code,
      locked_config_present: Boolean(assignment?.locked_config),
      created_by: assignment?.created_by,
      created_at: assignment?.created_at,
      updated_at: assignment?.updated_at,
      reusedInvite: existingInvite ? assignment?.invite_code === existingInvite : false,
    });

    // Build invite URL
    const base =
      process.env.WEB_BASE_URL ||
      req.get('origin') ||
      req.get('referer') ||
      'http://localhost:5173';
    const inviteUrl = `${base.replace(/\/$/, '')}/org/join/${assignment.invite_code}`;
    log('inviteUrl', { inviteUrl });

    return res.json({
      ok: true,
      courseId: cid,
      courseTitle: course.title,
      assignment,
      inviteUrl,
    });
  } catch (e) {
    errlog('failure', {
      message: e?.message,
      code: e?.code,
      severity: e?.severity,
      stack: e?.stack,
    });
    if (
      e?.message === 'COURSE_NOT_FOUND' ||
      e?.message === 'TITLE_REQUIRED' ||
      e?.message === 'INVALID_SIZE'
    ) {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: 'Failed to ensure assignment' });
  }
}

// GET /api/orgs/attempts/:attemptId/meta   (strict to current user)
export async function getAttemptMeta(req, res) {
  const userId = req.user?.id;
  const { attemptId } = req.params;
  if (!userId || !attemptId) return res.status(400).json({ message: 'Bad request' });

  const q = await pool.query(
    `SELECT
       qa.*,
       a.id             AS assignment_id,
       a.course_id,
       a.title_override,
       a.pass_mark      AS assign_pass_mark,
       a.timer_s        AS assign_timer_s,
       a.locked_config,
       o.default_pass_mark AS org_pass_mark,
       o.quiz_time_limit_s AS org_timer_s
     FROM org_quiz_attempts qa
     JOIN org_course_assignments a ON a.id = qa.assignment_id
     JOIN organizations o          ON o.id = qa.org_id
     WHERE qa.id = $1 AND qa.user_id = $2
     LIMIT 1`,
    [attemptId, userId]
  );
  if (!q.rowCount) return res.status(404).json({ message: 'Attempt not found' });

  const row = q.rows[0];
  const locked_config = safeParseJSON(row.locked_config);
  const passMark = row.pass_mark ?? row.assign_pass_mark ?? row.org_pass_mark ?? 70;
  const timer_s  = row.assign_timer_s ?? row.org_timer_s ?? 900;

  return res.json({
    ok: true,
    meta: {
      attemptId: row.id,
      assignmentId: row.assignment_id,
      courseId: row.course_id,
      locked_config,
      passMark,
      timer_s,
      due_at: row.due_at,
      status: row.status,
      org_id: row.org_id,
      title_override: row.title_override || null,
    }
  });
}

function safeParseJSON(v) {
  if (!v) return null;
  try { return typeof v === 'object' ? v : JSON.parse(v); } catch { return null; }
}

// GET /api/orgs/assignments/:assignmentId/mine  (find or lazily create an attempt)
export async function getMyAttemptForAssignment(req, res) {
  const userId = req.user?.id;
  const { assignmentId } = req.params;
  if (!userId || !assignmentId) return res.status(400).json({ message: 'Bad request' });

  // find assignment + org defaults
  const a = await pool.query(
    `SELECT a.*, o.default_pass_mark, o.quiz_time_limit_s
       FROM org_course_assignments a
       JOIN organizations o ON o.id = a.org_id
      WHERE a.id = $1`,
    [assignmentId]
  );
  if (!a.rowCount) return res.status(404).json({ message: 'Assignment not found' });
  const assign = a.rows[0];

  // find existing attempt for this user
 const e = await pool.query(
  `SELECT *
     FROM org_quiz_attempts
    WHERE assignment_id=$1 AND user_id=$2
    ORDER BY created_at DESC
    LIMIT 1`,
  [assignmentId, userId]
);

if (!e.rowCount) {
  // No attempt yet → tell the client to call /attempts/start
  const locked_config = safeParseJSON(assign.locked_config);
  const passMark = assign.pass_mark ?? assign.default_pass_mark ?? 70;
  const timer_s  = assign.timer_s ?? assign.quiz_time_limit_s ?? 900;
  return res.json({
    ok: true,
    meta: {
      attemptId: null,
      assignmentId: assign.id,
      courseId: assign.course_id,
      locked_config,
      passMark,
      timer_s,
      due_at: null,
      status: 'none',
      org_id: assign.org_id,
      title_override: assign.title_override || null,
    }
  });
}

const attempt = e.rows[0];
  // Re-hydrate full meta (including org timers) for the active/last attempt
  const q = await pool.query(
    `SELECT
       qa.*,
       a.id             AS assignment_id,
       a.course_id,
       a.title_override,
       a.pass_mark      AS assign_pass_mark,
       a.timer_s        AS assign_timer_s,
       a.locked_config,
       o.default_pass_mark AS org_pass_mark,
       o.quiz_time_limit_s AS org_timer_s
     FROM org_quiz_attempts qa
     JOIN org_course_assignments a ON a.id = qa.assignment_id
     JOIN organizations o          ON o.id = qa.org_id
     WHERE qa.id = $1
     LIMIT 1`,
    [attempt.id]
  );
  const row = q.rows[0];
  const locked_config = safeParseJSON(row.locked_config);
  const passMark = row.pass_mark ?? row.assign_pass_mark ?? row.org_pass_mark ?? 70;
  const timer_s  = row.assign_timer_s ?? row.org_timer_s ?? 900;

  return res.json({
    ok: true,
    meta: {
      attemptId: row.id,
      assignmentId: row.assignment_id,
      courseId: row.course_id,
      locked_config,
      passMark,
      timer_s,
      due_at: row.due_at,
      status: row.status,
      org_id: row.org_id,
      title_override: row.title_override || null,
    }
  });
}

// POST /api/orgs/attempts/start  { assignmentId }

export async function startAttempt(req, res) {
  const userId = req.user?.id;
  const { assignmentId } = req.body || {};
  if (!userId || !assignmentId) return res.status(400).json({ message: 'Bad request' });

  // load assignment + org defaults
  const { rows: aRows } = await pool.query(
    `SELECT a.*, o.quiz_time_limit_s, o.default_pass_mark, o.allow_retry
       FROM org_course_assignments a
       JOIN organizations o ON o.id = a.org_id
      WHERE a.id=$1::uuid`,
    [assignmentId]
  );
  if (!aRows.length) return res.status(404).json({ message: 'Assignment not found' });
  const a = aRows[0];

  // ensure org membership
  const mem = await pool.query(
    `SELECT 1 FROM org_memberships WHERE org_id=$1::uuid AND user_id=$2 LIMIT 1`,
    [a.org_id, userId]
  );
  if (!mem.rowCount) return res.status(403).json({ message: 'Forbidden' });

  await pool.query('BEGIN');
  try {
    // lock (assignmentId,userId)
    await pool.query(
      `SELECT pg_advisory_xact_lock(
         ('x'||substr(md5($1::text),1,8))::bit(32)::int,
         ('x'||substr(md5($2::text),1,8))::bit(32)::int
       )`,
      [assignmentId, String(userId)]
    );

    // idempotent: reuse active & unexpired
    const { rows: activeRows } = await pool.query(
      `SELECT id, attempt_no, due_at, pass_mark
         FROM org_quiz_attempts
        WHERE assignment_id=$1::uuid AND user_id=$2 AND status='active'`,
      [assignmentId, userId]
    );
    if (activeRows.length) {
      const act = activeRows[0];
      const remainingMs = Math.max(0, new Date(act.due_at).getTime() - Date.now());
      if (remainingMs > 0) {
        await pool.query('COMMIT');
        return res.json({ ok: true, attemptId: act.id, attemptNo: act.attempt_no, remainingMs });
      } else {
        await pool.query(`UPDATE org_quiz_attempts SET status='expired' WHERE id=$1`, [act.id]);
      }
    }

    // attempts used for limit (submitted+expired)
    const { rows: usedRows } = await pool.query(
      `SELECT COUNT(*)::int AS used
         FROM org_quiz_attempts
        WHERE assignment_id=$1::uuid AND user_id=$2
          AND status IN ('submitted','expired')`,
      [assignmentId, userId]
    );
    const used = usedRows[0].used;
    const maxAttempts = a.max_attempts || 1;
    if (used >= maxAttempts) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ code: 'ATTEMPTS_EXHAUSTED', message: 'No attempts left.' });
    }

    // ✅ get latest attempt_no row and lock THAT row (legal with FOR UPDATE)
    const { rows: lastRows } = await pool.query(
      `SELECT attempt_no
         FROM org_quiz_attempts
        WHERE assignment_id=$1::uuid AND user_id=$2
        ORDER BY attempt_no DESC
        LIMIT 1
        FOR UPDATE`,
      [assignmentId, userId]
    );
    const lastNo = lastRows[0]?.attempt_no ?? 0;
    const nextNo = lastNo + 1;

    const secs = a.timer_s || a.quiz_time_limit_s || 900;
    const dueAt = new Date(Date.now() + secs * 1000);
    const passMark = a.pass_mark || a.default_pass_mark || 70;

    // insert new active attempt (protect with ON CONFLICT anyway)
    const ins = await pool.query(
      `INSERT INTO org_quiz_attempts
         (org_id, assignment_id, user_id, attempt_no, status, due_at, pass_mark)
       VALUES ($1::uuid,$2::uuid,$3,$4,'active',$5,$6)
       ON CONFLICT (assignment_id, user_id, attempt_no) DO NOTHING
       RETURNING id, attempt_no, due_at`,
      [a.org_id, assignmentId, userId, nextNo, dueAt, passMark]
    );

    let attemptRow = ins.rows[0];
    if (!attemptRow) {
      // fallback: return the latest row (should be the one created by a concurrent txn)
      const { rows: fb } = await pool.query(
        `SELECT id, attempt_no, due_at
           FROM org_quiz_attempts
          WHERE assignment_id=$1::uuid AND user_id=$2
          ORDER BY attempt_no DESC
          LIMIT 1`,
        [assignmentId, userId]
      );
      attemptRow = fb[0];
    }

    await pool.query('COMMIT');

    const remainingMs = Math.max(0, new Date(attemptRow.due_at).getTime() - Date.now());
    return res.json({
      ok: true,
      attemptId: attemptRow.id,
      attemptNo: attemptRow.attempt_no,
      remainingMs,
    });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('[attempts/start] failed', e);
    return res.status(500).json({ message: 'Failed to start attempt' });
  }
}
