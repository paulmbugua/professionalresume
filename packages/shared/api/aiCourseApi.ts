// @mytutorapp/shared/api/aiCourseApi.ts

import type {
  TopCourse,
  AiOutlineResponse,
  AiOutlineSection,
  LessonPack,
  Quiz,
  GradeRequest,
  GradeResult,
  CoursePackage,
  LegacySize,
  DbCourseSize,
  AiOutlineRequest,
  AiLessonSSMLRequest,
  AiQuizRequest,
} from '@mytutorapp/shared/types';

type Jsonish = Record<string, unknown> | Array<unknown> | undefined;

function normalizeBase(url: string) {
  return url?.endsWith('/') ? url.slice(0, -1) : url;
}

function buildHeaders(token?: string, isJson = true): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (isJson) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// Optional debug switch; still logs errors even when off
const DBG_AI = ((): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DBG_AI') === '1';
  } catch {
    return false;
  }
})();

type MinimalReqMeta = {
  outlineLen?: number;
  joinedSsmlBytes?: number;
  courseId?: string;
  level?: string;
  courseSize?: string;
} | undefined;

/** Read once; parse JSON; throw rich error text when not ok */
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  errorPrefix?: string
): Promise<T> {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const res = await fetch(input, init);
  const text = await res.text();
  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  try {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (typeof input === 'object' && input !== null && 'url' in input) {
      url = (input as { url: string }).url;
    }
    const meth = init?.method || 'GET';

    // summarize request/response body safely (for debugging only)
    let reqBodyMeta: MinimalReqMeta = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          const o = parsed as Record<string, unknown>;
          const meta: Record<string, unknown> = {};
          if (Array.isArray(o.outline)) meta.outlineLen = o.outline.length;
          if (typeof o.joinedSsml === 'string')
            meta.joinedSsmlBytes = (o.joinedSsml as string).length;
          if (typeof o.courseId === 'string') meta.courseId = o.courseId as string;
          if (typeof o.level === 'string') meta.level = o.level as string;
          if (typeof o.courseSize === 'string') meta.courseSize = o.courseSize as string;
          reqBodyMeta = meta as MinimalReqMeta;
        }
      } catch {
        // ignore parse errors (debug only)
      }
    }

    const tag =
      url.includes('/api/ai/lesson-ssml')        ? '[api:lesson-ssml]' :
      url.includes('/api/ai/outline')            ? '[api:outline]'     :
      url.includes('/api/ai/quiz')               ? '[api:quiz]'        :
      url.includes('/api/ai/grade')              ? '[api:grade]'       :
      url.includes('/api/ai/cache/clear-course') ? '[api:cache-course]':
      url.includes('/api/ai/cache/clear-top-courses') ? '[api:cache-top]':
      url.includes('/api/courses/ai-sandbox')    ? '[api:ai-sandbox]'  :
      '[api]';

    if (DBG_AI) {
      console.log(`${tag} ${meth} ${url}`, {
        status: res.status,
        ms: Math.round(t1 - t0),
        body: reqBodyMeta,
        respBytes: text?.length ?? 0,
      });
    }

    // Always print error bodies for fast diagnosis
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`${tag} ERROR ${res.status} ${meth} ${url} — body:`, text || '(empty)');
    }
  } catch {
    // swallow debug errors
  }

  const mkErr = () => {
    const msg = text || res.statusText || `HTTP ${res.status}`;
    return new Error(errorPrefix ? `${errorPrefix} (${res.status}): ${msg}` : msg);
  };

  if (!res.ok) throw mkErr();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw mkErr();
  }
}

/* ────────────────────────────────────────────────────────────
 * GET /api/ai/courses/top
 * ─────────────────────────────────────────────────────────── */
type TopCoursesArg =
  | boolean
  | {
      aiOnly?: boolean;
      limit?: number;
      offset?: number;
    };

export async function fetchTopCourses(
  backendUrl: string,
  arg?: TopCoursesArg
): Promise<TopCourse[]> {
  const base = normalizeBase(backendUrl);

  const aiOnly = typeof arg === 'boolean' ? arg : Boolean(arg?.aiOnly);
  const limit = typeof arg === 'object' && typeof arg.limit === 'number' ? arg.limit : undefined;
  const offset = typeof arg === 'object' && typeof arg.offset === 'number' ? arg.offset : undefined;

  const params = new URLSearchParams();
  if (aiOnly) params.set('aiOnly', '1');
  if (limit) params.set('limit', String(limit));
  if (typeof offset === 'number') params.set('offset', String(offset));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return fetchJson<TopCourse[]>(
    `${base}/api/ai/courses/top${qs}`,
    { method: 'GET', headers: buildHeaders(undefined, false) },
    'Failed to load courses'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/outline
 * ─────────────────────────────────────────────────────────── */
export async function createOutline(
  backendUrl: string,
  body: AiOutlineRequest,
  opts?: { signal?: AbortSignal; token?: string }
): Promise<AiOutlineResponse> {
  const base = normalizeBase(backendUrl);
  return fetchJson<AiOutlineResponse>(
    `${base}/api/ai/outline`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
    'Outline generation failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/lesson-ssml
 * ─────────────────────────────────────────────────────────── */
export async function createLessonSSML(
  backendUrl: string,
  body: AiLessonSSMLRequest,
  opts?: { signal?: AbortSignal; token?: string }
): Promise<LessonPack> {
  const base = normalizeBase(backendUrl);
  return fetchJson<LessonPack>(
    `${base}/api/ai/lesson-ssml`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
    'SSML generation failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/quiz
 * ─────────────────────────────────────────────────────────── */
export async function createQuiz(
  backendUrl: string,
  body: AiQuizRequest,
  opts?: { signal?: AbortSignal; token?: string }
): Promise<{ quiz: Quiz }> {
  const base = normalizeBase(backendUrl);
  return fetchJson<{ quiz: Quiz }>(
    `${base}/api/ai/quiz`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
    'Quiz generation failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/grade (auth)
 * ─────────────────────────────────────────────────────────── */
export async function gradeQuizApi(
  backendUrl: string,
  token: string,
  payload: GradeRequest,
  opts?: { signal?: AbortSignal }
): Promise<GradeResult> {
  const base = normalizeBase(backendUrl);
  return fetchJson<GradeResult>(
    `${base}/api/ai/grade`,
    {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify(payload),
      signal: opts?.signal,
    },
    'Grading failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/course-package
 * ─────────────────────────────────────────────────────────── */
export async function createCoursePackage(
  backendUrl: string,
  body: {
    courseId: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    targetMinutes?: number;
    voiceName?: string;
    numQuestions?: number;
    size?: LegacySize;
    courseSize?: DbCourseSize;
    paragraphs?: number;
    sentencesPerParagraph?: number;
  },
  opts?: { signal?: AbortSignal; token?: string }
): Promise<CoursePackage> {
  const base = normalizeBase(backendUrl);
  return fetchJson<CoursePackage>(
    `${base}/api/ai/course-package`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body as Jsonish),
      signal: opts?.signal,
    },
    'Course package generation failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/courses/ai-sandbox
 * ─────────────────────────────────────────────────────────── */
export async function createAiSandboxCourse(
  backendUrl: string,
  titleOrInit:
    | string
    | {
        title: string;
        courseSize?: DbCourseSize;
        size?: LegacySize;
        minutes?: number;
      },
  opts?: { signal?: AbortSignal }
): Promise<{ id: string; title: string; description?: string }> {
  const base = normalizeBase(backendUrl);

  const body =
    typeof titleOrInit === 'string'
      ? { title: titleOrInit }
      : {
          title: titleOrInit.title,
          courseSize: titleOrInit.courseSize,
          size: titleOrInit.size,
          minutes: titleOrInit.minutes,
        };

  return fetchJson(
    `${base}/api/courses/ai-sandbox`,
    {
      method: 'POST',
      headers: buildHeaders(undefined, true),
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
    'Failed to create AI course'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/cache/clear-course
 * POST /api/ai/cache/clear-top-courses
 * (Cache admin helpers)
 * ─────────────────────────────────────────────────────────── */
export async function clearCourseCache(
  backendUrl: string,
  courseId: string,
  opts?: { signal?: AbortSignal; token?: string }
): Promise<{ removed: number }> {
  const base = normalizeBase(backendUrl);
  return fetchJson<{ removed: number }>(
    `${base}/api/ai/cache/clear-course`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify({ courseId }),
      signal: opts?.signal,
    },
    'Failed to clear course cache'
  );
}

export async function clearTopCoursesCache(
  backendUrl: string,
  opts?: { signal?: AbortSignal; token?: string }
): Promise<{ removed: number }> {
  const base = normalizeBase(backendUrl);
  return fetchJson<{ removed: number }>(
    `${base}/api/ai/cache/clear-top-courses`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify({}), // explicit empty payload
      signal: opts?.signal,
    },
    'Failed to clear top courses cache'
  );
}
