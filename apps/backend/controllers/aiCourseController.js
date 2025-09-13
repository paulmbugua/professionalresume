// apps/backend/controllers/aiCourseController.js
import pool from '../config/db.js';

import {
  withGate,
  listTopCoursesService,
  generateOutlineService,
  generateLessonSSMLService,
  generateQuizService,
  generateCoursePackageService,
  // NEW: cache helpers
  cacheBustCourse,
  cacheDeleteByPattern,
} from '../services/aiCourseService.js';

import {
  outlineSchema,
  lessonSchema,
  quizSchema,
  gradeSchema,
} from '../validators/aiCoursesValidator.js';

/* ─────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────── */
function olMeta(outline) {
  const len = Array.isArray(outline) ? outline.length : 0;
  const head = Array.isArray(outline)
    ? outline.slice(0, 2).map((s) => s?.title || '').filter(Boolean)
    : [];
  return { len, head };
}

function setHeaders(res, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.set(k, v);
}

// Treat "1", "true", true as truthy for query/body flags
function boolish(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true';
}

// SAFE program track reader with default
function getProgramTrack(req) {
  const raw =
    req.body?.programTrack ??
    req.query?.programTrack ??
    req.headers['x-program-track'];
  return String(raw || 'general');
}

// Broader timeout/abort detector (covers AbortController + proxy messages)
function isAbortLike(err) {
  const msg = String(err?.message || err?.msg || '').toLowerCase();
  return (
    err?._isTimeoutAbort === true ||
    err?.name === 'AbortError' ||
    msg.includes('abort') ||
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    err?.code === 'UND_ERR_ABORTED'
  );
}

/* ─────────────────────────────────────────────────────────
 * Controllers (thin): validate → gate → call service → set headers
 * ───────────────────────────────────────────────────────── */

export async function listTopCourses(req, res) {
  try {
    const aiOnly = boolish(req.query.aiOnly);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    // Optional: allow list endpoint to clear its cache first
    if (boolish(req.query.refresh) || boolish(req.query.refreshCache)) {
      await cacheDeleteByPattern('ai:topCourses:*');
    }

    const { status, data, headers } = await listTopCoursesService({ aiOnly, limit, offset });
    setHeaders(res, headers);
    return res.status(status).json(data);
  } catch (err) {
    console.error('[ai] listTopCourses error:', err);
    return res.status(500).json({ error: 'Failed to load courses' });
  }
}


export async function generateOutline(req, res) {
  try {
    await withGate(async () => {
      // Keep program track header for visibility/debug
      const programTrack = getProgramTrack(req);
      res.set('X-Program-Track', programTrack);

      const { value, error } = outlineSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
      });
      if (error) {
        console.warn('[ai] outline validation failed', error.details?.map((d) => d.message));
        return res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: error.message,
          details: error.details?.map((d) => d.message) || [],
        });
      }

      let {
        courseId,
        title,
        level,
        targetMinutes,
        courseSize,
        totalLessons,
        assignmentId, // may be provided by the org flow
      } = value;

      title = typeof title === 'string' && title.trim() ? title.trim() : undefined;
      assignmentId =
        typeof assignmentId === 'string' && assignmentId.trim() ? assignmentId.trim() : undefined;

      console.log('[api:outline] req', {
        courseId,
        title: Boolean(title),
        courseId,
        title: Boolean(title),
        level,
        targetMinutes,
        courseSize,
        totalLessons,
        assignmentId: Boolean(assignmentId),
        programTrack,
      });

      // Optional refresh hooks
      if (
        boolish(req.query.refresh) ||
        boolish(req.query.refreshCache) ||
        boolish(req.body?.refresh) ||
        boolish(req.body?.refreshCache)
      ) {
        if (courseId) await cacheBustCourse(courseId);
        if (boolish(req.query.top) || boolish(req.body?.top)) {
          await cacheDeleteByPattern('ai:topCourses:*');
        }
      }

      // 🔒 If caller didn't specify totalLessons/targetMinutes, try the org assignment's locked_config
if (assignmentId) {
  try {
    const q = await pool.query(
      `SELECT COALESCE(locked_config, '{}'::jsonb) AS lc
         FROM org_course_assignments
        WHERE id = $1::uuid
        LIMIT 1`,
      [assignmentId]
    );
    const lc = q.rows?.[0]?.lc || {};

    // totalLessons override (already present)
    const lockedTotal = Math.max(1, Number(lc.totalLessons));
    if ((!totalLessons || Number(totalLessons) <= 0) && Number.isFinite(lockedTotal) && lockedTotal > 0) {
      totalLessons = lockedTotal;
    }

    // minutes override (NEW)
    const lockedMinutes = Math.max(5, Number(lc.minutes));
    if ((!targetMinutes || Number(targetMinutes) <= 0) && Number.isFinite(lockedMinutes) && lockedMinutes > 0) {
      targetMinutes = lockedMinutes;
    }
  } catch (e) {
    console.warn('[api:outline] locked_config lookup failed', e?.message || e);
  }
}


      const { status, data, headers } = await generateOutlineService({
        courseId,
        title,
        level,
        targetMinutes,
        courseSize,
        totalLessons,
        programTrack,
      });

      setHeaders(res, headers);
      console.log('[api:outline] resp', {
        status,
        outlineLen: Array.isArray(data?.outline) ? data.outline.length : 0,
      });
      return res.status(status).json(data);
    });
  } catch (err) {
    const info = {
      name: err?.name,
      msg: err?.message || err?.msg,
      timeout: !!err?._isTimeoutAbort,
      busy: !!err?._serverBusy,
    };
    console.error('[ai] generateOutline error:', info);

    if (err?._serverBusy) {
      res.set('Retry-After', '3');
      return res.status(503).json({ error: 'Server busy. Please retry.' });
    }
    if (isAbortLike(err)) {
      res.set('Retry-After', '5');
      return res.status(504).json({ error: 'AI service timeout. Please try again.' });
    }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' });
    }
    return res.status(500).json({ error: 'Failed to generate outline' });
  }
}


export async function generateLessonSSML(req, res) {
  try {
    await withGate(async () => {
      const programTrack = getProgramTrack(req);
      res.set('X-Program-Track', programTrack);
      const { value, error } = lessonSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
      });
      if (error) {
        console.warn('[ai] lesson validation failed', error.details?.map((d) => d.message));
        return res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: error.message,
          details: error.details?.map((d) => d.message) || [],
        });
      }

      const { courseId, outline, voiceName, courseSize } = value;
       const startRaw = req.query.start ?? req.body?.start;
      const countRaw = req.query.count ?? req.body?.count;
      const start = Number.isFinite(Number(startRaw)) ? Number(startRaw) : 0;
       const MAX_BATCH = 3;
      const count = Math.max(1, Math.min(MAX_BATCH, Number.isFinite(Number(countRaw)) ? Number(countRaw) : 1));
      
      console.log('[api:lesson-ssml] req', {
        courseId,
        voiceName,
        courseSize,
        outlineLen: Array.isArray(outline) ? outline.length : 0,
        start,
        count,
        sample: Array.isArray(outline) ? outline.slice(0, 2).map((s) => s?.title || '') : [],
      });

      if (!courseId) return res.status(400).json({ error: 'MISSING_COURSE_ID' });
      if (!Array.isArray(outline) || !outline.length) {
        return res.status(400).json({ error: 'EMPTY_OUTLINE' });
      }

      // Optional refresh before generating
      if (boolish(req.query.refresh) || boolish(req.query.refreshCache) || boolish(req.body?.refresh) || boolish(req.body?.refreshCache)) {
        await cacheBustCourse(courseId);
      }

      const { status, data, headers } = await generateLessonSSMLService({
        courseId,
        outline,
        voiceName: voiceName || 'en-US-JennyNeural',
        courseSize,
        count,
        start,
        programTrack,
      });
      setHeaders(res, headers);

      // If degraded but payload exists, send 206 so clients can consume it.
      let statusOut = status;
      const hasPayload =
        (Array.isArray(data?.lessons) && data.lessons.length > 0) ||
        (typeof data?.joinedSsml === 'string' && data.joinedSsml.trim().length > 0);
      if (status >= 500 && status < 600 && hasPayload) {
        statusOut = 206;
        res.set('X-Degraded', 'true');
      }

      console.log('[api:lesson-ssml] resp', {
        status: statusOut,
        lessons: Array.isArray(data?.lessons) ? data.lessons.length : 0,
        joinedBytes: typeof data?.joinedSsml === 'string' ? data.joinedSsml.length : 0,
        notice: !!data?.notice,
      });
      return res.status(statusOut).json(data);
    });
  } catch (err) {
    const info = {
      name: err?.name,
      msg: err?.message || err?.msg,
      timeout: !!err?._isTimeoutAbort,
      busy: !!err?._serverBusy,
    };
    console.error('[ai] generateLessonSSML error:', info);

    if (err?._serverBusy) {
      res.set('Retry-After', '3');
      return res.status(503).json({ error: 'Server busy. Please retry.' });
    }
    if (isAbortLike(err)) {
      res.set('Retry-After', '5');
      return res.status(504).json({ error: 'AI service timeout. Please try again.' });
    }

    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' });
    }
    return res.status(500).json({ error: 'Failed to generate lesson SSML' });
  }
}

export async function generateQuiz(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = quizSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
      });
      if (error) {
        console.warn('[ai] quiz validation failed', error.details?.map((d) => d.message));
        return res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: error.message,
          details: error.details?.map((d) => d.message) || [],
        });
      }

      // Always initialize locals from validated payload
      const courseId   = value.courseId;
      const outline    = value.outline;
      const courseSize = value.courseSize;
      let   numQ       = value.numQuestions; // <- local working copy

      const meta = olMeta(outline);
      console.log('[api:quiz] req', {
        courseId,
        outlineLen: meta.len,
        numQuestions_in: numQ,
        courseSize,
      });

      if (!courseId) {
        return res.status(400).json({ error: 'MISSING_COURSE_ID' });
      }
      if (!Array.isArray(outline) || !outline.length) {
        return res.status(400).json({ error: 'EMPTY_OUTLINE' });
      }

      // 🔒 If numQuestions not provided, try assignment locked_config.quizSize
      const assignmentId =
        typeof req.body?.assignmentId === 'string' && req.body.assignmentId.trim()
          ? req.body.assignmentId.trim()
          : undefined;

      if ((numQ == null || Number(numQ) <= 0) && assignmentId) {
        try {
          const q = await pool.query(
            `SELECT COALESCE(locked_config, '{}'::jsonb) AS lc
               FROM org_course_assignments
              WHERE id = $1::uuid
              LIMIT 1`,
            [assignmentId]
          );
          const n = Number(q.rows?.[0]?.lc?.quizSize);
          if (Number.isFinite(n) && n > 0) numQ = n;
        } catch (e) {
          console.warn('[api:quiz] locked_config lookup failed', e?.message || e);
        }
      }

      // Final clamp (keeps things sane even if locked_config is odd)
      if (numQ != null) {
        const n = Number(numQ);
        if (Number.isFinite(n)) {
          numQ = Math.max(3, Math.min(30, n));
        } else {
          numQ = undefined;
        }
      }

      // Optional refresh before quiz gen
      if (
        boolish(req.query.refresh) ||
        boolish(req.query.refreshCache) ||
        boolish(req.body?.refresh) ||
        boolish(req.body?.refreshCache)
      ) {
        await cacheBustCourse(courseId);
      }

      const { status, data, headers } = await generateQuizService({
        courseId,
        outline,
        numQuestions: numQ, // <- use the sanitized value
        courseSize,
      });

      setHeaders(res, headers);
      console.log('[api:quiz] resp', {
        status,
        numQuestions_effective: numQ ?? 'auto',
        questions: data?.quiz?.questions?.length || 0,
      });
      return res.status(status).json(data);
    });
  } catch (err) {
    const info = {
      name: err?.name,
      msg: err?.message || err?.msg,
      timeout: !!err?._isTimeoutAbort,
      busy: !!err?._serverBusy,
    };
    console.error('[ai] generateQuiz error:', info);

    if (err?._serverBusy) {
      res.set('Retry-After', '3');
      return res.status(503).json({ error: 'Server busy. Please retry.' });
    }
    if (
      String(err?.message || '').toLowerCase().includes('abort') ||
      String(err?.msg || '').toLowerCase().includes('abort') ||
      err?.name === 'AbortError'
    ) {
      res.set('Retry-After', '5');
      return res.status(504).json({ error: 'AI service timeout. Please try again.' });
    }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) {
      res.set('Retry-After', '10');
      return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' });
    }
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}


// Pure sync grading using provided key
export async function gradeQuiz(req, res) {
  try {
    const { value, error } = gradeSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true, // let assignmentId flow through even if not in schema
    });
    if (error) {
      console.warn('[ai] grade validation failed', error.details?.map((d) => d.message));
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: error.message,
        details: error.details?.map((d) => d.message) || [],
      });
    }

    const { quiz, answers } = value;

    // Extract passMark/assignmentId without TS
    const assignmentId =
      typeof value.assignmentId === 'string' && value.assignmentId.trim()
        ? value.assignmentId.trim()
        : undefined;

    let passMark =
      value.passMark !== undefined && value.passMark !== null && !Number.isNaN(Number(value.passMark))
        ? Number(value.passMark)
        : undefined;

    // If passMark missing, look up from assignment → locked_config → org default → 70
    if ((passMark === undefined || Number.isNaN(passMark)) && assignmentId) {
      try {
        const q = await pool.query(
          `SELECT
             COALESCE(
               a.pass_mark,
               NULLIF((a.locked_config->>'passMark')::int, 0),
               o.default_pass_mark,
               70
             )::int AS effective_pass_mark
           FROM org_course_assignments a
           LEFT JOIN organizations o ON o.id = a.org_id
          WHERE a.id = $1::uuid
          LIMIT 1`,
          [assignmentId]
        );
        if (q.rows?.[0]?.effective_pass_mark != null) {
          passMark = Number(q.rows[0].effective_pass_mark);
        }
      } catch (e) {
        console.warn('[ai] gradeQuiz: passMark lookup failed', e?.message || e);
      }
    }

    // Final fallback + clamp
    if (passMark === undefined || Number.isNaN(passMark)) passMark = 70;
    passMark = Math.max(0, Math.min(100, Math.round(passMark)));

    // Grade using provided key
    const key = new Map(quiz.questions.map((q) => [q.id, q.answerIndex]));
    let correct = 0;
    for (const a of answers) {
      if (key.get(a.questionId) === a.choiceIndex) correct += 1;
    }
    const total = quiz.questions.length;
    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    const passed = scorePct >= passMark;

    return res.json({
      correct,
      total,
      scorePct,
      passed,
      passMark,
      assignmentId: assignmentId || null,
    });
  } catch (err) {
    console.error('[ai] gradeQuiz error:', err);
    return res.status(500).json({ error: 'Failed to grade quiz' });
  }
}


export async function generateCoursePackage(req, res) {
  try {
    await withGate(async () => {
      const {
        courseId,
        level = 'beginner',
        targetMinutes,
        voiceName = 'en-US-JennyNeural',
        numQuestions,
        courseSize,
        totalLessons,
      } = req.body || {};
      if (!courseId) return res.status(400).json({ error: 'courseId is required' });
      const programTrack = getProgramTrack(req);           // <-- read safely
      res.set('X-Program-Track', programTrack);            // (optional header for visibility)


      console.log('[api:course-package] req', {
        courseId,
        level,
        targetMinutes,
        voiceName,
        numQuestions,
        courseSize,
        programTrack,
        totalLessons,  
      });

      // Optional refresh before end-to-end package
      if (boolish(req.query.refresh) || boolish(req.query.refreshCache) || boolish(req.body?.refresh) || boolish(req.body?.refreshCache)) {
        await cacheBustCourse(courseId);
        if (boolish(req.query.top) || boolish(req.body?.top)) {
          await cacheDeleteByPattern('ai:topCourses:*');
        }
      }

  const { status, data, headers } = await generateCoursePackageService({
   courseId,
   level,
   targetMinutes,
   voiceName,
   numQuestions,
   courseSize,
   totalLessons,
   programTrack,
 });
 
      setHeaders(res, headers);

      console.log('[api:course-package] resp', {
        status,
        outlineLen: Array.isArray(data?.outline) ? data.outline.length : 0,
        lessons: Array.isArray(data?.lessons) ? data.lessons.length : 0,
        quizQ: data?.quiz?.questions?.length || 0,
        notice: !!data?.notice,
      });

      return res.status(status).json(data);
    });
  } catch (err) {
    console.error('[ai] generateCoursePackage error:', {
      name: err?.name,
      msg: err?.message || err?.msg,
      timeout: !!err?._isTimeoutAbort,
      busy: !!err?._serverBusy,
    });
    if (err?._serverBusy) {
      res.set('Retry-After', '3');
      return res.status(503).json({ error: 'Server busy. Please retry.' });
    }
    if (isAbortLike(err)) {
      res.set('Retry-After', '5');
      return res.status(504).json({ error: 'AI service timeout. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to generate course package' });
  }
}

/* ─────────────────────────────────────────────────────────
 * Cache admin helpers (optional endpoints)
 * ───────────────────────────────────────────────────────── */

// Clear cache for a specific courseId (outline/ssml/quiz). Accepts query or body.
export async function clearCourseCache(req, res) {
  try {
    const courseId = req.body?.courseId || req.query?.courseId;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });
    const removed = await cacheBustCourse(courseId);
    return res.json({ ok: true, removed, courseId });
  } catch (err) {
    console.error('[ai] clearCourseCache error:', err);
    return res.status(500).json({ error: 'Failed to clear course cache' });
  }
}

// Clear top courses cache only
export async function clearTopCoursesCache(req, res) {
  try {
    const removed = await cacheDeleteByPattern('ai:topCourses:*');
    return res.json({ ok: true, removed });
  } catch (err) {
    console.error('[ai] clearTopCoursesCache error:', err);
    return res.status(500).json({ error: 'Failed to clear top courses cache' });
  }
}

/* ─────────────────────────────────────────────────────────
 * Optional default export (helps in some bundlers)
 * ───────────────────────────────────────────────────────── */
export default {
  listTopCourses,
  generateOutline,
  generateLessonSSML,
  generateQuiz,
  gradeQuiz,
  generateCoursePackage,
  // NEW:
  clearCourseCache,
  clearTopCoursesCache,
};
