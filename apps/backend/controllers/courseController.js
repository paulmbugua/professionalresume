// controllers/courseController.js
import pool from '../config/db.js';
import Joi from 'joi';

// ---- Joi schemas ----
const syllabusItemSchema = Joi.object({
  week: Joi.number().integer().min(1).required(),
  topic: Joi.string().allow('').trim(),
  assignment: Joi.string().allow('').trim(),
  videoUrl: Joi.string().uri().allow('').optional(),
  notesUrl: Joi.string().uri().allow('').optional(),
});

const courseSchema = Joi.object({
  // Accept tutorId in body so we can fallback if token doesn't provide one
  tutorId: Joi.number().integer().optional(),

  title: Joi.string().min(3).required(),
  description: Joi.string().allow(''),
  level: Joi.string()
    .valid('Beginner', 'Intermediate', 'Advanced', 'All Levels')
    .required(),
  duration: Joi.string().allow(''),
  price: Joi.number().precision(2).min(0).required(),
  syllabus: Joi.array().items(syllabusItemSchema).default([]),
  prerequisites: Joi.string().allow(''),
}).unknown(false);

// ---- helpers ----
function normalizeSyllabus(input = []) {
  const kept = input.filter((w) => {
    const topic = (w.topic ?? '').trim();
    const assignment = (w.assignment ?? '').trim();
    const videoUrl = (w.videoUrl ?? '').trim();
    const notesUrl = (w.notesUrl ?? '').trim();
    return topic || assignment || videoUrl || notesUrl;
  });

  return kept.map((w, i) => ({
    week: i + 1,
    topic: (w.topic ?? '').trim(),
    assignment: (w.assignment ?? '').trim(),
    videoUrl: (w.videoUrl ?? '').trim(),
    notesUrl: (w.notesUrl ?? '').trim(),
  }));
}

// ---- controllers ----
export const createCourse = async (req, res) => {
  try {
    // Validate body first (also allows optional tutorId)
    const { error, value } = courseSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ error: error.message });

    // Try tutorId from token first (authUser set req.user = { id: decoded.id })
    let tutorId = req.user?.id;

    // Coerce number if token stored it as string
    if (typeof tutorId === 'string' && /^\d+$/.test(tutorId)) {
      tutorId = Number(tutorId);
    }

    // Fallback to the body-provided tutorId (since you don't want to change authUser)
    if (!tutorId && typeof value.tutorId === 'number') {
      tutorId = value.tutorId;
    }

    // If still missing, reject
    if (!tutorId) {
      return res
        .status(401)
        .json({ error: 'Unauthenticated: tutorId missing in token and request body.' });
    }

    // Debug logs to verify what we got
    // (Remove these once everything works.)
    console.log('[createCourse] tutorId from req.user.id:', req.user?.id);
    console.log('[createCourse] tutorId fallback from body:', value.tutorId);
    console.log('[createCourse] final tutorId used:', tutorId);

    // Pre-check to give a clear error instead of a FK violation
    const tutorCheck = await pool.query('SELECT 1 FROM users WHERE id = $1', [tutorId]);
    if (tutorCheck.rowCount === 0) {
      return res.status(400).json({ error: `Tutor ${tutorId} not found` });
    }

    const cleanedSyllabus = normalizeSyllabus(value.syllabus);

    const result = await pool.query(
      `INSERT INTO courses (
         id, tutor_id, title, description, level, duration, price, syllabus, prerequisites
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
       )
       RETURNING id, tutor_id, title, description, level, duration, price, syllabus, prerequisites, created_at`,
      [
        tutorId,
        value.title,
        value.description ?? '',
        value.level,
        value.duration ?? '',
        value.price,
        JSON.stringify(cleanedSyllabus),
        value.prerequisites ?? '',
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[createCourse] server error', err);
    if (err && err.code === '23503') {
      return res.status(400).json({ error: 'Invalid tutorId (foreign key).' });
    }
    return res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
};

export const getCourses = async (_req, res) => {
  const result = await pool.query(
    `SELECT id, tutor_id, title, description, level, duration, price, syllabus, prerequisites, created_at
     FROM courses
     ORDER BY created_at DESC`
  );
  res.json(result.rows);
};

export const getCourseById = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, tutor_id, title, description, level, duration, price, syllabus, prerequisites, created_at
     FROM courses
     WHERE id = $1`,
    [id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
};
