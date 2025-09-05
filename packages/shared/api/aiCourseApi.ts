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

// -------------------- Debug switch --------------------
const DBG_AI = ((): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DBG_AI') === '1';
  } catch {
    return false;
  }
})();

// -------------------- Error class --------------------
export class HttpError extends Error {
  status: number;
  bodyText?: string;
  url?: string;
  retryAfterSec?: number;
  tag?: string;
  constructor(message: string, status: number, extras?: Partial<HttpError>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    Object.assign(this, extras);
  }
}

// -------------------- Common options --------------------
type CommonOpts = {
  signal?: AbortSignal;
  token?: string;
  programTrack?: string; // will be sent as X-Program-Track
  timeoutMs?: number;    // optional client-side timeout (auto AbortController)
};

// Create a derived AbortSignal that auto-aborts after timeoutMs.
// The returned cancel() must be called after fetch resolves/rejects to clear timers.
function withTimeoutSignal(
  baseSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): { signal?: AbortSignal; cancel: () => void } {
  if (!timeoutMs || timeoutMs <= 0) return { signal: baseSignal, cancel: () => {} };
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // tie parent cancellation
  if (baseSignal) {
    if (baseSignal.aborted) ctrl.abort();
    else baseSignal.addEventListener('abort', onAbort, { once: true });
  }
  // timeout
  timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const cancel = () => {
    if (timer) clearTimeout(timer);
    if (baseSignal) baseSignal.removeEventListener('abort', onAbort as any);
  };

  return { signal: ctrl.signal, cancel };
}

// -------------------- Minimal body meta for logs --------------------
type MinimalReqMeta =
  | {
      outlineLen?: number;
      joinedSsmlBytes?: number;
      courseId?: string;
      level?: string;
      courseSize?: string;
    }
  | undefined;

// -------------------- fetchJson --------------------
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  errorPrefix?: string,
  tagLabel?: string
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

    // summarize request body safely (for debugging only)
    let reqBodyMeta: MinimalReqMeta = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          const o = parsed as Record<string, unknown>;
          const meta: Record<string, unknown> = {};
          if (Array.isArray(o.outline)) meta.outlineLen = o.outline.length;
          if (typeof o.joinedSsml === 'string') meta.joinedSsmlBytes = (o.joinedSsml as string).length;
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
      tagLabel ??
      (url.includes('/api/ai/lesson-ssml')        ? '[api:lesson-ssml]' :
       url.includes('/api/ai/outline')            ? '[api:outline]'     :
       url.includes('/api/ai/quiz')               ? '[api:quiz]'        :
       url.includes('/api/ai/grade')              ? '[api:grade]'       :
       url.includes('/api/ai/cache/clear-course') ? '[api:cache-course]':
       url.includes('/api/ai/cache/clear-top-courses') ? '[api:cache-top]':
       url.includes('/api/courses/ai-sandbox')    ? '[api:ai-sandbox]'  :
       '[api]');

    if (DBG_AI) {
      console.log(`${tag} ${meth} ${url}`, {
        status: res.status,
        ms: Math.round(t1 - t0),
        body: reqBodyMeta,
        respBytes: text?.length ?? 0,
      });
    }

    if (!res.ok) {
      // Always print error bodies for diagnosis
      // eslint-disable-next-line no-console
      console.error(`${tag} ERROR ${res.status} ${meth} ${url} — body:`, text || '(empty)');
      const retryAfter = Number(res.headers.get('Retry-After') || '');
      const msg = text || res.statusText || `HTTP ${res.status}`;
      throw new HttpError(
        errorPrefix ? `${errorPrefix} (${res.status}): ${msg}` : msg,
        res.status,
        {
          bodyText: text,
          url,
          retryAfterSec: Number.isFinite(retryAfter) ? retryAfter : undefined,
          tag,
        }
      );
    }
  } catch (e) {
    // If our throw above was caught here, rethrow it; otherwise ignore debug errors
    if (e instanceof HttpError) throw e;
  }

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (e) {
    throw new HttpError(
      errorPrefix ? `${errorPrefix}: Invalid JSON` : 'Invalid JSON',
      res.status,
      { bodyText: text }
    );
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
    'Failed to load courses',
    '[api:top-courses]'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/outline
 * ─────────────────────────────────────────────────────────── */
export async function createOutline(
  backendUrl: string,
  body: AiOutlineRequest,
  opts?: CommonOpts
): Promise<AiOutlineResponse> {
  const base = normalizeBase(backendUrl);
  const headers = buildHeaders(opts?.token, true);
  if (opts?.programTrack) headers['X-Program-Track'] = String(opts.programTrack);

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<AiOutlineResponse>(
      `${base}/api/ai/outline`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      },
      'Outline generation failed',
      '[api:outline]'
    );
  } finally {
    cancel();
  }
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/lesson-ssml
 * ─────────────────────────────────────────────────────────── */
export async function createLessonSSML(
  backendUrl: string,
  body: AiLessonSSMLRequest,
  opts?: CommonOpts
): Promise<LessonPack> {
  const base = normalizeBase(backendUrl);
  const headers = buildHeaders(opts?.token, true);
  if (opts?.programTrack) headers['X-Program-Track'] = String(opts.programTrack);

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<LessonPack>(
      `${base}/api/ai/lesson-ssml`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      },
      'SSML generation failed',
      '[api:lesson-ssml]'
    );
  } finally {
    cancel();
  }
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/quiz
 * ─────────────────────────────────────────────────────────── */
export async function createQuiz(
  backendUrl: string,
  body: AiQuizRequest,
  opts?: CommonOpts
): Promise<{ quiz: Quiz }> {
  const base = normalizeBase(backendUrl);
  const headers = buildHeaders(opts?.token, true);
  if (opts?.programTrack) headers['X-Program-Track'] = String(opts.programTrack);

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<{ quiz: Quiz }>(
      `${base}/api/ai/quiz`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      },
      'Quiz generation failed',
      '[api:quiz]'
    );
  } finally {
    cancel();
  }
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/grade (auth)
 * ─────────────────────────────────────────────────────────── */
export async function gradeQuizApi(
  backendUrl: string,
  token: string,
  payload: GradeRequest,
  opts?: { signal?: AbortSignal; timeoutMs?: number } // no programTrack needed
): Promise<GradeResult> {
  const base = normalizeBase(backendUrl);
  const headers = buildHeaders(token, true);

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<GradeResult>(
      `${base}/api/ai/grade`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      },
      'Grading failed',
      '[api:grade]'
    );
  } finally {
    cancel();
  }
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
  opts?: CommonOpts
): Promise<CoursePackage> {
  const base = normalizeBase(backendUrl);
  const headers = buildHeaders(opts?.token, true);
  if (opts?.programTrack) headers['X-Program-Track'] = String(opts.programTrack);

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<CoursePackage>(
      `${base}/api/ai/course-package`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body as Jsonish),
        signal,
      },
      'Course package generation failed',
      '[api:course-package]'
    );
  } finally {
    cancel();
  }
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
  opts?: { signal?: AbortSignal; timeoutMs?: number }
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

  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson(
      `${base}/api/courses/ai-sandbox`,
      {
        method: 'POST',
        headers: buildHeaders(undefined, true),
        body: JSON.stringify(body),
        signal,
      },
      'Failed to create AI course',
      '[api:ai-sandbox]'
    );
  } finally {
    cancel();
  }
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/cache/clear-course
 * POST /api/ai/cache/clear-top-courses
 * (Cache admin helpers)
 * ─────────────────────────────────────────────────────────── */
export async function clearCourseCache(
  backendUrl: string,
  courseId: string,
  opts?: { signal?: AbortSignal; token?: string; timeoutMs?: number }
): Promise<{ removed: number }> {
  const base = normalizeBase(backendUrl);
  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<{ removed: number }>(
      `${base}/api/ai/cache/clear-course`,
      {
        method: 'POST',
        headers: buildHeaders(opts?.token, true),
        body: JSON.stringify({ courseId }),
        signal,
      },
      'Failed to clear course cache',
      '[api:cache-course]'
    );
  } finally {
    cancel();
  }
}

export async function clearTopCoursesCache(
  backendUrl: string,
  opts?: { signal?: AbortSignal; token?: string; timeoutMs?: number }
): Promise<{ removed: number }> {
  const base = normalizeBase(backendUrl);
  const { signal, cancel } = withTimeoutSignal(opts?.signal, opts?.timeoutMs);
  try {
    return await fetchJson<{ removed: number }>(
      `${base}/api/ai/cache/clear-top-courses`,
      {
        method: 'POST',
        headers: buildHeaders(opts?.token, true),
        body: JSON.stringify({}), // explicit empty payload
        signal,
      },
      'Failed to clear top courses cache',
      '[api:cache-top]'
    );
  } finally {
    cancel();
  }
}
