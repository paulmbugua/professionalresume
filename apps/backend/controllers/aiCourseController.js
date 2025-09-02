// apps/backend/controllers/aiCoursesController.js
import 'dotenv/config';
import crypto from 'crypto';
import { createRedis, ensureRedisConnected } from '../cronJobs/redisConnection.js';
import OpenAI from 'openai';
import pool from '../config/db.js';
import {
  outlineSchema,
  lessonSchema,
  quizSchema,
  gradeSchema,
} from '../validators/aiCoursesValidator.js';

// ----------------------- OpenAI -----------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configurable request timeout (ms) for OpenAI
// ⬆️ bumped default from 18s to 45s
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 45000);

const redis = createRedis();
await ensureRedisConnected(redis).catch(() => {
  console.warn('[redis] not connected; caching disabled for this process');
});

const REDIS_TTL = {
  topCourses: 60 * 5,       // 5 min: good for list pages
  outline: 60 * 60 * 24,    // 24 h
  ssml: 60 * 60 * 24,       // 24 h
  quiz: 60 * 60 * 24,       // 24 h
};

function sha1(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return crypto.createHash('sha1').update(s).digest('hex');
}

async function cacheGetJSON(key) {
  if (!redis) return null;
  try {
    const txt = await redis.get(key);
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    console.warn('[redis] get error', e?.message);
    return null;
  }
}

async function cacheSetJSON(key, value, ttlSec) {
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    return true;
  } catch (e) {
    console.warn('[redis] set error', e?.message);
    return false;
  }
}

// Optional: bulk delete by pattern for invalidation (use SCAN, not KEYS)
async function cacheDeleteByPattern(pattern) {
  if (!redis) return 0;
  let cursor = '0', total = 0;
  try {
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length) {
        total += keys.length;
        await redis.del(keys);
      }
    } while (cursor !== '0');
  } catch (e) {
    console.warn('[redis] scan/del error', e?.message);
  }
  return total;
}

// ----------------------- In-process concurrency gate -----------------------
let inflight = 0;
const MAX_INFLIGHT = Number(process.env.AI_MAX_INFLIGHT || 4);

async function withGate(fn) {
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

// ----------------------- Quota breaker & fallbacks -----------------------
let quotaDownUntil = 0; // epoch ms

function breakerActive() {
  return Date.now() < quotaDownUntil;
}
function tripBreaker(minutes = 10) {
  quotaDownUntil = Date.now() + minutes * 60 * 1000;
}
function fallbackNotice(reason = 'insufficient_quota') {
  return { degraded: true, reason };
}

function makeFallbackOutline(title = 'Your Topic') {
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

function makeFallbackQuiz(title = 'Your Topic', outline = [], num = 6) {
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

// ----------------------- Error classification -----------------------
/**
 * Normalize OpenAI & network errors so callers can react consistently.
 * Returns { kind, status, retryAfterSec, message }.
 *
 * kind ∈ 'quota' | 'rate_limit' | 'auth' | 'timeout' | 'network' | 'bad_request' | 'unknown'
 */
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
  const bodyCode =
    body?.code ||
    body?.error?.code ||
    err?.code ||
    '';
  const msg = String(
    err?.message ||
    body?.message ||
    body?.error?.message ||
    ''
  ).toLowerCase();

  // Timeouts/abort
  if (err?._isTimeoutAbort || msg.includes('timeout') || msg.includes('aborted')) {
    return { kind: 'timeout', status: status || 503, retryAfterSec: retryAfter || 5, message: 'timeout' };
  }

  // Network/DNS (fetch failed, ECONNRESET, etc.)
  if (
    msg.includes('fetch failed') ||
    msg.includes('socket') ||
    msg.includes('econnreset') ||
    msg.includes('network')
  ) {
    return { kind: 'network', status: status || 502, retryAfterSec: retryAfter || 10, message: 'network' };
  }

  // Auth: 401 invalid_api_key, org/project issues
  if (status === 401 || bodyCode === 'invalid_api_key' || msg.includes('invalid api key')) {
    return { kind: 'auth', status: 401, retryAfterSec: undefined, message: 'invalid_api_key' };
  }

  // Quota/billing: 402 Payment Required, 429 insufficient_quota
  if (status === 402 || bodyCode === 'insufficient_quota' || msg.includes('insufficient quota') || msg.includes('payment required') || msg.includes('billing hard limit')) {
    return { kind: 'quota', status: 402, retryAfterSec: retryAfter || 600, message: 'insufficient_quota' };
  }

  // Rate limit: 429 but *not* insufficient_quota
  if (status === 429 || msg.includes('rate limit')) {
    return { kind: 'rate_limit', status: 429, retryAfterSec: retryAfter || 20, message: 'rate_limited' };
  }

  // Bad request / safety / schema issues
  if (status === 400) {
    return { kind: 'bad_request', status: 400, retryAfterSec: undefined, message: 'bad_request' };
  }

  return { kind: 'unknown', status: status || 500, retryAfterSec: retryAfter, message: 'unknown' };
}

// ----------------------- Helpers -----------------------
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
    if (isAbortError(e)) {
      e._isTimeoutAbort = true; // tag for 503 mapping
    }
    throw e;
  }
}

/**
 * Helper to get JSON from OpenAI reliably (JSON mode + tiny retry).
 * If OpenAI returns quota/429/etc., we tag the thrown error with .aiKind and .retryAfterSec
 * so controllers can degrade gracefully.
 */
async function aiJson({ system, user, temperature = 0.2, tries = 2 }) {
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
          },
          { signal }
        );
        return r.choices?.[0]?.message?.content || '{}';
      }, OPENAI_REQUEST_TIMEOUT_MS);

      try {
        return JSON.parse(content);
      } catch {
        if (i === tries - 1) return {};
      }
    } catch (e) {
      const c = classifyOpenAIError(e);
      // propagate normalized tags
      e.aiKind = c.kind;
      e.retryAfterSec = c.retryAfterSec;
      e.status = c.status;

      lastErr = e;

      // Retry on transient kinds only
      if (c.kind === 'rate_limit' || c.kind === 'network' || c.kind === 'timeout') {
        // small backoff
        await new Promise((r) => setTimeout(r, Math.min(2000, (c.retryAfterSec || 1) * 1000)));
        continue;
      }

      // Do not retry on quota/auth/bad_request/unknown
      throw e;
    }
  }
  throw lastErr || new Error('OpenAI request failed');
}

/* =========================================================
 * AI teachability heuristics
 * =======================================================*/

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
  for (const k of AI_POSITIVE_KEYWORDS) {
    if (text.includes(k)) score += 2;
  }
  score = Math.min(score, 30);
  for (const k of AI_NEGATIVE_KEYWORDS) {
    if (text.includes(k)) score -= 5;
  }
  if (Array.isArray(syllabusJson) && syllabusJson.length >= 3) score += 3;
  return score;
}

/* =========================================================
 * Controllers
 * =======================================================*/

/**
 * GET /api/ai/courses/top?aiOnly=1
 * Returns up to top 10 courses, optionally filtered to AI-friendly ones.
 */
export async function listTopCourses(req, res) {
  try {
    const aiOnly = String(req.query.aiOnly || '').trim() === '1';
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const cacheKey = `ai:topCourses:aiOnly=${aiOnly}:limit=${limit}:offset=${offset}`;
    const cached = await cacheGetJSON(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('X-Offset', String(offset));
      res.set('X-Limit', String(limit));
      return res.json(cached);
    }

    const q = await pool.query(
      `
      SELECT id, title, description, syllabus, avg_rating, ratings_count
        FROM courses
       ORDER BY
         (avg_rating IS NULL) ASC, avg_rating DESC,
         (ratings_count IS NULL) ASC, ratings_count DESC,
         created_at DESC NULLS LAST
       LIMIT 1000
      `
    );

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
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.reviews - a.reviews;
      });

    const slice = scoredAll.slice(offset, offset + limit).map(({ _score, ...rest }) => rest);

    await cacheSetJSON(cacheKey, slice, REDIS_TTL.topCourses);

    res.set('X-Cache', 'MISS');
    res.set('X-Total-Ranked', String(scoredAll.length));
    res.set('X-Offset', String(offset));
    res.set('X-Limit', String(limit));
    res.set('X-Has-More', String(offset + slice.length < scoredAll.length));

    return res.json(slice);
  } catch (err) {
    console.error('[ai] listTopCourses error:', err);
    return res.status(500).json({ error: 'Failed to load courses' });
  }
}


/**
 * POST /api/ai/outline
 * Body: { courseId?, title?, level, targetMinutes }
 * Returns: { outline, notice? }
 */
export async function generateOutline(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = outlineSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, title, level, targetMinutes } = value;

      let courseTitle = title || 'Untitled Course';
      let courseDesc = '';

      if (courseId) {
        const cq = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
        if (cq.rowCount) {
          courseTitle = cq.rows[0].title || courseTitle;
          courseDesc = cq.rows[0].description || '';
        }
      }

      // 1) Cache lookup
      const cacheKey = `ai:outline:${courseId || 't:' + sha1(courseTitle)}:lvl=${level}:min=${targetMinutes}`;
      const cached = await cacheGetJSON(cacheKey);
      if (cached?.outline?.length) {
        res.set('X-Cache', 'HIT');
        return res.json({ outline: cached.outline });
      }

      // Breaker short-circuit
      if (breakerActive()) {
        res.set('Retry-After', '600');
        return res.status(503).json({
          outline: makeFallbackOutline(courseTitle),
          notice: fallbackNotice('breaker_active'),
        });
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
Keep it ${level}, 3–7 sections total, suitable for ~${targetMinutes} minutes. Key points must be concrete and assessable.`,
          user: `Course: ${courseTitle}\nDescription: ${courseDesc}\nMake it crisp, practical, and testable.`,
          temperature: 0.3,
        });

        const outline = Array.isArray(json.outline) ? json.outline : [];
        if (!outline.length) {
          return res.status(502).json({ error: 'AI returned an empty outline' });
        }

        // 2) Cache store (success only)
        await cacheSetJSON(cacheKey, { outline }, REDIS_TTL.outline);

        return res.json({ outline });
      } catch (err) {
        const kind = err?.aiKind;
        const retryAfter = Math.max((err?.retryAfterSec || 0), 0);
        if (kind === 'quota') {
          tripBreaker(10);
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          else res.set('Retry-After', '600');
          return res.status(503).json({
            outline: makeFallbackOutline(courseTitle),
            notice: fallbackNotice('insufficient_quota'),
          });
        }
        if (kind === 'rate_limit') {
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          return res.status(503).json({
            outline: makeFallbackOutline(courseTitle),
            notice: fallbackNotice('rate_limited'),
          });
        }
        if (kind === 'auth') return res.status(401).json({ error: 'OpenAI API key invalid or unauthorized' });
        if (kind === 'timeout') { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
        if (kind === 'network') { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI network error. Please retry shortly.' }); }
        throw err;
      }
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateOutline error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate outline' });
  }
}

/**
 * POST /api/ai/lesson-ssml
 * Body: { courseId, outline[], voiceName? }
 * Returns:
 *  {
 *    lessons: [{ id, title, goals?: string[], ssml, estSeconds?: number }],
 *    joinedSsml,   // concatenated with separators (for backward compatibility)
 *    notice?
 *  }
 */
export async function generateLessonSSML(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = lessonSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, outline, voiceName } = value;
      const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
      if (!cq.rowCount) return res.status(404).json({ error: 'COURSE_NOT_FOUND' });
      const courseTitle = cq.rows[0].title || 'Course';

      const outlineHash = sha1(outline);
      const cacheKey = `ai:ssml:lessons:${courseId}:voice=${voiceName}:ol=${outlineHash}`;
      const cached = await cacheGetJSON(cacheKey);
      if (cached?.lessons?.length) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      const scaffoldFromOutline = () => {
        const lessons = outline.map((o, idx) => {
          const title = o?.title || `Lesson ${idx + 1}`;
          const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];
          const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
      <p><mark name="L${idx + 1}.S1"/>Welcome to ${title} in ${courseTitle}.</p>
      ${kp.map((k, i) => `      <p><mark name="L${idx + 1}.S${i + 2}"/>Key point: ${k}</p>`).join('\n')}
      <break time="1200ms"/>
      <p><mark name="L${idx + 1}.S9"/>This concludes ${title}. In the next lesson, we'll continue.</p>
    </prosody>
  </voice>
</speak>`.trim();
          return { id: `L${idx + 1}`, title, goals: kp, ssml, estSeconds: 90 };
        });
        const joinedSsml = lessons
          .map((l, i) =>
            i === 0
              ? l.ssml
              : l.ssml.replace(
                  /<\/speak>\s*$/i,
                  `<p><break time="2000ms"/></p></prosody></voice></speak>`
                )
          )
          .join('\n\n');
        return { lessons, joinedSsml };
      };

      // Breaker short-circuit
      if (breakerActive()) {
        const pack = scaffoldFromOutline();
        res.set('Retry-After', '600');
        return res.status(503).json({ ...pack, notice: fallbackNotice('breaker_active') });
      }

      try {
        const outlineStr = outline
          .map((o, i) => `Section ${i + 1}: ${o.title} — ${o.keyPoints?.join('; ') || ''}`)
          .join('\n');

        const json = await aiJson({
          system: `You are an instructional designer and voice scriptwriter.
Return JSON in EXACT shape:
{
  "lessons": [
    {
      "id": "L1",
      "title": "string",
      "goals": ["string", "string"],
      "estSeconds": 60,
      "ssml": "<speak ...>...</speak>"
    }
  ]
}
Guidelines:
- 4–8 lessons total, each 60–180 seconds.
- Use Azure SSML with: <speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="0%" pitch="+0st"> ... </prosody></voice></speak>
- Keep paragraphs short (<p> blocks), add subtle <break time="400ms"/> between ideas.
- For sentence-level sync, insert <mark name="L{index}.S{n}"/> at the START of each <p>. (Example: <p><mark name="L2.S3"/>Text…</p>)
- Use clear, teacherly tone. No code fences. No extra keys.`,
          user: `Course: ${courseTitle}
Sections:
${outlineStr}
Write a separate, self-contained lesson for each section with a natural intro and recap.`,
          temperature: 0.4,
        });

        const lessonsRaw = Array.isArray(json?.lessons) ? json.lessons : [];
        const lessons = lessonsRaw
          .map((l, idx) => {
            const id = l?.id || `L${idx + 1}`;
            const title = String(l?.title || outline[idx]?.title || `Lesson ${idx + 1}`);
            const goals = Array.isArray(l?.goals) ? l.goals.slice(0, 6) : [];
            const estSeconds = Number(l?.estSeconds || 90);
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

            if (!/<mark\s+name=/.test(ssml)) {
              ssml = ssml.replace(
                /<prosody[^>]*>/i,
                (m) => `${m}\n      <p><mark name="${id}.S1"/>${title}</p>\n      <break time="400ms"/>`
              );
            }

            return { id, title, goals, ssml: ssml.trim(), estSeconds };
          })
          .filter((l) => l?.ssml && l?.title);

        if (!lessons.length) {
          const pack = scaffoldFromOutline();
          return res.status(502).json({ ...pack, notice: { degraded: true, reason: 'ai_empty_lessons' } });
        }

        const joinedSsml = lessons
          .map((l, i) =>
            i === 0
              ? l.ssml
              : l.ssml.replace(
                  /<\/speak>\s*$/i,
                  `<p><break time="2500ms"/></p></prosody></voice></speak>`
                )
          )
          .join('\n\n');

        const payload = { lessons, joinedSsml };
        await cacheSetJSON(cacheKey, payload, REDIS_TTL.ssml);
        return res.json(payload);
      } catch (err) {
        const kind = err?.aiKind;
        const retryAfter = Math.max((err?.retryAfterSec || 0), 0);
        if (kind === 'quota') {
          tripBreaker(10);
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          else res.set('Retry-After', '600');
          const pack = scaffoldFromOutline();
          return res.status(503).json({ ...pack, notice: fallbackNotice('insufficient_quota') });
        }
        if (kind === 'rate_limit') {
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          const pack = scaffoldFromOutline();
          return res.status(503).json({ ...pack, notice: fallbackNotice('rate_limited') });
        }
        if (kind === 'auth') return res.status(401).json({ error: 'OpenAI API key invalid or unauthorized' });
        if (kind === 'timeout') { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
        if (kind === 'network') { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI network error. Please retry shortly.' }); }
        throw err;
      }
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateLessonSSML error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate lesson SSML' });
  }
}

/**
 * POST /api/ai/quiz
 * Body: { courseId, outline[], numQuestions }
 * Returns: { quiz, notice? }
 */
export async function generateQuiz(req, res) {
  try {
    await withGate(async () => {
      const { value, error } = quizSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.message });

      const { courseId, outline, numQuestions } = value;
      const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
      if (!cq.rowCount) return res.status(404).json({ error: 'COURSE_NOT_FOUND' });

      const courseTitle = cq.rows[0].title || 'Course';

      const olHash = sha1(outline);
      const cacheKey = `ai:quiz:${courseId}:n=${numQuestions}:ol=${olHash}`;
      const cached = await cacheGetJSON(cacheKey);
      if (cached?.quiz?.questions?.length) {
        res.set('X-Cache', 'HIT');
        return res.json({ quiz: cached.quiz });
      }

      // Breaker short-circuit
      if (breakerActive()) {
        const qs = makeFallbackQuiz(courseTitle, outline, numQuestions);
        res.set('Retry-After', '600');
        return res.status(503).json({ quiz: { questions: qs }, notice: fallbackNotice('breaker_active') });
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
Exactly ${numQuestions} questions. One correct answer each. Prompts must be unambiguous. Choices concise.`,
          user: `Course: ${courseTitle}
Key sections:
${outline.map((o) => `- ${o.title}: ${o.keyPoints.join(', ')}`).join('\n')}
Test the most important points only.`,
          temperature: 0.2,
        });

        const quiz = { questions: Array.isArray(json.questions) ? json.questions : [] };
        if (!quiz.questions.length) {
          return res.status(502).json({ error: 'AI returned an empty quiz' });
        }

        await cacheSetJSON(cacheKey, { quiz }, REDIS_TTL.quiz);

        return res.json({ quiz });
      } catch (err) {
        const kind = err?.aiKind;
        const retryAfter = Math.max((err?.retryAfterSec || 0), 0);
        if (kind === 'quota') {
          tripBreaker(10);
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          else res.set('Retry-After', '600');
          const qs = makeFallbackQuiz(courseTitle, outline, numQuestions);
          return res.status(503).json({ quiz: { questions: qs }, notice: fallbackNotice('insufficient_quota') });
        }
        if (kind === 'rate_limit') {
          if (retryAfter) res.set('Retry-After', String(retryAfter));
          const qs = makeFallbackQuiz(courseTitle, outline, numQuestions);
          return res.status(503).json({ quiz: { questions: qs }, notice: fallbackNotice('rate_limited') });
        }
        if (kind === 'auth') return res.status(401).json({ error: 'OpenAI API key invalid or unauthorized' });
        if (kind === 'timeout') { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
        if (kind === 'network') { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI network error. Please retry shortly.' }); }
        throw err;
      }
    });
  } catch (err) {
    const info = { name: err?.name, msg: err?.message, timeout: !!err?._isTimeoutAbort, busy: !!err?._serverBusy };
    console.error('[ai] generateQuiz error:', info);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    if (err?._isTimeoutAbort) { res.set('Retry-After', '5'); return res.status(503).json({ error: 'AI service timeout. Please try again.' }); }
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('temporarily unavailable')) { res.set('Retry-After', '10'); return res.status(503).json({ error: 'AI temporarily unavailable. Please retry shortly.' }); }
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}


/**
 * POST /api/ai/grade  (auth)
 * Returns: { correct, total, scorePct, passed, passMark }
 */
export async function gradeQuiz(req, res) {
  try {
    const { value, error } = gradeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { quiz, answers, passMark } = value;

    const key = new Map(quiz.questions.map((q) => [q.id, q.answerIndex]));
    let correct = 0;
    for (const a of answers) {
      if (key.get(a.questionId) === a.choiceIndex) correct += 1;
    }
    const total = quiz.questions.length;
    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    const passed = scorePct >= passMark;

    res.json({ correct, total, scorePct, passed, passMark });
  } catch (err) {
    console.error('[ai] gradeQuiz error:', err);
    res.status(500).json({ error: 'Failed to grade quiz' });
  }
}

/* =========================================================
 * One-shot Course Package (outline → lessons → quiz)
 * =======================================================*/

/**
 * Helper versions of outline/lessons/quiz to use inside the package endpoint.
 * They are intentionally minimal and reuse the same prompts/logic as controllers.
 */
async function _coreGenerateOutline({ courseId, title, level = 'beginner', targetMinutes = 12, courseDesc = '' }) {
  const courseTitle = title || (await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId])).rows?.[0]?.title || 'Untitled Course';

  const cacheKey = `ai:outline:${courseId || 't:' + sha1(courseTitle)}:lvl=${level}:min=${targetMinutes}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.outline?.length) return cached.outline;

  if (breakerActive()) return makeFallbackOutline(courseTitle);

  const json = await aiJson({
    system: `You are an instructional designer. Output JSON:
{
  "outline":[
    {"id":"w1","title":"...","keyPoints":["...","..."]},
    ...
  ]
}
Keep it ${level}, 3–7 sections total, suitable for ~${targetMinutes} minutes. Key points must be concrete and assessable.`,
    user: `Course: ${courseTitle}\nDescription: ${courseDesc}\nMake it crisp, practical, and testable.`,
    temperature: 0.3,
  });
  const outline = Array.isArray(json.outline) ? json.outline : [];
  if (!outline.length) return makeFallbackOutline(courseTitle);
  await cacheSetJSON(cacheKey, { outline }, REDIS_TTL.outline);
  return outline;
}

async function _coreGenerateLessons({ courseId, outline, voiceName = 'en-US-JennyNeural' }) {
  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  const courseTitle = cq.rowCount ? cq.rows[0].title : 'Course';

  const outlineHash = sha1(outline);
  const cacheKey = `ai:ssml:lessons:${courseId}:voice=${voiceName}:ol=${outlineHash}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.lessons?.length) return cached;

  const scaffoldFromOutline = () => {
    const lessons = outline.map((o, idx) => {
      const title = o?.title || `Lesson ${idx + 1}`;
      const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];
      const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
      <p><mark name="L${idx + 1}.S1"/>Welcome to ${title} in ${courseTitle}.</p>
      ${kp.map((k, i) => `      <p><mark name="L${idx + 1}.S${i + 2}"/>Key point: ${k}</p>`).join('\n')}
      <break time="1200ms"/>
      <p><mark name="L${idx + 1}.S9"/>This concludes ${title}. In the next lesson, we'll continue.</p>
    </prosody>
  </voice>
</speak>`.trim();
      return { id: `L${idx + 1}`, title, goals: kp, ssml, estSeconds: 90 };
    });
    const joinedSsml = lessons
      .map((l, i) =>
        i === 0
          ? l.ssml
          : l.ssml.replace(
              /<\/speak>\s*$/i,
              `<p><break time="2000ms"/></p></prosody></voice></speak>`
            )
      )
      .join('\n\n');
    return { lessons, joinedSsml };
  };

  if (breakerActive()) return scaffoldFromOutline();

  const outlineStr = outline
    .map((o, i) => `Section ${i + 1}: ${o.title} — ${o.keyPoints?.join('; ') || ''}`)
    .join('\n');

  const json = await aiJson({
    system: `You are an instructional designer and voice scriptwriter.
Return JSON in EXACT shape:
{
  "lessons": [
    {
      "id": "L1",
      "title": "string",
      "goals": ["string", "string"],
      "estSeconds": 60,
      "ssml": "<speak ...>...</speak>"
    }
  ]
}
Guidelines:
- 4–8 lessons total, each 60–180 seconds.
- Use Azure SSML with: <speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="0%" pitch="+0st"> ... </prosody></voice></speak>
- Keep paragraphs short (<p> blocks), add subtle <break time="400ms"/> between ideas.
- For sentence-level sync, insert <mark name="L{index}.S{n}"/> at the START of each <p>. (Example: <p><mark name="L2.S3"/>Text…</p>)
- Use clear, teacherly tone. No code fences. No extra keys.`,
    user: `Course: ${courseTitle}
Sections:
${outlineStr}
Write a separate, self-contained lesson for each section with a natural intro and recap.`,
    temperature: 0.4,
  });

  const lessonsRaw = Array.isArray(json?.lessons) ? json.lessons : [];
  const lessons = lessonsRaw
    .map((l, idx) => {
      const id = l?.id || `L${idx + 1}`;
      const title = String(l?.title || outline[idx]?.title || `Lesson ${idx + 1}`);
      const goals = Array.isArray(l?.goals) ? l.goals.slice(0, 6) : [];
      const estSeconds = Number(l?.estSeconds || 90);
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

      if (!/<mark\s+name=/.test(ssml)) {
        ssml = ssml.replace(
          /<prosody[^>]*>/i,
          (m) => `${m}\n      <p><mark name="${id}.S1"/>${title}</p>\n      <break time="400ms"/>`
        );
      }

      return { id, title, goals, ssml: ssml.trim(), estSeconds };
    })
    .filter((l) => l?.ssml && l?.title);

  if (!lessons.length) return scaffoldFromOutline();

  const joinedSsml = lessons
    .map((l, i) =>
      i === 0
        ? l.ssml
        : l.ssml.replace(
            /<\/speak>\s*$/i,
            `<p><break time="2500ms"/></p></prosody></voice></speak>`
          )
    )
    .join('\n\n');

  const payload = { lessons, joinedSsml };
  await cacheSetJSON(cacheKey, payload, REDIS_TTL.ssml);
  return payload;
}

async function _coreGenerateQuiz({ courseId, outline, numQuestions = 8 }) {
  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  const courseTitle = cq.rowCount ? cq.rows[0].title : 'Course';

  const olHash = sha1(outline);
  const cacheKey = `ai:quiz:${courseId}:n=${numQuestions}:ol=${olHash}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.quiz?.questions?.length) return cached.quiz;

  if (breakerActive()) {
    return { questions: makeFallbackQuiz(courseTitle, outline, numQuestions) };
  }

  const json = await aiJson({
    system: `Create a multiple-choice quiz JSON:
{
  "questions":[
    {"id":"q1","prompt":"...","choices":["A","B","C","D"],"answerIndex":1},
    ...
  ]
}
Exactly ${numQuestions} questions. One correct answer each. Prompts must be unambiguous. Choices concise.`,
    user: `Course: ${courseTitle}
Key sections:
${outline.map((o) => `- ${o.title}: ${o.keyPoints.join(', ')}`).join('\n')}
Test the most important points only.`,
    temperature: 0.2,
  });

  const quiz = { questions: Array.isArray(json.questions) ? json.questions : [] };
  if (!quiz.questions.length) return { questions: makeFallbackQuiz(courseTitle, outline, numQuestions) };

  await cacheSetJSON(cacheKey, { quiz }, REDIS_TTL.quiz);
  return quiz;
}

/**
 * POST /api/ai/course-package
 * Body: { courseId, level, targetMinutes, voiceName, numQuestions }
 * Returns: { outline, lessons, joinedSsml, quiz, notice? }
 */
export async function generateCoursePackage(req, res) {
  try {
    await withGate(async () => {
      const {
        courseId,
        level = 'beginner',
        targetMinutes = 12,
        voiceName = 'en-US-JennyNeural',
        numQuestions = 8,
      } = req.body || {};

      if (!courseId) return res.status(400).json({ error: 'courseId is required' });

      // Load course meta
      const { rows } = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
      if (!rows?.length) return res.status(404).json({ error: 'COURSE_NOT_FOUND' });
      const courseTitle = rows[0].title || 'Course';
      const courseDesc = rows[0].description || '';

      // 1) Outline
      let outline;
      try {
        outline = await _coreGenerateOutline({ courseId, title: courseTitle, level, targetMinutes, courseDesc });
      } catch (e) {
        const kind = e?.aiKind;
        if (kind === 'quota') { tripBreaker(10); }
        outline = makeFallbackOutline(courseTitle);
      }

      // 2) Lessons
      let lessonsPack;
      try {
        lessonsPack = await _coreGenerateLessons({ courseId, outline, voiceName });
      } catch (e) {
        const kind = e?.aiKind;
        if (kind === 'quota') { tripBreaker(10); }
        // scaffold fallback
        const outlineScaffold = outline?.length ? outline : makeFallbackOutline(courseTitle);
        const idxOutline = outlineScaffold.map((o, idx) => ({ ...o, _idx: idx }));
        const lessons = idxOutline.map((o) => ({
          id: `L${o._idx + 1}`,
          title: o.title,
          goals: Array.isArray(o.keyPoints) ? o.keyPoints.slice(0, 4) : [],
          ssml: `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="0%" pitch="+0st">
      <p><mark name="L${o._idx + 1}.S1"/>Welcome to ${o.title} in ${courseTitle}.</p>
      <p><mark name="L${o._idx + 1}.S2"/>We will cover the essentials and a quick example.</p>
    </prosody>
  </voice>
</speak>`.trim(),
          estSeconds: 75
        }));
        const joinedSsml = lessons.map(l => l.ssml).join('\n\n');
        lessonsPack = { lessons, joinedSsml, notice: fallbackNotice('insufficient_quota') };
      }

      // 3) Quiz
      let quiz;
      try {
        quiz = await _coreGenerateQuiz({ courseId, outline, numQuestions });
      } catch (e) {
        const kind = e?.aiKind;
        if (kind === 'quota') { tripBreaker(10); }
        quiz = { questions: makeFallbackQuiz(courseTitle, outline, numQuestions) };
      }

      return res.json({ outline, ...lessonsPack, quiz, notice: lessonsPack?.notice });
    });
  } catch (err) {
    console.error('[ai] generateCoursePackage error:', err);
    if (err?._serverBusy) { res.set('Retry-After', '3'); return res.status(503).json({ error: 'Server busy. Please retry.' }); }
    return res.status(500).json({ error: 'Failed to generate course package' });
  }
}
