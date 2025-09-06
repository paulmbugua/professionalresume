// packages/shared/hooks/useAiCourseFlow.ts
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  fetchTopCourses,
  createOutline,
  createLessonSSML,
  createQuiz,
  gradeQuizApi,
  createAiSandboxCourse,
  // NEW: cache helpers
  clearCourseCache,
  clearTopCoursesCache,
} from '../api/aiCourseApi';
import { useRobotSpeaker } from './useRobotSpeaker';

// ✅ Add these imports to fix TS2304
import {
  getEligibility as certGetEligibility,
  generateCertificate as certGenerate,
} from '@mytutorapp/shared/api';

import type {
  Certificate,
  TopCourse,
  AiOutlineSection,
  Quiz,
  GradeResult,
  AILesson,
  LessonPack,
  ProgramTrack,
  AiOutlineRequest,
  AiLessonSSMLRequest,
  AiQuizRequest,
  DbCourseSize,
  AiOutlineResponse,
} from '@mytutorapp/shared/types';

export type StartState =
  | 'idle'
  | 'outlining'
  | 'narrating'
  | 'ready'
  | 'quizzing'
  | 'graded'
  | 'error';

type LoadTopOptions = {
  limit?: number;
  append?: boolean;
  cursor?: string | null;
  page?: 'next' | 'prev' | number | string;
  aiOnly?: boolean;
};

type CourseSize = DbCourseSize;

const BATCH_SIZE = 3;
const MAX_RETRIES = 3;

const DBG = (() => {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DBG_AI') === '1';
  } catch {
    return false;
  }
})();

const SIZE_PRESETS: Record<
  CourseSize,
  {
    minutes: number;
    paragraphs: number;
    sentencesPerParagraph: number;
    finalQuizSize: number;
  }
> = {
  mini: { minutes: 12, paragraphs: 8, sentencesPerParagraph: 2, finalQuizSize: 4 },
  standard: { minutes: 25, paragraphs: 10, sentencesPerParagraph: 2, finalQuizSize: 6 },
  extended: { minutes: 32, paragraphs: 12, sentencesPerParagraph: 2, finalQuizSize: 8 },
  deep_dive: { minutes: 45, paragraphs: 14, sentencesPerParagraph: 2, finalQuizSize: 10 },
  bootcamp: { minutes: 60, paragraphs: 16, sentencesPerParagraph: 2, finalQuizSize: 12 },
};

type RetryableError = {
  headers?: Record<string, string | number | undefined>;
  retryAfter?: number;
  retryAfterSec?: number;
  status?: number;
  code?: number;
  message?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(e: RetryableError, fallbackMs: number) {
  // accept e.retryAfter (sec), e.retryAfterMs, or header string
  const hdr =
    e?.headers?.['retry-after'] ??
    e?.headers?.['Retry-After'] ??
    e?.retryAfter ??
    e?.retryAfterSec;
  if (typeof hdr === 'number') {
    const seconds = hdr > 1000 ? hdr / 1000 : hdr;
    return Math.max(250, Math.round(seconds * 1000));
  }
  if (typeof hdr === 'string') {
    const n = Number(hdr.trim());
    if (!Number.isNaN(n)) {
      return Math.max(250, Math.round(n * 1000));
    }
  }
  return fallbackMs;
}

function getStatusCode(err: unknown): number {
  const e = err as Partial<RetryableError>;
  return typeof e.status === 'number'
    ? e.status
    : typeof e.code === 'number'
    ? (e.code as number)
    : 0;
}
function getMessage(err: unknown): string | undefined {
  return (err as { message?: string })?.message;
}

export function useAiCourse(backendUrl: string, token?: string) {
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TopCourse | null>(null);
  const [outline, setOutline] = useState<AiOutlineSection[]>([]);

  const [lessons, setLessons] = useState<AILesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [joinedSsml, setJoinedSsml] = useState<string>('');
  const [ssml, setSsml] = useState<string>('');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const [step, setStep] = useState<StartState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [degradedNotice, setDegradedNotice] = useState<{ degraded: boolean; reason: string } | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  const { reset: resetTts, loading: ttsLoading, error: ttsError } = useRobotSpeaker();

  const fullPackInFlightRef = useRef<Promise<void> | null>(null);
  const gotFullPackRef = useRef(false);

  // NEW: track/abort a single “run” of outline+lessons generation
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadTopCourses = useCallback(
    async (opts?: LoadTopOptions) => {
      const { aiOnly = false } = opts || {};
      setError(null);
      try {
        // Pass pagination knobs through when provided
        const rows = await fetchTopCourses(backendUrl, {
          aiOnly,
          limit: opts?.limit,
          // Optional offset support if caller provides it (not in type)
          offset: (opts as any)?.offset,
        });
        setTopCourses((prev) => (opts?.append ? [...prev, ...rows] : rows));
        if (DBG) console.info('[ai] top courses', { count: rows.length, append: Boolean(opts?.append) });
        return rows;
      } catch (e: unknown) {
        setError(getMessage(e) || 'Failed to load courses');
        if (DBG) console.warn('[ai] fetchTopCourses failed', e);
        throw e;
      }
    },
    [backendUrl]
  );

  const selectCourse = useCallback(
    (course: TopCourse | null) => {
      // Abort any in-flight AI generation for previous course
      try { abortRef.current?.abort('switch-course'); } catch {}
      abortRef.current = null;
      runIdRef.current++;

      setSelectedCourse(course);
      setOutline([]);
      setLessons([]);
      setCurrentLessonIndex(0);
      setJoinedSsml('');
      setSsml('');
      setQuiz(null);
      setAnswers({});
      setGrade(null);
      setCertificate(null);
      setDegradedNotice(null);
      resetTts();
      setStep('idle');
      setError(null);
      gotFullPackRef.current = false;
      fullPackInFlightRef.current = null;
      if (DBG) console.info('[ai] selectCourse', { courseId: course?.id || null });
    },
    [resetTts]
  );

  const currentLesson = useMemo(
    () => (lessons.length ? lessons[currentLessonIndex] : null),
    [lessons, currentLessonIndex]
  );
  const hasPrevLesson = useMemo(() => currentLessonIndex > 0, [currentLessonIndex]);
  const hasNextLesson = useMemo(
    () => currentLessonIndex < lessons.length - 1,
    [currentLessonIndex, lessons.length]
  );

  const goToLesson = useCallback(
    (index: number) => {
      if (!lessons.length) return;
      const clamped = Math.max(0, Math.min(index, lessons.length - 1));
      setCurrentLessonIndex(clamped);
      if (DBG) console.info('[ai] goToLesson', { index: clamped, total: lessons.length });
    },
    [lessons.length]
  );

  const nextLesson = useCallback(() => {
    if (!lessons.length) return;
    setCurrentLessonIndex((i) => {
      const v = Math.min(i + 1, lessons.length - 1);
      if (DBG) console.info('[ai] nextLesson', { from: i, to: v, total: lessons.length });
      return v;
    });
  }, [lessons.length]);

  const prevLesson = useCallback(() => {
    if (!lessons.length) return;
    setCurrentLessonIndex((i) => {
      const v = Math.max(i - 1, 0);
      if (DBG) console.info('[ai] prevLesson', { from: i, to: v, total: lessons.length });
      return v;
    });
  }, [lessons.length]);

  const DEFAULT_SIZE = {
    level: 'beginner' as const,
    courseSize: 'standard' as CourseSize,
    voiceName: 'en-US-JennyNeural',
  };

  function buildKnobs(input?: {
    courseSize?: CourseSize;
    level?: 'beginner' | 'intermediate' | 'advanced';
    minutes?: number;
    paragraphs?: number;
    sentencesPerParagraph?: number;
    finalQuizSize?: number;
    programTrack?: ProgramTrack;
    totalLessons?: number;
  }) {
    const courseSize = input?.courseSize || DEFAULT_SIZE.courseSize;
    const p = SIZE_PRESETS[courseSize];

    return {
      courseSize,
      level: input?.level || DEFAULT_SIZE.level,
      targetMinutes: input?.minutes ?? p.minutes,
      paragraphs: input?.paragraphs ?? p.paragraphs,
      sentencesPerParagraph: input?.sentencesPerParagraph ?? p.sentencesPerParagraph,
      finalQuizSize: input?.finalQuizSize ?? p.finalQuizSize,
      programTrack: input?.programTrack,
      totalLessons: input?.totalLessons,
    };
  }

  async function fetchLessonsInBatches(
    baseUrl: string,
    courseId: string,
    fullOutline: AiOutlineSection[],
    voice: string,
    knobs: ReturnType<typeof buildKnobs>,
    alreadyHave: number,
    onBatch: (pack: LessonPack, startIndex: number) => void,
    signal?: AbortSignal
  ) {
    let i = alreadyHave;
    while (i < fullOutline.length) {
      const start = i;
      const count = Math.min(BATCH_SIZE, fullOutline.length - start);

      const sliceForLog = fullOutline.slice(start, start + count);

      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      for (;;) {
        if (signal?.aborted) throw signal.reason || new Error('Aborted');
        try {
          if (DBG) {
            console.groupCollapsed('[ai] fetchLessonsInBatches request', {
              start,
              count,
              totalOutline: fullOutline.length,
              sliceForLogLen: sliceForLog.length,
              voice,
              level: knobs.level,
              courseSize: knobs.courseSize,
            });
          }

          const batchPayload: AiLessonSSMLRequest = {
            courseId,
            outline: fullOutline, // server uses start/count
            voiceName: voice,
            level: knobs.level,
            courseSize: knobs.courseSize,
            paragraphs: knobs.paragraphs,
            sentencesPerParagraph: knobs.sentencesPerParagraph,
            programTrack: knobs.programTrack,
            totalLessons: knobs.totalLessons,
            start,
            count,
          };

          const pack = await createLessonSSML(baseUrl, batchPayload, { signal });

          if (DBG) {
            console.log('[ai] fetchLessonsInBatches response', {
              gotLessons: pack?.lessons?.length || 0,
              joinedBytes: (pack?.joinedSsml || '').length,
            });
            console.groupEnd();
          }
          onBatch(pack, start);
          i += count;
          break;
        } catch (e: unknown) {
          attempt++;
          const status = getStatusCode(e);
          // treat 429 like 503 for backoff/retry
          const retriable = status === 503 || status === 429;
          const backoff = retriable ? parseRetryAfter(e as RetryableError, 1200 * attempt) : 800 * attempt;
          if (DBG)
            console.warn('[ai] batch failed', {
              start,
              count,
              attempt,
              status,
              backoffMs: backoff,
              error: getMessage(e) ?? String(e),
            });
          if (attempt >= MAX_RETRIES && !retriable) throw e;
          await sleep(backoff);
          if (attempt >= MAX_RETRIES) throw e;
        }
      }
    }
  }

  const startWithAI = useCallback(
    async (opts?: {
      courseSize?: CourseSize;
      level?: 'beginner' | 'intermediate' | 'advanced';
      minutes?: number;
      voiceName?: string;
      paragraphs?: number;
      sentencesPerParagraph?: number;
      programTrack?: ProgramTrack;
      totalLessons?: number;
    }) => {
      if (!selectedCourse) return;
      setError(null);
      setStep('outlining');

      const voice = opts?.voiceName || DEFAULT_SIZE.voiceName;
      const knobs = buildKnobs({
        courseSize: opts?.courseSize,
        level: opts?.level,
        minutes: opts?.minutes,
        paragraphs: opts?.paragraphs,
        sentencesPerParagraph: opts?.sentencesPerParagraph,
        programTrack: opts?.programTrack,
        totalLessons: opts?.totalLessons,
      });

      // Begin a new run + controller
      runIdRef.current += 1;
      const myRun = runIdRef.current;
      try { abortRef.current?.abort('superseded'); } catch {}
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      if (DBG) console.groupCollapsed('[ai] startWithAI', { courseId: selectedCourse.id, knobs });

      try {
        // Outline (with retries on 503/429)
        let o: AiOutlineResponse | undefined;
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        for (;;) {
          try {
            const outlineReq: AiOutlineRequest = {
              courseId: selectedCourse.id,
              level: knobs.level,
              courseSize: knobs.courseSize,
              targetMinutes: knobs.targetMinutes,
              paragraphs: knobs.paragraphs,
              sentencesPerParagraph: knobs.sentencesPerParagraph,
              programTrack: knobs.programTrack,
              totalLessons: knobs.totalLessons,
            };
            o = await createOutline(backendUrl, outlineReq, { signal });
            break;
          } catch (e: unknown) {
            attempt++;
            const status = getStatusCode(e);
            if ((status !== 503 && status !== 429) || attempt >= MAX_RETRIES) throw e;
            const delay = parseRetryAfter(e as RetryableError, 1500 * attempt);
            if (DBG) console.warn('[ai] outline 503/429 retry', { attempt, delayMs: delay });
            await sleep(delay);
          }
        }

        const ol = o?.outline ?? [];
        if (runIdRef.current !== myRun) return;
        setOutline(ol);
        if (DBG) console.info('[ai] outline loaded', { count: ol.length });

        // First lesson quickly for instant UX
        setStep('narrating');

        const firstPayload: AiLessonSSMLRequest = {
          courseId: selectedCourse.id,
          outline: ol.slice(0, 1),
          voiceName: voice,
          count: 1,
          level: knobs.level,
          courseSize: knobs.courseSize,
          paragraphs: knobs.paragraphs,
          sentencesPerParagraph: knobs.sentencesPerParagraph,
          programTrack: knobs.programTrack,
          totalLessons: knobs.totalLessons,
        };

        const firstPack: LessonPack = await createLessonSSML(backendUrl, firstPayload, { signal });

        if (runIdRef.current !== myRun) return;
        setLessons(firstPack.lessons ?? []);
        setJoinedSsml(firstPack.joinedSsml ?? '');
        setCurrentLessonIndex(0);
        setSsml(firstPack.joinedSsml || firstPack.lessons?.[0]?.ssml || '');
        setDegradedNotice(firstPack.notice ?? null);
        setStep('ready');
        if (DBG)
          console.info('[ai] firstPack ready', {
            lessons: firstPack.lessons?.length || 0,
            joinedBytes: (firstPack.joinedSsml || '').length,
          });

        // Stream/batch the rest
        fetchLessonsInBatches(
          backendUrl,
          selectedCourse.id,
          ol,
          voice,
          knobs,
          firstPack.lessons?.length || 0,
          (pack, startIndex) => {
            if (runIdRef.current !== myRun) return;
            if (DBG) console.groupCollapsed('[ai] onBatch', { startIndex, got: pack?.lessons?.length || 0 });
            setLessons((prev) => {
              const next = [...(prev || [])];
              (pack.lessons || []).forEach((l, j) => {
                next[startIndex + j] = l;
              });
              if (DBG) console.log('[ai] lessons after stitch', { prevLen: prev?.length || 0, nextLen: next.length });
              return next;
            });
            setJoinedSsml((prev) => {
              const current = prev?.trim() ? prev : (firstPack.joinedSsml || '');
              const incoming = pack.joinedSsml || (pack.lessons || []).map((l) => l.ssml).join('\n\n');
              return (current ? current + '\n\n' : '') + incoming;
            });
            if (pack.notice) setDegradedNotice(pack.notice);
            if (DBG) console.groupEnd();
          },
          signal
        ).catch((e: unknown) => {
          if (DBG) console.warn('[ai] fetchLessonsInBatches failed', e);
        });

        // Opportunistic full pack fetch (if server decides to return all at once)
        if (!gotFullPackRef.current && !fullPackInFlightRef.current) {
          fullPackInFlightRef.current = (async () => {
            try {
              const restPayload: AiLessonSSMLRequest = {
                courseId: selectedCourse.id,
                outline: ol,
                voiceName: voice,
                level: knobs.level,
                courseSize: knobs.courseSize,
                paragraphs: knobs.paragraphs,
                sentencesPerParagraph: knobs.sentencesPerParagraph,
                programTrack: knobs.programTrack,
                totalLessons: knobs.totalLessons,
              };

              const restPack: LessonPack = await createLessonSSML(backendUrl, restPayload, { signal });

              const newCount = restPack.lessons?.length || 0;
              const oldCount = firstPack.lessons?.length || 0;
              if (newCount > oldCount) {
                if (DBG) console.info('[ai] full pack expanded', { oldCount, newCount });
                if (runIdRef.current !== myRun) return;
                setLessons(restPack.lessons ?? []);
                setJoinedSsml(restPack.joinedSsml ?? '');
                if (restPack.joinedSsml) setSsml(restPack.joinedSsml);
                if (restPack.notice) setDegradedNotice(restPack.notice);
                gotFullPackRef.current = true;
              } else {
                if (DBG) console.warn('[ai] full pack returned no expansion', { oldCount, newCount });
              }
            } catch (e: unknown) {
              if (DBG) console.warn('[ai] full pack fetch failed', e);
            } finally {
              fullPackInFlightRef.current = null;
            }
          })();
        }
      } catch (e: unknown) {
        setError(getMessage(e) || 'AI failed to prepare this lesson');
        setStep('error');
        if (DBG) {
          console.groupEnd();
          console.error('[ai] startWithAI failed', e);
        }
        return;
      } finally {
        // If this run is still current and was aborted, clear the controller
        if (abortRef.current?.signal?.aborted) {
          abortRef.current = null;
        }
      }

      if (DBG) console.groupEnd();
    },
    [backendUrl, selectedCourse]
  );

  const startCustomTopic = useCallback(
    async (
      title: string,
      opts?: {
        courseSize?: CourseSize;
        level?: 'beginner' | 'intermediate' | 'advanced';
        minutes?: number;
        voiceName?: string;
        paragraphs?: number;
        sentencesPerParagraph?: number;
        programTrack?: ProgramTrack;
        totalLessons?: number;
      }
    ) => {
      setError(null);
      try {
        const chosenSize: CourseSize = opts?.courseSize || DEFAULT_SIZE.courseSize;
        const preset = SIZE_PRESETS[chosenSize];

        const sandbox = await createAiSandboxCourse(backendUrl, {
          title,
          courseSize: chosenSize,
          minutes: opts?.minutes ?? preset.minutes,
        });

        setSelectedCourse({
          id: sandbox.id,
          title: sandbox.title,
          blurb: sandbox.description || '',
          rating: 0,
          reviews: 0,
        });

        if (DBG) console.info('[ai] sandbox course created', { id: sandbox.id, size: chosenSize });

        await startWithAI({
          courseSize: chosenSize,
          level: opts?.level || DEFAULT_SIZE.level,
          voiceName: opts?.voiceName || DEFAULT_SIZE.voiceName,
          paragraphs: opts?.paragraphs ?? preset.paragraphs,
          sentencesPerParagraph: opts?.sentencesPerParagraph ?? preset.sentencesPerParagraph,
          programTrack: opts?.programTrack,
          totalLessons: opts?.totalLessons,
          minutes: opts?.minutes ?? preset.minutes,
        });
      } catch (e: unknown) {
        setError(getMessage(e) || 'Failed to start custom topic');
        setStep('error');
        if (DBG) console.error('[ai] startCustomTopic failed', e);
      }
    },
    [backendUrl, startWithAI]
  );

  const generateQuizNow = useCallback(
    async (numQuestions?: number, courseSize?: CourseSize, programTrack?: ProgramTrack, totalLessons?: number) => {
      if (!selectedCourse || !outline.length) return;
      setError(null);
      setStep('quizzing');

      const size = courseSize || DEFAULT_SIZE.courseSize;
      const preset = SIZE_PRESETS[size];

      try {
        const quizReq: AiQuizRequest =
          typeof numQuestions === 'number'
            ? {
                courseId: selectedCourse.id,
                outline,
                numQuestions,
                programTrack,
                totalLessons,
              }
            : {
                courseId: selectedCourse.id,
                outline,
                level: DEFAULT_SIZE.level,
                targetMinutes: preset.minutes,
                courseSize: size,
                paragraphs: preset.paragraphs,
                sentencesPerParagraph: preset.sentencesPerParagraph,
                finalQuizSize: preset.finalQuizSize,
                programTrack,
                totalLessons,
              };

        const q = await createQuiz(backendUrl, quizReq);
        setQuiz(q.quiz);
        setAnswers({});
        if (DBG) console.info('[ai] quiz generated', { questions: q.quiz?.questions?.length || 0 });
      } catch (e: unknown) {
        setError(getMessage(e) || 'AI failed to generate quiz');
        setStep('error');
        if (DBG) console.error('[ai] generateQuizNow failed', e);
      }
    },
    [backendUrl, selectedCourse, outline]
  );

  const answerQuestion = useCallback((questionId: string, choiceIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceIndex }));
    if (DBG) console.log('[ai] answerQuestion', { questionId, choiceIndex });
  }, []);

  const allAnswered = useMemo(() => {
    if (!quiz?.questions?.length) return false;
    return quiz.questions.every((q) => Number.isInteger(answers[q.id]));
  }, [quiz, answers]);

  const gradeNow = useCallback(
    async (passMark?: number) => {
      if (!token) {
        setError('Please sign in to submit and grade your quiz.');
        if (DBG) console.warn('[ai] gradeNow aborted: no token');
        return;
      }
      if (!quiz?.questions?.length) return;
      setError(null);
      try {
        const payload = {
          quiz,
          answers: Object.keys(answers).map((qid) => ({
            questionId: qid,
            choiceIndex: answers[qid],
          })),
          passMark,
        };
        const g = await gradeQuizApi(backendUrl, token, payload);
        setGrade(g);
        setStep('graded');
        if (DBG) console.info('[ai] grade result', { scorePct: g?.scorePct, passed: g?.passed });
        return g;
      } catch (e: unknown) {
        setError(getMessage(e) || 'Grading failed');
        setStep('error');
        if (DBG) console.error('[ai] gradeNow failed', e);
        throw e;
      }
    },
    [backendUrl, token, quiz, answers]
  );

  const tryGenerateCertificate = useCallback(async () => {
    if (!token) {
      setError('Please sign in to request your certificate.');
      if (DBG) console.warn('[ai] tryGenerateCertificate aborted: no token');
      return null;
    }
    if (!selectedCourse) return null;

    try {
      const elig = await certGetEligibility(backendUrl, token, selectedCourse.id);
      if (DBG) console.info('[ai] cert eligibility', elig);
      if (!elig.eligible) {
        setError(elig.reason || 'Not eligible for certificate yet.');
        return null;
      }
      const cert = await certGenerate(backendUrl, token, selectedCourse.id);
      setCertificate(cert);
      if (DBG) console.info('[ai] certificate generated', { id: cert?.id || null });
      return cert;
    } catch (e: unknown) {
      setError(getMessage(e) || 'Certificate generation failed');
      if (DBG) console.error('[ai] tryGenerateCertificate failed', e);
      return null;
    }
  }, [backendUrl, token, selectedCourse]);

  /* ─────────────────────────────────────────────────────────
   * NEW: Cache clear helpers (call from UI when needed)
   * ───────────────────────────────────────────────────────── */
  const clearSelectedCourseCacheNow = useCallback(async () => {
    if (!selectedCourse) return 0;
    try {
      const res = await clearCourseCache(backendUrl, selectedCourse.id, { token });
      if (DBG) console.info('[ai] cache cleared for course', { courseId: selectedCourse.id, removed: res?.removed ?? 0 });
      return res?.removed ?? 0;
    } catch (e: unknown) {
      if (DBG) console.warn('[ai] clearSelectedCourseCacheNow failed', e);
      throw e;
    }
  }, [backendUrl, token, selectedCourse]);

  const clearTopCoursesCacheNow = useCallback(async () => {
    try {
      const res = await clearTopCoursesCache(backendUrl, { token });
      if (DBG) console.info('[ai] top-courses cache cleared', { removed: res?.removed ?? 0 });
      return res?.removed ?? 0;
    } catch (e: unknown) {
      if (DBG) console.warn('[ai] clearTopCoursesCacheNow failed', e);
      throw e;
    }
  }, [backendUrl, token]);

  return {
    topCourses,
    selectedCourse,
    outline,

    lessons,
    currentLessonIndex,
    currentLesson,
    joinedSsml,
    ssml,
    degradedNotice,

    quiz,
    answers,
    grade,

    certificate,

    step,
    error,
    ttsLoading,
    ttsError,

    loadTopCourses,
    selectCourse,

    startWithAI,
    startCustomTopic,

    goToLesson,
    nextLesson,
    prevLesson,
    hasNextLesson,
    hasPrevLesson,

    generateQuizNow,
    answerQuestion,
    allAnswered,
    gradeNow,

    tryGenerateCertificate,

    // NEW: cache helpers you can call from the UI
    clearSelectedCourseCacheNow,
    clearTopCoursesCacheNow,
  };
}
