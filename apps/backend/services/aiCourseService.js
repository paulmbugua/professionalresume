// apps/backend/services/aiCourseService.js
import 'dotenv/config';
import crypto from 'crypto';
import OpenAI from 'openai';
import pool from '../config/db.js';
import { createRedis, ensureRedisConnected } from '../cronJobs/redisConnection.js';

/* ─────────────────────────────────────────────────────────
 * Logging helpers
 * ───────────────────────────────────────────────────────── */
const DEBUG_AI = String(process.env.DEBUG_AI || '').trim() === '1';
const LOG_NS = 'aiSvc';
function log(level, scope, msg, data) {
  const fn = (console[level] || console.log).bind(console);
  if (data !== undefined) fn(`[${LOG_NS}:${scope}] ${msg}`, data);
  else fn(`[${LOG_NS}:${scope}] ${msg}`);
}
const dlog = (scope, msg, data) => { if (DEBUG_AI) log('log', scope, msg, data); };

/* ─────────────────────────────────────────────────────────
 * OpenAI + timeouts
 * ───────────────────────────────────────────────────────── */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 60000);

/* ─────────────────────────────────────────────────────────
 * Redis (singleton) + JSON cache helpers
 * ───────────────────────────────────────────────────────── */
const redis = createRedis();
await ensureRedisConnected(redis).then(
  () => dlog('redis', 'connected')
).catch(() => {
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
    const hit = Boolean(txt);
    dlog('cache', `GET ${hit ? 'HIT' : 'MISS'} ${key}`);
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
    dlog('cache', `SET ok ${key}`, { ttlSec });
    return true;
  } catch (e) {
    console.warn('[redis] set error', e?.message);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────
 * Concurrency gate (exported so controllers can wrap calls)
 * ───────────────────────────────────────────────────────── */
let inflight = 0;
const MAX_INFLIGHT = Number(process.env.AI_MAX_INFLIGHT || 4);

export async function withGate(fn) {
  if (inflight >= MAX_INFLIGHT) {
    dlog('gate', `reject: inflight=${inflight}, max=${MAX_INFLIGHT}`);
    const e = new Error('Server busy');
    e._serverBusy = true;
    throw e;
  }
  inflight++;
  dlog('gate', `enter: inflight=${inflight}`);
  try {
    return await fn();
  } finally {
    inflight--;
    dlog('gate', `exit: inflight=${inflight}`);
  }
}

/* ─────────────────────────────────────────────────────────
 * Breaker (quota/429 backoff)
 * ───────────────────────────────────────────────────────── */
let quotaDownUntil = 0;
function breakerActive() { return Date.now() < quotaDownUntil; }
function tripBreaker(minutes = 10) {
  quotaDownUntil = Date.now() + minutes * 60 * 1000;
  console.warn(`[${LOG_NS}:breaker] tripped for ~${minutes} minutes`);
}
function fallbackNotice(reason = 'insufficient_quota') { return { degraded: true, reason }; }

/* ─────────────────────────────────────────────────────────
 * Error classification + timeout wrapper
 * ───────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────
 * SIZE presets (Mini → Bootcamp) + helpers
 * ───────────────────────────────────────────────────────── */
// Strict JSON schema for lessons + notes (markdown / formulas / tables)
export const LESSON_PACK_SCHEMA = {
  name: 'LessonPack',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      lessons: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id:         { type: 'string' },
            title:      { type: 'string' },
            goals:      { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string' } },
            estSeconds: { type: 'integer', minimum: 30, maximum: 1800 },
            ssml:       { type: 'string' },

            // Notes panel (always present but can be empty)
            markdown:   { type: 'string' },

            // Formulas (always present but can be empty array)
            formulas: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id:      { type: 'string' },
                  latex:   { type: 'string' },
                  // Keep the set tight so the model doesn't invent odd values
                  speakAs: { type: 'string', enum: ['math', 'spell-out', 'characters', 'none'] }
                },
                // IMPORTANT: strict mode requires listing every key in properties here
                required: ['id','latex','speakAs']
              }
            },

            // Tables (always present but can be empty array)
            tables: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title:   { type: 'string' },
                  columns: { type: 'array', minItems: 1, items: { type: 'string' } },
                  rows:    {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'array',
                      items: { anyOf: [ { type: 'string' }, { type: 'number' } ] }
                    }
                  }
                },
                required: ['title','columns','rows']
              }
            }
          },
          // IMPORTANT: strict mode requires listing ALL keys here
          required: ['id','title','goals','estSeconds','ssml','markdown','formulas','tables']
        }
      }
    },
    required: ['lessons']
  },
  strict: true
};

/* NEW: Strict JSON schema for quiz */
export const QUIZ_SCHEMA = {
  name: 'QuizPack',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            prompt: { type: 'string' },
            choices: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' }
            },
            answerIndex: { type: 'integer', minimum: 0, maximum: 3 }
          },
          required: ['id','prompt','choices','answerIndex']
        }
      }
    },
    required: ['questions']
  },
  strict: true
};

export const SIZE_PRESETS = {
  mini:       { key:'mini',       label:'Mini',       units:2,  lessonsPerUnit:3, wordsMin:450, wordsMax:550,  quizPerLesson:4, estAudioMinSec:180, estAudioMaxSec:240, ttsTargetMs:210000, para:[6,8]  },
  standard:   { key:'standard',   label:'Standard',   units:4,  lessonsPerUnit:4, wordsMin:650, wordsMax:800,  quizPerLesson:5, estAudioMinSec:300, estAudioMaxSec:420, ttsTargetMs:360000, para:[7,10] },
  extended:   { key:'extended',   label:'Extended',   units:6,  lessonsPerUnit:4, wordsMin:800, wordsMax:900,  quizPerLesson:6, estAudioMinSec:360, estAudioMaxSec:480, ttsTargetMs:420000, para:[9,12] },
  deep_dive:  { key:'deep_dive',  label:'Deep Dive',  units:8,  lessonsPerUnit:4, wordsMin:900, wordsMax:1100, quizPerLesson:7, estAudioMinSec:480, estAudioMaxSec:600, ttsTargetMs:540000, para:[11,14]},
  bootcamp:   { key:'bootcamp',   label:'Bootcamp',   units:10, lessonsPerUnit:5, wordsMin:1000, wordsMax:1200, quizPerLesson:7, estAudioMinSec:480, estAudioMaxSec:600, ttsTargetMs:540000, para:[12,16]},
};

export const PROGRAM_TRACKS = {
  module:      { key: 'module',      label: 'Module',      lessons: 8,   estTotalMinutes: 90  },
  certificate: { key: 'certificate', label: 'Certificate', lessons: 20,  estTotalMinutes: 300 },
  diploma:     { key: 'diploma',     label: 'Diploma',     lessons: 60,  estTotalMinutes: 900 },
  degree:      { key: 'degree',      label: 'Degree',      lessons: 120, estTotalMinutes: 1800 },
};

export function lessonsForTrack(trackKey) {
  const k = (trackKey || '').toLowerCase();
  return PROGRAM_TRACKS[k]?.lessons || undefined;
}

// Per-size pacing: slower + longer breaks for larger courses
const PACE_PRESETS = {
  mini:      { ratePct: '-5%',  paraBreakMs: 450, sectionBreakMs: 2000 },
  standard:  { ratePct: '-7%',  paraBreakMs: 500, sectionBreakMs: 2500 },
  extended:  { ratePct: '-8%',  paraBreakMs: 550, sectionBreakMs: 2750 },
  deep_dive: { ratePct: '-10%', paraBreakMs: 600, sectionBreakMs: 3000 },
  bootcamp:  { ratePct: '-12%', paraBreakMs: 650, sectionBreakMs: 3200 },
};
function paceFor(sizeKey) {
  return PACE_PRESETS[sizeKey] || PACE_PRESETS.standard;
}

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

/* ─────────────────────────────────────────────────────────
 * SSML sanitizer (unchanged from your controller)
 * ───────────────────────────────────────────────────────── */
export function sanitizeSsml(
  ssml,
  lessonId = 'L1',
  voiceFallback = 'en-US-JennyNeural',
  opts = { ratePct: '-10%', breakMs: 500, sentencesPerPara: 2 }
)  {
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

  const breakMs = Number(opts?.breakMs ?? 300);
  const perPara = Math.max(1, Math.min(3, Number(opts?.sentencesPerPara ?? 2)));

  const paras = [];
  for (let i = 0; i < reindexed.length; i += perPara) {
    const chunk = reindexed.slice(i, i + perPara);
    if (!chunk.length) continue;
    const first = chunk[0]; // keep the <bookmark/> at the start of the paragraph
    const restJoined = chunk
      .slice(1)
      // strip any bookmark at the start of subsequent sentences in the same paragraph
      .map((s) => s.replace(/^<bookmark[^>]*\/>\s*/i, ''))
      .join(' ');
    paras.push(`<p>${[first, restJoined].filter(Boolean).join(' ')}</p>\n<break time="${breakMs}ms"/>`);
  }
  const body = paras.join('\n      ');

  const voiceMatch = ssml.match(/<voice[^>]*name="([^"]+)"[^>]*>/i);
  const voiceName = voiceMatch?.[1] || voiceFallback || 'en-US-JennyNeural';

  return `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${opts?.ratePct ?? '0%'}" pitch="+0st">
      ${body}
    </prosody>
  </voice>
</speak>`.trim();
}

/* ─────────────────────────────────────────────────────────
 * OpenAI JSON helper (now supports JSON Schema)
 * ───────────────────────────────────────────────────────── */
export async function aiJson({ system, user, temperature = 0.2, tries = 3, maxTokens, schema }) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const t0 = Date.now();
    try {
      dlog('openai', `request try=${i + 1} temp=${temperature} maxTokens=${maxTokens || 'default'} schema=${!!schema}`);

      const content = await withTimeout(async (signal) => {
        // Build response_format
        let responseFormat;
        if (schema && typeof schema === 'object' && schema.name && schema.schema) {
          responseFormat = {
            type: 'json_schema',
            json_schema: {
              name: schema.name,
              schema: schema.schema,
              strict: schema.strict !== undefined ? !!schema.strict : true,
            },
          };
        } else if (schema) {
          console.warn(`[${LOG_NS}:openai] schema provided but missing {name, schema}; falling back to json_object`);
          responseFormat = { type: 'json_object' };
        } else {
          responseFormat = { type: 'json_object' };
        }

        const r = await openai.chat.completions.create(
          {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature,
            messages: [
              { role: 'system', content: system },
              { role: 'user',   content: user   },
            ],
            response_format: responseFormat,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          },
          { signal }
        );

        return r.choices?.[0]?.message?.content || '{}';
      }, OPENAI_REQUEST_TIMEOUT_MS);

      const ms = Date.now() - t0;
      dlog('openai', `response ok in ${ms}ms`);

      try {
        return JSON.parse(content);
      } catch (e) {
        console.warn(`[${LOG_NS}:openai] JSON.parse failed`, { message: String(e?.message || e) });
        if (i === tries - 1) return {};
      }
    } catch (e) {
      const c = classifyOpenAIError(e);
      e.aiKind = c.kind;
      e.retryAfterSec = c.retryAfterSec;
      e.status = c.status;
      lastErr = e;

      console.warn(
        `[${LOG_NS}:openai] error`,
        { kind: c.kind, status: c.status, retryAfterSec: c.retryAfterSec, msg: e?.message }
      );
      if (i < tries - 1 && (c.kind === 'rate_limit' || c.kind === 'network' || c.kind === 'timeout')) {
        const backoffMs = Math.min(2000, (c.retryAfterSec || 1) * 1000);
        dlog('openai', `retrying after ${backoffMs}ms`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('OpenAI request failed');
}

export async function cacheDeleteByPattern(pattern, { batch = 1000, useUnlink = true } = {}) {
  if (!redis) {
    console.warn('[redis] delete skipped (no client)');
    return 0;
  }

  let cursor = '0';
  let removed = 0;

  const doBulk = async (keys) => {
    if (!keys.length) return 0;

    // Prefer UNLINK (non-blocking) if available, fall back to DEL.
    const hasUnlink = useUnlink && typeof redis.unlink === 'function';
    try {
      const n = hasUnlink
        ? await redis.unlink(...keys)
        : await redis.del(...keys);
      return Number(n) || 0;
    } catch (e) {
      // Cluster/cross-slot or arg length? Fall back to per-key pipeline.
      const pipe = redis.multi();
      for (const k of keys) {
        if (hasUnlink) pipe.unlink(k); else pipe.del(k);
      }
      const res = await pipe.exec();
      // res is [[err, val], [err, val], ...] in ioredis; node-redis returns just vals
      if (Array.isArray(res)) {
        return res.reduce((acc, item) => {
          if (Array.isArray(item)) {
            const [err, val] = item;
            return acc + (err ? 0 : (Number(val) || 0));
          }
          return acc + (Number(item) || 0);
        }, 0);
      }
      return 0;
    }
  };

  do {
    // ioredis & node-redis both support raw SCAN with MATCH/COUNT
    const scanRes = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', String(batch));
    const nextCursor = Array.isArray(scanRes) ? scanRes[0] : '0';
    const keys       = Array.isArray(scanRes) ? scanRes[1] : [];

    if (keys && keys.length) {
      removed += await doBulk(keys);
    }
    cursor = nextCursor;
  } while (cursor !== '0');

  dlog('cache', `DELETE pattern="${pattern}" removed=${removed}`);
  return removed;
}

export async function cacheBustCourse(courseId) {
  const total =
    (await cacheDeleteByPattern(`ai:outline:${courseId}*`)) +
    (await cacheDeleteByPattern(`ai:ssml:${courseId}*`)) +
    (await cacheDeleteByPattern(`ai:quiz:${courseId}*`));
  dlog('cache', `cacheBustCourse(${courseId}) -> ${total} keys removed`);
  return total;
}

/* ─────────────────────────────────────────────────────────
 * Teachability scoring (for listTopCourses)
 * ───────────────────────────────────────────────────────── */
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


/* ─────────────────────────────────────────────────────────
 * Service methods (used by controllers)
 * Each returns { status, data, headers }
 * ───────────────────────────────────────────────────────── */
export async function listTopCoursesService({ aiOnly = false, limit = 50, offset = 0 }) {
  const cacheKey = `ai:topCourses:aiOnly=${aiOnly}:limit=${limit}:offset=${offset}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached) {
    dlog('topCourses', 'serve from cache', { count: cached.length, offset, limit, aiOnly });
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
  dlog('topCourses', 'db rows', { count: rows.length });

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
  dlog('topCourses', 'ranked and cached', { totalRanked: scoredAll.length, returned: slice.length });

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

export async function generateOutlineService({ courseId, title, level, targetMinutes, courseSize, totalLessons: explicitLessons, programTrack }) {
  dlog('outline', 'enter', { courseId, title: Boolean(title), level, targetMinutes, courseSize, explicitLessons, programTrack });

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
  dlog('outline', 'size preset', { preset: preset?.key });

  // 1) Decide how many lessons to create
  let totalLessons;
  if (Number.isFinite(Number(explicitLessons)) && Number(explicitLessons) > 0) {
    totalLessons = Math.max(1, Math.min(500, Number(explicitLessons))); // clamp
  } else {
    const fromTrack = lessonsForTrack(programTrack);
    totalLessons = fromTrack || totalLessonsOf(preset);
  }

  // 2) Decide total minutes (if caller didn’t pass)
  let target = Number.isFinite(Number(targetMinutes)) && Number(targetMinutes) > 0
    ? Number(targetMinutes)
    : defaultTargetMinutesOf(preset);

  // Heuristic: if minutes per lesson looks too tiny, treat input as per-lesson
  if (target / totalLessons < 3) {
    target = target * totalLessons;
  }

  dlog('outline', 'computed plan', { totalLessons, targetMinutesTotal: target });

  const cacheKey = `ai:outline:${courseId || 't:' + sha1(courseTitle)}:size=${preset.key}:lvl=${level}:lessons=${totalLessons}:min=${target}:track=${programTrack || ''}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.outline?.length) {
    dlog('outline', 'cache HIT', { len: cached.outline.length });
    return { status: 200, data: { outline: cached.outline.slice(0, totalLessons) }, headers: { 'X-Cache': 'HIT' } };
  }

  if (breakerActive()) {
    console.warn(`[${LOG_NS}:outline] breaker active; serving fallback`);
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
      tries: 3
    });

    let outline = Array.isArray(json.outline) ? json.outline : [];
    if (!outline.length) {
      console.warn(`[${LOG_NS}:outline] AI returned empty outline`);
      return { status: 502, data: { error: 'AI returned an empty outline' }, headers: {} };
    }
    outline = outline.slice(0, totalLessons);

    await cacheSetJSON(cacheKey, { outline }, REDIS_TTL.outline);
    dlog('outline', 'success', { len: outline.length });
    return { status: 200, data: { outline }, headers: { 'X-Cache': 'MISS' } };
  } catch (err) {
    const c = classifyOpenAIError(err);
    console.warn(`[${LOG_NS}:outline] error`, { kind: c.kind, status: c.status, msg: err?.message });
    if (c.kind === 'quota') { tripBreaker(10); return { status: 503, data: { outline: makeFallbackOutline(courseTitle).slice(0, totalLessons), notice: fallbackNotice('insufficient_quota') }, headers: { 'Retry-After': String(c.retryAfterSec || 600) } }; }
    if (c.kind === 'rate_limit') { return { status: 503, data: { outline: makeFallbackOutline(courseTitle).slice(0, totalLessons), notice: fallbackNotice('rate_limited') }, headers: { 'Retry-After': String(c.retryAfterSec || 20) } }; }
    if (c.kind === 'auth') { return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} }; }
    if (c.kind === 'timeout') { return { status: 503, data: { error: 'AI service timeout. Please try again.' }, headers: { 'Retry-After': '5' } }; }
    if (c.kind === 'network') { return { status: 503, data: { error: 'AI network error. Please retry shortly.' }, headers: { 'Retry-After': '10' } }; }
    throw err;
  }
}

export async function generateLessonSSMLService({
  courseId,
  outline,
  voiceName,
  courseSize,
  count,
  start = 0, // NEW: offset for paging
}) {
  // Entry params
  log('log', 'lesson', 'enter', {
    courseId,
    outlineIsArray: Array.isArray(outline),
    outlineLen: Array.isArray(outline) ? outline.length : 0,
    start,
    count, // ignored; we force count=1 below
    voiceName,
    courseSize,
  });

  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  if (!cq.rowCount) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = cq.rows[0].title || 'Course';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize });
  const [paraMin, paraMax] = preset.para;
  const targetWords = Math.round((preset.wordsMin + preset.wordsMax) / 2);
  const maxWords    = preset.wordsMax;
  const sentencesPerPara = targetWords >= 900 ? '2–3' : '1–2';
  const pace = paceFor(preset.key);

  if (!Array.isArray(outline) || outline.length === 0) {
    console.warn('[svc:lesson-ssml] EMPTY_OUTLINE');
    return { status: 400, data: { error: 'EMPTY_OUTLINE' }, headers: {} };
  }

  const safeStart = Math.max(0, Math.min(Number(start) || 0, Math.max(0, outline.length - 1)));
  // **Queue mode**: always one lesson per request
  const takeCount = 1;
  const outlineSlice = outline.slice(safeStart, safeStart + 1);

  dlog('lesson', 'slicing', {
    safeStart,
    takeCount,
    resultingSliceLen: outlineSlice.length,
    totalOutlineLen: outline.length,
    voiceName,
    pace,
    targetWords,
    paraMin,
    paraMax,
  });

  const outlineHash = sha1({ slice: outlineSlice, start: safeStart });
  const cacheKey = `ai:ssml:lessons:${courseId}:size=${preset.key}:voice=${voiceName}:start=${safeStart}:n=${takeCount}:ol=${outlineHash}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.lessons?.length) {
    dlog('lesson', 'cache HIT', { lessons: cached.lessons.length });
    const hasMore = safeStart + 1 < outline.length;
    return {
      status: 200,
      data: { ...cached, queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } },
      headers: {
        'X-Cache': 'HIT',
        'X-Next-Start': hasMore ? String(safeStart + 1) : '',
        'X-Has-More': String(hasMore),
        'X-Total-Lessons': String(outline.length),
        'X-TTS-Rate': pace.ratePct,
        'X-TTS-ParaBreakMs': String(pace.paraBreakMs),
        'X-TTS-SectionBreakMs': String(pace.sectionBreakMs),
        'X-Voice': voiceName || '',
      }
    };
  }

  // Rich, unique scaffold (~6 paragraphs)
  const scaffoldFromOutline = () => {
    const o = outlineSlice[0];
    const absoluteIdx = safeStart;
    const id = `L${absoluteIdx + 1}`;
    const title = o?.title || `Lesson ${absoluteIdx + 1}`;
    const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];
    const goalsLine = kp.length ? kp.join('; ') : 'key ideas and a quick check for understanding';
    const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
      <p><bookmark mark="${id}.S1"/>Welcome to <emphasis level="moderate">${title}</emphasis> in ${courseTitle}. Here’s our plan for today.</p>
      <p><bookmark mark="${id}.S2"/>You will learn ${goalsLine}. We’ll keep the pace friendly and practical.</p>
      <p><bookmark mark="${id}.S3"/>Hook: imagine applying today’s idea to a simple, real situation. We’ll build from intuition to a crisp definition.</p>
      <p><bookmark mark="${id}.S4"/>Core concept: we define the terms, show a tight example, and call out a common pitfall to avoid.</p>
      <p><bookmark mark="${id}.S5"/>Micro-check: pause and answer a quick question in your head. If you can explain it in one sentence, you’re on track.</p>
      <p><bookmark mark="${id}.S6"/>Recap: restate the core idea in plain words, then preview what comes next so your memory sticks.</p>
    </prosody>
  </voice>
</speak>`.trim();
    const lesson = {
      id,
      title,
      goals: kp,
      ssml,
      estSeconds: Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2),
      markdown: `### ${title}\n\n- Goals: ${kp.map((g)=>`**${g}**`).join(', ') || 'Understand the core idea and check yourself once.'}\n- Pitfall: confusing definitions with examples.\n- Try: explain the idea to a friend in one sentence.`,
      formulas: [],
      tables: [],
    };
    return { lessons: [lesson], joinedSsml: ssml };
  };

  if (breakerActive()) {
    console.warn(`[${LOG_NS}:lesson] breaker active; returning scaffold only`);
    const pack = scaffoldFromOutline();
    const hasMore = safeStart + 1 < outline.length;
    return {
      status: 503,
      data: { ...pack, notice: fallbackNotice('breaker_active'), queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } },
      headers: { 'Retry-After': '600' },
    };
  }

  // On schema/parse failure, retry a single-lesson plain SSML (no JSON).
  async function retryPlainSSML() {
    const o = outlineSlice[0];
    const absoluteIdx = safeStart;
    const id = `L${absoluteIdx + 1}`;
    const title = o?.title || `Lesson ${absoluteIdx + 1}`;
    const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];

    const system = `You are a master teacher. Return ONLY valid Azure SSML for a single narrated lesson (no JSON, no backticks).
Wrap exactly:
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="${pace.ratePct}" pitch="+0st"> ... </prosody></voice></speak>
Rules:
- ${[...Array(Math.max(1, Math.min(3, 2))).length]} // placeholder keeps style consistent
- ${[...Array(Math.max(1, Math.min(3, 2))).length]} // (ignored by model; real pacing enforced in sanitize)`;

    const user = `Course: ${courseTitle}
Absolute lesson #: ${absoluteIdx + 1}
Title: ${title}
Goals: ${kp.join('; ') || 'Teach the core concept, give one tight example, call out a pitfall, run a micro-check, and recap.'}
Write the narration.`;

    const content = await withTimeout(async (signal) => {
      const r = await openai.chat.completions.create(
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.35,
          messages: [
            { role: 'system', content: system },
            { role: 'user',   content: user   },
          ],
          max_tokens: 1400,
        },
        { signal }
      );
      return r.choices?.[0]?.message?.content || '';
    }, OPENAI_REQUEST_TIMEOUT_MS);

    let ssml = content?.trim() || '';
    if (!/^\s*<speak[\s>]/i.test(ssml)) {
      ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
${ssml}
    </prosody>
  </voice>
</speak>`.trim();
    }
    ssml = sanitizeSsml(ssml, id, voiceName, { ratePct: pace.ratePct, breakMs: pace.paraBreakMs, sentencesPerPara: 2 });
    const lesson = {
      id,
      title,
      goals: kp,
      ssml: ssml.trim(),
      estSeconds: Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2),
      markdown: '',
      formulas: [],
      tables: [],
    };
    return { lessons: [lesson], joinedSsml: lesson.ssml };
  }

  try {
    const outlineStr = outlineSlice
      .map((o, i) => {
        const absoluteIdx = safeStart + i;
        return `Section ${absoluteIdx + 1}: ${o.title} — ${o.keyPoints?.join('; ') || ''}`;
      })
      .join('\n');

    dlog('lesson', 'calling OpenAI', {
      sections: outlineSlice.length,
      start: safeStart,
      count: 1,
    });

    const json = await aiJson({
      system: `You are a master teacher writing **natural** SSML for narrated lessons.
Return JSON STRICTLY matching the given schema.
Guidelines for each lesson:
- Length target ~${targetWords} words (min ${preset.wordsMin}, soft max ${maxWords}).
- Each <p> has ${sentencesPerPara} short sentences (≤ 140 chars), conversational.
- Present tense; no code fences; proper punctuation.
- Insert <bookmark mark="L{ABS}.S{n}"/> at the start of every <p>, where ABS is absolute lesson number (1-based in the whole course).
- Produce ${paraMin}–${paraMax} paragraphs per lesson (fits a ${preset.label} course).
- Wrap Azure SSML exactly:
  <speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="${pace.ratePct}" pitch="+0st"> ... </prosody></voice></speak>
Also always include:
- "markdown": brief, readable notes (GFM) with headings, bulleted steps, and inline math where useful.
- "formulas": array. For each key equation used in the lesson, include { id, latex, speakAs } where speakAs ∈ { "math","spell-out","characters","none" } to indicate how a screen reader should read it.
- "tables": array for compact comparisons (columns/rows). Keep concise.`,
      user: `Course: ${courseTitle}
START_INDEX (0-based in full course): ${safeStart}
Sections (absolute numbering shown):
${outlineStr}
Write one self-contained lesson per section with hook, goals, concepts, example, pitfall, micro-check, and recap.`,
      temperature: 0.35,
      maxTokens: 2000,
      schema: LESSON_PACK_SCHEMA,
      tries: 3
    });

    const rawCount = Array.isArray(json?.lessons) ? json.lessons.length : 0;
    dlog('lesson', 'openai returned', { rawCount });

    const lessons = (Array.isArray(json?.lessons) ? json.lessons : [])
      .map((l, i) => {
        const absoluteIdx = safeStart + i;
        const id = `L${absoluteIdx + 1}`;
        const title = String(l?.title || outlineSlice[i]?.title || `Lesson ${absoluteIdx + 1}`);
        const goals = Array.isArray(l?.goals) ? l.goals.slice(0, 6) : [];
        const estSeconds = Number(
          l?.estSeconds || Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2)
        );

        let ssml = String(l?.ssml || '');
        if (!/^\s*<speak[\s>]/i.test(ssml)) {
          ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
${ssml}
    </prosody>
  </voice>
</speak>`.trim();
        }
        if (!/<bookmark\s+mark=/.test(ssml)) {
          ssml = ssml.replace(
            /<prosody[^>]*>/i,
            (m) => `${m}\n      <p><bookmark mark="${id}.S1"/>${title}</p>\n      <break time="400ms"/>`
          );
        }

        ssml = sanitizeSsml(ssml, id, voiceName, {
          ratePct: pace.ratePct,
          breakMs: pace.paraBreakMs,
          sentencesPerPara: 2,
        });

        const markdown = typeof l?.markdown === 'string' ? l.markdown : '';
        const formulas = Array.isArray(l?.formulas) ? l.formulas : [];
        const tables   = Array.isArray(l?.tables) ? l.tables : [];

        return { id, title, goals, ssml: ssml.trim(), estSeconds, markdown, formulas, tables };
      })
      .filter((l) => l?.ssml && l?.title);

    if (!lessons.length) {
      console.warn(`[${LOG_NS}:lesson] AI returned empty lessons; retrying plain SSML`);
      try {
        const pack = await retryPlainSSML();
        const hasMore = safeStart + 1 < outline.length;
        const payload = { ...pack, queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } };
        await cacheSetJSON(cacheKey, pack, REDIS_TTL.ssml);
        return {
          status: 206,
          data: { ...payload, notice: { degraded: true, reason: 'json_parse_failed_plain_ssml' } },
          headers: {
            'X-Cache': 'MISS',
            'X-Degraded': 'true',
            'X-Next-Start': hasMore ? String(safeStart + 1) : '',
            'X-Has-More': String(hasMore),
            'X-Total-Lessons': String(outline.length),
            'X-TTS-Rate': pace.ratePct,
            'X-TTS-ParaBreakMs': String(pace.paraBreakMs),
            'X-TTS-SectionBreakMs': String(pace.sectionBreakMs),
            'X-Voice': voiceName || '',
          }
        };
      } catch {
        console.warn(`[${LOG_NS}:lesson] plain SSML retry failed; falling back to scaffold`);
        const pack = scaffoldFromOutline();
        const hasMore = safeStart + 1 < outline.length;
        const payload = { ...pack, queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } };
        return { status: 502, data: { ...payload, notice: { degraded: true, reason: 'ai_empty_lessons' } }, headers: {} };
      }
    }

    const joinedSsml = lessons
      .map((l, i) =>
        i === 0
          ? l.ssml
          : l.ssml.replace(
              /<\/speak>\s*$/i,
              `<p><break time="${pace.sectionBreakMs}ms"/></p></prosody></voice></speak>`
            )
      )
      .join('\n\n');

    const hasMore = safeStart + 1 < outline.length;
    const payload = { lessons, joinedSsml, queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } };
    await cacheSetJSON(cacheKey, payload, REDIS_TTL.ssml);
    log('log', 'lesson', 'success', { lessons: lessons.length, joinedBytes: joinedSsml.length });
    return {
      status: 200,
      data: payload,
      headers: {
        'X-Cache': 'MISS',
        'X-Next-Start': hasMore ? String(safeStart + 1) : '',
        'X-Has-More': String(hasMore),
        'X-Total-Lessons': String(outline.length),
        'X-TTS-Rate': pace.ratePct,
        'X-TTS-ParaBreakMs': String(pace.paraBreakMs),
        'X-TTS-SectionBreakMs': String(pace.sectionBreakMs),
        'X-Voice': voiceName || '',
      }
    };
  } catch (err) {
    const c = classifyOpenAIError(err);
    console.warn(`[${LOG_NS}:lesson] error`, { kind: c.kind, status: c.status, msg: err?.message });

    if (c.kind === 'quota' || c.kind === 'rate_limit') {
      const pack = scaffoldFromOutline();
      const hasMore = safeStart + 1 < outline.length;
      return {
        status: 503,
        data: { ...pack, notice: fallbackNotice(c.kind), queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } },
        headers: { 'Retry-After': String(c.retryAfterSec || 10) }
      };
    }
    if (c.kind === 'timeout' || c.kind === 'network') {
      return { status: 503, data: { error: c.message || 'temporary_error' }, headers: { 'Retry-After': String(c.retryAfterSec || 5) } };
    }
    if (c.kind === 'auth') {
      return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} };
    }

    if (c.kind === 'bad_request' || c.kind === 'unknown') {
      const pack = scaffoldFromOutline();
      const hasMore = safeStart + 1 < outline.length;
      const packWithNotice = {
        ...pack,
        notice: fallbackNotice(c.kind === 'unknown' ? 'server_error' : 'bad_request'),
      };
      return { status: 502, data: { ...packWithNotice, queue: { nextStart: hasMore ? safeStart + 1 : null, hasMore, total: outline.length } }, headers: {} };
    }
    throw err;
  }
}

/* Helper: normalize/repair AI quiz output and top it up with fallbacks */
function normalizeQuizArray(questions, desired, courseTitle, outline) {
  const out = [];
  const seen = new Set();
  const push = (q) => {
    if (!q) return;
    const id = String(q.id || `q${out.length + 1}`);
    const prompt = String(q.prompt || '').trim();
    let choices = Array.isArray(q.choices) ? q.choices.map(String) : [];
    if (choices.length !== 4) {
      // pad or trim choices to 4
      choices = (choices.slice(0, 4).concat(['Option A','Option B','Option C','Option D'])).slice(0, 4);
    }
    let answerIndex = Number.isFinite(Number(q.answerIndex)) ? Number(q.answerIndex) : 0;
    if (answerIndex < 0 || answerIndex > 3) answerIndex = 0;
    if (!prompt) return;
    const sig = prompt.toLowerCase();
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({ id, prompt, choices, answerIndex });
  };

  if (Array.isArray(questions)) {
    for (const q of questions) push(q);
  }

  // Top up with fallbacks if short
  if (out.length < desired) {
    const fb = makeFallbackQuiz(courseTitle, outline, desired);
    for (let i = 0; i < fb.length && out.length < desired; i++) push(fb[i]);
  }

  // Ensure stable ids q1..qN
  return out.slice(0, desired).map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

export async function generateQuizService({ courseId, outline, numQuestions, courseSize }) {
  dlog('quiz', 'enter', { courseId, outlineLen: Array.isArray(outline) ? outline.length : 0, numQuestions, courseSize });

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
    dlog('quiz', 'cache HIT', { questions: cached.quiz.questions.length });
    return { status: 200, data: { quiz: cached.quiz }, headers: { 'X-Cache': 'HIT' } };
  }

  if (breakerActive()) {
    console.warn(`[${LOG_NS}:quiz] breaker active; serving fallback`);
    const qs = makeFallbackQuiz(courseTitle, outline, n);
    return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('breaker_active') }, headers: { 'Retry-After': '600' } };
  }

  try {
    // First try with strict JSON schema
    let json = await aiJson({
      system: `Create a multiple-choice quiz as JSON STRICTLY matching this schema:
- "questions": array of exactly ${n} items
- each: {"id":"q1","prompt":"...","choices":["A","B","C","D"],"answerIndex":0..3}
Write clear, unambiguous prompts; choices concise; exactly one correct answer.`,
      user: `Course: ${courseTitle}
Key sections:
${outline.map((o) => `- ${o.title}: ${(o.keyPoints || []).join(', ')}`).join('\n')}
Focus on the most important points.`,
      temperature: 0.2,
      maxTokens: 1600,
      tries: 3,
      schema: QUIZ_SCHEMA
    });

    let questions = Array.isArray(json?.questions) ? json.questions : [];

    // If schema-compliant response is empty, softly retry without schema once
    if (!questions.length) {
      dlog('quiz', 'empty after schema; retrying without schema once');
      json = await aiJson({
        system: `Create a multiple-choice quiz JSON with exactly ${n} questions:
{"questions":[{"id":"q1","prompt":"...","choices":["A","B","C","D"],"answerIndex":0}, ... ]}`,
        user: `Course: ${courseTitle}
Key sections:
${outline.map((o) => `- ${o.title}: ${(o.keyPoints || []).join(', ')}`).join('\n')}
Keep it crisp; exactly one correct answer per question.`,
        temperature: 0.25,
        maxTokens: 1600,
        tries: 2
      });
      questions = Array.isArray(json?.questions) ? json.questions : [];
    }

    // Normalize/repair and top up with fallback if short
    const normalized = normalizeQuizArray(questions, n, courseTitle, outline);
    const degraded = normalized.length < (Array.isArray(questions) ? questions.length : 0) || !questions.length;

    const quiz = { questions: normalized };
    await cacheSetJSON(cacheKey, { quiz }, REDIS_TTL.quiz);
    dlog('quiz', 'success', { questions: quiz.questions.length, degraded });

    return {
      status: degraded ? 206 : 200,
      data: { quiz, ...(degraded ? { notice: fallbackNotice('quiz_repaired_or_fallback') } : {}) },
      headers: degraded ? { 'X-Degraded': 'true' } : { 'X-Cache': 'MISS' }
    };
  } catch (err) {
    const c = classifyOpenAIError(err);
    console.warn(`[${LOG_NS}:quiz] error`, { kind: c.kind, status: c.status, msg: err?.message });

    if (c.kind === 'quota') {
      tripBreaker(10);
      const qs = makeFallbackQuiz(courseTitle, outline, n);
      return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('insufficient_quota') }, headers: { 'Retry-After': String(c.retryAfterSec || 600) } };
    }
    if (c.kind === 'rate_limit') {
      const qs = makeFallbackQuiz(courseTitle, outline, n);
      return { status: 503, data: { quiz: { questions: qs }, notice: fallbackNotice('rate_limited') }, headers: { 'Retry-After': String(c.retryAfterSec || 20) } };
    }
    if (c.kind === 'auth') {
      return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} };
    }
    if (c.kind === 'timeout') {
      return { status: 503, data: { error: 'AI service timeout. Please try again.' }, headers: { 'Retry-After': '5' } };
    }
    if (c.kind === 'network') {
      return { status: 503, data: { error: 'AI network error. Please retry shortly.' }, headers: { 'Retry-After': '10' } };
    }

    // For bad schema/unknown errors, degrade with fallback instead of 502
    const qs = makeFallbackQuiz(courseTitle, outline, n);
    return {
      status: 206,
      data: { quiz: { questions: qs }, notice: fallbackNotice(c.kind === 'bad_request' ? 'bad_request' : 'server_error') },
      headers: { 'X-Degraded': 'true' }
    };
  }
}

export async function generateCoursePackageService({ courseId, level = 'beginner', targetMinutes, voiceName = 'en-US-JennyNeural', numQuestions, courseSize }) {
  dlog('package', 'enter', { courseId, level, targetMinutes, voiceName, numQuestions, courseSize });

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

  // Lessons (queue across the outline, 1 by 1)
  const lessons = [];
  const ssmlParts = [];
  let anyDegradedLesson = false;
  for (let i = 0; i < outline.length; i++) {
    try {
      const r = await generateLessonSSMLService({ courseId, outline, voiceName, courseSize, count: 1, start: i });
      const L = r.data?.lessons?.[0];
      if (L) {
        lessons.push(L);
        ssmlParts.push(L.ssml);
        if (r.status && r.status !== 200) anyDegradedLesson = true;
      } else {
        // scaffold for just this lesson if call returned no content
        const tmp = await generateLessonSSMLService({ courseId, outline: [outline[i]], voiceName, courseSize, count: 1, start: 0 });
        const F = tmp.data?.lessons?.[0];
        if (F) {
          lessons.push(F);
          ssmlParts.push(F.ssml);
          anyDegradedLesson = true;
        }
      }
      // polite pacing between calls
      if (i + 1 < outline.length) await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      // last-ditch scaffold if a single lesson hard-fails
      const title = outline[i]?.title || `Lesson ${i + 1}`;
      const kp = Array.isArray(outline[i]?.keyPoints) ? outline[i].keyPoints.slice(0, 4) : [];
      const fallback = {
        id: `L${i + 1}`,
        title,
        goals: kp,
        ssml: `<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="${paceFor(preset.key).ratePct}" pitch="+0st"><p><bookmark mark="L${i + 1}.S1"/>${title}</p><p><bookmark mark="L${i + 1}.S2"/>We’ll revisit this in the next pass.</p></prosody></voice></speak>`,
        estSeconds: Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2),
        markdown: '',
        formulas: [],
        tables: [],
      };
      lessons.push(fallback);
      ssmlParts.push(fallback.ssml);
      anyDegradedLesson = true;
    }
  }
  const joinedSsml = ssmlParts.join(`\n<p><break time="${paceFor(preset.key).sectionBreakMs}ms"/></p>\n`);

  // Quiz
  const quizResp = await generateQuizService({
    courseId,
    outline,
    numQuestions: numQuestions ?? (outline.length * preset.quizPerLesson),
    courseSize,
  });
  const quiz = quizResp.data?.quiz || { questions: makeFallbackQuiz(courseTitle, outline, 8) };

  const anyDegraded = [outlineResp.status, quizResp.status].some((s) => s && s !== 200) || anyDegradedLesson;

  dlog('package', 'done', {
    outlineLen: outline?.length || 0,
    lessons: lessons.length,
    quizQ: quiz?.questions?.length || 0,
    degraded: Boolean(anyDegraded),
  });

  return { status: anyDegraded ? 206 : 200, data: { outline, lessons, joinedSsml, quiz, notice: anyDegraded ? fallbackNotice('degraded_generation') : undefined }, headers: {} };
}
