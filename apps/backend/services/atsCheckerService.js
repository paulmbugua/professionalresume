import { extractTextFromUploadedDocument } from './cvParseService.js';

const MAX_JOB_DESCRIPTION_CHARS = 20000;
const MAX_RESUME_TEXT_CHARS = 120000;

const SECTION_PATTERNS = {
  summary: /\b(summary|professional summary|profile|objective|about)\b/i,
  experience:
    /\b(experience|employment|work history|professional experience)\b/i,
  education: /\b(education|academic background|qualifications)\b/i,
  skills: /\b(skills|technical skills|core skills|competencies|tools)\b/i,
  certifications: /\b(certifications|certificates|licenses|licences)\b/i,
  projects: /\b(projects|portfolio|selected projects)\b/i,
};

const STOPWORDS = new Set([
  'about',
  'above',
  'across',
  'after',
  'again',
  'against',
  'all',
  'also',
  'and',
  'any',
  'are',
  'because',
  'been',
  'being',
  'between',
  'both',
  'can',
  'candidate',
  'company',
  'could',
  'department',
  'each',
  'etc',
  'experience',
  'from',
  'has',
  'have',
  'having',
  'her',
  'him',
  'his',
  'into',
  'job',
  'looking',
  'may',
  'more',
  'must',
  'need',
  'our',
  'out',
  'per',
  'role',
  'required',
  'requirements',
  'responsibilities',
  'shall',
  'she',
  'should',
  'such',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'through',
  'under',
  'using',
  'was',
  'were',
  'will',
  'with',
  'within',
  'work',
  'you',
  'your',
]);

const ACTION_VERBS = [
  'achieved',
  'administered',
  'analysed',
  'analyzed',
  'built',
  'coordinated',
  'created',
  'delivered',
  'designed',
  'developed',
  'directed',
  'implemented',
  'improved',
  'increased',
  'launched',
  'led',
  'managed',
  'negotiated',
  'optimized',
  'reduced',
  'resolved',
  'streamlined',
  'supervised',
  'trained',
];

const KENYA_MARKET_TERMS = [
  'ngo',
  'government',
  'county',
  'ministry',
  'parastatal',
  'sacco',
  'bank',
  'un',
  'donor',
  'compliance',
  'procurement',
  'monitoring',
  'evaluation',
  'stakeholder',
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanText(value = '', max = MAX_RESUME_TEXT_CHARS) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function normalizeWord(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]/g, '')
    .replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, '')
    .trim();
}

function tokenize(text = '') {
  return (
    cleanText(text)
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9+#./-]{1,}/g) || []
  );
}

function wordCount(text = '') {
  return tokenize(text).filter((word) => /[a-z0-9]/i.test(word)).length;
}

function hasAny(text = '', patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectSections(text = '') {
  return Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([key, pattern]) => [
      key,
      pattern.test(text),
    ]),
  );
}

function scoreCategory(id, label, score, max, notes = []) {
  return {
    id,
    label,
    score: clamp(Math.round(score), 0, max),
    max,
    notes: notes.filter(Boolean).slice(0, 5),
  };
}

function getTopKeywords(jobDescription = '', targetRole = '') {
  const source = cleanText(
    `${targetRole}\n${jobDescription}`,
    MAX_JOB_DESCRIPTION_CHARS,
  );
  if (!source) return [];

  const counts = new Map();
  for (const raw of tokenize(source)) {
    const word = normalizeWord(raw);
    if (!word || word.length < 3 || STOPWORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  const phraseMatches =
    source
      .toLowerCase()
      .match(
        /\b(?:project management|data analysis|customer service|financial reporting|monitoring and evaluation|business development|stakeholder management|risk management|digital marketing|public relations|human resources|supply chain|software development|quality assurance|sales management|account management)\b/g,
      ) || [];

  for (const phrase of phraseMatches) {
    counts.set(phrase, (counts.get(phrase) || 0) + 3);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 24)
    .map(([keyword]) => keyword);
}

function analyzeKeywords(
  resumeText = '',
  jobDescription = '',
  targetRole = '',
) {
  const resume = cleanText(resumeText).toLowerCase();
  const keywords = getTopKeywords(jobDescription, targetRole);

  if (!keywords.length) {
    const marketMatches = KENYA_MARKET_TERMS.filter((term) =>
      resume.includes(term),
    );
    return {
      compared: false,
      matchRate: null,
      matched: marketMatches,
      missing: [],
      keywords: [],
    };
  }

  const matched = [];
  const missing = [];
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    if (resume.includes(needle)) matched.push(keyword);
    else missing.push(keyword);
  }

  return {
    compared: true,
    matchRate: keywords.length ? matched.length / keywords.length : null,
    matched,
    missing,
    keywords,
  };
}

function getBulletLines(text = '') {
  return cleanText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^([-*•]|\d+[.)])\s+/.test(line));
}

function analyzeImpact(text = '') {
  const bullets = getBulletLines(text);
  const lower = cleanText(text).toLowerCase();
  const actionVerbHits = ACTION_VERBS.filter((verb) =>
    new RegExp(`\\b${verb}\\b`, 'i').test(lower),
  );
  const metricMatches =
    cleanText(text).match(
      /(\d+%|\b\d+[,.]?\d*\s*(ksh|kes|usd|users|clients|staff|teams|projects|days|months|years|branches|counties)\b)/gi,
    ) || [];

  return {
    bullets,
    actionVerbHits,
    metricMatches,
  };
}

function analyzeFormatting(text = '') {
  const cleaned = cleanText(text);
  const warnings = [];
  const weirdChars = cleaned.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || [];
  const linkCount = (
    cleaned.match(/https?:\/\/|www\.|linkedin\.com|github\.com/gi) || []
  ).length;
  const allCapsLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 18 && line === line.toUpperCase());

  if (weirdChars.length / Math.max(cleaned.length, 1) > 0.02) {
    warnings.push(
      'The extracted text contains unusual characters. Replace decorative symbols with plain text.',
    );
  }
  if (allCapsLines.length > 8) {
    warnings.push(
      'Too many all-caps lines can make the document harder to scan.',
    );
  }
  if (linkCount === 0) {
    warnings.push(
      'Add a LinkedIn, portfolio, or professional profile link if relevant.',
    );
  }

  return {
    warnings,
    weirdCharCount: weirdChars.length,
    linkCount,
  };
}

function buildRecommendations({
  sections,
  keywordMatch,
  impact,
  formatting,
  contact,
  counts,
}) {
  const recommendations = [];

  if (!contact.email || !contact.phone) {
    recommendations.push({
      priority: 'high',
      title: 'Make contact details easy to parse',
      detail:
        'Add a plain email address and phone number near the top of the CV.',
    });
  }

  for (const [section, present] of Object.entries(sections)) {
    if (
      !present &&
      ['summary', 'experience', 'education', 'skills'].includes(section)
    ) {
      recommendations.push({
        priority: 'high',
        title: `Add a clear ${section} section`,
        detail:
          'Use a standard section heading so ATS systems can classify your content correctly.',
      });
    }
  }

  if (keywordMatch.compared && keywordMatch.missing.length) {
    recommendations.push({
      priority: 'high',
      title: 'Add missing job advert keywords naturally',
      detail: `Prioritize: ${keywordMatch.missing.slice(0, 8).join(', ')}.`,
    });
  }

  if (impact.bullets.length < 5) {
    recommendations.push({
      priority: 'medium',
      title: 'Use more achievement bullets',
      detail:
        'Rewrite duties as concise bullets that start with strong verbs and show outcomes.',
    });
  }

  if (impact.metricMatches.length < 3) {
    recommendations.push({
      priority: 'medium',
      title: 'Quantify your results',
      detail:
        'Add numbers such as revenue, cost savings, processing time, client volume, team size, or project count.',
    });
  }

  for (const warning of formatting.warnings) {
    recommendations.push({
      priority: 'medium',
      title: 'Clean ATS formatting risk',
      detail: warning,
    });
  }

  if (counts.words < 250) {
    recommendations.push({
      priority: 'medium',
      title: 'Add enough role evidence',
      detail:
        'The document is short. Add relevant experience, projects, education, tools, and measurable achievements.',
    });
  } else if (counts.words > 1100) {
    recommendations.push({
      priority: 'low',
      title: 'Tighten the CV length',
      detail:
        'The document is long. Keep the strongest achievements and remove repeated duties.',
    });
  }

  return recommendations.slice(0, 10);
}

function buildVerdict(score) {
  if (score >= 85) return 'Excellent ATS fit';
  if (score >= 70) return 'Strong, needs targeted polish';
  if (score >= 55) return 'Usable, but missing important ATS signals';
  return 'Needs improvement before applying';
}

function analyzeResumeText({
  resumeText,
  jobDescription = '',
  targetRole = '',
  diagnostics = {},
}) {
  const text = cleanText(resumeText);
  const counts = { words: wordCount(text), characters: text.length };
  const sections = detectSections(text);
  const sectionCount = Object.values(sections).filter(Boolean).length;
  const keywordMatch = analyzeKeywords(text, jobDescription, targetRole);
  const impact = analyzeImpact(text);
  const formatting = analyzeFormatting(text);
  const contact = {
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text),
    phone:
      /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/.test(
        text,
      ),
    location:
      /\b(nairobi|mombasa|kisumu|nakuru|eldoret|kenya|remote|hybrid)\b/i.test(
        text,
      ),
    profileLink: hasAny(text, [
      /linkedin\.com/i,
      /github\.com/i,
      /portfolio/i,
      /www\./i,
      /https?:\/\//i,
    ]),
  };

  const contactScore =
    (contact.email ? 5 : 0) +
    (contact.phone ? 5 : 0) +
    (contact.location ? 3 : 0) +
    (contact.profileLink ? 2 : 0);

  const sectionScore = (sectionCount / Object.keys(sections).length) * 20;
  const keywordScore = keywordMatch.compared
    ? (keywordMatch.matchRate || 0) * 30
    : Math.min(24, 12 + keywordMatch.matched.length * 2);
  const impactScore =
    Math.min(8, impact.bullets.length) +
    Math.min(6, impact.actionVerbHits.length) +
    Math.min(6, impact.metricMatches.length * 2);
  const readabilityScore =
    (counts.words >= 250 && counts.words <= 1100
      ? 7
      : counts.words >= 180
        ? 4
        : 2) +
    (formatting.weirdCharCount / Math.max(text.length, 1) < 0.01 ? 4 : 1) +
    (formatting.warnings.length <= 1 ? 4 : 2);

  const categories = [
    scoreCategory('contact', 'Contact parsing', contactScore, 15, [
      contact.email ? 'Email detected.' : 'Email missing.',
      contact.phone ? 'Phone number detected.' : 'Phone number missing.',
      contact.profileLink
        ? 'Professional link detected.'
        : 'Professional link not detected.',
    ]),
    scoreCategory('sections', 'ATS section structure', sectionScore, 20, [
      `${sectionCount} of ${Object.keys(sections).length} common sections detected.`,
      !sections.skills && 'Add a dedicated skills section.',
      !sections.experience && 'Add a dedicated experience section.',
    ]),
    scoreCategory('keywords', 'Role keyword match', keywordScore, 30, [
      keywordMatch.compared
        ? `${keywordMatch.matched.length} of ${keywordMatch.keywords.length} target keywords matched.`
        : 'Add a job advert for deeper keyword scoring.',
    ]),
    scoreCategory('impact', 'Achievement evidence', impactScore, 20, [
      `${impact.bullets.length} bullet lines detected.`,
      `${impact.actionVerbHits.length} action verbs detected.`,
      `${impact.metricMatches.length} quantified outcomes detected.`,
    ]),
    scoreCategory(
      'formatting',
      'Readability and formatting',
      readabilityScore,
      15,
      [`${counts.words} words detected.`, ...formatting.warnings],
    ),
  ];

  const score = clamp(
    categories.reduce((sum, category) => sum + category.score, 0),
    0,
    100,
  );

  const recommendations = buildRecommendations({
    sections,
    keywordMatch,
    impact,
    formatting,
    contact,
    counts,
  });

  return {
    score,
    verdict: buildVerdict(score),
    summary:
      score >= 70
        ? 'Your CV has a solid ATS foundation. Apply the targeted fixes below to improve recruiter and system matching.'
        : 'Your CV needs clearer structure, stronger role keywords, and more measurable achievements before submission.',
    categories,
    sections,
    contact,
    keywordMatch,
    recommendations,
    document: {
      wordCount: counts.words,
      characterCount: counts.characters,
      parser: diagnostics.parser,
      extractionUsed: diagnostics.extractionUsed,
      warnings: diagnostics.warnings || [],
    },
    nextActions: [
      'Apply the highest-priority recommendations.',
      'Recheck against the exact job advert before submitting.',
      'Use an ATS-friendly template when exporting the final resume.',
    ],
  };
}

export async function analyzeAtsUpload({
  file,
  resumeText,
  jobDescription,
  targetRole,
}) {
  let text = cleanText(resumeText);
  let diagnostics = {};

  if (file?.buffer) {
    const extracted = await extractTextFromUploadedDocument({
      buffer: file.buffer,
      mimetype: file.mimetype,
      filename: file.originalname,
    });
    text = cleanText(extracted.text);
    diagnostics = extracted.diagnostics || {};
  }

  if (!text || wordCount(text) < 40) {
    const error = new Error(
      'Upload a readable PDF/DOCX resume or paste resume text with enough content.',
    );
    error.statusCode = 400;
    throw error;
  }

  return analyzeResumeText({
    resumeText: text,
    jobDescription: cleanText(jobDescription, MAX_JOB_DESCRIPTION_CHARS),
    targetRole: cleanText(targetRole, 300),
    diagnostics,
  });
}
