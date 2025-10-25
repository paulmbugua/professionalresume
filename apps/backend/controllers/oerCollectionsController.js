// apps/backend/controllers/oerCollectionsController.js
import pool from '../config/db.js';

const VERSION = 'oer@v1.2';

// Helpers
function isUuid(s = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function findBook(key) {
  // match by uuid text, slug, or exact title (case-insensitive)
  const { rows } = await pool.query(
     `SELECT id, provider, slug, title, pdf_url, web_url, cover_url, license, license_url, created_at, updated_at
       FROM oer_books
      WHERE id::text = $1
         OR slug = $1
         OR lower(title) = lower($1)
      LIMIT 1`,
    [key]
  );
  return rows[0] || null;
}

/* --------------------------- Collections listing -------------------------- */
export async function listCollections(req, res) {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 24, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rawKind = String(req.query.kind ?? '').toLowerCase();
    const kind = rawKind === 'video' || rawKind === 'doc' ? rawKind : null;

    const whereParts = ['TRUE'];
    const params = [];
    let p = 0;

    if (kind) {
      whereParts.push(`content_kind = $${++p}`);
      params.push(kind);
    }

    const whereClause = whereParts.join(' AND ');

    // Push limit/offset at the end (placeholders depend on how many filters we added)
    const limitPlaceholder  = `$${++p}`;
    const offsetPlaceholder = `$${++p}`;
    params.push(limit, offset);

    const sql = `
      WITH filtered AS (
        SELECT id, title, description, subject, created_at, thumbnail_url, content_kind
          FROM catalog_collection
         WHERE ${whereClause}
      ),
      hero AS (
        SELECT DISTINCT ON (cci.collection_id)
               cci.collection_id,
               tpc.thumbnail_url
          FROM catalog_collection_items cci
          JOIN third_party_catalog tpc
            ON tpc.slug = cci.catalog_slug
         ORDER BY cci.collection_id, tpc.created_at DESC NULLS LAST
      ),
      counts AS (
        SELECT collection_id, COUNT(*)::int AS items_count
          FROM catalog_collection_items
         GROUP BY collection_id
      )
      SELECT
        f.id,
        f.title,
        f.description,
        f.subject,
        f.created_at,
        f.content_kind,
        COALESCE(f.thumbnail_url, h.thumbnail_url) AS thumbnail_url,
        COALESCE(cnt.items_count, 0)               AS items_count,
        COUNT(*) OVER()::int                       AS total_rows
      FROM filtered f
      LEFT JOIN hero   h   ON h.collection_id  = f.id
      LEFT JOIN counts cnt ON cnt.collection_id = f.id
      ORDER BY f.created_at DESC NULLS LAST, f.title ASC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder};
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('[oer] listCollections error:', e);
    res.status(500).json({ error: 'Failed to load collections' });
  }
}

/* -------------------------- Collection item listing ----------------------- */
export async function getCollectionItems(req, res) {
  try {
    const key = String((req.params.idOrTitle ?? req.params.id ?? '')).trim();
    if (!key) return res.status(400).json({ error: 'collection key required' });

    const where = isUuid(key) ? 'c.id = $1' : 'LOWER(c.title) = LOWER($1)';

    const sql = `
      SELECT tpc.slug, tpc.title, tpc.type, tpc.provider, tpc.subject, tpc.grade_level,
             tpc.thumbnail_url, tpc.source_url, tpc.embed_url,tpc.source_url AS web_url,
             /* NOTE: this LEFT JOIN rarely matches unless your TPC rows use the same slug as oer_books */
             NULL::text AS file_url,
             tpc.commercial_allowed, tpc.license, tpc.license_url, tpc.attribution_html
        FROM catalog_collection c
        JOIN catalog_collection_items cci ON cci.collection_id = c.id
        JOIN third_party_catalog tpc      ON tpc.slug = cci.catalog_slug
       WHERE ${where}
       ORDER BY COALESCE(cci.position, 2147483647),
                tpc.created_at ASC NULLS LAST, tpc.title;
    `;
    const { rows } = await pool.query(sql, [key]);
    res.json(rows);
  } catch (e) {
    console.error('[oer] getCollectionItems error:', e);
    res.status(500).json({ error: 'Failed to load collection items' });
  }
}

/* ------------------------------ Courses (cards) --------------------------- */
export async function listCourses(req, res) {
  try {
    const limit   = Math.min(Math.max(Number(req.query.limit)  || 24, 1), 200);
    const offset  = Math.max(Number(req.query.offset) || 0, 0);
    const subject = (req.query.subject || '').trim();

    console.log('[oer] listCourses req', { limit, offset, subject, VERSION });

    // $1=limit, $2=offset, optional $3=subject
    const args = [limit, offset];
    const whereSubject = subject ? `WHERE LOWER(x.subject) = LOWER($3)` : '';
    if (subject) args.push(subject);

    const sql = `
      /* ${VERSION} - no b.subject in books; use existing timestamps */
      WITH hero AS (
        SELECT DISTINCT ON (cci.collection_id)
               cci.collection_id,
               tpc.thumbnail_url
          FROM catalog_collection_items cci
          JOIN third_party_catalog tpc ON tpc.slug = cci.catalog_slug
         ORDER BY cci.collection_id, tpc.created_at DESC NULLS LAST
      ),
      counts AS (
        SELECT collection_id, COUNT(*)::int AS items_count
          FROM catalog_collection_items
         GROUP BY collection_id
      ),
      collections AS (
        SELECT
          c.id,
          NULL::text        AS slug,
          c.title,
          c.description,
          c.subject,
          COALESCE(c.thumbnail_url, h.thumbnail_url) AS thumbnail_url,
          'All Levels'::text               AS level,
          COALESCE(cnt.items_count, 0)     AS items_count,
          c.created_at,
          'collection'::text               AS kind
        FROM catalog_collection c
        LEFT JOIN hero   h   ON h.collection_id  = c.id
        LEFT JOIN counts cnt ON cnt.collection_id = c.id
      ),
      books AS (
        SELECT
          b.id,
          b.slug,
          b.title,
          NULL::text         AS description,
          NULL::text         AS subject,        -- books don’t have subject (yet)
          b.cover_url        AS thumbnail_url,
          'All Levels'::text AS level,
          1::int             AS items_count,
          b.created_at       AS created_at,
          'book'::text       AS kind
        FROM oer_books b
      )
      SELECT id, slug, title, description, subject, thumbnail_url, level, items_count, created_at, kind
      FROM (
        SELECT * FROM collections
        UNION ALL
        SELECT * FROM books
      ) x
      ${whereSubject}
      ORDER BY x.created_at DESC NULLS LAST, x.title ASC
      LIMIT $1 OFFSET $2;
    `;

    console.log('[oer] listCourses sqlInfo', {
      hasSubjectFilter: !!subject,
      whereSubject,
      args,
      version: VERSION,
    });

    const t0 = Date.now();
    const { rows } = await pool.query(sql, args);
    const durMs = Date.now() - t0;

    console.log('[oer] listCourses rows', rows.length, 'durMs', durMs, 'sample:', rows[0]);

    const out = rows.map((r) => ({
      id: r.id,
      slug: r.slug ?? null,
      title: r.title,
      description: r.description ?? '',
      subject: r.subject ?? null,
      thumbnail_url: r.thumbnail_url ?? null,
      level: r.level || 'All Levels',
      price: 0,
      priceLabel: 'Free',
      items_count: r.items_count,
      provider: 'oer',
      kind: r.kind, // 'collection' | 'book'
    }));

    if (rows.length) {
      const counts = out.reduce((acc, it) => {
        acc[it.kind] = (acc[it.kind] || 0) + 1;
        return acc;
      }, {});
      console.log('[oer] listCourses kindCounts', counts, VERSION);
    } else {
      console.warn('[oer] listCourses empty result', subject ? { subject } : '(no filter)', VERSION);
    }

    return res.json(out);
  } catch (e) {
    console.error('[oer] listCourses error:', e.stack || e, VERSION);
    return res.status(500).json({ error: 'Failed to load free courses' });
  }
}

/* ------------------------------ Book details ------------------------------ */
/** GET /api/oer/books/:idOrSlug  → returns the book row with pdf_url */
export async function getBook(req, res) {
  try {
    const key = String(req.params.idOrSlug || '').trim();
    if (!key) return res.status(400).json({ error: 'book key required' });

    const book = await findBook(key);
    if (!book) return res.status(404).json({ error: 'book not found' });

    const base = `${req.protocol}://${req.get('host')}`;
    if (book.pdf_url && /^https?:\/\//i.test(book.pdf_url)) {
      try {
        const host = new URL(book.pdf_url).hostname;
        if ((process.env.PDF_PROXY_ALLOWLIST || '').toLowerCase().includes(host.toLowerCase())) {
          book.pdf_url = `${base}/api/proxy/pdf?u=${encodeURIComponent(book.pdf_url)}`;
        }
      } catch {}
    }


    return res.json(book);
  } catch (e) {
    console.error('[oer] getBook error:', e);
    return res.status(500).json({ error: 'Failed to load book' });
  }
}

/* ------------------------ Course details (collection OR book) ------------- */
/** GET /api/oer/courses/:idOrTitle  */
export async function getCourse(req, res) {
  try {
    const key = String((req.params.idOrTitle ?? req.params.id ?? '')).trim();
    if (!key) return res.status(400).json({ error: 'course key required' });

    // 1) If it's a BOOK, return a single-week “course” backed by the PDF
    const book = await findBook(key);
    if (book) {
      const course = {
        id: book.id,
        title: book.title,
        description: '',
        subject: null,
        thumbnail_url: book.cover_url || null,
        provider: 'oer',
        level: 'All Levels',
        price: 0,
        priceLabel: 'Free',
        kind: 'book',
        syllabus: [
          {
            week: 1,
            topic: book.title,
            videoUrl: null,
          // Use web_url as the “notes” (reader) target so the UI follows normal shape
          notesUrl: book.web_url,
          notesUrls: [book.web_url],
          thumbnail_url: book.cover_url || null,
          },
        ],
        license: book.license,
        license_url: book.license_url,
      };
      return res.json(course);
    }

    // 2) Otherwise treat it as a COLLECTION
    const where = isUuid(key) ? 'c.id = $1' : 'LOWER(c.title) = LOWER($1)';

    // Collection (course) shell
    const { rows: col } = await pool.query(
      `
      WITH hero AS (
        SELECT DISTINCT ON (cci.collection_id)
               cci.collection_id,
               tpc.thumbnail_url
          FROM catalog_collection_items cci
          JOIN third_party_catalog tpc ON tpc.slug = cci.catalog_slug
         ORDER BY cci.collection_id, tpc.created_at DESC NULLS LAST
      )
      SELECT c.id, c.title, c.description, c.subject, COALESCE(c.thumbnail_url, h.thumbnail_url) AS thumbnail_url
        FROM catalog_collection c
        LEFT JOIN hero h ON h.collection_id = c.id
       WHERE ${where}
       LIMIT 1
      `,
      [key]
    );
    if (col.length === 0) return res.status(404).json({ error: 'course not found' });

    // Items → syllabus
    const { rows: items } = await pool.query(
      `
      SELECT tpc.title, tpc.type, tpc.embed_url, tpc.source_url,
             tpc.thumbnail_url, tpc.grade_level,
             COALESCE(cci.position, 2147483647) AS pos,
             tpc.created_at
        FROM catalog_collection_items cci
        JOIN third_party_catalog tpc ON tpc.slug = cci.catalog_slug
       WHERE cci.collection_id = $1
       ORDER BY COALESCE(cci.position, 2147483647),
                tpc.created_at ASC NULLS LAST,
                tpc.title ASC
      `,
      [col[0].id]
    );

    const syllabus = items.map((it, i) => {
      const isVideo = (it.type || '').toLowerCase() === 'video';
      return {
        week: i + 1,
        topic: it.title || `Lesson ${i + 1}`,
        videoUrl: isVideo ? (it.embed_url || it.source_url || null) : null,
        notesUrl: !isVideo ? (it.source_url || null) : null,
        notesUrls: !isVideo && it.source_url ? [it.source_url] : undefined,
        thumbnail_url: it.thumbnail_url || null,
      };
    });

    const level = items.find(x => x.grade_level && x.grade_level.trim())?.grade_level || 'All Levels';

    const course = {
      id: col[0].id,
      title: col[0].title,
      description: col[0].description,
      subject: col[0].subject,
      thumbnail_url: col[0].thumbnail_url,
      provider: 'oer',
      level,
      price: 0,
      priceLabel: 'Free',
      kind: 'collection',
      syllabus,
    };

    return res.json(course);
  } catch (e) {
    console.error('[oer] getCourse error:', e);
    return res.status(500).json({ error: 'Failed to load free course' });
  }
}
