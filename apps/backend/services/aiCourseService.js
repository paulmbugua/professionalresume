// apps/backend/services/aiCourseService.js
import 'dotenv/config';
import crypto from 'crypto';
import OpenAI from 'openai';
import pool from '../config/db.js';
import { createRedis, ensureRedisConnected } from '../cronJobs/redisConnection.js';

// ─────────────────────────────────────────────────────────
// OpenAI + timeouts
// ─────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 20000);

// ─────────────────────────────────────────────────────────
// Redis (singleton) + JSON cache helpers
// ─────────────────────────────────────────────────────────
const redis = createRedis();
await ensureRedisConnected(redis).catch(() => {
  console.warn('[redis] not connected; caching disabled for this process');
});

export const REDIS_TTL = {
  topCourses: 60 * 5,       // 5 min
  outline:    60 * 60 * 24, // 24 h
  ssml:       60 * 60 * 24, // 24 h
  quiz:       60 * 60 * 24, // 24 h
};

export function sha1(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return crypto.createHash('sha1').update(s).digest('hex');
}

export async function cacheGetJSON(key) {
  if (!redis) return null;
  try {
    const txt = await redis.get(key);
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    console.warn('[redis] get error', e?.message);
    return null;
  }
}

export async function cacheSetJSON(key, value, ttlSec) {
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    return true;
  } catch (e) {
    console.warn('[redis] set error', e?.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// Concurrency gate (exported so controllers can wrap calls)
// ─────────────────────────────────────────────────────────
let inflight = 0;
const MAX_INFLIGHT = Number(process.env.AI_MAX_INFLIGHT || 4);

export async function withGate(fn) {
  if (inflight >= MAX_INFLIGHT) {
    const e = new Error('Server busy');
    e._serverBusy = true;
    throw e;
  }
  inflight++;
  try {
    return await fn();
  } finally {
    inflight--;
  }
}

// ─────────────────────────────────────────────────────────
// Breaker (quota/429 backoff)
// ─────────────────────────────────────────────────────────
let quotaDownUntil = 0;
function breakerActive() { return Date.now() < quotaDownUntil; }
function tripBreaker(minutes = 10) { quotaDownUntil = Date.now() + minutes * 60 * 1000; }
function fallbackNotice(reason = 'insufficient_quota') { return { degraded: true, reason }; }

// ─────────────────────────────────────────────────────────
// Error classification + timeout wrapper
// ─────────────────────────────────────────────────────────
function classifyOpenAIError(err) {
  const status =
    err?.status ||
    err?.response?.status ||
    (typeof err?.code === 'number' ? err.code : undefined);

  const headers = err?.response?.headers || err?.headers || {};
  const retryAfter =
    Number(headers['retry-after']) ||
    Number(headers['Retry-After']) ||
    undefined;

  const body = err?.body || err?.response?.data || err?.error || {};
  const bodyCode = body?.code || body?.error?.code || err?.code || '';
  const msg = String(err?.message || body?.message || body?.error?.message || '').toLowerCase();

  if (err?._isTimeoutAbort || msg.includes('timeout') || msg.includes('aborted')) {
    return { kind: 'timeout', status: status || 503, retryAfterSec: retryAfter || 5, message: 'timeout' };
  }
  if (msg.includes('fetch failed') || msg.includes('socket') || msg.includes('econnreset') || msg.includes('network')) {
    return { kind: 'network', status: status || 502, retryAfterSec: retryAfter || 10, message: 'network' };
  }
  if (status === 401 || bodyCode === 'invalid_api_key' || msg.includes('invalid api key')) {
    return { kind: 'auth', status: 401, retryAfterSec: undefined, message: 'invalid_api_key' };
  }
  if (status === 402 || bodyCode === 'insufficient_quota' || msg.includes('insufficient quota') || msg.includes('payment required') || msg.includes('billing hard limit')) {
    return { kind: 'quota', status: 402, retryAfterSec: retryAfter || 600, message: 'insufficient_quota' };
  }
  if (status === 429 || msg.includes('rate limit')) {
    return { kind: 'rate_limit', status: 429, retryAfterSec: retryAfter || 20, message: 'rate_limited' };
  }
  if (status === 400) {
    return { kind: 'bad_request', status: 400, retryAfterSec: undefined, message: 'bad_request' };
  }
  return { kind: 'unknown', status: status || 500, retryAfterSec: retryAfter, message: 'unknown' };
}

function isAbortError(e) {
  return e?.name === 'AbortError' || /aborted|abort|timeout/i.test(String(e?.message || ''));
}

async function withTimeout(promiseFactory, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await promiseFactory(ac.signal);
    clearTimeout(t);
    return res;
  } catch (e) {
    clearTimeout(t);
    if (isAbortError(e)) e._isTimeoutAbort = true;
    throw e;
  }
}

// ─────────────────────────────────────────────────────────
// SIZE presets (Mini → Bootcamp) + helpers
// ─────────────────────────────────────────────────────────
export const SIZE_PRESETS = {
  mini:       { key:'mini',       label:'Mini',       units:2,  lessonsPerUnit:3, wordsMin:400, wordsMax:550,  quizPerLesson:4, estAudioMinSec:180, estAudioMaxSec:240, ttsTargetMs:210000, para:[6,8]  },
  standard:   { key:'standard',   label:'Standard',   units:4,  lessonsPerUnit:4, wordsMin:600, wordsMax:800,  quizPerLesson:5, estAudioMinSec:300, estAudioMaxSec:420, ttsTargetMs:360000, para:[7,10] },
  extended:   { key:'extended',   label:'Extended',   units:6,  lessonsPerUnit:4, wordsMin:750, wordsMax:900,  quizPerLesson:6, estAudioMinSec:360, estAudioMaxSec:480, ttsTargetMs:420000, para:[9,12] },
  deep_dive:  { key:'deep_dive',  label:'Deep Dive',  units:8,  lessonsPerUnit:4, wordsMin:900, wordsMax:1100, quizPerLesson:7, estAudioMinSec:480, estAudioMaxSec:600, ttsTargetMs:540000, para:[11,14]},
  bootcamp:   { key:'bootcamp',   label:'Bootcamp',   units:10, lessonsPerUnit:5, wordsMin:900, wordsMax:1200, quizPerLesson:7, estAudioMinSec:480, estAudioMaxSec:600, ttsTargetMs:540000, para:[12,16]},
};

export function totalLessonsOf(preset) { return preset.units * preset.lessonsPerUnit; }
export function defaultTargetMinutesOf(preset) {
  const avgSec = (preset.estAudioMinSec + preset.estAudioMaxSec) / 2;
  return Math.round((totalLessonsOf(preset) * avgSec) / 60);
}

export async function resolveCourseSize({ courseId, bodyCourseSize }) {
  if (bodyCourseSize && SIZE_PRESETS[bodyCourseSize]) return SIZE_PRESETS[bodyCourseSize];
  if (courseId) {
    const r = await pool.query(`SELECT course_size FROM courses WHERE id = $1`, [courseId]);
    const key = r.rows?.[0]?.course_size;
    if (key && SIZE_PRESETS[key]) return SIZE_PRESETS[key];
  }
  return SIZE_PRESETS.standard;
}

// ─────────────────────────────────────────────────────────
// SSML sanitizer (unchanged from your controller)
// ─────────────────────────────────────────────────────────
export function sanitizeSsml(ssml, lessonId = 'L1', voiceFallback = 'en-US-JennyNeural') {
  if (!ssml) return ssml;

  const TRANSITION_RE = /^(?:First,|Next,|Now,|For example,|However,|Then,|Finally,|In short,)\s*/i;
  const normQuotes = (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const stripOuter = (t) =>
    t.replace(/<\/?speak[^>]*>/gi, '')
     .replace(/<\/?voice[^>]*>/gi, '')
     .replace(/<\/?prosody[^>]*>/gi, '')
     .replace(/<\/?p[^>]*>/gi, ' ')
     .trim();

  function splitIntoSentences(raw) {
    const keepBookmarks = raw.replace(/<\s*\/?\s*bookmark[^>]*>/gi, (m) => m);
    const chunks = keepBookmarks
      .split(/(?=<bookmark\s+mark=)/i)
      .flatMap((chunk) =>
        chunk.trim().split(/(?<=[.?!])\s+/).map((s) => s.trim())
      )
      .filter(Boolean);

    const out = [];
    for (let i = 0; i < chunks.length; i++) {
      const s = chunks[i];
      if (/^<bookmark\s+mark=/i.test(s)) {
        const bm = (s.match(/^<bookmark[^>]*\/>/i) || [''])[0];
        const rest = s.replace(/^<bookmark[^>]*\/>/i, '').trim();
        if (rest) out.push(bm + ' ' + rest);
        else if (i + 1 < chunks.length) out.push(bm + ' ' + chunks[++i]);
        else out.push(bm);
      } else {
        out.push(s);
      }
    }
    return out
      .map((s) => (/[.?!]$/.test(s) ? s : s + '.'))
      .map((s) =>
        s.replace(/\s+([.,!?;:])/g, '$1')
         .replace(/\s{2,}/g, ' ')
         .trim()
      );
  }

  const stripLeadTransition = (s) => s.replace(TRANSITION_RE, '').trim();
  const coreOf = (s) =>
    normQuotes(s)
      .replace(/^<bookmark[^>]*\/>/i, '')
      .replace(TRANSITION_RE, '')
      .toLowerCase()
      .replace(/['"“”‘’]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  function ensureBookmark(sentence) {
    if (/^<bookmark\s+mark=/i.test(sentence)) return sentence;
    return `<bookmark mark="${lessonId}.S0"/> ${sentence}`;
  }

  const inner = normQuotes(stripOuter(ssml));
  let sentences = splitIntoSentences(inner).map((s) => s.trim());

  sentences = sentences.map((s) => {
    s = ensureBookmark(s);
    const bm = s.match(/^<bookmark[^>]*\/>/i)?.[0] || '';
    const rest = s.replace(/^<bookmark[^>]*\/>/i, '').trim();
    const cleaned = stripLeadTransition(rest);
    return `${bm} ${cleaned}`.replace(/\s{2,}/g, ' ').trim();
  });

  const seen = new Map();
  const deduped = [];
  for (const s of sentences) {
    const core = coreOf(s);
    if (!core) continue;
    if (!seen.has(core)) {
      seen.set(core, s);
      deduped.push(s);
    } else {
      const prev = seen.get(core);
      if (s.length > prev.length) {
        const idx = deduped.indexOf(prev);
        if (idx !== -1) deduped[idx] = s;
        seen.set(core, s);
      }
    }
  }

  const reindexed = deduped.map((s, i) =>
    s.replace(/^<bookmark\s+mark="[^"]*"\s*\/>/i, `<bookmark mark="${lessonId}.S${i + 1}"/>`)
  );

  const body = reindexed
    .map((s) => `<p>${s}</p>\n<break time="300ms"/>`)
    .join('\n      ');

  const voiceMatch = ssml.match(/<voice[^>]*name="([^"]+)"[^>]*>/i);
  const voiceName = voiceMatch?.[1] || voiceFallback || 'en-US-JennyNeural';

  return `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
      ${body}
    </prosody>
  </voice>
</speak>`.trim();
}

// ─────────────────────────────────────────────────────────
// OpenAI JSON helper
// ─────────────────────────────────────────────────────────
export async function aiJson({ system, user, temperature = 0.2, tries = 1, maxTokens }) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const content = await withTimeout(async (signal) => {
        const r = await openai.chat.completions.create(
          {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            response_format: { type: 'json_object' },
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          },
          { signal }
        );
        return r.choices?.[0]?.message?.content || '{}';
      }, OPENAI_REQUEST_TIMEOUT_MS);

      try { return JSON.parse(content); }
      catch { if (i === tries - 1) return {}; }
    } catch (e) {
      const c = classifyOpenAIError(e);
      e.aiKind = c.kind;
      e.retryAfterSec = c.retryAfterSec;
      e.status = c.status;
      lastErr = e;

      if (i < tries - 1 && (c.kind === 'rate_limit' || c.kind === 'network' || c.kind === 'timeout')) {
        await new Promise((r) => setTimeout(r, Math.min(2000, (c.retryAfterSec || 1) * 1000)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('OpenAI request failed');
}

// ─────────────────────────────────────────────────────────
// Teachability scoring (for listTopCourses)
// ─────────────────────────────────────────────────────────
const AI_POSITIVE_KEYWORDS = [
  'algebra','fractions','decimals','statistics','probability','calculus','linear algebra','discrete math',
  'physics','mechanics','motion','forces','thermodynamics','optics',
  'chemistry','stoichiometry','periodic table','reactions','equilibrium',
  'biology','cells','genetics','evolution',
  'computer science','data structures','algorithms','time complexity','python','javascript','typescript',
  'react','node','graphql','sql','docker','kubernetes','cloud fundamentals','git',
  'ml','machine learning','deep learning','pytorch','computer vision','nlp','rag','prompt engineering',
  'grammar','writing','composition','german a1','kiswahili','vocabulary',
  'time series','quant','forecasting',
];
const AI_NEGATIVE_KEYWORDS = [
  'wet lab','dissection','welding','soldering','cpr','first aid','surgery','flight',
  'driving','pharmacology','clinical','radiology',
  'oil painting','dance','sculpture','photography studio','fine art portfolio',
  'penetration testing','red team','exploit development'
];
function aiTeachabilityScore(title = '', description = '', syllabusJson = null) {
  const text = [
    title || '',
    description || '',
    Array.isArray(syllabusJson)
      ? syllabusJson.map(s => [s?.topic, s?.assignment].filter(Boolean).join(' ')).join(' ')
      : '',
  ].join(' ').toLowerCase();
  let score = 0;
  for (const k of AI_POSITIVE_KEYWORDS) { if (text.includes(k)) score += 2; }
  score = Math.min(score, 30);
  for (const k of AI_NEGATIVE_KEYWORDS) { if (text.includes(k)) score -= 5; }
  if (Array.isArray(syllabusJson) && syllabusJson.length >= 3) score += 3;
  return score;
}

// ─────────────────────────────────────────────────────────
// Service methods (used by controllers)
// Each returns { status, data, headers }
// ─────────────────────────────────────────────────────────
export async function listTopCoursesService({ aiOnly = false, limit = 50, offset = 0 }) {
  const cacheKey = `ai:topCourses:aiOnly=${aiOnly}:limit=${limit}:offset=${offset}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached) {
    return { status: 200, data: cached, headers: { 'X-Cache': 'HIT', 'X-Offset': String(offset), 'X-Limit': String(limit) } };
  }

  const q = await pool.query(`
    SELECT id, title, description, syllabus, avg_rating, ratings_count
      FROM courses
     ORDER BY
       (avg_rating IS NULL) ASC, avg_rating DESC,
       (ratings_count IS NULL) ASC, ratings_count DESC,
       created_at DESC NULLS LAST
     LIMIT 1000
  `);

  const rows = q.rows || [];
  const scoredAll = rows
    .map((r) => {
      const s = aiTeachabilityScore(r.title, r.description, r.syllabus);
      return {
        id: r.id,
        title: r.title,
        blurb: r.description || '',
        rating: Number(r.avg_rating ?? 0),
        reviews: Number(r.ratings_count ?? 0),
        _score: s,
      };
    })
    .filter((r) => (aiOnly ? r._score > 0 : true))
    .sort((a, b) => (b._score - a._score) || (b.rating - a.rating) || (b.reviews - a.reviews));

  const slice = scoredAll.slice(offset, offset + limit).map(({ _score, ...rest }) => rest);
  await cacheSetJSON(cacheKey, slice, REDIS_TTL.topCourses);

  return {
    status: 200,
    data: slice,
    headers: {
      'X-Cache': 'MISS',
      'X-Total-Ranked': String(scoredAll.length),
      'X-Offset': String(offset),
      'X-Limit': String(limit),
      'X-Has-More': String(offset + slice.length < scoredAll.length),
    },
  };
}

export function makeFallbackOutline(title = 'Your Topic') {
  const topics = [
    'Introduction & outcomes',
    'Core concepts',
    'Worked examples',
    'Common pitfalls',
    'Mini project & recap',
  ];
  return topics.map((t, i) => ({
    id: `w${i + 1}`,
    title: `${t} — ${title}`,
    keyPoints: [
      `Overview of ${title} (${t.toLowerCase()}).`,
      `When/why ${title} matters.`,
      `Simple, actionable steps.`,
    ],
  }));
}

export function makeFallbackQuiz(title = 'Your Topic', outline = [], num = 6) {
  const base = outline?.length ? outline : makeFallbackOutline(title);
  return base.slice(0, num).map((s, i) => ({
    id: `q${i + 1}`,
    prompt: `Which statement is TRUE about "${s.title}" in ${title}?`,
    choices: [
      `It correctly introduces a key idea in ${title}.`,
      'It is unrelated to the course.',
      'It contradicts the learning goals.',
      'It belongs to a different course.',
    ],
    answerIndex: 0,
  }));
}

export async function generateOutlineService({ courseId, title, level, targetMinutes, courseSize }) {
  // Load DB meta
  let courseTitle = title || 'Untitled Course';
  let courseDesc = '';
  if (courseId) {
    const cq = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
    if (cq.rowCount) {
      courseTitle = cq.rows[0].title || courseTitle;
      courseDesc  = cq.rows[0].description || '';
    }
  }

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize });
  const totalLessons = totalLessonsOf(preset);
  const target = Number.isFinite(Number(targetMinutes)) && Number(targetMinutes) > 0
    ? Number(targetMinutes)
    : defaultTargetMinutesOf(preset);

  const cacheKey = `ai:outline:${courseId || 't:' + sha1(courseTitle)}:size=${preset.key}:lvl=${level}:lessons=${totalLessons}:min=${target}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.outline?.length) {
    return { status: 200, data: { outline: cached.outline }, headers: { 'X-Cache': 'HIT' } };
  }

  if (breakerActive()) {
    return {
      status: 503,
      data: { outline: makeFallbackOutline(courseTitle).slice(0, totalLessons), notice: fallbackNotice('breaker_active') },
      headers: { 'Retry-After': '600' },
    };
  }

  try {
    const json = await aiJson({
      system: `You are an instructional designer. Output JSON:
{
  "outline":[
    {"id":"w1","title":"...","keyPoints":["...","..."]},
    ...
  ]
}
Level: ${level || 'beginner'}.
Create EXACTLY ${totalLessons} sections (one per lesson) for a course of ~${target} minutes total.
Each section: short, clear title + 3–5 concrete, assessable key points.`,
      user: `Course: ${courseTitle}
Description: ${courseDesc}
Keep it crisp, practical, testable.`,
      temperature: 0.3,
      maxTokens: 1200,
    });

    let outline = Array.isArray(json.outline) ? json.outline : [];
    if (!outline.length) {
      return { status: 502, data: { error: 'AI returned an empty outline' }, headers: {} };
    }
    outline = outline.slice(0, totalLessons);

    await cacheSetJSON(cacheKey, { outline }, REDIS_TTL.outline);
    return { status: 200, data: { outline }, headers: { 'X-Cache': 'MISS' } };
  } catch (err) {
    const c = classifyOpenAIError(err);
    if (c.kind === 'quota') { tripBreaker(10); return { status: 503, data: { outline: makeFallbackOutline(courseTitle).slice(0, totalLessons), notice: fallbackNotice('insufficient_quota') }, headers: { 'Retry-After': String(c.retryAfterSec || 600) } }; }
    if (c.kind === 'rate_limit') { return { status: 503, data: { outline: makeFallbackOutline(courseTitle).slice(0, totalLessons), notice: fallbackNotice('rate_limited') }, headers: { 'Retry-After': String(c.retryAfterSec || 20) } }; }
    if (c.kind === 'auth') { return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} }; }
    if (c.kind === 'timeout') { return { status: 503, data: { error: 'AI service timeout. Please try again.' }, headers: { 'Retry-After': '5' } }; }
    if (c.kind === 'network') { return { status: 503, data: { error: 'AI network error. Please retry shortly.' }, headers: { 'Retry-After': '10' } }; }
    throw err;
  }
}

export async function generateLessonSSMLService({ courseId, outline, voiceName, courseSize, count }) {
  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  if (!cq.rowCount) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = cq.rows[0].title || 'Course';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize });
  const [paraMin, paraMax] = preset.para;

  const takeCount = Number.isFinite(Number(count)) && Number(count) > 0
    ? Math.min(Math.max(Number(count), 1), outline.length)
    : outline.length;
  const outlineSlice = outline.slice(0, takeCount);

  const outlineHash = sha1(outlineSlice);
  const cacheKey = `ai:ssml:lessons:${courseId}:size=${preset.key}:voice=${voiceName}:ol=${outlineHash}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.lessons?.length) {
    return { status: 200, data: cached, headers: { 'X-Cache': 'HIT' } };
  }

  const scaffoldFromOutline = () => {
    const lessons = outlineSlice.map((o, idx) => {
      const title = o?.title || `Lesson ${idx + 1}`;
      const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];
      const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
      <p><bookmark mark="L${idx + 1}.S1"/>Welcome to ${title} in ${courseTitle}.</p>
      ${kp.map((k, i) => `      <p><bookmark mark="L${idx + 1}.S${i + 2}"/>Key point: ${k}</p>`).join('\n')}
      <break time="1200ms"/>
      <p><bookmark mark="L${idx + 1}.S9"/>This concludes ${title}. In the next lesson, we'll continue.</p>
    </prosody>
  </voice>
</speak>`.trim();
      return { id: `L${idx + 1}`, title, goals: kp, ssml, estSeconds: Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2) };
    });
    const joinedSsml = lessons
      .map((l, i) => (i === 0 ? l.ssml : l.ssml.replace(/<\/speak>\s*$/i, `<p><break time="2000ms"/></p></prosody></voice></speak>`)))
      .join('\n\n');
    return { lessons, joinedSsml };
  };

  if (breakerActive()) {
    const pack = scaffoldFromOutline();
    return { status: 503, data: { ...pack, notice: fallbackNotice('breaker_active') }, headers: { 'Retry-After': '600' } };
  }

  try {
    const outlineStr = outlineSlice.map((o, i) => `Section ${i + 1}: ${o.title} — ${o.keyPoints?.join('; ') || ''}`).join('\n');
    const json = await aiJson({
      system: `You are a master teacher writing **natural** SSML for narrated lessons.
Return JSON EXACTLY:
{
  "lessons": [
    {"id":"L1","title":"string","goals":["string"],"estSeconds":60,"ssml":"<speak ...>...</speak>"}
  ]
}
Rules:
- Each <p> has 1–2 short sentences (≤ 140 chars), conversational and clear.
- No boilerplate transitions ("First,", "Next,", "For example,", "However,", "Then,", "Finally,", "In short,").
- Present tense; no lists; no code fences; proper punctuation.
- Insert <bookmark mark="L{index}.S{n}"/> at the start of every <p>.
- Produce ${paraMin}–${paraMax} paragraphs per lesson (fits a ${preset.label} course).
- Wrap Azure SSML exactly:
  <speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="0%" pitch="+0st"> ... </prosody></voice></speak>`,
      user: `Course: ${courseTitle}
Sections:
${outlineStr}
Write one self-contained lesson per section with hook, goals, concepts, example, pitfall, micro-check, and recap.`,
      temperature: 0.35,
    });

    const lessonsRaw = Array.isArray(json?.lessons) ? json.lessons : [];
    const lessons = (Array.isArray(lessonsRaw) ? lessonsRaw : [])
      .map((l, idx) => {
        const id = l?.id || `L${idx + 1}`;
        const title = String(l?.title || outlineSlice[idx]?.title || `Lesson ${idx + 1}`);
        const goals = Array.isArray(l?.goals) ? l.goals.slice(0, 6) : [];
        const estSeconds = Number(l?.estSeconds || Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2));
        let ssml = String(l?.ssml || '');
        const hasSpeak = /^\s*<speak[\s>]/i.test(ssml);
        if (!hasSpeak) {
          ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
${ssml}
    </prosody>
  </voice>
</speak>`.trim();
        }
        if (!/<bookmark\s+mark=/.test(ssml)) {
          ssml = ssml.replace(/<prosody[^>]*>/i, (m) => `${m}\n      <p><bookmark mark="${id}.S1"/>${title}</p>\n      <break time="400ms"/>`);
        }
        ssml = sanitizeSsml(ssml, id);
        return { id, title, goals, ssml: ssml.trim(), estSeconds };
      })
      .filter((l) => l?.ssml && l?.title);

    if (!lessons.length) {
      const pack = scaffoldFromOutline();
      return { status: 502, data: { ...pack, notice: { degraded: true, reason: 'ai_empty_lessons' } }, headers: {} };
    }

    const joinedSsml = lessons
      .map((l, i) => (i === 0 ? l.ssml : l.ssml.replace(/<\/speak>\s*$/i, `<p><break time="2500ms"/></p></prosody></voice></speak>`)))
      .join('\n\n');

    const payload = { lessons, joinedSsml };
    await cacheSetJSON(cacheKey, payload, REDIS_TTL.ssml);
    return { status: 200, data: payload, headers: { 'X-Cache': 'MISS' } };
  } catch (err) {
    const c = classifyOpenAIError(err);
    if (c.kind === 'quota') { tripBreaker(10); const pack = scaffoldFromOutline(); return { status: 503, data: { ...pack, notice: fallbackNotice('insufficient_quota') }, headers: { 'Retry-After': String(c.retryAfterSec || 600) } }; }
    if (c.kind === 'rate_limit') { const pack = scaffoldFromOutline(); return { status: 503, data: { ...pack, notice: fallbackNotice('rate_limited') }, headers: { 'Retry-After': String(c.retryAfterSec || 20) } }; }
    if (c.kind === 'auth') { return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} }; }
    if (c.kind === 'timeout') { return { status: 503, data: { error: 'AI service timeout. Please try again.' }, headers: { 'Retry-After': '5' } }; }
    if (c.kind === 'network') { return { status: 503, data: { error: 'AI network error. Please retry shortly.' }, headers: { 'Retry-After': '10' } }; }
    throw err;
  }
}

export async function generateQuizService({ courseId, outline, numQuestions, courseSize }) {
  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  if (!cq.rowCount) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = cq.rows[0].title || 'Course';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize });
  const perLesson = preset.quizPerLesson;
  const desired = (Array.isArray(outline) ? outline.length : 0) * perLesson;
  const n = Number.isFinite(Number(numQuestions)) && Number(numQuestions) > 0 ? Number(numQuestions) : Math.max(6, Math.min(40, desired));

  const olHash = sha1(outline);
  const cacheKey = `ai:quiz:${courseId}:size=${preset.key}:n=${n}:ol=${olHash}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.quiz?.questions?.length) {
    return { status: 200, data: { quiz: cached.quiz }, headers: { 'X-Cache': 'HIT' } };
  }

  if (breakerActive()) {
    const qs = makeFallbackQuiz(courseTitle, outline, n);
    return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('breaker_active') }, headers: { 'Retry-After': '600' } };
  }

  try {
    const json = await aiJson({
      system: `Create a multiple-choice quiz JSON:
{
  "questions":[
    {"id":"q1","prompt":"...","choices":["A","B","C","D"],"answerIndex":1},
    ...
  ]
}
Exactly ${n} questions. One correct answer each. Prompts unambiguous. Choices concise.`,
      user: `Course: ${courseTitle}
Key sections:
${outline.map((o) => `- ${o.title}: ${(o.keyPoints || []).join(', ')}`).join('\n')}
Test only the most important points.`,
      temperature: 0.2,
      maxTokens: 1000,
    });

    const quiz = { questions: Array.isArray(json.questions) ? json.questions : [] };
    if (!quiz.questions.length) {
      return { status: 502, data: { error: 'AI returned an empty quiz' }, headers: {} };
    }
    await cacheSetJSON(cacheKey, { quiz }, REDIS_TTL.quiz);
    return { status: 200, data: { quiz }, headers: { 'X-Cache': 'MISS' } };
  } catch (err) {
    const c = classifyOpenAIError(err);
    if (c.kind === 'quota') { tripBreaker(10); const qs = makeFallbackQuiz(courseTitle, outline, n); return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('insufficient_quota') }, headers: { 'Retry-After': String(c.retryAfterSec || 600) } }; }
    if (c.kind === 'rate_limit') { const qs = makeFallbackQuiz(courseTitle, outline, n); return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('rate_limited') }, headers: { 'Retry-After': String(c.retryAfterSec || 20) } }; }
    if (c.kind === 'auth') { return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} }; }
    if (c.kind === 'timeout') { return { status: 503, data: { error: 'AI service timeout. Please try again.' }, headers: { 'Retry-After': '5' } }; }
    if (c.kind === 'network') { return { status: 503, data: { error: 'AI network error. Please retry shortly.' }, headers: { 'Retry-After': '10' } }; }
    throw err;
  }
}

export async function generateCoursePackageService({ courseId, level = 'beginner', targetMinutes, voiceName = 'en-US-JennyNeural', numQuestions, courseSize }) {
  const { rows } = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
  if (!rows?.length) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = rows[0].title || 'Course';
  const courseDesc  = rows[0].description || '';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize });
  const effectiveTarget = Number.isFinite(Number(targetMinutes)) && Number(targetMinutes) > 0
    ? Number(targetMinutes)
    : defaultTargetMinutesOf(preset);

  // Outline
  let outline, outlineResp = await generateOutlineService({ courseId, title: courseTitle, level, targetMinutes: effectiveTarget, courseSize });
  if (outlineResp.status === 200) outline = outlineResp.data.outline;
  else if (outlineResp.data?.outline) outline = outlineResp.data.outline;
  else outline = makeFallbackOutline(courseTitle).slice(0, totalLessonsOf(preset));

  // Lessons
  const lessonsResp = await generateLessonSSMLService({ courseId, outline, voiceName, courseSize });
  const lessons = lessonsResp.data?.lessons || [];
  const joinedSsml = lessonsResp.data?.joinedSsml || '';

  // Quiz
  const quizResp = await generateQuizService({
    courseId,
    outline,
    numQuestions: numQuestions ?? (outline.length * preset.quizPerLesson),
    courseSize,
  });
  const quiz = quizResp.data?.quiz || { questions: makeFallbackQuiz(courseTitle, outline, 8) };

  const anyDegraded = [outlineResp.status, lessonsResp.status, quizResp.status].some((s) => s && s !== 200);
  const notice = anyDegraded ? fallbackNotice('degraded_generation') : undefined;

  return { status: anyDegraded ? 206 : 200, data: { outline, lessons, joinedSsml, quiz, notice }, headers: {} };
}
