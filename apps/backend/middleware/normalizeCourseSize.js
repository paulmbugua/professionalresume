// apps/backend/middleware/normalizeCourseSize.js
const VALID = new Set(['mini', 'standard', 'extended', 'deep_dive', 'bootcamp']);
const LEGACY_TO_NEW = {
  micro: 'mini',
  short: 'standard',
  standard: 'standard',
  deep_dive: 'deep_dive',
};

function normKey(v) {
  if (v === undefined || v === null) return undefined;
  return String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeCourseSize(req, res, next) {
  // Ensure body/query objects exist so we can safely mutate
  if (!req.body) req.body = {};
  if (!req.query) req.query = {};

  // Capture raw inputs for logging
  const raw = {
    bodyCourseSize: req.body.courseSize,
    bodySize: req.body.size,
    queryCourseSize: req.query.courseSize,
    querySize: req.query.size,
  };

  // Prefer explicit body.courseSize, then legacy body.size, then query equivalents
  const src =
    req.body.courseSize ??
    req.body.size ??
    req.query.courseSize ??
    req.query.size;

  const k = normKey(src);

  let mapped;
  if (k && VALID.has(k)) {
    mapped = k;
  } else if (k && LEGACY_TO_NEW[k]) {
    mapped = LEGACY_TO_NEW[k];
  }

  // Write normalized value (if any) and drop legacy keys
  if (mapped) req.body.courseSize = mapped;

  if ('size' in req.body) delete req.body.size;
  if ('size' in req.query) delete req.query.size;

  // Optional: expose a header to quickly verify normalization in responses
  if (mapped) {
    try {
      res.set('X-Normalized-CourseSize', mapped);
    } catch {
      // ignore if headers already sent in some edge path
    }
  }

  // Dev-only logging so you can see what got normalized (avoids prod noise)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[mw:normalizeCourseSize]', {
      raw,
      normalized: mapped || null,
      effective: req.body.courseSize || null,
      path: req.path,
      method: req.method,
    });
  }

  next();
}
