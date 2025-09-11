// createAiSandboxCourse.js (minimal changes to fit your columns)
import pool from '../config/db.js';
import { cacheDeleteByPattern } from '../utils/redisCache.js';

function cleanTitle(raw) { return String(raw || '').replace(/\s+/g, ' ').trim(); }

const SIZE_ALIASES = { micro:'mini', short:'standard', standard:'standard', deep_dive:'deep_dive', mini:'mini', extended:'extended', bootcamp:'bootcamp' };
const SIZE_VALID = new Set(['mini','standard','extended','deep_dive','bootcamp']);

function normalizeSize(input, minutes) {
  const m = input && SIZE_ALIASES[input] ? SIZE_ALIASES[input] : null;
  if (m) return m;
  if (typeof minutes === 'number') {
    if (minutes < 15) return 'mini';
    if (minutes < 45) return 'standard';
    if (minutes < 90) return 'extended';
    if (minutes < 180) return 'deep_dive';
    return 'bootcamp';
  }
  return 'standard';
}

export async function createAiSandboxCourse(req, res) {
  try {
    const title = cleanTitle(req.body?.title);
    if (!title || title.length < 3) return res.status(400).json({ error: 'TITLE_REQUIRED' });
    if (title.length > 150) return res.status(400).json({ error: 'TITLE_TOO_LONG' });

    const sizeRaw = req.body?.courseSize || req.body?.size;
    const minutes = typeof req.body?.minutes === 'number' ? req.body.minutes : undefined;
    const course_size = normalizeSize(sizeRaw, minutes);
    if (!SIZE_VALID.has(course_size)) return res.status(400).json({ error: 'INVALID_SIZE' });

    // 1) If exists, just return it (and ensure minimal listability fields are present)
    const existing = await pool.query(
      `SELECT id, title, description FROM courses WHERE is_ai_generated = TRUE AND LOWER(title)=LOWER($1) LIMIT 1`,
      [title]
    );
    if (existing.rows.length) {
      const row = existing.rows[0];

      // Backfill minimal listable fields if missing
      await pool.query(`
        UPDATE courses SET
          syllabus = COALESCE(syllabus, '[]'::jsonb),
          total_units = COALESCE(total_units, 1),
          lessons_per_unit = COALESCE(lessons_per_unit, 1),
          total_lessons = COALESCE(total_lessons, 1),
          estimated_hours = COALESCE(estimated_hours, 0.2)
        WHERE id = $1
      `, [row.id]).catch(() => {});

      await cacheDeleteByPattern('ai:topCourses:*');
      await cacheDeleteByPattern('courses:list:*');
      await cacheDeleteByPattern('courses:byId:*');

      return res.status(200).json({ id: row.id, title: row.title, description: row.description, blurb: row.description, is_ai_generated: true, source: 'existing' });
    }

    // 2) Create new minimal, listable shell
    const desc = `AI sandbox course for: ${title}`;
    const insert = await pool.query(`
      INSERT INTO courses (
        id, title, description, course_size, is_ai_generated,
        syllabus, total_units, lessons_per_unit, total_lessons, estimated_hours
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, TRUE,
        '[]'::jsonb, 1, 1, 1, 0.2
      )
      RETURNING id, title, description
    `, [title, desc, course_size]);

    const row = insert.rows[0];

    await cacheDeleteByPattern('ai:topCourses:*');
    await cacheDeleteByPattern('courses:list:*');
    await cacheDeleteByPattern('courses:byId:*');

    return res.status(201).json({ id: row.id, title: row.title, description: row.description, blurb: row.description, is_ai_generated: true, source: 'created' });
  } catch (err) {
    if (err?.code === '23505') {
      // Unique race: return the row
      const fb = await pool.query(
        `SELECT id, title, description FROM courses WHERE is_ai_generated = TRUE AND LOWER(title)=LOWER($1) LIMIT 1`,
        [cleanTitle(req.body?.title)]
      );
      if (fb.rows.length) {
        const row = fb.rows[0];
        return res.status(200).json({ id: row.id, title: row.title, description: row.description, blurb: row.description, is_ai_generated: true, source: 'existing' });
      }
    }
    console.error('[courses] createAiSandboxCourse error', err);
    return res.status(500).json({ error: 'FAILED_CREATE_AI_COURSE' });
  }
}
