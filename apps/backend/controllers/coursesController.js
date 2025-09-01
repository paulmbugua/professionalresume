// apps/backend/controllers/coursesController.js
import pool from '../config/db.js';
import { cacheDeleteByPattern } from '../utils/redisCache.js'; // ⬅️ add this

function cleanTitle(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
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

    // 1) Return existing course if present (no invalidation needed)
    const existing = await pool.query(`
      SELECT id, title, description
        FROM courses
       WHERE is_ai_generated = TRUE
         AND LOWER(title) = LOWER($1)
       LIMIT 1
    `, [title]);

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

    // 2) Create new sandbox course
    const desc = `AI sandbox course for: ${title}`;
    const insert = await pool.query(`
      INSERT INTO courses (id, title, description, is_ai_generated)
      VALUES (gen_random_uuid(), $1, $2, TRUE)
      RETURNING id, title, description
    `, [title, desc]);

    const row = insert.rows[0];

    // 🔄 Invalidate any cached "top courses" pages so the new course appears
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
    if (err?.code === '23505') {
      try {
        const title = cleanTitle(req.body?.title);
        const fallback = await pool.query(`
          SELECT id, title, description
            FROM courses
           WHERE is_ai_generated = TRUE
             AND LOWER(title) = LOWER($1)
           LIMIT 1
        `, [title]);
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
