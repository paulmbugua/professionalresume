// apps/backend/controllers/aiCourseController.js
import 'dotenv/config';
import {
  withGate,
  listTopCoursesService,
  generateOutlineService,
  generateLessonSSMLService,
  generateQuizService,
  generateCoursePackageService,
} from '../services/aiCourseService.js';

import {
  outlineSchema,
  lessonSchema,
  quizSchema,
  gradeSchema,
} from '../validators/aiCoursesValidator.js';

/* ─────────────────────────────────────────────────────────
 * Controllers (thin): validate → gate → call service → set headers
 * ───────────────────────────────────────────────────────── */

export async function listTopCourses(req, res) {
  try {
    const aiOnly = String(req.query.aiOnly || '').trim() === '1';
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { status, data, headers } = await listTopCoursesService({ aiOnly, limit, offset });
    for (const [k, v] of Object.entries(headers || {})) res.set(k, v);
    return res.status(status).json(data);
  } catch (err) {
    console.error('[ai] listTopCourses error:', err);
    return res.status(500).json({ error: 'Failed to load courses' });
  }
}

export async function generateOutline(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = outlineSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, title, level, targetMinutes, courseSize } = value;
      const { status, data, headers } = await generateOutlineService({ courseId, title, level, targetMinutes, courseSize });
      for (const [k, v] of Object.entries(headers || {})) res.set(k, v);
      return res.status(status).json(data);
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateOutline error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate outline' });
  }
}

export async function generateLessonSSML(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = lessonSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, outline, voiceName, courseSize } = value;
      const count = Number(req.query.count || req.body?.count || 0);

      const { status, data, headers } = await generateLessonSSMLService({ courseId, outline, voiceName, courseSize, count });
      for (const [k, v] of Object.entries(headers || {})) res.set(k, v);
      return res.status(status).json(data);
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateLessonSSML error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate lesson SSML' });
  }
}

export async function generateQuiz(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = quizSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, outline, numQuestions, courseSize } = value;
      const { status, data, headers } = await generateQuizService({ courseId, outline, numQuestions, courseSize });
      for (const [k, v] of Object.entries(headers || {})) res.set(k, v);
      return res.status(status).json(data);
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateQuiz error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}

// Pure sync, keep here
export async function gradeQuiz(req, res) {
  try {
    const { value, error } = gradeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { quiz, answers, passMark } = value;
    const key = new Map(quiz.questions.map((q) => [q.id, q.answerIndex]));
    let correct = 0;
    for (const a of answers) { if (key.get(a.questionId) === a.choiceIndex) correct += 1; }
    const total = quiz.questions.length;
    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    const passed = scorePct >= passMark;
    res.json({ correct, total, scorePct, passed, passMark });
  } catch (err) {
    console.error('[ai] gradeQuiz error:', err);
    res.status(500).json({ error: 'Failed to grade quiz' });
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
      } = req.body || {};
      if (!courseId) return res.status(400).json({ error: 'courseId is required' });

      const { status, data, headers } = await generateCoursePackageService({
        courseId, level, targetMinutes, voiceName, numQuestions, courseSize
      });
      for (const [k, v] of Object.entries(headers || {})) res.set(k, v);
      return res.status(status).json(data);
    });
  } catch (err) {
    console.error('[ai] generateCoursePackage error:', err);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    return res.status(500).json({ error: 'Failed to generate course package' });
  }
}
