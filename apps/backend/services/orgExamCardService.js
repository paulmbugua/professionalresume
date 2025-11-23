// apps/backend/services/orgExamCardService.js
import pool from '../config/db.js';

const percentOf = (score, max) => {
  const s = Number(score);
  const m = Number(max);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 100;
};

const computeOrdinalRank = (n) => {
  if (!n || !Number.isFinite(n)) return null;
  const v = n % 100;
  const suffix =
    v >= 11 && v <= 13
      ? 'th'
      : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 3)] || 'th';
  return `${n}${suffix}`;
};

/**
 * Core builder used by both JSON API and PDF generator.
 * Returns:
 * {
 *   student: { id, name, email, admission_code, class_label },
 *   term: { id, year, label },
 *   session: { id, label },
 *   subjects: [
 *     {
 *       subject,
 *       score,
 *       max_score,
 *       grade,
 *       percent,
 *       classRank,
 *       classSize,
 *       classMeanPercent
 *     }
 *   ],
 *   summary: {
 *     totalScore,
 *     totalMax,
 *     totalPercent,
 *     overallGrade,
 *     classRank,
 *     classSize
 *   },
 *   computed: {
 *     bestSubject,
 *     bestPercent,
 *     weakestSubject,
 *     weakestPercent
 *   },
 *   progressSeries: [
 *     { termId, sessionId, label, percent, isCurrent }
 *   ],
 *   attendance: {
 *     lessonsHeld,
 *     lessonsAttended,
 *     attendancePercent,
 *     behaviorRating,
 *     punctualityRating,
 *     teacherComment
 *   } | null
 * }
 */
export async function getStudentExamCard({ orgId, sessionId, studentUserId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── NEW: load org meta for header / branding ──
    const orgRes = await client.query(
      `select id, name, slug
       from organizations
       where id = $1
       limit 1`,
      [orgId],
    );
    if (!orgRes.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    const orgRow = orgRes.rows[0];
    const org = {
      id: orgRow.id,
      name: orgRow.name,
      slug: orgRow.slug,
    };

    // 1) Resolve term + session meta
    const sessionMetaRes = await client.query(
      `
        select
          s.id              as session_id,
          s.label           as exam_label,
          s.term_id         as term_id,
          t.label           as term_label,
          t.year            as term_year
        from org_exam_sessions s
        join org_exam_terms t
          on t.id = s.term_id
        where s.org_id = $1
          and s.id     = $2
        limit 1
      `,
      [orgId, sessionId],
    );

    if (!sessionMetaRes.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const sessionMeta = sessionMetaRes.rows[0];

    // 2) Load all result rows for THIS learner in THIS exam
    const resultsRes = await client.query(
      `
        select
          r.subject,
          r.score,
          r.max_score,
          r.grade,
          u.id              as student_id,
          u.name            as student_name,
          u.email           as student_email,
          p.class_label,
          p.admission_code
        from org_exam_results r
        join users u
          on u.id = r.student_user_id
        left join org_learner_profiles p
          on p.org_id = r.org_id
         and p.user_id = r.student_user_id
        where r.org_id         = $1
          and r.session_id     = $2
          and r.student_user_id = $3
        order by r.subject asc
      `,
      [orgId, sessionId, studentUserId],
    );

    if (!resultsRes.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const firstRow = resultsRes.rows[0];

    const student = {
      id: firstRow.student_id,
      name: firstRow.student_name,
      email: firstRow.student_email,
      admission_code: firstRow.admission_code,
      class_label: firstRow.class_label,
    };

    const effectiveClassLabel = (firstRow.class_label || '').toString().trim();

    // 3) Load ALL rows in this exam + class for positions
    const classRowsRes = await client.query(
      `
        select
          r.student_user_id,
          r.subject,
          r.score,
          r.max_score,
          p.class_label
        from org_exam_results r
        left join org_learner_profiles p
          on p.org_id  = r.org_id
         and p.user_id = r.student_user_id
        where r.org_id     = $1
          and r.session_id = $2
          and (
            $3::text is null
            or lower(coalesce(p.class_label, '')) = lower($3::text)
          )
      `,
      [orgId, sessionId, effectiveClassLabel || null],
    );

    const classRows = classRowsRes.rows;

    // 4) Overall totals (for the whole class)
    const totalsByStudent = new Map();
    for (const r of classRows) {
      const sid = Number(r.student_user_id);
      if (!Number.isFinite(sid)) continue;
      const s = Number(r.score) || 0;
      const m = Number(r.max_score) || 0;

      const prev = totalsByStudent.get(sid) || {
        totalScore: 0,
        totalMax: 0,
        percent: 0,
      };
      const totalScore = prev.totalScore + s;
      const totalMax = prev.totalMax + m;
      const percent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      totalsByStudent.set(sid, { totalScore, totalMax, percent });
    }

    const overallSorted = Array.from(totalsByStudent.entries()).sort(
      (a, b) => b[1].percent - a[1].percent,
    );
    const classSize = overallSorted.length;
    const overallIdx = overallSorted.findIndex(
      ([sid]) => Number(sid) === Number(studentUserId),
    );
    const overallRank = overallIdx >= 0 ? overallIdx + 1 : null;

    const myTotals = overallIdx >= 0 ? overallSorted[overallIdx][1] : null;
    const totalScore = myTotals?.totalScore ?? null;
    const totalMax = myTotals?.totalMax ?? null;
    const totalPercent = myTotals ? myTotals.percent : null;

    // 5) Subject-wise positions in this class
    const rowsBySubject = new Map();
    for (const r of classRows) {
      const key = (r.subject || '').toString().toLowerCase();
      if (!rowsBySubject.has(key)) rowsBySubject.set(key, []);
      rowsBySubject.get(key).push(r);
    }

    const subjectPositions = {};
    for (const [key, rows] of rowsBySubject.entries()) {
      if (!rows.length) continue;
      const withPerc = rows
        .map((r) => ({
          studentId: Number(r.student_user_id),
          percent: percentOf(r.score, r.max_score) ?? 0,
        }))
        .sort((a, b) => b.percent - a.percent);

      const size = withPerc.length;
      const idx = withPerc.findIndex(
        (row) => row.studentId === Number(studentUserId),
      );
      const rank = idx >= 0 ? idx + 1 : null;
      const meanPercent =
        withPerc.reduce((acc, r) => acc + r.percent, 0) / size || null;
      subjectPositions[key] = { rank, size, meanPercent };
    }

    // 6) Build subject array + find best / weakest
    const subjects = [];
    let best = null;
    let weakest = null;

    for (const r of resultsRes.rows) {
      const pct = percentOf(r.score, r.max_score);
      const key = (r.subject || '').toString().toLowerCase();
      const pos = subjectPositions[key] || {
        rank: null,
        size: 0,
        meanPercent: null,
      };

      const enriched = {
        subject: r.subject,
        score: Number(r.score),
        max_score: Number(r.max_score),
        grade: r.grade,
        percent: pct,
        classRank: pos.rank,
        classSize: pos.size,
        classMeanPercent: pos.meanPercent,
      };
      subjects.push(enriched);

      if (pct != null) {
        if (!best || pct > best.percent) {
          best = { subject: r.subject, percent: pct };
        }
        if (!weakest || pct < weakest.percent) {
          weakest = { subject: r.subject, percent: pct };
        }
      }
    }

    // 7) Build simple progress/history series for this learner
    const historyRes = await client.query(
      `
        select
          s.id          as session_id,
          s.label       as exam_label,
          t.id          as term_id,
          t.label       as term_label,
          t.year        as term_year,
          sum(r.score)  as total_score,
          sum(r.max_score) as total_max
        from org_exam_results r
        join org_exam_sessions s
          on s.id = r.session_id
        join org_exam_terms t
          on t.id = s.term_id
        where r.org_id           = $1
          and r.student_user_id  = $2
        group by s.id, s.label, t.id, t.label, t.year
        order by t.year asc, t.label asc, s.label asc
      `,
      [orgId, studentUserId],
    );

    const progressSeries = historyRes.rows.map((row) => {
      const ts = Number(row.total_score) || 0;
      const tm = Number(row.total_max) || 0;
      const p = tm > 0 ? (ts / tm) * 100 : 0;
      const label = `${row.term_year} ${row.term_label} – ${row.exam_label}`;
      return {
        termId: row.term_id,
        sessionId: row.session_id,
        label,
        percent: p,
        isCurrent: row.session_id === sessionMeta.session_id,
      };
    });

    // 8) Attendance / behaviour block (optional table)
    let attendance = null;
    try {
      const attRes = await client.query(
        `
          select
            lessons_held,
            lessons_attended,
            behavior_rating,
            punctuality_rating,
            teacher_comment
          from org_learner_attendance
          where org_id = $1
            and user_id = $2
            and term_id = $3
          limit 1
        `,
        [orgId, studentUserId, sessionMeta.term_id],
      );

      if (attRes.rows.length) {
        const att = attRes.rows[0];
        const lh = Number(att.lessons_held) || 0;
        const la = Number(att.lessons_attended) || 0;
        const attendancePercent =
          lh > 0 ? Math.round((la / lh) * 1000) / 10 : null;

        attendance = {
          lessonsHeld: lh || null,
          lessonsAttended: la || null,
          attendancePercent,
          behaviorRating: att.behavior_rating ?? null,
          punctualityRating: att.punctuality_rating ?? null,
          teacherComment: att.teacher_comment ?? null,
        };
      }
    } catch (err) {
      // If table doesn't exist, we silently ignore; everything else should still work.
      if (!/relation .*org_learner_attendance.* does not exist/i.test(err.message || '')) {
        throw err;
      }
    }

    await client.query('COMMIT');

    const summary = {
      totalScore,
      totalMax,
      totalPercent,
      overallGrade: null,
      classRank: overallRank,
      classSize,
    };

    return {
      org,                     // ← NEW: expose org to PDF + JSON
      student,
      term: {
        id: sessionMeta.term_id,
        year: sessionMeta.term_year,
        label: sessionMeta.term_label,
      },
      session: {
        id: sessionMeta.session_id,
        label: sessionMeta.exam_label,
      },
      subjects,
      summary,
      computed: {
        bestSubject: best?.subject ?? null,
        bestPercent: best?.percent ?? null,
        weakestSubject: weakest?.subject ?? null,
        weakestPercent: weakest?.percent ?? null,
      },
      progressSeries,
      attendance,
      helpers: {
        ordinalRank: computeOrdinalRank,
      },
    };
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}