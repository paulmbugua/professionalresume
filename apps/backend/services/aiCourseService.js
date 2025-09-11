// apps/backend/services/aiCourseService.js
import 'dotenv/config';
import pool from '../config/db.js';

import {
  // logging
  LOG_NS, log, dlog,
  // openai + timing utils
  openai, OPENAI_REQUEST_TIMEOUT_MS, withTimeout,
  // cache helpers + TTLs
  REDIS_TTL, cacheGetJSON, cacheSetJSON, cacheBustCourse,
  // control flow + breaker
  withGate, breakerActive, tripBreaker, fallbackNotice,
  // error utils
  classifyOpenAIError,
  // schemas & ai helpers
  LESSON_PACK_SCHEMA, QUIZ_SCHEMA, OUTLINE_SCHEMA, aiJson,
  // sizing + pacing
  resolveCourseSize, lessonsForTrack, totalLessonsOf, defaultTargetMinutesOf, paceFor,
  // content helpers
  sanitizeSsml, aiTeachabilityScore, inferLessonSignals,
  // misc
  sha1,
} from './aiCourseCore.js';

/* ─────────────────────────────────────────────────────────
 * Re-export selected core utilities so existing imports don't break
 * ───────────────────────────────────────────────────────── */
export { withGate, cacheBustCourse, sanitizeSsml, cacheDeleteByPattern } from './aiCourseCore.js';

/* ─────────────────────────────────────────────────────────
 * Length helpers
 * ───────────────────────────────────────────────────────── */
function wordCountFromSsml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
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

export async function generateOutlineService({
  courseId,
  title,
  level,
  targetMinutes,
  courseSize,
  totalLessons: explicitLessons,
  programTrack,
}) {
  dlog('outline', 'enter', {
    courseId,
    title: Boolean(title),
    level,
    targetMinutes,
    courseSize,
    explicitLessons,
    programTrack,
  });

  // Load DB meta
  let courseTitle = title || 'Untitled Course';
  let courseDesc = '';
  if (courseId) {
    const cq = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
    if (cq.rowCount) {
      courseTitle = cq.rows[0].title || courseTitle;
      courseDesc = cq.rows[0].description || '';
    }
  }

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize, programTrack });
  dlog('outline', 'size preset', { preset: preset?.key });

  // 1) Decide how many lessons to create
    // 1) Decide how many lessons to create (track + size cooperate)
  let totalLessons;
  if (Number.isFinite(Number(explicitLessons)) && Number(explicitLessons) > 0) {
    totalLessons = Math.max(1, Math.min(500, Number(explicitLessons))); // explicit override
  } else {
    const fromTrack = lessonsForTrack(programTrack);   // e.g., module=8, certificate=20, ...
    const fromSize  = totalLessonsOf(preset);          // e.g., mini=6, standard=16, ...
    // Prefer the stronger guidance so size presets aren’t “capped” by a smaller track
    totalLessons = Math.max(fromTrack || 0, fromSize || 0) || 8; // final fallback 8
  }


  // 2) Decide total minutes (if caller didn’t pass)
  let target =
    Number.isFinite(Number(targetMinutes)) && Number(targetMinutes) > 0
      ? Number(targetMinutes)
      : defaultTargetMinutesOf(preset);

  // Ensure at least 3 minutes per lesson
 if (totalLessons > 0) {
   const minPerLesson = 3;
   const minTotal = minPerLesson * totalLessons;
   if (target < minTotal) target = minTotal;
}

  dlog('outline', 'computed plan', { totalLessons, targetMinutesTotal: target, fromTrack: lessonsForTrack(programTrack), fromSize: totalLessonsOf(preset) });

  const cacheKey = `ai:outline:${courseId || 't:' + sha1(courseTitle)}:size=${preset.key}:lvl=${level}:lessons=${totalLessons}:min=${target}:track=${programTrack || ''}`;
  const cached = await cacheGetJSON(cacheKey);
  if (cached?.outline?.length) {
    dlog('outline', 'cache HIT', { len: cached.outline.length });
    return {
      status: 200,
      data: { outline: cached.outline.slice(0, totalLessons) },
      headers: {
        'X-Cache': 'HIT',
        'X-Size-Key': preset.key,
        'X-Computed-Lessons': String(totalLessons),
        'X-Target-Minutes': String(target),
      },
    };
  }

  if (breakerActive()) {
    console.warn(`[${LOG_NS}:outline] breaker active; serving fallback`);
    return {
      status: 503,
      data: {
        outline: makeFallbackOutline(courseTitle).slice(0, totalLessons),
        notice: fallbackNotice('breaker_active'),
      },
      headers: {
        'Retry-After': '600',
        'X-Size-Key': preset.key,
        'X-Computed-Lessons': String(totalLessons),
        'X-Target-Minutes': String(target),
      },
    };
  }

const perItemTokens = 70; // conservative budget per lesson (title + 3 kp)
const wantTokens = Math.min(12000, Math.max(1200, perItemTokens * totalLessons + 300));

// Distribute a fair share of the global token ceiling to each slice
function maxTokensForSlice(count) {
  const proportional = Math.floor(wantTokens * (count / Math.max(1, totalLessons)));
  const heuristic    = perItemTokens * count + 200;           // ~60–70 per item + overhead
  const elasticFloor = Math.min(1000, Math.max(200, 50*count + 200)); // 200–1000
  return Math.min(6000, Math.max(elasticFloor, Math.min(proportional, heuristic)));
}

// helper: ask for a slice and force schema
// helper: ask for a slice and force schema
async function genSlice(start, count, overrideMaxTokens) {
  const endAbs = start + count; // absolute 1-based in copy below is cosmetic only
  const kpNote = count > 30 ? '2–3' : '3–5';

  // Use the caller-provided cap if present; otherwise default to our heuristic
  const localMax = (Number.isFinite(overrideMaxTokens) && overrideMaxTokens > 0)
    ? Math.floor(overrideMaxTokens)
    : maxTokensForSlice(count);

  dlog('outline', 'slice budget', {
    start, count,
    maxTokens: localMax,
    wantTokens,
    totalLessons
  });

  const json = await withGate(
    'openai:outline',
    process.env.NODE_ENV === 'production' ? 1 : 2,
    () => aiJson({
      system:
        `You are an instructional designer. Return ONLY JSON matching the schema.\n` +
        `Level: ${level || 'beginner'}.\n` +
        `Create EXACTLY ${count} sections for a ~${target} minute course.\n` +
        `Each section: short, clear title + ${kpNote} concrete, testable key points.`,
      user:
        `Course: ${courseTitle}\n` +
        (courseDesc ? `Description: ${courseDesc}\n` : '') +
        `Sections ${start + 1}–${endAbs} of ${totalLessons}. Keep it crisp, practical, testable.`,
      temperature: 0.3,
      maxTokens: Math.max(1, localMax), // tiny safety floor so 0 doesn't break the call
      tries: 3,
      schema: OUTLINE_SCHEMA
    })
  );

  const arr = Array.isArray(json?.outline) ? json.outline : [];
  return arr.slice(0, count);
}


let outline = [];
try {
  // chunk if large
  const CHUNK = totalLessons > 40 ? 20 : totalLessons > 30 ? 30 : totalLessons;

  // NEW: strict global token budget control
  let budgetRemaining = wantTokens;

  for (let i = 0; i < totalLessons; i += CHUNK) {
    const take = Math.min(CHUNK, totalLessons - i);

    // Share of the budget for this slice, hard-capped by what's left
    const capForThisSlice = Math.min(maxTokensForSlice(take), Math.max(0, budgetRemaining));

    // try the AI slice; if no budget left, or call fails, fall back to deterministic filler
    let slice = [];

    if (capForThisSlice > 0) {
      try {
        slice = await genSlice(i, take, capForThisSlice);
      } catch (e) {
        console.warn(`[${LOG_NS}:outline] slice ${i}-${i + take - 1} failed; using fallback`, e?.message);
      }
    } else {
      dlog('outline', 'budget exhausted; using fallback', { start: i, count: take, budgetRemaining });
    }

    if (!slice.length) {
      const fb = makeFallbackOutline(courseTitle).slice(0, take);
      // give unique ids/titles per absolute index
      slice = fb.map((s, k) => ({ ...s, id: `w${i + k + 1}` }));
    }

    outline.push(...slice);

    // Decrement global budget by what we *allowed* this slice to use
    budgetRemaining = Math.max(0, budgetRemaining - capForThisSlice);
  }

  outline = outline.slice(0, totalLessons);

  await cacheSetJSON(cacheKey, { outline }, REDIS_TTL.outline);
  dlog('outline', 'success', { len: outline.length });
  return {
    status: 200,
    data: { outline },
    headers: {
      'X-Cache': 'MISS',
      'X-Size-Key': preset.key,
      'X-Computed-Lessons': String(totalLessons),
      'X-Target-Minutes': String(target),
    },
  };
} catch (err) {
    const c = classifyOpenAIError(err);
    console.warn(`[${LOG_NS}:outline] error`, { kind: c.kind, status: c.status, msg: err?.message });
    if (c.kind === 'quota') {
      tripBreaker(10);
      return {
        status: 503,
        data: {
          outline: makeFallbackOutline(courseTitle).slice(0, totalLessons),
          notice: fallbackNotice('insufficient_quota'),
        },
        headers: {
          'Retry-After': String(c.retryAfterSec || 600),
          'X-Size-Key': preset.key,
          'X-Computed-Lessons': String(totalLessons),
          'X-Target-Minutes': String(target),
        },
      };
    }
    if (c.kind === 'rate_limit') {
      return {
        status: 503,
        data: {
          outline: makeFallbackOutline(courseTitle).slice(0, totalLessons),
          notice: fallbackNotice('rate_limited'),
        },
        headers: {
          'Retry-After': String(c.retryAfterSec || 20),
          'X-Size-Key': preset.key,
          'X-Computed-Lessons': String(totalLessons),
          'X-Target-Minutes': String(target),
        },
      };
    }
    if (c.kind === 'auth') {
      return { status: 401, data: { error: 'OpenAI API key invalid or unauthorized' }, headers: {} };
    }
    if (c.kind === 'timeout') {
      return {
        status: 503,
        data: { error: 'AI service timeout. Please try again.' },
        headers: { 'Retry-After': '5', 'X-Size-Key': preset.key, 'X-Computed-Lessons': String(totalLessons), 'X-Target-Minutes': String(target) },
      };
    }
    if (c.kind === 'network') {
      return {
        status: 503,
        data: { error: 'AI network error. Please retry shortly.' },
        headers: { 'Retry-After': '10', 'X-Size-Key': preset.key, 'X-Computed-Lessons': String(totalLessons), 'X-Target-Minutes': String(target) },
      };
    }
        // LAST RESORT: do not 502 with empty payloads for big tracks — degrade gracefully
    const fb = makeFallbackOutline(courseTitle).slice(0, totalLessons);
    return {
      status: 206,
      data: { outline: fb, notice: fallbackNotice('outline_repaired_or_fallback') },
      headers: { 'X-Degraded': 'true', 'X-Computed-Lessons': String(totalLessons), 'X-Target-Minutes': String(target) }
    };
  }
}

/* ─────────────────────────────────────────────────────────
 * Artifact anchoring + SSML repairs
 * ───────────────────────────────────────────────────────── */
function ensureAnchorsForArtifacts(lesson, ssml) {
  const body = (ssml.match(/<prosody[^>]*>([\s\S]*?)<\/prosody>/i)?.[1] || ssml)
                .replace(/<[^>]+>/g, ' ');
  const sentenceCount =
    (body.match(/[.?!]+["')\]]?/g) || []).length || 1;
  const safeIndex = (i) => Math.max(1, Math.min(i, sentenceCount)); // 1-based
  const spread = (n) =>
    Array.from({ length: n }, (_, i) =>
      safeIndex(1 + Math.floor((i * sentenceCount) / Math.max(1, n)))
    );

  if (Array.isArray(lesson.formulas) && lesson.formulas.length) {
    const slots = spread(lesson.formulas.length);
    lesson.formulas = lesson.formulas.map((f, i) => ({
      ...f,
      announceAtSentence: Number.isFinite(Number(f?.announceAtSentence))
        ? f.announceAtSentence
        : slots[i] || 1,
    }));
  }
  if (Array.isArray(lesson.tables) && lesson.tables.length) {
    const slots = spread(lesson.tables.length);
    lesson.tables = lesson.tables.map((t, i) => ({
      ...t,
      announceAtSentence: Number.isFinite(Number(t?.announceAtSentence))
        ? t.announceAtSentence
        : slots[i] || 1,
    }));
  }
  
   if (Array.isArray(lesson.charts)   && lesson.charts.length)   {
    const slots = spread(lesson.charts.length);
    lesson.charts = lesson.charts.map((ch, i) => ({
      ...ch,
      announceAtSentence: Number.isFinite(Number(ch?.announceAtSentence))
        ? ch.announceAtSentence
        : slots[i] || 1,
    }));
  }

  if (Array.isArray(lesson.images) && lesson.images.length) {
  const slots = spread(lesson.images.length);
  lesson.images = lesson.images.map((im, i) => ({
    ...im,
    announceAtSentence: Number.isFinite(Number(im?.announceAtSentence))
      ? im.announceAtSentence
      : slots[i] || 1,
  }));
}
if (Array.isArray(lesson.snippets) && lesson.snippets.length) {
  const slots = spread(lesson.snippets.length);
  lesson.snippets = lesson.snippets.map((sn, i) => ({
    ...sn,
    announceAtSentence: Number.isFinite(Number(sn?.announceAtSentence))
      ? sn.announceAtSentence
      : slots[i] || 1,
  }));
}

  return lesson;
}

function closeProsodyIfMissing(ssml) {
  const opens  = (ssml.match(/<prosody\b/gi) || []).length;
  const closes = (ssml.match(/<\/prosody>/gi) || []).length;
  if (opens > closes) {
    const need = opens - closes;
    return ssml.replace(/<\/voice>\s*<\/speak>\s*$/i, `${'</prosody>'.repeat(need)}</voice></speak>`);
  }
  return ssml;
}

// Extract the inner content of a <prosody> ... </prosody> block
function innerProsody(ssml) {
  const m = String(ssml).match(/<prosody[^>]*>([\s\S]*?)<\/prosody>/i);
  return (m ? m[1] : String(ssml)).trim();
}

export async function generateLessonSSMLService({ 
  courseId,
  outline,
  voiceName,
  courseSize,
  count,
  start = 0, // NEW: offset for paging
  programTrack,
}) {
  log('log', 'lesson', 'enter', {
    courseId,
    outlineIsArray: Array.isArray(outline),
    outlineLen: Array.isArray(outline) ? outline.length : 0,
    start,
    count,
    voiceName,
    courseSize,
  });

  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  if (!cq.rowCount) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = cq.rows[0].title || 'Course';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize, programTrack });
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
  const wantCount = Math.max(1, Number.isFinite(Number(count)) ? Number(count) : 1);
  const takeCount = Math.max(1, Math.min(wantCount, Math.max(1, outline.length - safeStart)));
  const outlineSlice = outline.slice(safeStart, safeStart + takeCount);

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
    const produced = Number(cached?.lessons?.length ?? takeCount);
    const hasMore = safeStart + produced < outline.length;
    const nextStart = hasMore ? safeStart + produced : null;
    return {
      status: 200,
      data: { ...cached, queue: { nextStart, hasMore, total: outline.length } },
      headers: {
        'X-Cache': 'HIT',
        'X-Next-Start': nextStart != null ? String(nextStart) : '',
        'X-Has-More': String(hasMore),
        'X-Total-Lessons': String(outline.length),
        'X-TTS-Rate': pace.ratePct,
        'X-TTS-ParaBreakMs': String(pace.paraBreakMs),
        'X-TTS-SectionBreakMs': String(pace.sectionBreakMs),
        'X-Voice': voiceName || '',
      }
    };
  }

  const scaffoldFromOutline = () => {
    const o = outlineSlice[0];
    const absoluteIdx = safeStart;
    const id = `L${absoluteIdx + 1}`;
    const title = o?.title || `Lesson ${absoluteIdx + 1}`;
    const kp = Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4) : [];
    const goalsLine = kp.length ? kp.join('; ') : 'a small set of core ideas';
    const ssml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
      <p><bookmark mark="${id}.S1"/>${title}. We’ll work through ${goalsLine}, keeping it practical and clear.</p>
      <p><bookmark mark="${id}.S2"/>We’ll return with a full narration shortly if the AI is temporarily unavailable.</p>
    </prosody>
  </voice>
</speak>`.trim();

    return {
      lessons: [{
        id, title, goals: kp, ssml,
        estSeconds: Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2),
        markdown: `### ${title}\n\n- Goals: ${kp.map((g)=>`**${g}**`).join(', ') || 'Understand the core idea and check yourself once.'}\n- Pitfall: confusing definitions with examples.\n- Try: explain the idea to a friend in one sentence.`,
        formulas: [], tables: [],
      }],
      joinedSsml: ssml
    };
  };

  if (breakerActive()) {
    console.warn(`[${LOG_NS}:lesson] breaker active; returning scaffold only`);
    const pack = scaffoldFromOutline();
    const produced = pack.lessons?.length ?? 0;
    const hasMore = safeStart + produced < outline.length;
    const nextStart = hasMore ? safeStart + produced : null;
    return {
      status: 503,
      data: { ...pack, notice: fallbackNotice('breaker_active'), queue: { nextStart, hasMore, total: outline.length } },
      headers: { 'Retry-After': '600' },
    };
  }

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
 - (Keep paragraphs short)
 - (Natural, teacherly tone)
 - (Do not use literal labels like "Hook:", "Core concept:", "Micro-check:", or "Recap:")`;

    const user = `Course: ${courseTitle}
Absolute lesson #: ${absoluteIdx + 1}
Title: ${title}
Goals: ${kp.join('; ') || 'Teach the core concept, give one tight example, call out a pitfall, run a micro-check, and recap.'}
Write the narration.`;

    const content = await withTimeout(async (signal) => {
      const r = await withGate(
        'openai:ssml',
        process.env.NODE_ENV === 'production' ? 1 : 2,
        () => openai.chat.completions.create(
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
        )
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

    // Sanitize and then enforce length
    ssml = sanitizeSsml(ssml, id, voiceName, { ratePct: pace.ratePct, breakMs: pace.paraBreakMs, sentencesPerPara: 2, dedupe: false });
    ssml = closeProsodyIfMissing(ssml);

    const minWords = preset.wordsMin;
    if (wordCountFromSsml(ssml) < Math.floor(minWords * 0.9)) {
      const expandSystem = `You expand Azure SSML while keeping the same wrapper and voice.
Return ONLY valid SSML. Append 4–6 new <p> blocks that deepen the worked example,
add a brief pitfall explanation, a realistic micro-check, and a plain-English recap.
Do not use literal labels like "Hook:" etc. Keep the same prosody rate (${pace.ratePct}).`;
      const expandUser = `Here is the current SSML for lesson ${id}. Expand it to ~${minWords} words total:\n\n${ssml}`;

      const expanded = await withTimeout(async (signal) => {
        const r = await withGate(
          'openai:ssml:expand',
          process.env.NODE_ENV === 'production' ? 1 : 2,
          () => openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.3,
            messages: [{ role: 'system', content: expandSystem }, { role: 'user', content: expandUser }],
            max_tokens: 1400,
          }, { signal })
        );
        return r.choices?.[0]?.message?.content || ssml;
      }, OPENAI_REQUEST_TIMEOUT_MS);

      ssml = sanitizeSsml(expanded, id, voiceName, { ratePct: pace.ratePct, breakMs: pace.paraBreakMs, sentencesPerPara: 2, dedupe: false });
      ssml = closeProsodyIfMissing(ssml);
    }

    const syntheticSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><rect width="300" height="160" fill="#f6f7fb"/><circle cx="70" cy="80" r="28" fill="#c4d7ff"/><rect x="120" y="60" width="150" height="40" fill="#b8e3d0"/></svg>';
const estSeconds = Math.round((preset.estAudioMinSec + preset.estAudioMaxSec) / 2);
 const lesson = {
   id, title, goals: kp, ssml: ssml.trim(), estSeconds,
   markdown: `## Illustrations\n![Simple schematic](data:image/svg+xml;utf8,${encodeURIComponent(syntheticSvg)})`,
   formulas: [], tables: [],
   images: [{ id: `${id}-im1`, title: 'Simple schematic', alt: 'Simple schematic', url: `data:image/svg+xml;utf8,${encodeURIComponent(syntheticSvg)}`, caption: 'Generated placeholder', announceAtSentence: 1 }],
   charts: []
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
      count: takeCount,
    });

    const signals = inferLessonSignals(courseTitle, outlineSlice[0]);
    const minTables   = signals.wantTable ? 1 : 0;
    const minImages   = signals.minImages || 0;
    const minSnippets = signals.minSnippets || 0;

    const json = await withGate(
      'openai:lesson',
      process.env.NODE_ENV === 'production' ? 1 : 2,
      () => aiJson({
        system: `You are a master teacher writing **natural** SSML for narrated lessons.
Return JSON STRICTLY matching the provided JSON Schema. Do not include Markdown code fences or any text outside the JSON fields.
The JSON MUST contain a "lessons" array of EXACTLY ${takeCount} item(s)—one per section in the request slice.

Guidelines for each lesson (write *naturally*, no section labels):
- Target ~${targetWords} words (min ${preset.wordsMin}, soft max ${maxWords}); present tense; conversational and clear.
- Structure as ${paraMin}–${paraMax} paragraphs. Each <p> has ${sentencesPerPara} short sentences (≤ 140 chars).
- Insert <bookmark mark="L{ABS}.S{n}"/> at the start of EVERY <p>, where ABS is the absolute 1-based lesson number in the whole course.
- Wrap Azure SSML exactly:
  <speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts"><voice name="${voiceName}"><prosody rate="${pace.ratePct}" pitch="+0st"> ... </prosody></voice></speak>

Content artifacts (MANDATORY):
- "markdown": slide-style notes in GFM. Use headings + bullet points — no literal labels like "Hook:" or "Recap:". Include:
  • a **Formulas** section with $$ LaTeX $$ for each formula you output, and
  • a **Quick table(s)** section with compact GFM tables (| col | … |),
  • if visuals help, an **Illustrations** section containing Markdown images: \`![alt](URL-or-dataURI)\` with short captions,
  • if programming-related, a **Code snippets** section with fenced blocks (language-tagged), plus a one-line explanation per snippet.
- "formulas": include >= ${(signals.minFormulas ?? 2)} if the topic is quantitative; otherwise [].
  Each item: { id:"f1..", title, latex, speakAs∈{"math","spell-out","characters","none"}, variables:{symbol, meaning}, announceAtSentence:<1-based index> }.
  In narration, explain equations ... and say **“of” for parentheses** (e.g., f(x) → “f of x”).
- "tables": include >= ${(typeof minTables !== 'undefined' ? minTables : 1)} if comparing steps/items; otherwise []. Keep compact.
 - "images": include >= ${minImages}. Each item MUST include:
   { id, title, alt, url, caption, announceAtSentence }.
   Prefer simple line-diagram-style illustrations. Use https or data URLs.

- "charts": when appropriate, include ≥ 1. Each MUST be:
  { id, title, kind∈[bar|line|pie|histogram|scatter|box|heatmap|other], alt, caption,
    url, svg, announceAtSentence }.
  Include BOTH keys "url" and "svg": put the rendered SVG string in "svg" and set "url" to null,
  OR host it and put the link in "url" and set "svg" to null. Do not omit either key.

- "charts": when appropriate (comparisons, distributions, proportions), include >= 1 of: bar, line, pie, histogram, scatter, box, heatmap. Prefer **data:image/svg+xml;utf8,<svg...>** in "url"; if you instead return raw SVG, put it in "svg".
- "snippets": include >= ${minSnippets} when the section is programming-related. Each: { id, title, language, code, explanation, announceAtSentence }. Keep code runnable and concise.`,
        user: `Course: ${courseTitle}
START_INDEX (0-based in full course): ${safeStart}
Sections (absolute numbering shown):
${outlineStr}
Write one self-contained lesson per section with a hook, goals, core concept, worked example, pitfall, a micro-check, and a recap.`,
        temperature: 0.35,
        maxTokens: 4500,
        schema: LESSON_PACK_SCHEMA,
        tries: 3
      })
    );

    const rawCount = Array.isArray(json?.lessons) ? json.lessons.length : 0;
    dlog('lesson', 'openai returned', { rawCount });

    // Build lessons with awaitable expansion guard
    const lessons = [];
    const rawLessons = Array.isArray(json?.lessons) ? json.lessons : [];

    for (let i = 0; i < rawLessons.length; i++) {
      const l = rawLessons[i];
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

      // Sanitize first (keeps structure), no aggressive dedupe
      ssml = sanitizeSsml(ssml, id, voiceName, {
        ratePct: pace.ratePct,
        breakMs: pace.paraBreakMs,
        sentencesPerPara: 2,
        dedupe: false,
      });
      ssml = closeProsodyIfMissing(ssml);

      // Enforce preset length if short (≈90% of wordsMin)
      const minWords = preset.wordsMin;
      if (wordCountFromSsml(ssml) < Math.floor(minWords * 0.9)) {
        const expandSystem = `You expand Azure SSML while keeping the same wrapper and voice.
Return ONLY valid SSML. Append 4–6 new <p> blocks that deepen the worked example,
add a brief pitfall explanation, a realistic micro-check, and a plain-English recap.
Do not use literal labels like "Hook:" etc. Keep the same prosody rate (${pace.ratePct}).`;
        const expandUser = `Here is the current SSML for lesson ${id}. Expand it to ~${minWords} words total:\n\n${ssml}`;

        const expanded = await withTimeout(async (signal) => {
          const r = await withGate(
            'openai:ssml:expand',
            process.env.NODE_ENV === 'production' ? 1 : 2,
            () => openai.chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              temperature: 0.3,
              messages: [{ role: 'system', content: expandSystem }, { role: 'user', content: expandUser }],
              max_tokens: 1400,
            }, { signal })
          );
          return r.choices?.[0]?.message?.content || ssml;
        }, OPENAI_REQUEST_TIMEOUT_MS);

        ssml = sanitizeSsml(expanded, id, voiceName, {
          ratePct: pace.ratePct,
          breakMs: pace.paraBreakMs,
          sentencesPerPara: 2,
          dedupe: false,
        });
        ssml = closeProsodyIfMissing(ssml);
      }

      const markdown = typeof l?.markdown === 'string' ? l.markdown : '';
      const formulas = Array.isArray(l?.formulas) ? l.formulas : [];
      const tables   = Array.isArray(l?.tables) ? l.tables : [];
      const charts   = Array.isArray(l?.charts) ? l.charts : [];
       const images   = Array.isArray(l?.images) ? l.images : [];
      const snippets = Array.isArray(l?.snippets) ? l.snippets : [];

      let lesson = { id, title, goals, ssml: ssml.trim(), estSeconds, markdown, formulas, tables, charts, images, snippets };
      lesson = ensureAnchorsForArtifacts(lesson, lesson.ssml);
      lessons.push(lesson);
    }

    // Ensure markdown contains sections for any formulas/tables if missing
    function renderGfmTable(t) {
      const head = `| ${t.columns.join(' | ')} |\n| ${t.columns.map(() => '-').join(' | ')} |`;
      const body = t.rows.map(r => `| ${r.map(x => String(x)).join(' | ')} |`).join('\n');
      return `\n**${t.title || 'Table'}**${t.caption ? ` — _${t.caption}_` : ''}\n\n${head}\n${body}\n`;
    }

    const svgToDataUrl = (svg) =>
      `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    function renderChart(ch) {
  const alt = (ch.alt || ch.title || ch.kind || 'Chart').replace(/\|/g,'-');
  const inlineSvg = typeof ch.svg === 'string' && ch.svg.trim() ? svgToDataUrl(ch.svg) : '';
  const url = (typeof ch.url === 'string' && ch.url.trim()) ? ch.url : inlineSvg;
  if (url) {
    const title = ch.title || (ch.kind ? ch.kind[0].toUpperCase() + ch.kind.slice(1) : 'Chart');
    return `\n**${title}**${ch.caption ? ` — _${ch.caption}_` : ''}\n\n![${alt}](${url})\n`;
  }
  return `\n**${ch.title || 'Chart'}**${ch.caption ? ` — _${ch.caption}_` : ''}\n`;
}


          function renderImage(im) {
        const alt = (im.alt || im.title || 'Illustration').replace(/\|/g,'-');
        if (im.url) return `\n**${im.title || 'Illustration'}**${im.caption ? ` — _${im.caption}_` : ''}\n\n![${alt}](${im.url})\n`;
        return `\n**${im.title || 'Illustration'}**${im.caption ? ` — _${im.caption}_` : ''}\n`;
      }
      function renderSnippet(sn) {
        const map = { 'ts': 'typescript', 'c#': 'csharp', 'c++': 'cpp' };
        const raw = (sn.language || '').toLowerCase();
        const lang = map[raw] || raw;
        const header = `\n**${sn.title || 'Code snippet'}**${sn.explanation ? ` — _${sn.explanation}_` : ''}\n\n`;
        return `${header}\`\`\`${lang}\n${sn.code || ''}\n\`\`\`\n`;
      }


    
      
  const enhanced = lessons.map(L => {
    let md = String(L.markdown || '').trim();

    const hasAnyLatex      = /\$\$[^$]+\$\$/.test(md);
    const hasAnyTable      = /\|.+\|/.test(md);
    const hasChartsSection = /(^|\n)##\s*Charts\b/i.test(md);
    const hasAnyImage      = /!\[[^\]]*\]\([^)]+\)/.test(md);
    const hasAnyFence      = /```/.test(md);

    // Charts: insert section only if a "## Charts" section isn't already present
    if (L.charts?.length && !hasChartsSection) {
      md += `\n\n## Charts\n` + L.charts.map(renderChart).join('\n');
    }

    if (L.formulas?.length && !hasAnyLatex) {
      md += `\n\n## Formulas\n` + L.formulas
        .map(f => `**${f.title || f.id}**\n\n$$\n${f.latex}\n$$`)
        .join('\n\n');
    }

    if (L.tables?.length && !hasAnyTable) {
      md += `\n\n## Quick table(s)\n` + L.tables.map(renderGfmTable).join('\n');
    }

    // (removed the duplicate charts block that referenced hasAnyChart)

    if (L.images?.length && !hasAnyImage) {
      md += `\n\n## Illustrations\n` + L.images.map(renderImage).join('\n');
    }

    if (L.snippets?.length && !hasAnyFence) {
      md += `\n\n## Code snippets\n` + L.snippets.map(renderSnippet).join('\n');
    }

    return { ...L, markdown: md.trim() };
  });
  lessons.splice(0, lessons.length, ...enhanced);


    

    if (!lessons.length) {
      console.warn(`[${LOG_NS}:lesson] AI returned empty lessons; retrying plain SSML`);
      try {
        const pack = await retryPlainSSML();
        const produced = pack.lessons?.length ?? 0;
        const hasMore = safeStart + produced < outline.length;
        const nextStart = hasMore ? safeStart + produced : null;
        const payload = { ...pack, queue: { nextStart, hasMore, total: outline.length } };
        await cacheSetJSON(cacheKey, pack, REDIS_TTL.ssml);
        return {
          status: 206,
          data: { ...payload, notice: { degraded: true, reason: 'json_parse_failed_plain_ssml' } },
          headers: {
            'X-Cache': 'MISS',
            'X-Degraded': 'true',
            'X-Next-Start': nextStart != null ? String(nextStart) : '',
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
        const produced = pack.lessons?.length ?? 0;
        const hasMore = safeStart + produced < outline.length;
        const nextStart = hasMore ? safeStart + produced : null;
        const payload = { ...pack, queue: { nextStart, hasMore, total: outline.length } };
        return { status: 502, data: { ...payload, notice: { degraded: true, reason: 'ai_empty_lessons' } }, headers: {} };
      }
    }

    // Build a SINGLE <speak> wrapper for all lessons
    const bodies = lessons.map((L, i) => {
      const body = innerProsody(L.ssml);
      if (i === 0) return body;
      return `<p><break time="${pace.sectionBreakMs}ms"/></p>\n${body}`;
    });

    const joinedSsml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
${bodies.join('\n')}
    </prosody>
  </voice>
</speak>`.trim();

    // Optional sanity check
    const opens = (joinedSsml.match(/<prosody\b/gi) || []).length;
    const closes = (joinedSsml.match(/<\/prosody>/gi) || []).length;
    if (opens !== 1 || closes !== 1) {
      console.warn('[tts] SSML prosody mismatch', { opens, closes });
    }

    const hasMore = safeStart + lessons.length < outline.length;
    const nextStart = hasMore ? safeStart + lessons.length : null;
    const payload = { lessons, joinedSsml, queue: { nextStart, hasMore, total: outline.length } };
    await cacheSetJSON(cacheKey, payload, REDIS_TTL.ssml);
    log('log', 'lesson', 'success', { lessons: lessons.length, joinedBytes: joinedSsml.length });
    return {
      status: 200,
      data: payload,
      headers: {
        'X-Cache': 'MISS',
        'X-Next-Start': nextStart != null ? String(nextStart) : '',
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
      const produced = pack.lessons?.length ?? 0;
      const hasMore = safeStart + produced < outline.length;
      const nextStart = hasMore ? safeStart + produced : null;
      return {
        status: 503,
        data: { ...pack, notice: fallbackNotice(c.kind), queue: { nextStart, hasMore, total: outline.length } },
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
  try {
    const pack = await retryPlainSSML(); // produce a full narration
    const produced = pack.lessons?.length ?? 0;
    const hasMore = safeStart + produced < outline.length;
    const nextStart = hasMore ? safeStart + produced : null;
    return {
      status: 206,
      data: { ...pack, notice: fallbackNotice('schema_error_plain_ssml'), queue: { nextStart, hasMore, total: outline.length } },
      headers: {}
    };
  } catch {
    const pack = scaffoldFromOutline();
    const produced = pack.lessons?.length ?? 0;
    const hasMore = safeStart + produced < outline.length;
    const nextStart = hasMore ? safeStart + produced : null;
    return {
      status: 502,
      data: { ...pack, notice: fallbackNotice('bad_request_scaffold'), queue: { nextStart, hasMore, total: outline.length } },
      headers: {}
    };
  }
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

  if (out.length < desired) {
    const fb = makeFallbackQuiz(courseTitle, outline, desired);
    for (let i = 0; i < fb.length && out.length < desired; i++) push(fb[i]);
  }

  return out.slice(0, desired).map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

export async function generateQuizService({ courseId, outline, numQuestions, courseSize, programTrack }) {
  dlog('quiz', 'enter', { courseId, outlineLen: Array.isArray(outline) ? outline.length : 0, numQuestions, courseSize, programTrack });

  const cq = await pool.query(`SELECT title FROM courses WHERE id = $1`, [courseId]);
  if (!cq.rowCount) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = cq.rows[0].title || 'Course';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize, programTrack });
  const perLesson = preset.quizPerLesson;
  const desired = (Array.isArray(outline) ? outline.length : 0) * perLesson;
  const n = Number.isFinite(Number(numQuestions)) && Number(numQuestions) > 0 ? Number(numQuestions) : Math.max(6, Math.min(40, desired));

  const olHash = sha1(outline);
  const cacheKey = `ai:quiz:${courseId}:size=${preset.key}:track=${programTrack || ''}:n=${n}:ol=${olHash}`;
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
  const perQTokens = 55;                     // prompt + 4 choices + structure
  const CHUNK = n > 30 ? 20 : n;             // keep slices reasonable
  const all = [];

  async function genQuizSlice(start, count) {
    const focus = (outline || []).slice(0, Math.min(12, outline?.length || 0));
    const json = await withGate(
      'openai:quiz',
      process.env.NODE_ENV === 'production' ? 1 : 2,
      () => aiJson({
        system:
          `Create a multiple-choice quiz as JSON STRICTLY matching this schema:\n` +
          `- "questions": array of exactly ${count} items\n` +
          `- each: {"id":"q1","prompt":"...","choices":["A","B","C","D"],"answerIndex":0..3}\n` +
          `Clear prompts; concise choices; one correct answer.`,
        user:
          `Course: ${courseTitle}\n` +
          (focus.length
            ? `Focus areas:\n${focus.map((o)=>`- ${o.title}: ${(o.keyPoints||[]).join(', ')}`).join('\n')}\n`
            : ``) +
          `Questions ${start + 1}–${start + count} of ${n}.`,
        temperature: 0.2,
        maxTokens: Math.min(5000, Math.max(1000, perQTokens * count + 200)),
        tries: 3,
        schema: QUIZ_SCHEMA
      })
    );
    const items = Array.isArray(json?.questions) ? json.questions : [];
    return items.slice(0, count);
  }

  for (let i = 0; i < n; i += CHUNK) {
    const take = Math.min(CHUNK, n - i);
    let slice = [];
    try { slice = await genQuizSlice(i, take); } catch (e) {
      console.warn(`[${LOG_NS}:quiz] slice ${i}-${i+take-1} failed; continuing`, e?.message);
    }
    all.push(...slice);
  }

  const normalized = normalizeQuizArray(all, n, courseTitle, outline);
  const rawCount = all.length;
  const degraded = rawCount === 0 || normalized.length < rawCount;

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

    const qs = makeFallbackQuiz(courseTitle, outline, n);
    return {
      status: 206,
      data: { quiz: { questions: qs }, notice: fallbackNotice(c.kind === 'bad_request' ? 'bad_request' : 'server_error') },
      headers: { 'X-Degraded': 'true' }
    };
  }
}

export async function generateCoursePackageService({ courseId, level = 'beginner', targetMinutes, voiceName = 'en-US-JennyNeural', numQuestions, courseSize, programTrack, totalLessons }) {
  dlog('package', 'enter', { courseId, level, targetMinutes, voiceName, numQuestions, courseSize,programTrack });

  const { rows } = await pool.query(`SELECT title, description FROM courses WHERE id = $1`, [courseId]);
  if (!rows?.length) return { status: 404, data: { error: 'COURSE_NOT_FOUND' }, headers: {} };
  const courseTitle = rows[0].title || 'Course';
  const courseDesc  = rows[0].description || '';

  const preset = await resolveCourseSize({ courseId, bodyCourseSize: courseSize, programTrack });
  const effectiveTarget = Number.isFinite(Number(targetMinutes)) && Number(targetMinutes) > 0
    ? Number(targetMinutes)
    : defaultTargetMinutesOf(preset);

  // Outline
  let outline, outlineResp = await generateOutlineService({ courseId, title: courseTitle, level, targetMinutes: effectiveTarget, courseSize, programTrack,totalLessons,});
  if (outlineResp.status === 200) outline = outlineResp.data.outline;
  else if (outlineResp.data?.outline) outline = outlineResp.data.outline;
  else outline = makeFallbackOutline(courseTitle).slice(0, totalLessonsOf(preset));

  // Lessons
  const lessons = [];
  const ssmlParts = [];
  let anyDegradedLesson = false;
  for (let i = 0; i < outline.length; i++) {
    try {
      const r = await generateLessonSSMLService({ courseId, outline, voiceName, courseSize, count: 1, start: i, programTrack });
      const L = r.data?.lessons?.[0];
      if (L) {
        lessons.push(L);
        ssmlParts.push(L.ssml);
        if (r.status && r.status !== 200) anyDegradedLesson = true;
      } else {
        const tmp = await generateLessonSSMLService({ courseId, outline: [outline[i]], voiceName, courseSize, count: 1, start: 0, programTrack });
        const F = tmp.data?.lessons?.[0];
        if (F) {
          lessons.push(F);
          ssmlParts.push(F.ssml);
          anyDegradedLesson = true;
        }
      }
      if (i + 1 < outline.length) await new Promise(r => setTimeout(r, 150));
    } catch {
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

  // Build ONE <speak> wrapper for the whole course package
  const pace = paceFor(preset.key);
  const bodies = ssmlParts.map((s, i) => {
    const body = innerProsody(s);
    return i === 0 ? body : `<p><break time="${pace.sectionBreakMs}ms"/></p>\n${body}`;
  });
  const joinedSsml = `
<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
    <prosody rate="${pace.ratePct}" pitch="+0st">
${bodies.join('\n')}
    </prosody>
  </voice>
</speak>`.trim();

  // Quiz
  const quizResp = await generateQuizService({
    courseId,
    outline,
    numQuestions: numQuestions ?? (outline.length * preset.quizPerLesson),
    courseSize,
    programTrack,
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
