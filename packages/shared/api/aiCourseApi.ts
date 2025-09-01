// packages/shared/api/aiCourseApi.ts
import type {
  TopCourse,
  AiOutlineResponse,
  AiOutlineSection,
  LessonSSMLResponse,
  Quiz,
  GradeRequest,
  GradeResult,
} from '@mytutorapp/shared/types';

type Jsonish = Record<string, unknown> | Array<unknown> | undefined;

function normalizeBase(url: string) {
  return url?.endsWith('/') ? url.slice(0, -1) : url;
}

function buildHeaders(token?: string, isJson = true): HeadersInit {
  const h: HeadersInit = { Accept: 'application/json' };
  if (isJson) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // If server returned plain text, throw a useful error
    throw new Error(text || `HTTP ${res.status}`);
  }
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  errorPrefix?: string
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    // Try to extract JSON/text error details
    const body = await res.text().catch(() => '');
    const msg = body || res.statusText || `HTTP ${res.status}`;
    throw new Error(errorPrefix ? `${errorPrefix} (${res.status}): ${msg}` : msg);
  }
  // Parse JSON with a defensive wrapper
  try {
    return (await res.json()) as T;
  } catch {
    // Some backends send empty bodies on 204/200
    return await safeJson<T>(res);
  }
}

/** GET /api/ai/courses/top */
export async function fetchTopCourses(backendUrl: string, aiOnly = false) {
  const url = `${backendUrl}/api/ai/courses/top${aiOnly ? '?aiOnly=1' : ''}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to load courses');
  return r.json();
}


/** POST /api/ai/outline */
export async function createOutline(
  backendUrl: string,
  body: {
    courseId?: string;
    title?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    targetMinutes?: number;
  },
  opts?: { signal?: AbortSignal; token?: string } // token optional in case your route is protected later
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

/** POST /api/ai/lesson-ssml */
export async function createLessonSSML(
  backendUrl: string,
  body: {
    courseId: string;
    outline: AiOutlineSection[];
    voiceName?: string;
  },
  opts?: { signal?: AbortSignal; token?: string } // token optional for future-proofing
): Promise<LessonSSMLResponse> {
  const base = normalizeBase(backendUrl);
  return fetchJson<LessonSSMLResponse>(
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

/** POST /api/ai/quiz */
export async function createQuiz(
  backendUrl: string,
  body: {
    courseId: string;
    outline: AiOutlineSection[];
    numQuestions?: number;
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

/** POST /api/ai/grade  (auth) */
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