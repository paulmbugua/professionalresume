const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;

const cap = (v = '', max = 2000) => String(v || '').trim().slice(0, max);
const dedupe = (items = [], max = 80) => {
  const seen = new Set();
  const out = [];
  for (const value of items) {
    const v = cap(value, 300);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
};

const normalizeUrl = (value = '') => {
  const v = cap(value, 240).replace(/[),.;]+$/, '');
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
};

const parseDateRange = (value = '') => {
  const m = String(value).match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\s*(?:-|–|—|to)\s*((?:Present|Current|Now)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})/i);
  if (!m) return { start: '', end: '' };
  return { start: cap(m[1], 40), end: cap(m[2], 40) };
};

const splitBullets = (value = '') =>
  dedupe(
    String(value)
      .split(/\n|•|\-/g)
      .map((v) => v.trim())
      .filter((v) => v.length > 2),
    12,
  );

const flattenSkills = (skills = []) => {
  const rows = Array.isArray(skills) ? skills : [];
  const flat = [];
  for (const item of rows) {
    if (typeof item === 'string') {
      const rhs = item.includes(':') ? item.split(':').slice(1).join(':') : item;
      flat.push(...rhs.split(/[,;|]/g));
      continue;
    }
    if (item && typeof item === 'object') {
      const vals = Array.isArray(item.items) ? item.items : [];
      flat.push(...vals);
    }
  }
  return dedupe(flat.map((v) => cap(v, 120)), 80);
};

const inferBasics = (rawText = '', basics = {}) => {
  const urls = (rawText.match(URL_RE) || []).map(normalizeUrl);
  const links = dedupe([
    ...((basics.links || []).map((l) => normalizeUrl(l?.url || ''))),
    ...urls,
  ], 12).map((url) => ({
    label: /github/i.test(url)
      ? 'GitHub'
      : /linkedin/i.test(url)
        ? 'LinkedIn'
        : /portfolio|novagptech|devworks/i.test(url)
          ? 'Portfolio'
          : 'Website',
    url,
  }));

  const email = basics.email || cap((rawText.match(EMAIL_RE) || [])[0] || '', 160);
  const phone = basics.phone || cap((rawText.match(PHONE_RE) || [])[0] || '', 80);

  return {
    name: cap(basics.name, 120),
    headline: cap(basics.headline, 180),
    email: cap(email, 160),
    phone: cap(phone, 80),
    location: cap(basics.location, 120),
    links,
  };
};

export function mapExtractedResumeToCvDraft(rawExtracted = {}, options = {}) {
  const rawText = cap(options.rawText || '', 14000);
  const basics = inferBasics(rawText, rawExtracted.basics || {});
  const experience = (Array.isArray(rawExtracted.experience) ? rawExtracted.experience : []).map((item) => {
    const dateSrc = `${item?.start || ''} - ${item?.end || ''}`.trim() || item?.date || '';
    const parsed = parseDateRange(dateSrc);
    const bullets = Array.isArray(item?.bullets)
      ? dedupe(item.bullets, 12)
      : splitBullets(item?.description || '');
    return {
      company: cap(item?.company, 180),
      role: cap(item?.role || item?.title, 180),
      start: cap(item?.start || parsed.start, 40),
      end: cap(item?.end || parsed.end, 40),
      location: cap(item?.location, 120),
      bullets,
    };
  }).filter((e) => e.company || e.role || e.bullets.length).slice(0, 20);

  const education = (Array.isArray(rawExtracted.education) ? rawExtracted.education : []).map((item) => {
    const parsed = parseDateRange(`${item?.start || ''} - ${item?.end || ''}`);
    return {
      school: cap(item?.school || item?.institution, 180),
      program: cap(item?.program || item?.degree, 180),
      start: cap(item?.start || parsed.start, 40),
      end: cap(item?.end || parsed.end, 40),
      details: cap(item?.details || item?.description || '', 500),
    };
  }).filter((e) => e.school || e.program).slice(0, 12);

  return {
    basics,
    summary: cap(rawExtracted.summary, 2000),
    skills: flattenSkills(rawExtracted.skills || []),
    experience,
    education,
    projects: (Array.isArray(rawExtracted.projects) ? rawExtracted.projects : []).map((p) => ({
      name: cap(p?.name, 180),
      link: normalizeUrl(p?.link || p?.url || ''),
      description: cap(p?.description, 600),
      bullets: Array.isArray(p?.bullets) ? dedupe(p.bullets, 12) : splitBullets(p?.description || ''),
    })).filter((p) => p.name || p.description).slice(0, 20),
    certifications: (Array.isArray(rawExtracted.certifications) ? rawExtracted.certifications : []).map((c) => ({
      name: cap(c?.name, 180),
      issuer: cap(c?.issuer, 140),
      year: cap(c?.year || c?.date, 16),
    })).filter((c) => c.name).slice(0, 20),
    extras: {
      languages: dedupe(rawExtracted?.extras?.languages || rawExtracted.languages || [], 20),
      interests: dedupe(rawExtracted?.extras?.interests || [], 20),
    },
  };
}
