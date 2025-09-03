// apps/backend/middleware/normalizeCourseSize.js

const VALID = new Set(['mini', 'standard', 'extended', 'deep_dive', 'bootcamp']);
const LEGACY_TO_NEW = {
  micro: 'mini',
  short: 'standard',
  standard: 'standard',
  deep_dive: 'deep_dive',
};

function normKey(v) {
  if (!v) return undefined;
  return String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeCourseSize(req, _res, next) {
  // prefer explicit body.courseSize, then legacy body.size, then query equivalents
  const src =
    req.body?.courseSize ??
    req.body?.size ??
    req.query?.courseSize ??
    req.query?.size;

  const k = normKey(src);

  let mapped;
  if (k && VALID.has(k)) {
    mapped = k;
  } else if (k && LEGACY_TO_NEW[k]) {
    mapped = LEGACY_TO_NEW[k];
  }

  // write the normalized value (if any) and drop legacy keys
  if (mapped) req.body.courseSize = mapped;
  if (req.body && 'size' in req.body) delete req.body.size;
  if (req.query && 'size' in req.query) delete req.query.size;

  next();
}
