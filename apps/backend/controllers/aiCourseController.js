// apps/backend/controllers/aiCourseController.js
import 'dotenv/config';
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
    const aiOnly = String(req.query.aiOnly || '').trim() === '1';
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
      // NOTE: Joi often strips unknowns from `value`; read programTrack separately.
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

      const { courseId, title, level, targetMinutes, courseSize, totalLessons } = value;
      console.log('[api:outline] req', {
        courseId,
        title: Boolean(title),
        level,
        targetMinutes,
        courseSize,
        totalLessons,
        programTrack, // always present (defaulted)
      });

      // Optional refresh: bust course-scoped caches (outline/ssml/quiz) and optionally top-courses
      if (boolish(req.query.refresh) || boolish(req.query.refreshCache) || boolish(req.body?.refresh) || boolish(req.body?.refreshCache)) {
        if (courseId) await cacheBustCourse(courseId);
        if (boolish(req.query.top) || boolish(req.body?.top)) {
          await cacheDeleteByPattern('ai:topCourses:*');
        }
      }

      const { status, data, headers } = await generateOutlineService({
        courseId,
        title,
        level,
        targetMinutes,
        courseSize,
        totalLessons,
        programTrack, // pass it explicitly
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
      // Use 504 to signal a gateway timeout to clients/CDN
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

      const { courseId, outline, numQuestions, courseSize } = value;
      const meta = olMeta(outline);
      console.log('[api:quiz] req', {
        courseId,
        outlineLen: meta.len,
        numQuestions,
        courseSize,
      });

      if (!courseId) return res.status(400).json({ error: 'MISSING_COURSE_ID' });
      if (!Array.isArray(outline) || !outline.length) {
        return res.status(400).json({ error: 'EMPTY_OUTLINE' });
      }

      // Optional refresh before quiz gen
      if (boolish(req.query.refresh) || boolish(req.query.refreshCache) || boolish(req.body?.refresh) || boolish(req.body?.refreshCache)) {
        await cacheBustCourse(courseId);
      }

      const { status, data, headers } = await generateQuizService({
        courseId,
        outline,
        numQuestions,
        courseSize,
      });
      setHeaders(res, headers);
      console.log('[api:quiz] resp', {
        status,
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
    if (isAbortLike(err)) {
      res.set('Retry-After', '5');
      return res.status(504).json({ error: 'AI service timeout. Please try again.' });
    }

    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) {
      res.set('Retry-After', '10');
      return res
        .status(503)
        .json({ error: 'AI temporarily unavailable. Please retry shortly.' });
    }
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}

// Pure sync grading using provided key
export async function gradeQuiz(req, res) {
  try {
    const { value, error } = gradeSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });
    if (error) {
      console.warn('[ai] grade validation failed', error.details?.map((d) => d.message));
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: error.message,
        details: error.details?.map((d) => d.message) || [],
      });
    }

    const { quiz, answers, passMark = 70 } = value;
    const key = new Map(quiz.questions.map((q) => [q.id, q.answerIndex]));
    let correct = 0;
    for (const a of answers) {
      if (key.get(a.questionId) === a.choiceIndex) correct += 1;
    }
    const total = quiz.questions.length;
    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    const passed = scorePct >= passMark;

    return res.json({ correct, total, scorePct, passed, passMark });
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
