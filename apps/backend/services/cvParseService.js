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
const URL_TEST_RE = /^(https?:\/\/[^\s)]+|www\.[^\s)]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)$/i;
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

function isLikelyHeading(line) {
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
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }
  return sections;
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

function flattenSkillLines(lines = []) {
  const out = [];
  for (const line of lines) {
    const cleaned = cap(line, 300);
    if (!cleaned) continue;
    const rhs = cleaned.includes(':') ? cleaned.split(':').slice(1).join(':') : cleaned;
    const chunks = rhs.split(/[,|;/]|\s{2,}/g).map((s) => cap(s, 120));
    for (const chunk of chunks) {
      if (!chunk) continue;
      out.push(chunk.replace(/^[-•*]\s*/, ''));
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
      return /^[A-Za-z][A-Za-z\s'.-]+$/.test(line);
    });

  const uppercase = candidates.find((line) => {
    const letters = line.replace(/[^A-Za-z]/g, '');
    if (!letters) return false;
    return letters === letters.toUpperCase();
  });

  return uppercase || candidates[0] || '';
}

function parseBasics(text, topLines = []) {
  const allLines = text
    .split('\n')
    .map((line) => cap(line, 180))
    .filter(Boolean);
  const emails = text.match(EMAIL_RE) || [];
  const urls = text.match(URL_RE) || [];
  const phones = (text.match(PHONE_RE) || []).filter(
    (p) => p.replace(/\D/g, '').length >= 7,
  );

  const nameCandidate =
    topLines.find((line) => {
      const words = line.trim().split(/\s+/);
      if (words.length < 2 || words.length > 5) return false;
      if (isEmailLine(line) || isUrlLine(line) || isPhoneLine(line)) return false;
      return /^[A-Za-z][A-Za-z\s'.-]+$/.test(line);
    }) ||
    inferNameFromLines(allLines) ||
    topLines[0] ||
    '';

  const headlineCandidate =
    topLines.find((line) => {
      const lower = line.toLowerCase();
      if (line === nameCandidate) return false;
      return /(engineer|developer|designer|manager|analyst|consultant|specialist|lead|architect)/i.test(
        lower,
      );
    }) || '';

  const locationCandidate =
    topLines.find((line) => {
      if (isEmailLine(line) || isUrlLine(line) || isPhoneLine(line)) return false;
      return (
        /,/.test(line) ||
        /\b(kenya|usa|uk|canada|nigeria|india|germany|france|qatar|uae|remote)\b/i.test(
          line,
        )
      );
    }) ||
    allLines.find((line) =>
      /\b(kenya|usa|uk|canada|nigeria|india|germany|france|qatar|uae|remote)\b/i.test(
        line,
      ),
    ) ||
    '';

  const links = dedupeStrings(urls.map(normalizeUrl), 10).map((url) => ({
    label: /linkedin/i.test(url)
      ? 'LinkedIn'
      : /github/i.test(url)
        ? 'GitHub'
        : /portfolio/i.test(url)
          ? 'Portfolio'
          : 'Website',
    url,
  }));

  return {
    name: cap(nameCandidate, 120),
    headline: cap(headlineCandidate, 180),
    email: cap(emails[0] || '', 160),
    phone: cap(phones[0] || '', 80),
    location: cap(locationCandidate, 120),
    links,
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

function parseBullets(lines = []) {
  return dedupeStrings(
    lines
      .filter((line) => /^[-•*]\s+/.test(line))
      .map((line) => line.replace(/^[-•*]\s+/, '')),
    12,
  );
}

export function parseExperience(lines = []) {
  if (!lines.length) return [];
  const entries = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.bullets = dedupeStrings(current.bullets || [], 12);
    if (current.company || current.role || current.bullets.length) {
      entries.push({
        company: cap(current.company, 180),
        role: cap(current.role, 180),
        start: cap(current.start, 40),
        end: cap(current.end, 40),
        location: cap(current.location, 120),
        bullets: current.bullets,
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (!line) continue;
    const headerParts = line.split(/\s+[-–—]\s+|\s+\|\s+/).map((p) => p.trim());
    const hasHeaderRoleCompany = headerParts.length >= 2 && !/^[-•*]\s+/.test(line);
    const inlineDate = parseDateRange(line);
    const looksLikeDateOnly = Boolean(inlineDate.start && inlineDate.end) && headerParts.length <= 2;

    if (
      hasHeaderRoleCompany &&
      !looksLikeDateOnly &&
      (inlineDate.start || (!current || (current.role && current.company)))
    ) {
      flush();
      current = {
        company: headerParts[1] || '',
        role: headerParts[0] || '',
        start: inlineDate.start || '',
        end: inlineDate.end || '',
        location: '',
        bullets: [],
      };
      continue;
    }

    const dateMatch = line.match(DATE_RANGE_RE);
    if (dateMatch) {
      if (!current) {
        current = {
          company: '',
          role: '',
          start: '',
          end: '',
          location: '',
          bullets: [],
        };
      }
      current.start = dateMatch[1] || '';
      current.end = dateMatch[2] || '';
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      if (!current)
        current = {
          company: '',
          role: '',
          start: '',
          end: '',
          location: '',
          bullets: [],
        };
      current.bullets.push(line.replace(/^[-•*]\s+/, ''));
      continue;
    }

    if (!current) {
      current = {
        company: '',
        role: '',
        start: '',
        end: '',
        location: '',
        bullets: [],
      };
      const parts = line.split(/\s+[-–—]\s+|\s+\|\s+/);
      current.role = parts[0] || '';
      current.company = parts[1] || '';
      continue;
    }

    if (!current.role) current.role = line;
    else if (!current.company) current.company = line;
    else if (!current.location && /,/.test(line)) current.location = line;
    else {
      flush();
      current = {
        company: '',
        role: line,
        start: '',
        end: '',
        location: '',
        bullets: [],
      };
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

  for (const line of lines) {
    if (!line) continue;
    const date = line.match(DATE_RANGE_RE);
    if (date) {
      if (!current)
        current = { school: '', program: '', start: '', end: '', details: '' };
      current.start = date[1] || '';
      current.end = date[2] || '';
      continue;
    }
    if (/^[-•*]\s+/.test(line)) {
      if (!current)
        current = { school: '', program: '', start: '', end: '', details: '' };
      current.details =
        `${current.details} ${line.replace(/^[-•*]\s+/, '')}`.trim();
      continue;
    }

    if (!current) {
      current = { school: '', program: '', start: '', end: '', details: '' };
      const parts = line.split(/\s+[-–—]\s+|\s+\|\s+/);
      current.school = parts[0] || '';
      current.program = parts[1] || '';
      continue;
    }

    if (!current.school) current.school = line;
    else if (!current.program) current.program = line;
    else {
      flush();
      const parts = line.split(/\s+[-–—]\s+|\s+\|\s+/);
      current = {
        school: parts[0] || line,
        program: parts[1] || '',
        start: '',
        end: '',
        details: '',
      };
    }
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

  for (const line of lines) {
    if (!line) continue;
    const url = (line.match(URL_RE) || [])[0] || '';
    if (/^[-•*]\s+/.test(line)) {
      if (!current)
        current = { name: '', link: '', description: '', bullets: [] };
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
    else {
      flush();
      current = {
        name: line,
        link: normalizeUrl(url),
        description: '',
        bullets: [],
      };
    }
  }
  flush();
  return items.slice(0, 20);
}

function parseCertifications(lines = []) {
  const items = [];
  for (const line of lines) {
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
  return dedupeStrings(parts, max);
}

export function normalizeExtractedDraft(extracted = {}) {
  const canonical = mapExtractedResumeToCvDraft(extracted, {});
  const basics = extracted.basics || {};
  const links = Array.isArray(basics.links) ? basics.links : [];
  const dedupLinks = [];
  const seen = new Set();
  for (const l of links) {
    const url = normalizeUrl(l?.url || '');
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedupLinks.push({
      label: cap(l?.label || 'Website', 60),
      url: cap(url, 240),
    });
    if (dedupLinks.length >= 12) break;
  }

  return {
    basics: {
      name: cap(basics.name, 120),
      headline: cap(basics.headline, 180),
      email: cap(basics.email, 160),
      phone: cap(basics.phone, 80),
      location: cap(basics.location, 120),
      links: dedupLinks,
    },
    summary: cap(canonical.summary || extracted.summary, 2000),
    skills: dedupeStrings(canonical.skills || extracted.skills || [], 50),
    experience: (Array.isArray(extracted.experience)
      ? extracted.experience
      : []
    )
      .slice(0, 20)
      .map((e) => ({
        company: cap(e?.company, 180),
        role: cap(e?.role, 180),
        start: cap(e?.start, 40),
        end: cap(e?.end, 40),
        location: cap(e?.location, 120),
        bullets: dedupeStrings(e?.bullets || [], 12),
      })),
    education: (Array.isArray(canonical.education) ? canonical.education : Array.isArray(extracted.education) ? extracted.education : [])
      .slice(0, 10)
      .map((e) => ({
        school: cap(e?.school, 180),
        program: cap(e?.program, 180),
        start: cap(e?.start, 40),
        end: cap(e?.end, 40),
        details: cap(e?.details, 500),
      })),
    projects: (Array.isArray(canonical.projects) ? canonical.projects : Array.isArray(extracted.projects) ? extracted.projects : [])
      .slice(0, 20)
      .map((p) => ({
        name: cap(p?.name, 180),
        link: cap(normalizeUrl(p?.link || ''), 240),
        description: cap(p?.description, 600),
        bullets: dedupeStrings(p?.bullets || [], 12),
      })),
    certifications: (Array.isArray(canonical.certifications)
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
      languages: dedupeStrings(
        extracted?.extras?.languages || extracted?.languages || [],
        20,
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
    skills: [...(primary.skills || []), ...(fallback.skills || [])],
    experience: (primary.experience && primary.experience.length)
      ? primary.experience
      : fallback.experience || [],
    education: (primary.education && primary.education.length)
      ? primary.education
      : fallback.education || [],
    projects: (primary.projects && primary.projects.length)
      ? primary.projects
      : fallback.projects || [],
    certifications: (primary.certifications && primary.certifications.length)
      ? primary.certifications
      : fallback.certifications || [],
    extras: {
      languages: [
        ...((primary.extras && primary.extras.languages) || []),
        ...((fallback.extras && fallback.extras.languages) || []),
      ],
      interests: [
        ...((primary.extras && primary.extras.interests) || []),
        ...((fallback.extras && fallback.extras.interests) || []),
      ],
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
    name: extracted.basics?.name || inferNameFromLines(lines),
    email: extracted.basics?.email || cap((text.match(EMAIL_RE) || [])[0] || '', 160),
    phone: extracted.basics?.phone || cap((text.match(PHONE_RE) || [])[0] || '', 80),
    location:
      extracted.basics?.location ||
      lines.find((line) => /\b(qatar|uae|kenya|remote|usa|uk|canada)\b/i.test(line)) ||
      '',
    links: [...(extracted.basics?.links || []), ...links],
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
      languages: [
        ...(extracted.extras?.languages || []),
        ...parsedLanguages,
      ],
      interests: extracted.extras?.interests || [],
    },
  });
}

function debugStage(label, payload) {
  if (process.env.NODE_ENV === 'production' && !process.env.CV_PARSE_DEBUG) return;
  try {
    console.info(`[CV_PARSE_DEBUG] ${label}`, payload);
  } catch (_err) {
    // no-op
  }
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
      for (const m of matches) parts.push(decodePdfStringLiteral(m.slice(1, -1)));
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
    } catch (_err) {
      decoded = null;
    }

    if (decoded) collectFromChunk(decoded);
  }

  if (!parts.length) {
    return '';
  }
  return cleanText(parts.join('\n'));
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
            bullets: { type: 'array', items: { type: 'string' } },
          },
          required: ['company', 'role', 'start', 'end', 'bullets'],
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
          required: ['school', 'program', 'start', 'end'],
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
          required: ['name', 'description', 'bullets'],
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
          required: ['name'],
        },
      },
      extras: {
        type: 'object',
        additionalProperties: false,
        properties: {
          languages: { type: 'array', items: { type: 'string' } },
          interests: { type: 'array', items: { type: 'string' } },
        },
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
            'Map resume text into CvDraft JSON. Use only facts present in text. Keep unknown fields empty. Dedupe and keep concise.',
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
    return null;
  }
}

export async function parseCvFileToDraftPartial({ buffer, mimetype, filename }) {
  const mime = String(mimetype || '').toLowerCase();
  const lowerName = String(filename || '').toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  let parser = 'pdf';
  let text = '';

  debugStage('RAW_FILE_META', { mimetype: mime, filename: lowerName, ext, bytes: buffer?.length || 0 });

  if (mime === 'application/pdf' || ext === '.pdf') {
    parser = 'pdf';
    text = extractTextFromPdfBuffer(buffer);
  } else if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    parser = 'docx';
    text = extractTextFromDocxBuffer(buffer);
  } else {
    throw new Error('Unsupported file type. Upload PDF or DOCX.');
  }

  debugStage('RAW_PDF_TEXT', text.slice(0, 4000));

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
    languages: parseSimpleList(sections.languages || [], 20),
    interests: parseSimpleList(sections.interests || [], 20),
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
  if (!extracted.basics.name)
    warnings.push('Could not confidently detect full name.');
  if (!extracted.experience.length)
    warnings.push('No work experience detected.');
  if (!extracted.skills.length) warnings.push('No skills detected.');

  return {
    extracted,
    diagnostics: {
      parser,
      warnings,
      confidence:
        typeof refined?.confidence === 'number'
          ? refined.confidence
          : undefined,
      usedAiRefinement: Boolean(refined),
    },
  };
}
