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
  // sizing unions from your shared types
  LegacySize,
  DbCourseSize,
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

/** Read once; parse JSON; throw rich error text when not ok */
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  errorPrefix?: string
): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

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
 * fetchTopCourses(base, true) or fetchTopCourses(base, { aiOnly, limit, offset })
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
 * Accepts both legacy `size` and new `courseSize`
 * ─────────────────────────────────────────────────────────── */
export async function createOutline(
  backendUrl: string,
  body: {
    courseId?: string;
    title?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    targetMinutes?: number;
    /** legacy client knob */
    size?: LegacySize;
    /** new DB/server knob */
    courseSize?: DbCourseSize;
    paragraphs?: number;
    sentencesPerParagraph?: number;
  },
  opts?: { signal?: AbortSignal; token?: string }
): Promise<AiOutlineResponse> {
  const base = normalizeBase(backendUrl);
  return fetchJson<AiOutlineResponse>(
    `${base}/api/ai/outline`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body as Jsonish),
      signal: opts?.signal,
    },
    'Outline generation failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/lesson-ssml → LessonPack
 * ─────────────────────────────────────────────────────────── */
export async function createLessonSSML(
  backendUrl: string,
  body: {
    courseId: string;
    outline: AiOutlineSection[];
    voiceName?: string;
    /** fast boot: generate first N only */
    count?: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    targetMinutes?: number;
    size?: LegacySize;
    courseSize?: DbCourseSize;
    paragraphs?: number;
    sentencesPerParagraph?: number;
  },
  opts?: { signal?: AbortSignal; token?: string }
): Promise<LessonPack> {
  const base = normalizeBase(backendUrl);
  return fetchJson<LessonPack>(
    `${base}/api/ai/lesson-ssml`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body as Jsonish),
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
  body: {
    courseId: string;
    outline: AiOutlineSection[];
    /** explicit count overrides finalQuizSize hint */
    numQuestions?: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    targetMinutes?: number;
    size?: LegacySize;
    courseSize?: DbCourseSize;
    paragraphs?: number;
    sentencesPerParagraph?: number;
  },
  opts?: { signal?: AbortSignal; token?: string }
): Promise<{ quiz: Quiz }> {
  const base = normalizeBase(backendUrl);
  return fetchJson<{ quiz: Quiz }>(
    `${base}/api/ai/quiz`,
    {
      method: 'POST',
      headers: buildHeaders(opts?.token, true),
      body: JSON.stringify(body as Jsonish),
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
      body: JSON.stringify(payload as Jsonish),
      signal: opts?.signal,
    },
    'Grading failed'
  );
}

/* ────────────────────────────────────────────────────────────
 * POST /api/ai/course-package (optional one-shot)
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
  title: string,
  opts?: { signal?: AbortSignal }
): Promise<{ id: string; title: string; description?: string }> {
  const base = normalizeBase(backendUrl);
  return fetchJson(
    `${base}/api/courses/ai-sandbox`,
    {
      method: 'POST',
      headers: buildHeaders(undefined, true),
      body: JSON.stringify({ title }),
      signal: opts?.signal,
    },
    'Failed to create AI course'
  );
}
