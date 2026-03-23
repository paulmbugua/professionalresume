import { inflateRawSync } from 'node:zlib';
import { mapExtractedResumeToCvDraft } from '../../../packages/shared/cv/mapExtractedResumeToCvDraft.js';

const MAX_TEXT_CHARS = 120000;

const headingMap = {
  summary: ['summary', 'professional summary', 'profile', 'about', 'objective'],
  experience: [
    'experience',
    'work experience',
    'employment',
    'work history',
    'professional experience',
  ],
  education: ['education', 'academic background'],
  skills: ['skills', 'technical skills', 'core skills', 'competencies'],
  projects: ['projects', 'personal projects'],
  certifications: ['certifications', 'certificates', 'licenses'],
  languages: ['languages'],
  interests: ['interests', 'hobbies'],
  contact: ['contact', 'contact information'],
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;
const EMAIL_TEST_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const URL_TEST_RE =
  /^(https?:\/\/[^\s)]+|www\.[^\s)]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)$/i;
const PHONE_TEST_RE =
  /^(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?$/;
const DATE_RANGE_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\s*(?:-|–|—|to)\s*((?:Present|Current|Now)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})/i;

const PDF_INTERNAL_MARKERS = [
  '%PDF-',
  ' obj',
  'endobj',
  'stream',
  'endstream',
  'xref',
  'trailer',
  'MediaBox',
  'ViewerPreferences',
  'ProcSet',
  'StructParents',
];

function debugStage(label, payload) {
  if (process.env.NODE_ENV === 'production' && !process.env.CV_PARSE_DEBUG) return;
  try {
    console.info(`[CV_PARSE_DEBUG] ${label}`, payload);
  } catch {
    // no-op
  }
}

function cleanText(input = '') {
  return String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function stripUnsafe(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/javascript:/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cap(str = '', max = 3000) {
  return stripUnsafe(str).slice(0, max);
}

function countPdfInternalMarkers(text = '') {
  const t = String(text || '');
  return PDF_INTERNAL_MARKERS.reduce((count, marker) => count + (t.includes(marker) ? 1 : 0), 0);
}

function isLikelyCorruptedPdfText(text = '') {
  const t = cleanText(text);
  if (!t) return false;

  const markerHits = countPdfInternalMarkers(t);
  if (markerHits >= 3) return true;

  const weirdCharCount = (t.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length;
  const weirdRatio = t.length ? weirdCharCount / t.length : 0;
  if (weirdRatio > 0.12) return true;

  const gibberishBursts = (t.match(/[^\x20-\x7E]{4,}/g) || []).length;
  if (gibberishBursts >= 4) return true;

  return false;
}

function isUsefulResumeText(text = '') {
  const t = cleanText(text);
  if (!t) return false;
  if (t.length < 80) return false;
  if (isLikelyCorruptedPdfText(t)) return false;

  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) return false;

  const positiveSignals = [
    /\b(summary|profile|objective|about)\b/i,
    /\b(experience|employment|work history|professional experience)\b/i,
    /\b(education|academic background)\b/i,
    /\b(skills|technical skills|core skills|competencies)\b/i,
    /\b(projects|certifications|languages|interests)\b/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(19|20)\d{2}\b/,
    /\b(github|linkedin|portfolio|website|phone|email|location)\b/i,
    /\b(developer|engineer|designer|manager|analyst|architect|consultant|specialist|operator|officer)\b/i,
  ];

  return positiveSignals.some((rx) => rx.test(t));
}

function normalizeUrl(url = '') {
  const u = stripUnsafe(url).replace(/[),.;]+$/, '');
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^www\./i.test(u)) return `https://${u}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return `https://${u}`;
  return u;
}

function dedupeStrings(values = [], max = 50) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    const val = cap(v, 300);
    if (!val) continue;
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(val);
    if (out.length >= max) break;
  }
  return out;
}

function dedupeLinkObjects(values = [], max = 12) {
  const out = [];
  const seen = new Set();
  for (const item of values) {
    const url = normalizeUrl(item?.url || '');
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: cap(item?.label || 'Website', 60),
      url: cap(url, 240),
    });
    if (out.length >= max) break;
  }
  return out;
}

function isEmailLine(value = '') {
  return EMAIL_TEST_RE.test(String(value).trim());
}

function isPhoneLine(value = '') {
  const line = String(value).trim();
  if (!line) return false;
  if (!PHONE_TEST_RE.test(line)) return false;
  return line.replace(/\D/g, '').length >= 7;
}

function isUrlLine(value = '') {
  return URL_TEST_RE.test(String(value).trim());
}

function parseDateRange(value = '') {
  const m = String(value).match(DATE_RANGE_RE);
  if (!m) return { start: '', end: '', current: false };
  const end = m[2] || '';
  return {
    start: m[1] || '',
    end,
    current: /present|current|now/i.test(end),
  };
}

function isLikelyHeading(line = '') {
  const s = line.trim().toLowerCase().replace(/:$/, '');
  return Object.values(headingMap).some((list) => list.includes(s));
}

function headingKey(line) {
  const s = line.trim().toLowerCase().replace(/:$/, '');
  for (const [key, aliases] of Object.entries(headingMap)) {
    if (aliases.includes(s)) return key;
  }
  return null;
}

function splitSections(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const sections = { top: [] };
  let current = 'top';

  for (const line of lines) {
    if (!line) {
      if (
        sections[current]?.length &&
        sections[current][sections[current].length - 1] !== ''
      ) {
        sections[current].push('');
      }
      continue;
    }

    const hk = headingKey(line);
    if (hk) {
      current = hk;
      if (!sections[current]) sections[current] = [];
      continue;
    }

    if (
      current === 'languages' &&
      (/^location\s*:/i.test(line) ||
        /^email\s*:/i.test(line) ||
        /^tel\s*:/i.test(line) ||
        /^phone\s*:/i.test(line) ||
        /^github\s*:/i.test(line) ||
        /^online profile\s*:/i.test(line) ||
        /^linkedin\s*:/i.test(line) ||
        /^portfolio\s*:/i.test(line) ||
        /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line))
    ) {
      current = 'contact';
      if (!sections[current]) sections[current] = [];
    }

    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  return sections;
}

function flattenSkillLines(lines = []) {
  const out = [];
  for (const line of lines) {
    const cleaned = cap(line, 300);
    if (!cleaned) continue;
    const rhs = cleaned.includes(':') ? cleaned.split(':').slice(1).join(':') : cleaned;
    const chunks = rhs
      .split(/[,;]|\s{2,}/g)
      .map((s) => cap(s, 120).replace(/^[-•*]\s*/, ''))
      .filter(Boolean);

    for (const chunk of chunks) {
      out.push(chunk);
    }
  }
  return dedupeStrings(out, 80);
}

function inferNameFromLines(lines = []) {
  const candidates = lines
    .map((line) => cap(line, 120))
    .filter(Boolean)
    .filter((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 5) return false;
      if (isEmailLine(line) || isUrlLine(line) || isPhoneLine(line)) return false;
      if (isLikelyHeading(line)) return false;
      if (/[:|]/.test(line)) return false;
      return /^[A-Za-z][A-Za-z\s'.-]+$/.test(line);
    });

  const uppercase = candidates.find((line) => {
    const letters = line.replace(/[^A-Za-z]/g, '');
    if (!letters) return false;
    return letters === letters.toUpperCase();
  });

  return uppercase || candidates[0] || '';
}

function getBottomLines(text = '', count = 12) {
  return text
    .split('\n')
    .map((line) => cap(line, 180))
    .filter(Boolean)
    .slice(-count);
}

function extractLabeledValue(text = '', label = '') {
  const re = new RegExp(`${label}\\s*:\\s*([^|\\n]+)`, 'i');
  const match = String(text || '').match(re);
  return cap(match?.[1] || '', 180);
}

function extractLabeledLinks(text = '') {
  const github = extractLabeledValue(text, 'GitHub');
  const onlineProfile = extractLabeledValue(text, 'Online profile');
  const linkedin = extractLabeledValue(text, 'LinkedIn');
  const portfolio = extractLabeledValue(text, 'Portfolio');

  return [
    github ? { label: 'GitHub', url: normalizeUrl(github) } : null,
    linkedin ? { label: 'LinkedIn', url: normalizeUrl(linkedin) } : null,
    portfolio ? { label: 'Portfolio', url: normalizeUrl(portfolio) } : null,
    onlineProfile ? { label: 'Website', url: normalizeUrl(onlineProfile) } : null,
  ].filter(Boolean);
}

function sanitizeLanguageValues(values = []) {
  const cleaned = values
    .map((value) => cap(value, 180))
    .filter(Boolean)
    .filter((line) => {
      if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) return false;
      if (isLikelyHeading(line)) return false;
      if (isEmailLine(line) || isPhoneLine(line) || isUrlLine(line)) return false;
      if (/^(location|email|tel|phone|github|online profile|linkedin|portfolio)\s*:/i.test(line)) {
        return false;
      }
      return /\b(english|arabic|french|spanish|german|swahili)\b/i.test(line);
    });

  const hasSimpleSingles = cleaned.some((line) => /^[A-Za-z]+$/.test(line.trim()));

  const filtered = hasSimpleSingles
    ? cleaned.filter((line) => !/[|]/.test(line))
    : cleaned;

  return dedupeStrings(filtered, 20);
} 


function parseBasics(text, topLines = []) {
  const allLines = text
    .split('\n')
    .map((line) => cap(line, 180))
    .filter(Boolean);
  const bottomLines = getBottomLines(text, 12);
  const searchLines = [...bottomLines, ...topLines, ...allLines];

  const emails = text.match(EMAIL_RE) || [];
  const urls = text.match(URL_RE) || [];
  const phones = (text.match(PHONE_RE) || []).filter((p) => p.replace(/\D/g, '').length >= 7);

  const labeledEmail = extractLabeledValue(text, 'Email');
  const labeledPhone = extractLabeledValue(text, 'Tel') || extractLabeledValue(text, 'Phone');
  const labeledLocation = extractLabeledValue(text, 'Location');
  const labeledLinks = extractLabeledLinks(text);

  const nameCandidate =
    searchLines.find((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (isLikelyHeading(trimmed)) return false;
      if (
        /^(professional summary|technical skills|professional experience|education|languages)$/i.test(
          trimmed,
        )
      ) {
        return false;
      }
      const words = trimmed.split(/\s+/);
      if (words.length < 2 || words.length > 5) return false;
      if (isEmailLine(trimmed) || isUrlLine(trimmed) || isPhoneLine(trimmed)) return false;
      if (/[:|]/.test(trimmed)) return false;
      return /^[A-Za-z][A-Za-z\s'.-]+$/.test(trimmed);
    }) || inferNameFromLines(searchLines) || '';

  const headlineCandidate =
    searchLines.find((line) => {
      const lower = line.toLowerCase();
      if (line === nameCandidate) return false;
      if (isLikelyHeading(line)) return false;
      if (isEmailLine(line) || isUrlLine(line) || isPhoneLine(line)) return false;
      return /(engineer|developer|designer|manager|analyst|consultant|specialist|lead|architect|operator|officer)/i.test(
        lower,
      );
    }) || '';

  const locationCandidate =
    searchLines.find((line) => {
      if (isEmailLine(line) || isUrlLine(line) || isPhoneLine(line)) return false;
      if (isLikelyHeading(line)) return false;
      return /\b(kenya|usa|uk|canada|nigeria|india|germany|france|qatar|uae|remote)\b/i.test(line);
    }) || '';

  const detectedLinks = dedupeStrings(urls.map(normalizeUrl), 10).map((url) => ({
    label: /linkedin/i.test(url)
      ? 'LinkedIn'
      : /github/i.test(url)
        ? 'GitHub'
        : /portfolio|novagptech/i.test(url)
          ? 'Portfolio'
          : 'Website',
    url,
  }));

  return {
    name: cap(nameCandidate, 120),
    headline: cap(headlineCandidate, 180),
    email: cap(labeledEmail || emails[0] || '', 160),
    phone: cap(labeledPhone || phones[0] || '', 80),
    location: cap(labeledLocation || locationCandidate || '', 120),
    links: dedupeLinkObjects([...labeledLinks, ...detectedLinks]),
  };
}

function parseSummary(sections, topLines) {
  const fromSection = (sections.summary || []).join(' ').trim();
  if (fromSection) return cap(fromSection, 2000);
  const fallback = topLines.slice(2, 6).join(' ').trim();
  return cap(fallback, 2000);
}

function parseSkills(lines = []) {
  const raw = lines.join('\n');
  if (!raw.trim()) return [];
  return flattenSkillLines(raw.split('\n')).slice(0, 50);
}

function mergeWrappedLines(lines = []) {
  const merged = [];
  for (const line of lines) {
    const trimmed = cap(line, 220);
    if (!trimmed) continue;

    const looksNew =
      /^[-•*]\s+/.test(trimmed) ||
      DATE_RANGE_RE.test(trimmed) ||
      /\|\s*/.test(trimmed) ||
      isLikelyHeading(trimmed);

    if (!merged.length || looksNew) {
      merged.push(trimmed);
      continue;
    }

    const prev = merged[merged.length - 1];
    if (prev.length < 140 && !/[.!?]$/.test(prev) && /^[A-Za-z(]/.test(trimmed)) {
      merged[merged.length - 1] = `${prev} ${trimmed}`.trim();
    } else {
      merged.push(trimmed);
    }
  }
  return merged;
}

function splitParagraphIntoBulletLikeSentences(text = '') {
  const cleaned = cap(text, 2000)
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .trim();

  if (!cleaned) return [];

  // First split by semicolon/newline-style duty separators
  let parts = cleaned
    .split(/\s*;\s+|\s*•\s+|\s*\u2022\s+|\s{2,}/g)
    .map((s) => cap(s, 260))
    .filter(Boolean);

  // If still one big paragraph, split by sentence boundaries
  if (parts.length <= 1) {
    parts = cleaned
      .split(/(?<=[.?!])\s+(?=[A-Z])/g)
      .map((s) => cap(s, 260))
      .filter(Boolean);
  }

  // If still one block, try action-verb segmentation
  if (parts.length <= 1) {
    parts = cleaned
      .split(
        /(?=\b(?:Built|Designed|Developed|Led|Managed|Created|Implemented|Optimized|Provided|Operated|Executed|Coordinated|Maintained|Delivered|Supported|Improved|Monitored|Assisted)\b)/g
      )
      .map((s) => cap(s, 260))
      .filter(Boolean);
  }

  return dedupeStrings(
    parts
      .map((item) => item.replace(/^[-•*]\s*/, '').trim())
      .filter((item) => item.length >= 18),
    12,
  );
}

function looksLikeResponsibilitiesParagraph(text = '') {
  const value = cap(text, 2000);
  if (!value) return false;

  const strongActionVerbHits =
    (
      value.match(
        /\b(built|designed|developed|led|managed|created|implemented|optimized|provided|operated|executed|coordinated|maintained|delivered|supported|improved|monitored|assisted)\b/gi,
      ) || []
    ).length;

  const sentenceCount = value
    .split(/(?<=[.?!])\s+(?=[A-Z])/g)
    .map((s) => s.trim())
    .filter(Boolean).length;

  return strongActionVerbHits >= 2 || sentenceCount >= 2;
}

function finalizeExperienceEntry(entry = {}) {
  const bullets = dedupeStrings(entry.bullets || [], 12);
  const description = cap(entry.description || '', 1200);

  // If description is actually duties/responsibilities, convert to bullets
  if (description && bullets.length === 0 && looksLikeResponsibilitiesParagraph(description)) {
    const derivedBullets = splitParagraphIntoBulletLikeSentences(description);
    if (derivedBullets.length) {
      return {
        ...entry,
        description: '',
        bullets: derivedBullets,
      };
    }
  }

  // If both exist, but description is long and duty-heavy, merge into bullets
  if (description && bullets.length > 0 && looksLikeResponsibilitiesParagraph(description)) {
    const mergedBullets = dedupeStrings(
      [...bullets, ...splitParagraphIntoBulletLikeSentences(description)],
      12,
    );
    return {
      ...entry,
      description: '',
      bullets: mergedBullets,
    };
  }

  return {
    ...entry,
    description,
    bullets,
  };
}

export function parseExperience(lines = []) {
  if (!lines.length) return [];
  const entries = [];
  let current = null;

  const flush = () => {
    if (!current) return;

    const finalized = finalizeExperienceEntry({
      company: cap(current.company, 180),
      role: cap(current.role, 180),
      start: cap(current.start, 40),
      end: cap(current.end, 40),
      location: cap(current.location, 120),
      description: cap(current.description, 1200),
      bullets: dedupeStrings(current.bullets || [], 12),
    });

    if (
      finalized.company ||
      finalized.role ||
      finalized.description ||
      finalized.bullets.length
    ) {
      entries.push(finalized);
    }

    current = null;
  };

  const mergedLines = mergeWrappedLines(lines);

  for (const line of mergedLines) {
    if (!line) continue;

    const headerParts = line.split(/\s+[-–—]\s+|\s+\|\s+/).map((p) => p.trim());
    const hasHeaderRoleCompany =
      headerParts.length >= 2 && !/^[-•*]\s+/.test(line) && DATE_RANGE_RE.test(line);

    const inlineDate = parseDateRange(line);

    if (hasHeaderRoleCompany) {
      flush();

      const beforePipe = line.split('|')[0].trim();
      const mainParts = beforePipe.split(/\s+—\s+|\s+–\s+|\s+-\s+/).map((p) => p.trim());

      current = {
        company: mainParts[1] || headerParts[1] || '',
        role: mainParts[0] || headerParts[0] || '',
        start: inlineDate.start || '',
        end: inlineDate.end || '',
        location: '',
        description: '',
        bullets: [],
      };

      if (
        /\b(qatar|kenya|uae|remote|usa|uk|canada)\b/i.test(current.company) &&
        /,/.test(current.company)
      ) {
        const locationMatch = current.company.match(
          /\b(qatar|kenya|uae|remote|usa|uk|canada)\b/i,
        );
        current.location = cap(locationMatch?.[0] || '', 120);
      }

      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!current) {
        current = {
          company: '',
          role: '',
          start: '',
          end: '',
          location: '',
          description: '',
          bullets: [],
        };
      }
      current.bullets.push(line.replace(/^[-•*]\s+/, '').trim());
      continue;
    }

    if (!current) {
      current = {
        company: '',
        role: '',
        start: '',
        end: '',
        location: '',
        description: '',
        bullets: [],
      };
    }

    if (!current.start && inlineDate.start) current.start = inlineDate.start;
    if (!current.end && inlineDate.end) current.end = inlineDate.end;

    if (
      !current.role &&
      /(engineer|developer|operator|officer|specialist|manager|lead)/i.test(line)
    ) {
      current.role = line;
      continue;
    }

    if (
      !current.company &&
      /\b(app|ltd|inc|bank|management|university|technologies|qatar|kenya)\b/i.test(line)
    ) {
      current.company = line;
      continue;
    }

    if (
      !current.location &&
      /,/.test(line) &&
      /\b(qatar|kenya|uae|remote|usa|uk|canada)\b/i.test(line)
    ) {
      current.location = line;
      continue;
    }

    // Instead of always pushing paragraph text into description,
    // try turning responsibility-like text into bullets.
    const derivedBullets = splitParagraphIntoBulletLikeSentences(line);

    if (
      derivedBullets.length >= 2 ||
      (derivedBullets.length >= 1 && looksLikeResponsibilitiesParagraph(line))
    ) {
      current.bullets.push(...derivedBullets);
    } else {
      current.description = `${current.description} ${line}`.trim();
    }
  }

  flush();
  return entries.slice(0, 20);
}

export function parseEducation(lines = []) {
  const items = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    if (current.school || current.program || current.details) {
      items.push({
        school: cap(current.school, 180),
        program: cap(current.program, 180),
        start: cap(current.start, 40),
        end: cap(current.end, 40),
        details: cap(current.details, 500),
      });
    }
    current = null;
  };

  const mergedLines = mergeWrappedLines(lines);

  for (const line of mergedLines) {
    if (!line) continue;

    const date = line.match(DATE_RANGE_RE);
    if (date) {
      if (!current) current = { school: '', program: '', start: '', end: '', details: '' };
      current.start = date[1] || '';
      current.end = date[2] || '';
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!current) current = { school: '', program: '', start: '', end: '', details: '' };
      current.details = `${current.details} ${line.replace(/^[-•*]\s+/, '')}`.trim();
      continue;
    }

    if (!current) {
      current = { school: '', program: '', start: '', end: '', details: '' };
    }

    if (!current.program && /\b(bachelor|master|diploma|degree|certificate|engineering|software)\b/i.test(line)) {
      current.program = line;
      continue;
    }

    if (!current.school) {
      current.school = line;
      continue;
    }

    if (!current.program) {
      current.program = line;
      continue;
    }

    current.details = `${current.details} ${line}`.trim();
  }

  flush();
  return items.slice(0, 10);
}

function parseProjects(lines = []) {
  const items = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    if (current.name || current.description || current.bullets.length) {
      items.push({
        name: cap(current.name, 180),
        link: cap(current.link, 240),
        description: cap(current.description, 600),
        bullets: dedupeStrings(current.bullets, 12),
      });
    }
    current = null;
  };

  const mergedLines = mergeWrappedLines(lines);

  for (const line of mergedLines) {
    if (!line) continue;
    const url = (line.match(URL_RE) || [])[0] || '';

    if (/^[-•*]\s+/.test(line)) {
      if (!current) current = { name: '', link: '', description: '', bullets: [] };
      current.bullets.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }

    if (!current) {
      current = {
        name: line,
        link: normalizeUrl(url),
        description: '',
        bullets: [],
      };
      continue;
    }

    if (!current.description) current.description = line;
    else current.description = `${current.description} ${line}`.trim();
  }

  flush();
  return items.slice(0, 20);
}

function parseCertifications(lines = []) {
  const items = [];
  for (const line of mergeWrappedLines(lines)) {
    if (!line) continue;
    const year = (line.match(/\b(19|20)\d{2}\b/) || [])[0] || '';
    const parts = line.split(/\s+[-–—]\s+|\s+\|\s+/);
    items.push({
      name: cap(parts[0] || line, 180),
      issuer: cap(parts[1] || '', 140),
      year: cap(year, 8),
    });
    if (items.length >= 20) break;
  }
  return items;
}

function parseSimpleList(lines = [], max = 20) {
  const raw = lines.join('\n');
  const parts = raw.includes(',')
    ? raw.split(',')
    : lines.map((l) => l.replace(/^[-•*]\s*/, ''));

  return dedupeStrings(
    parts.filter((item) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(String(item).trim())),
    max,
  );
}

export function normalizeExtractedDraft(extracted = {}) {
  const canonical = mapExtractedResumeToCvDraft(extracted, {});
  const basics = extracted.basics || {};

  return {
    basics: {
      name: cap(basics.name, 120),
      headline: cap(basics.headline, 180),
      email: cap(basics.email, 160),
      phone: cap(basics.phone, 80),
      location: cap(basics.location, 120),
      links: dedupeLinkObjects(Array.isArray(basics.links) ? basics.links : []),
    },
    summary: cap(canonical.summary || extracted.summary, 2000),
    skills: dedupeStrings(canonical.skills || extracted.skills || [], 50),
experience: (
  Array.isArray(extracted.experience)
    ? extracted.experience
    : Array.isArray(canonical.experience)
      ? canonical.experience
      : []
)
  .slice(0, 20)
  .map((e, index) => {
    const canonicalItem =
      Array.isArray(canonical.experience) && canonical.experience[index]
        ? canonical.experience[index]
        : {};

    const rawDescription = cap(e?.description || canonicalItem?.description, 1200);
    const rawBullets = dedupeStrings(
      (Array.isArray(e?.bullets) && e.bullets.length ? e.bullets : canonicalItem?.bullets) || [],
      12,
    );

    const normalized = finalizeExperienceEntry({
      company: cap(e?.company || canonicalItem?.company, 180),
      role: cap(e?.role || canonicalItem?.role, 180),
      start: cap(e?.start || canonicalItem?.start, 40),
      end: cap(e?.end || canonicalItem?.end, 40),
      location: cap(e?.location || canonicalItem?.location, 120),
      description: rawDescription,
      bullets: rawBullets,
    });

    return normalized;
  }),

    education: (
      Array.isArray(canonical.education)
        ? canonical.education
        : Array.isArray(extracted.education)
          ? extracted.education
          : []
    )
      .slice(0, 10)
      .map((e) => ({
        school: cap(e?.school, 180),
        program: cap(e?.program, 180),
        start: cap(e?.start, 40),
        end: cap(e?.end, 40),
        details: cap(e?.details, 500),
      })),
    projects: (
      Array.isArray(canonical.projects)
        ? canonical.projects
        : Array.isArray(extracted.projects)
          ? extracted.projects
          : []
    )
      .slice(0, 20)
      .map((p) => ({
        name: cap(p?.name, 180),
        link: cap(normalizeUrl(p?.link || ''), 240),
        description: cap(p?.description, 600),
        bullets: dedupeStrings(p?.bullets || [], 12),
      })),
    certifications: (
      Array.isArray(canonical.certifications)
        ? canonical.certifications
        : Array.isArray(extracted.certifications)
          ? extracted.certifications
          : []
    )
      .slice(0, 20)
      .map((c) => ({
        name: cap(c?.name, 180),
        issuer: cap(c?.issuer, 140),
        year: cap(c?.year, 8),
      })),
   extras: {
  languages: sanitizeLanguageValues(
    extracted?.extras?.languages || extracted?.languages || [],
  ),
  interests: dedupeStrings(extracted?.extras?.interests || [], 20),
},
  };
}

function mergeExtractedData(primary = {}, fallback = {}) {
  return normalizeExtractedDraft({
    basics: {
      ...(fallback.basics || {}),
      ...(primary.basics || {}),
      links: [
        ...((primary.basics && primary.basics.links) || []),
        ...((fallback.basics && fallback.basics.links) || []),
      ],
    },
    summary: primary.summary || fallback.summary || '',
    skills:
      primary.skills && primary.skills.length
        ? primary.skills
        : fallback.skills || [],
    experience:
      primary.experience && primary.experience.length
        ? primary.experience
        : fallback.experience || [],
    education:
      primary.education && primary.education.length
        ? primary.education
        : fallback.education || [],
    projects:
      primary.projects && primary.projects.length
        ? primary.projects
        : fallback.projects || [],
    certifications:
      primary.certifications && primary.certifications.length
        ? primary.certifications
        : fallback.certifications || [],
    extras: {
      languages:
        primary.extras?.languages && primary.extras.languages.length
          ? primary.extras.languages
          : fallback.extras?.languages || [],
      interests:
        primary.extras?.interests && primary.extras.interests.length
          ? primary.extras.interests
          : fallback.extras?.interests || [],
    },
  });
}

function recoverDeterministicSections(text = '', extracted = {}) {
  const lines = text
    .split('\n')
    .map((line) => cap(line, 200))
    .filter(Boolean);

  const links = dedupeStrings((text.match(URL_RE) || []).map(normalizeUrl), 12).map((url) => ({
    label: /github/i.test(url)
      ? 'GitHub'
      : /linkedin/i.test(url)
        ? 'LinkedIn'
        : /portfolio|novagptech/i.test(url)
          ? 'Portfolio'
          : 'Website',
    url,
  }));

  const basics = {
    ...extracted.basics,
    name: extracted.basics?.name || inferNameFromLines([...getBottomLines(text, 12), ...lines]),
    email:
      extracted.basics?.email ||
      cap(extractLabeledValue(text, 'Email') || (text.match(EMAIL_RE) || [])[0] || '', 160),
    phone:
      extracted.basics?.phone ||
      cap(
        extractLabeledValue(text, 'Tel') ||
          extractLabeledValue(text, 'Phone') ||
          (text.match(PHONE_RE) || [])[0] ||
          '',
        80,
      ),
    location:
      extracted.basics?.location ||
      cap(
        extractLabeledValue(text, 'Location') ||
          lines.find((line) => /\b(qatar|uae|kenya|remote|usa|uk|canada)\b/i.test(line)) ||
          '',
        120,
      ),
    links: dedupeLinkObjects([
      ...(extracted.basics?.links || []),
      ...extractLabeledLinks(text),
      ...links,
    ]),
  };

  const parsedLanguages = lines
    .filter((line) => /\b(fluent|basic|native|intermediate|advanced)\b/i.test(line))
    .filter((line) => /\b(english|arabic|french|spanish|german|swahili)\b/i.test(line))
    .map((line) => line.replace(/^[-•*]\s*/, ''));

  return normalizeExtractedDraft({
    ...extracted,
    basics,
    skills: extracted.skills?.length ? extracted.skills : flattenSkillLines(lines),
    extras: {
  languages: sanitizeLanguageValues(
    extracted?.extras?.languages?.length
      ? extracted.extras.languages
      : parsedLanguages,
  ),
  interests: extracted?.extras?.interests || [],
},
  });
}

function createEmptyExtractedDraft() {
  return {
    basics: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      links: [],
    },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    extras: {
      languages: [],
      interests: [],
    },
  };
}

function decodePdfStringLiteral(str) {
  return str
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

async function extractTextFromPdfWithLibrary(buffer) {
  try {
    const workerMod = await import('pdf-parse/worker').catch(() => null);
    const pdfMod = await import('pdf-parse');

    debugStage('PDF_LIBRARY_MODULE_KEYS', Object.keys(pdfMod || {}));

    const PDFParse = pdfMod?.PDFParse;
    if (typeof PDFParse !== 'function') {
      throw new TypeError(
        `pdf-parse did not expose PDFParse class. Export keys: ${Object.keys(pdfMod || {}).join(', ')}`,
      );
    }

    const options = { data: buffer };

    if (workerMod?.CanvasFactory) {
      options.CanvasFactory = workerMod.CanvasFactory;
    }

    if (typeof PDFParse.setWorker === 'function') {
      if (typeof workerMod?.getData === 'function') {
        PDFParse.setWorker(workerMod.getData());
      } else if (typeof workerMod?.getPath === 'function') {
        PDFParse.setWorker(workerMod.getPath());
      }
    }

    const parser = new PDFParse(options);
    const result = await parser.getText();

    const text =
      result?.text ||
      result?.rawText ||
      (Array.isArray(result?.pages) ? result.pages.map((p) => p?.text || '').join('\n') : '');

    if (typeof parser.destroy === 'function') {
      await parser.destroy().catch(() => {});
    }

    return cleanText(text);
  } catch (err) {
    debugStage('PDF_LIBRARY_EXTRACT_EXCEPTION', {
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
    return '';
  }
}

function extractTextFromPdfBuffer(buffer) {
  const raw = buffer.toString('latin1');
  const parts = [];

  const collectFromChunk = (chunk = '') => {
    const parens = chunk.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [];
    for (const token of parens) {
      const inner = token.replace(/\)\s*Tj$/, '').replace(/^\(/, '');
      parts.push(decodePdfStringLiteral(inner));
    }

    const arrays = chunk.match(/\[(.*?)\]\s*TJ/gs) || [];
    for (const token of arrays) {
      const matches = token.match(/\((?:\\.|[^\\)])*\)/g) || [];
      for (const m of matches) {
        parts.push(decodePdfStringLiteral(m.slice(1, -1)));
      }
    }
  };

  collectFromChunk(raw);

  const streamRegex = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(raw)) !== null) {
    const dict = match[1] || '';
    const streamDataLatin = match[2] || '';
    const streamBuffer = Buffer.from(streamDataLatin, 'latin1');
    let decoded = null;

    try {
      if (/FlateDecode/i.test(dict)) {
        decoded = inflateRawSync(streamBuffer).toString('latin1');
      }
    } catch {
      decoded = null;
    }

    if (decoded) collectFromChunk(decoded);
  }

  if (!parts.length) return '';
  return cleanText(parts.join('\n'));
}

function extractTextFromPdfBufferFallback(buffer) {
  const raw = buffer.toString('latin1');
  const matches = raw.match(/\((?:\\.|[^\\)]){2,}\)/g) || [];
  if (!matches.length) return '';

  const decoded = matches
    .slice(0, 20000)
    .map((token) => decodePdfStringLiteral(token.slice(1, -1)))
    .map((line) => line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim())
    .filter((line) => line.length >= 2)
    .join('\n');

  return cleanText(decoded);
}

function unzipDocxEntry(buffer, wantedName = 'word/document.xml') {
  let offset = 0;

  while (offset + 30 < buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const fileName = buffer
      .slice(offset + 30, offset + 30 + fileNameLen)
      .toString('utf8');
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const dataEnd = dataStart + compressedSize;

    if (fileName === wantedName) {
      const fileData = buffer.slice(dataStart, dataEnd);
      if (compression === 0) return fileData;
      if (compression === 8) return inflateRawSync(fileData);
      throw new Error(`Unsupported DOCX compression method: ${compression}`);
    }

    offset = dataEnd;
  }

  return null;
}

function extractTextFromDocxBuffer(buffer) {
  const xmlData = unzipDocxEntry(buffer, 'word/document.xml');
  if (!xmlData) throw new Error('DOCX document.xml not found');

  const xml = xmlData.toString('utf8');
  const withBreaks = xml
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<w:br\/?\s*>/g, '\n');

  const textOnly = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return cleanText(textOnly);
}

async function refineExtractionWithAi({ text, extracted }) {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!isUsefulResumeText(text)) return null;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      basics: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          headline: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          location: { type: 'string' },
          links: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['label', 'url'],
            },
          },
        },
        required: ['name', 'headline', 'email', 'phone', 'location', 'links'],
      },
      summary: { type: 'string' },
      skills: { type: 'array', items: { type: 'string' } },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            company: { type: 'string' },
            role: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
          required: ['company', 'role', 'start', 'end', 'location', 'description', 'bullets'],
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            school: { type: 'string' },
            program: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            details: { type: 'string' },
          },
          required: ['school', 'program', 'start', 'end', 'details'],
        },
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            link: { type: 'string' },
            description: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'link', 'description', 'bullets'],
        },
      },
      certifications: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            issuer: { type: 'string' },
            year: { type: 'string' },
          },
          required: ['name', 'issuer', 'year'],
        },
      },
      extras: {
        type: 'object',
        additionalProperties: false,
        properties: {
          languages: { type: 'array', items: { type: 'string' } },
          interests: { type: 'array', items: { type: 'string' } },
        },
        required: ['languages', 'interests'],
      },
      confidence: { type: 'number' },
      warnings: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'basics',
      'summary',
      'skills',
      'experience',
      'education',
      'projects',
      'certifications',
      'extras',
      'confidence',
      'warnings',
    ],
  };

  try {
    const { openai } = await import('./aiCourseCore.js');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'cv_refine', schema, strict: true },
      },
      messages: [
        {
          role: 'system',
          content:
  'Map resume text into CvDraft JSON. Use only facts present in text. Keep unknown fields empty. For experience entries, duties and responsibilities must go into bullets, not description. Use description only for a short high-level role summary when clearly present. If responsibilities are written as a paragraph, split them into separate bullet points by sentence or action. Do not create extra jobs from responsibility text. Do not treat headings like PROFESSIONAL SUMMARY as a person name. Preserve CI/CD as one skill. Return clean languages only.',
        },
        {
          role: 'user',
          content: `Resume text:
${text.slice(0, 14000)}

Heuristic extraction:
${JSON.stringify(extracted).slice(0, 9000)}`,
        },
      ],
    });

    const content = completion?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (err) {
    debugStage('AI_REFINEMENT_EXCEPTION', {
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
    return null;
  }
}

function buildStructuredParseFailure(parser, warningMessage) {
  return {
    extracted: createEmptyExtractedDraft(),
    diagnostics: {
      parser,
      warnings: [warningMessage],
      confidence: 0,
      usedAiRefinement: false,
      parseFailed: true,
      extractionUsed: 'none',
    },
  };
}

async function runPdfExtractionPipeline(buffer) {
  const attempts = [];

  const libraryText = await extractTextFromPdfWithLibrary(buffer);
  attempts.push({ extractor: 'pdf-parse', text: libraryText });
  if (isUsefulResumeText(libraryText)) {
    return { text: libraryText, extractionUsed: 'pdf-parse', attempts };
  }

  const tokenText = extractTextFromPdfBuffer(buffer);
  attempts.push({ extractor: 'pdf-token+flate', text: tokenText });
  if (isUsefulResumeText(tokenText)) {
    return { text: tokenText, extractionUsed: 'pdf-token+flate', attempts };
  }

  const fallbackText = extractTextFromPdfBufferFallback(buffer);
  attempts.push({ extractor: 'pdf-paren-fallback', text: fallbackText });
  if (isUsefulResumeText(fallbackText)) {
    return { text: fallbackText, extractionUsed: 'pdf-paren-fallback', attempts };
  }

  return { text: '', extractionUsed: 'none', attempts };
}

export async function parseCvFileToDraftPartial({ buffer, mimetype, filename }) {
  const mime = String(mimetype || '').toLowerCase();
  const lowerName = String(filename || '').toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  let parser = 'pdf';
  let text = '';
  let extractionUsed = 'none';

  debugStage('RAW_FILE_META', {
    mimetype: mime,
    filename: lowerName,
    ext,
    bytes: buffer?.length || 0,
  });

  try {
    if (mime === 'application/pdf' || ext === '.pdf') {
      parser = 'pdf';
      debugStage('PDF_EXTRACTOR_SELECTED', {
        primary: 'pdf-parse',
        secondary: 'pdf-token+flate',
        tertiary: 'pdf-paren-fallback',
      });

      const pdfResult = await runPdfExtractionPipeline(buffer);
      text = pdfResult.text;
      extractionUsed = pdfResult.extractionUsed;

      for (const attempt of pdfResult.attempts) {
        debugStage(
          attempt.extractor === 'pdf-parse'
            ? 'PDF_LIBRARY_EXTRACT_RESULT'
            : attempt.extractor === 'pdf-token+flate'
              ? 'PDF_TOKEN_EXTRACT_RESULT'
              : 'PDF_FALLBACK_EXTRACT_RESULT',
          {
            type: typeof attempt.text,
            length: attempt.text.length,
            preview: attempt.text.slice(0, 500),
            useful: isUsefulResumeText(attempt.text),
            corrupted: isLikelyCorruptedPdfText(attempt.text),
            pdfMarkerHits: countPdfInternalMarkers(attempt.text),
          },
        );
      }

      debugStage('PDF_EXTRACTOR_SUCCESS', {
        extractor: extractionUsed,
        finalLength: text.length,
      });
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      parser = 'docx';
      text = extractTextFromDocxBuffer(buffer);
      extractionUsed = 'docx-xml';

      debugStage('DOCX_EXTRACT_RESULT', {
        type: typeof text,
        length: text.length,
        preview: text.slice(0, 500),
        useful: isUsefulResumeText(text),
      });
    } else {
      throw new Error('Unsupported file type. Upload PDF or DOCX.');
    }
  } catch (err) {
    debugStage('PARSE_EXTRACTOR_EXCEPTION', {
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
    return buildStructuredParseFailure(
      parser,
      `Failed to extract text from uploaded ${parser.toUpperCase()} file.`,
    );
  }

  debugStage('RAW_PDF_TEXT', text.slice(0, 4000));
  debugStage('EXTRACTION_SANITY_RESULT', {
    useful: isUsefulResumeText(text),
    corrupted: isLikelyCorruptedPdfText(text),
    length: text.length,
    extractionUsed,
  });

  if (!isUsefulResumeText(text)) {
    return buildStructuredParseFailure(
      parser,
      `Could not extract readable resume text from uploaded ${parser.toUpperCase()} file.`,
    );
  }

  const sections = splitSections(text);
  const topLines = (sections.top || []).filter(Boolean).slice(0, 12);

  const basics = parseBasics(text, topLines);
  const summary = parseSummary(sections, topLines);
  const skills = parseSkills(sections.skills || []);
  const experience = parseExperience(sections.experience || []);
  const education = parseEducation(sections.education || []);
  const projects = parseProjects(sections.projects || []);
  const certifications = parseCertifications(sections.certifications || []);
  const extras = {
    languages: sanitizeLanguageValues(parseSimpleList(sections.languages || [], 20)),
    interests: dedupeStrings(sections.interests || [], 20),
  };

  const heuristicExtracted = normalizeExtractedDraft({
    basics,
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
    extras,
  });

  const refined = await refineExtractionWithAi({
    text,
    extracted: heuristicExtracted,
  });

  debugStage('AI_STRUCTURED_EXTRACTION', refined || null);

  const mergedExtracted = mergeExtractedData(refined || {}, heuristicExtracted);
  const extracted = recoverDeterministicSections(text, mergedExtracted);

  debugStage('NORMALIZED_CV_DRAFT', extracted);

  const warnings = [];
  if (refined?.warnings?.length) warnings.push(...refined.warnings.slice(0, 6));
  if (!extracted.basics.name) warnings.push('Could not confidently detect full name.');
  if (!extracted.experience.length) warnings.push('No work experience detected.');
  if (!extracted.skills.length) warnings.push('No skills detected.');
  if (!extracted.education.length) warnings.push('No education detected.');

  return {
    extracted,
    diagnostics: {
      parser,
      warnings,
      confidence: typeof refined?.confidence === 'number' ? refined.confidence : undefined,
      usedAiRefinement: Boolean(refined),
      extractionUsed,
      parseFailed: false,
    },
  };
}

export async function extractTextFromUploadedDocument({ buffer, mimetype, filename }) {
  const mime = String(mimetype || '').toLowerCase();
  const ext = String(filename || '')
    .toLowerCase()
    .match(/\.[a-z0-9]+$/)?.[0];

  let parser = 'pdf';
  let extractionUsed = 'none';
  let text = '';
  const warnings = [];

  if (mime === 'application/pdf' || ext === '.pdf') {
    parser = 'pdf';
    const pdfResult = await extractTextFromPdf(buffer);
    text = cleanText(pdfResult.text || '');
    extractionUsed = pdfResult.extractionUsed;
    if (!text) warnings.push('Could not extract readable text from PDF.');
  } else if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    parser = 'docx';
    text = cleanText(extractTextFromDocxBuffer(buffer) || '');
    extractionUsed = 'docx-xml';
    if (!text) warnings.push('Could not extract readable text from DOCX.');
  } else {
    throw new Error('Unsupported file type. Upload PDF or DOCX.');
  }

  return {
    text,
    diagnostics: {
      parser,
      extractionUsed,
      warnings,
    },
  };
}
