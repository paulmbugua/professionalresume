const str = { type: 'string' };
const strings = { type: 'array', items: str };
export const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const list = (properties) => ({ type: 'array', items: object(properties) });
export const resumeDataSchema = object({
  basics: object({
    name: str,
    headline: str,
    email: str,
    phone: str,
    location: str,
    links: list({ label: str, url: str }),
  }),
  targetTitle: str,
  summary: str,
  skills: strings,
  experience: list({
    company: str,
    role: str,
    start: str,
    end: str,
    location: str,
    description: str,
    bullets: strings,
  }),
  education: list({
    school: str,
    program: str,
    start: str,
    end: str,
    details: str,
  }),
  projects: list({ name: str, link: str, description: str, bullets: strings }),
  certifications: list({ name: str, issuer: str, year: str }),
  extras: object({ languages: strings, interests: strings }),
  additionalSections: list({
    title: str,
    placement: { type: 'string', enum: ['sidebar', 'main'] },
    content: str,
    bullets: strings,
  }),
  sectionLabels: object({
    summary: str,
    skills: str,
    experience: str,
    education: str,
    projects: str,
    certifications: str,
    extras: str,
  }),
});
export const factReviewSchema = object({
  sourceReadable: { type: 'boolean' },
  warnings: strings,
  claims: list({
    path: str,
    statement: str,
    classification: {
      type: 'string',
      enum: ['SUPPORTED', 'REASONABLE_REPHRASE', 'UNSUPPORTED'],
    },
    evidence: str,
  }),
});

export function validateSchema(value, schema, path = '') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`Invalid AI object at ${path}`);
    for (const key of schema.required)
      validateSchema(
        value[key],
        schema.properties[key],
        path ? `${path}.${key}` : key,
      );
    for (const key of Object.keys(value))
      if (!schema.properties[key])
        throw new Error(`Unexpected AI field ${path}.${key}`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > 300)
      throw new Error(`Invalid AI array at ${path}`);
    value.forEach((item, index) =>
      validateSchema(item, schema.items, `${path}.${index}`),
    );
  } else if (
    typeof value !== schema.type ||
    (schema.enum && !schema.enum.includes(value))
  ) {
    throw new Error(`Invalid AI value at ${path}`);
  }
}

export function collectResumeClaims(data) {
  const claims = [];
  function visit(value, path) {
    if (typeof value === 'string' && value.trim())
      claims.push({ path, statement: value });
    else if (Array.isArray(value))
      value.forEach((item, index) => visit(item, `${path}.${index}`));
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, item]) => {
        if (key === 'sectionLabels') {
          Object.entries(item).forEach(([section, label]) => {
            const content = data[section];
            const visibleContent =
              section === 'extras'
                ? data.extras.languages.length || data.extras.interests.length
                : Array.isArray(content)
                  ? content.length
                  : typeof content === 'string' && content.trim();
            if (visibleContent) visit(label, `sectionLabels.${section}`);
          });
        } else if (key !== 'placement')
          visit(item, path ? `${path}.${key}` : key);
      });
  }
  visit(data, '');
  return claims;
}

// Every nonempty factual field must be reviewed; incomplete reviews fail closed.
export function assertFactReview(data, review) {
  validateSchema(review, factReviewSchema);
  const expected = collectResumeClaims(data);
  const indexed = new Map();
  for (const claim of review.claims) {
    if (indexed.has(claim.path))
      throw new Error('Duplicate claim in factual review.');
    indexed.set(claim.path, claim);
  }
  const missing = expected.filter((claim) => {
    const checked = indexed.get(claim.path);
    return (
      !checked ||
      checked.statement !== claim.statement ||
      (checked.classification !== 'UNSUPPORTED' && !checked.evidence.trim())
    );
  });
  if (!review.sourceReadable || missing.length)
    throw Object.assign(
      new Error(
        'The source could not be fully verified. Please upload a clearer document and try again.',
      ),
      { status: 422, code: 'FACT_REVIEW_INCOMPLETE' },
    );
  const unsupported = review.claims.filter(
    (claim) => claim.classification === 'UNSUPPORTED',
  );
  if (unsupported.length)
    throw Object.assign(
      new Error(
        'The draft contains claims not supported by your original resume. It has not replaced your current resume. Rebuild to try again.',
      ),
      { status: 422, code: 'UNSUPPORTED_RESUME_CLAIMS', claims: unsupported },
    );
}
