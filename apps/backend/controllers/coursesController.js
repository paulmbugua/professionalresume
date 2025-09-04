import pool from '../config/db.js';
import { cacheDeleteByPattern } from '../utils/redisCache.js';

function cleanTitle(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

// server-side aliases (legacy → db)
const SIZE_ALIASES = {
  micro: 'mini',
  short: 'standard',
  standard: 'standard',
  deep_dive: 'deep_dive',
  mini: 'mini',
  extended: 'extended',
  bootcamp: 'bootcamp',
};
const SIZE_VALID = new Set(['mini', 'standard', 'extended', 'deep_dive', 'bootcamp']);

function normalizeSize(input, minutes) {
  if (input && SIZE_ALIASES[input]) return SIZE_ALIASES[input];
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
    const rawTitle = req.body?.title;
    const title = cleanTitle(rawTitle);

    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'TITLE_REQUIRED', detail: 'Title must be at least 3 characters.' });
    }
    if (title.length > 150) {
      return res.status(400).json({ error: 'TITLE_TOO_LONG', detail: 'Max 150 characters.' });
    }

    // ⚙️ normalize size from either courseSize (new) or size (legacy), or infer from minutes
    const sizeRaw = req.body?.courseSize || req.body?.size;
    const minutes = typeof req.body?.minutes === 'number' ? req.body.minutes : undefined;
    const course_size = normalizeSize(sizeRaw, minutes);

    if (!SIZE_VALID.has(course_size)) {
      return res.status(400).json({
        error: 'INVALID_SIZE',
        detail: `Allowed: ${[...SIZE_VALID].join(', ')}`,
      });
    }

    // 1) Return existing course if present
    const existing = await pool.query(
      `
      SELECT id, title, description
        FROM courses
       WHERE is_ai_generated = TRUE
         AND LOWER(title) = LOWER($1)
       LIMIT 1
      `,
      [title]
    );
    if (existing.rows.length) {
      const row = existing.rows[0];
      return res.status(200).json({
        id: row.id,
        title: row.title,
        description: row.description,
        blurb: row.description,
        is_ai_generated: true,
        source: 'existing',
      });
    }

    // 2) Create new sandbox course WITH course_size to satisfy the CHECK constraint
    const desc = `AI sandbox course for: ${title}`;
    const insert = await pool.query(
      `
      INSERT INTO courses (id, title, description, course_size, is_ai_generated)
      VALUES (gen_random_uuid(), $1, $2, $3, TRUE)
      RETURNING id, title, description
      `,
      [title, desc, course_size]
    );

    const row = insert.rows[0];

    await cacheDeleteByPattern('ai:topCourses:*');

    return res.status(201).json({
      id: row.id,
      title: row.title,
      description: row.description,
      blurb: row.description,
      is_ai_generated: true,
      source: 'created',
    });
  } catch (err) {
    // unique title race fallback
    if (err?.code === '23505') {
      try {
        const title = cleanTitle(req.body?.title);
        const fallback = await pool.query(
          `
          SELECT id, title, description
            FROM courses
           WHERE is_ai_generated = TRUE
             AND LOWER(title) = LOWER($1)
           LIMIT 1
          `,
          [title]
        );
        if (fallback.rows.length) {
          const row = fallback.rows[0];
          return res.status(200).json({
            id: row.id,
            title: row.title,
            description: row.description,
            blurb: row.description,
            is_ai_generated: true,
            source: 'existing',
          });
        }
      } catch {}
    }

    console.error('[courses] createAiSandboxCourse error', err);
    return res.status(500).json({ error: 'FAILED_CREATE_AI_COURSE' });
  }
}
