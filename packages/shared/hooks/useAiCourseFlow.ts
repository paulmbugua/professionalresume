// packages/shared/hooks/useAiCourse.ts
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  fetchTopCourses,
  createOutline,
  // ⬇ still used
  createQuiz,
  gradeQuizApi,
  createAiSandboxCourse,
  createLessonSSML,
  // cache helpers
  clearCourseCache,
  clearTopCoursesCache,
} from '../api/aiCourseApi';
import { useRobotSpeaker } from './useRobotSpeaker';
import { buildGradePayload } from '../utils/buildGradePayload';
import { useTtsQueue } from './useTtsQueue';

// NEW: aiClient helpers


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
  preserveIds?: string[];
  // optional offset passthrough for legacy endpoints
  offset?: number;
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

  // Tiny TTS queue: anything newer waits until the current audio ends
  const {
    enqueue,
    clear: clearQueue,
    pending: ttsPending,
    playNext,
  } = useTtsQueue((next) => {
    if (next?.trim()) setSsml(next); // promotes the next narration
  });

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const [step, setStep] = useState<StartState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [degradedNotice, setDegradedNotice] =
    useState<{ degraded: boolean; reason: string } | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  // NEW: pagination state (so the UI can avoid compat casts)
  const [hasMoreCourses, setHasMoreCourses] = useState<boolean>(false);
  const [coursesCursor, setCoursesCursor] = useState<string | null>(null);

  const { reset: resetTts, loading: ttsLoading, error: ttsError } = useRobotSpeaker();

  const fullPackInFlightRef = useRef<Promise<void> | null>(null);
  const gotFullPackRef = useRef(false);

  // NEW: track/abort a single “run” of outline+lessons generation
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      try { abortRef.current?.abort('unmount'); } catch {}
    };
  }, []);

  // ---------- Top courses (with pagination) ----------
  const loadTopCourses = useCallback(
    async (opts?: LoadTopOptions) => {
      const { aiOnly = false } = opts || {};
      setError(null);
      try {
        // Call and accept multiple response shapes (array or object with metadata)
        const raw: any = await fetchTopCourses(backendUrl, {
          aiOnly,
          limit: opts?.limit,
          cursor: opts?.cursor,
          page: opts?.page,
          offset: opts?.offset, // legacy passthrough
        } as any);

        // Normalize rows
        const rows: TopCourse[] = Array.isArray(raw)
          ? raw
          : (raw?.rows as TopCourse[]) ??
            (raw?.courses as TopCourse[]) ??
            (raw?.data as TopCourse[]) ??
            [];

        // ✅ Fix TS2881: don't chain `??` after a boolean
        const hasMoreFlag =
          raw?.hasMore ?? raw?.has_more ?? raw?.hasNext; // boolean | undefined

        const cursorPresent =
          raw?.nextCursor != null || typeof raw?.next_cursor !== 'undefined'; // boolean

        const normalizedHasMore: boolean =
          Boolean(hasMoreFlag ?? cursorPresent) && rows.length > 0;

        const normalizedCursor: string | null =
          raw?.nextCursor ?? raw?.next_cursor ?? raw?.cursor ?? null;

        // Filter out "Teach me" sandbox courses, unless preserved
        const isSandbox = (t: TopCourse) => {
          const title = (t.title || '').toLowerCase();
          const blurb = (t.blurb || '').toLowerCase();
          return (
            blurb.startsWith('ai sandbox course for:') ||
            title.startsWith('ai sandbox course for:')
          );
        };

        const keep = new Set(opts?.preserveIds || []);
        const incoming = rows.filter((r) => !isSandbox(r) || keep.has(r.id));

        setTopCourses((prev) => {
          const merged = opts?.append ? [...prev, ...incoming] : incoming;

          // Dedup by id
          const seen = new Set<string>();
          const deduped = merged.filter((x) =>
            seen.has(x.id) ? false : (seen.add(x.id), true)
          );

          // Sort by title
          deduped.sort((a, b) =>
            (a.title || '').localeCompare((b.title || ''), undefined, {
              sensitivity: 'base',
              numeric: true,
            })
          );

          return deduped;
        });

        setHasMoreCourses(Boolean(normalizedHasMore));
        setCoursesCursor(normalizedCursor);

        if (DBG)
          console.info('[ai] top courses', {
            count: rows.length,
            append: !!opts?.append,
            hasMore: normalizedHasMore,
            nextCursor: normalizedCursor,
          });
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
      try {
        abortRef.current?.abort('switch-course');
      } catch {}
      abortRef.current = null;
      runIdRef.current++;

      setSelectedCourse(course);
      setOutline([]);
      setLessons([]);
      setCurrentLessonIndex(0);
      setJoinedSsml('');
      setSsml('');
      clearQueue();
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

  const onNarrationEnded = useCallback(() => {
    playNext();
  }, [playNext]);

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
    courseSize: ((): CourseSize => {
      try {
        return (localStorage.getItem('AI_COURSE_SIZE') as CourseSize) || 'mini';
      } catch {
        return 'mini';
      }
    })(),
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

    // NEW: map size → default track
    const defaultTrackBySize: Record<CourseSize, ProgramTrack> = {
      mini: 'module', // 8 lessons
      standard: 'certificate', // 20 lessons
      extended: 'certificate', // 20
      deep_dive: 'diploma', // 60
      bootcamp: 'degree', // 120
    };
    const programTrack = input?.programTrack || defaultTrackBySize[courseSize];

    return {
      courseSize,
      level: input?.level || DEFAULT_SIZE.level,
      targetMinutes: input?.minutes ?? SIZE_PRESETS[courseSize].minutes,
      paragraphs: input?.paragraphs ?? SIZE_PRESETS[courseSize].paragraphs,
      sentencesPerParagraph:
        input?.sentencesPerParagraph ?? SIZE_PRESETS[courseSize].sentencesPerParagraph,
      finalQuizSize: input?.finalQuizSize ?? SIZE_PRESETS[courseSize].finalQuizSize,
      programTrack, // ensure it’s sent
      totalLessons: input?.totalLessons, // optional hard override
    };
  }

  // ---------- NEW batching using aiClient.getLessonsChunk ----------
  async function fetchLessonsInBatches(
    _baseUrl: string, // kept for signature compatibility
    courseId: string,
    fullOutline: AiOutlineSection[],
    voice: string,
    knobs: ReturnType<typeof buildKnobs>,
    alreadyHave: number,
    onBatch: (pack: LessonPack, startIndex: number) => void,
    signal?: AbortSignal,
    _assignmentId?: string, // unused in aiClient
    _token?: string // unused in aiClient
  ) {
    let produced = alreadyHave;
    while (produced < fullOutline.length) {
      if (signal?.aborted) throw signal.reason || new Error('Aborted');

      const start = produced;
      const count = Math.min(BATCH_SIZE, fullOutline.length - start);

       // ✅ real backend call (handles min length + expansion)
    const pack = await createLessonSSML(
      backendUrl,
      {
        courseId,
        outline: fullOutline,
        voiceName: voice,
        courseSize: knobs.courseSize,
        start,
        count,
        programTrack: knobs.programTrack,
      },
      { token, signal }
    );
    const gotCount = pack?.lessons?.length ?? 0;
    onBatch(pack, start);


      produced += gotCount;
      if (!gotCount) break;
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
      assignmentId?: string;
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
      try {
        abortRef.current?.abort('superseded');
      } catch {}
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      if (DBG) console.groupCollapsed('[ai] startWithAI', { courseId: selectedCourse.id, knobs });

      try {
        // Outline (with retries on 503/429)
        let outlineResp: AiOutlineResponse | undefined;
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
              assignmentId: opts?.assignmentId,
            };
            outlineResp = await createOutline(backendUrl, outlineReq, { signal, token });
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

        const ol = outlineResp?.outline ?? [];
        if (runIdRef.current !== myRun) return;
        setOutline(ol);
        if (DBG) console.info('[ai] outline loaded', { count: ol.length });

        // ⛔ bail if outline is empty
        if (!Array.isArray(ol) || ol.length === 0) {
          setStep('error');
          setError(
            'AI could not generate an outline for this course. Try a smaller size or another topic.'
          );
          if (DBG) console.warn('[ai] empty outline; aborting lesson generation');
          return;
        }

        // First lesson quickly for instant UX
        setStep('narrating');

        // 🔁 REPLACED: use aiClient.getLessonsChunk for the first lesson
         // ✅ Call the real backend
 const firstPack = await createLessonSSML(
   backendUrl,
   {
     courseId: selectedCourse.id,
     outline: ol,
     voiceName: voice,
     courseSize: knobs.courseSize,
     start: 0,
     count: 1,
     programTrack: knobs.programTrack,
   },
   { token, signal }
 );

        if (runIdRef.current !== myRun) return;
        setLessons(firstPack.lessons ?? []);
        setJoinedSsml(firstPack.joinedSsml ?? '');
        setCurrentLessonIndex(0);
        setSsml(firstPack.lessons?.[0]?.ssml || firstPack.joinedSsml || '');
        setDegradedNotice(firstPack.notice ?? null);
        setStep('ready');
        if (DBG)
          console.info('[ai] firstPack ready', {
            lessons: firstPack.lessons?.length || 0,
            joinedBytes: (firstPack.joinedSsml || '').length,
          });

        // Stream/batch the rest — APPEND incoming lessons (no sparse indices)
        fetchLessonsInBatches(
          backendUrl,
          selectedCourse.id,
          ol,
          voice,
          knobs,
          firstPack.lessons?.length || 0,
          (pack /*, _startIndex */) => {
            if (runIdRef.current !== myRun) return;
            if (DBG) console.groupCollapsed('[ai] onBatch', { got: pack?.lessons?.length || 0 });

            // 👇 append new lessons
            setLessons((prev) => {
              const next = [...(prev || []), ...(pack.lessons || [])];
              const seen = new Set<string>();
              return next.filter((l: any) => {
                const key = l?.id ?? l?.slug ?? l?.title; // fallback if id missing
                if (!key) return true;
                if (seen.has(String(key))) return false;
                seen.add(String(key));
                return true;
              });
            });

            // keep building a joined SSML track
            setJoinedSsml((prev) => {
              const current = prev?.trim() ? prev : firstPack.joinedSsml || '';
              const incoming =
                pack.joinedSsml || (pack.lessons || []).map((l) => l.ssml).join('\n\n');
              return (current ? current + '\n\n' : '') + incoming;
            });

            // If the combined narration grew meaningfully, line it up to play next.
            const candidate = pack.joinedSsml;
            if (candidate && candidate.length > (ssml?.length ?? 0) + 300) {
              enqueue(candidate, { replaceLatest: true });
            }

            if (pack.notice) setDegradedNotice(pack.notice);
            if (DBG) console.groupEnd();
          },
          signal,
          opts?.assignmentId,
          token
        ).catch((e: unknown) => {
          if (DBG) console.warn('[ai] fetchLessonsInBatches failed', e);
        });

        // Opportunistic full pack fetch (if API returns all at once)
        // Opportunistic full pack fetch (if API returns all at once)
if (!gotFullPackRef.current && !fullPackInFlightRef.current) {
  fullPackInFlightRef.current = (async () => {
    try {
      const full = await createLessonSSML(
        backendUrl,
        {
          courseId: selectedCourse.id,
          outline: ol,
          voiceName: voice,
          courseSize: knobs.courseSize,
          start: 0,
          count: ol.length,
          programTrack: knobs.programTrack,
        },
        { token, signal }
      );

      const allLessons = full.lessons ?? [];
      const newCount = allLessons.length;
      const oldCount = firstPack.lessons?.length ?? 0;

      if (newCount > oldCount) {
        if (DBG) console.info('[ai] full pack expanded', { oldCount, newCount });
        if (runIdRef.current !== myRun) return;

        setLessons(allLessons);
        const fullJoined = allLessons.map((l: AILesson) => l.ssml).join('\n\n');
        setJoinedSsml(fullJoined);
        if (fullJoined) enqueue(fullJoined, { replaceLatest: true });

        if (full.notice) setDegradedNotice(full.notice);
        gotFullPackRef.current = true;
      } else if (DBG) {
        console.warn('[ai] full pack returned no expansion', { oldCount, newCount });
      }
    } catch (e) {
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
    [backendUrl, selectedCourse, token, enqueue, ssml]
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
    async (
      numQuestions?: number,
      courseSize?: CourseSize,
      programTrack?: ProgramTrack,
      totalLessons?: number,
      assignmentId?: string
    ) => {
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
                // ✅ ensure course size is applied in the direct numQuestions path
                courseSize: size,
                // (optional but harmless — keeps parity with the other branch)
                level: DEFAULT_SIZE.level,
                programTrack,
                totalLessons: totalLessons ?? outline.length,
                assignmentId,
              }
            : {
                courseId: selectedCourse.id,
                outline,
                level: DEFAULT_SIZE.level,
                targetMinutes: preset.minutes,
                courseSize: size, // ✅ already present here
                paragraphs: preset.paragraphs,
                sentencesPerParagraph: preset.sentencesPerParagraph,
                finalQuizSize: preset.finalQuizSize,
                programTrack,
                totalLessons: totalLessons ?? outline.length,
                assignmentId,
              };

        const q = await createQuiz(backendUrl, quizReq, { token });
        setQuiz(q.quiz);
        setAnswers({});
        if (DBG) console.info('[ai] quiz generated', { questions: q.quiz?.questions?.length || 0 });
      } catch (e: unknown) {
        setError(getMessage(e) || 'AI failed to generate quiz');
        setStep('error');
        if (DBG) console.error('[ai] generateQuizNow failed', e);
      }
    },
    [backendUrl, selectedCourse, outline, token]
  );

  const answerQuestion = useCallback((questionId: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  type AnyQuiz = Quiz | null | undefined;
  type AnyQuestion = (Quiz['questions'][number] & Record<string, unknown>) | undefined;

  function inferIsShort(q: AnyQuiz): boolean {
    // honor a pack-level hint if present (but don't require it in types)
    const qt = (q as any)?.quizType;
    if (qt === 'short') return true;
    if (qt === 'mcq') return false;

    // otherwise infer from first question shape
    const first = (q?.questions?.[0] as AnyQuestion) || undefined;
    // MCQ if it has a choices array; otherwise treat as short-answer
    return !(first && Array.isArray((first as any).choices));
  }

  const allAnswered = useMemo(() => {
    const qs = quiz?.questions || [];
    if (!qs.length) return false;

    const isShort = inferIsShort(quiz);

    return qs.every((q) => {
      const v = answers[q.id];
      return isShort
        ? typeof v === 'string' && v.trim() !== ''
        : typeof v === 'number' && Number.isFinite(v) && v >= 0;
    });
  }, [quiz, answers]);

  const gradeNow = useCallback(
    async (passMark?: number) => {
      if (!token) { setError('Please sign in to submit and grade your quiz.'); return; }
      if (!quiz?.questions?.length) return;
      setError(null);
      try {
        const payload: any = buildGradePayload(quiz, answers); // ← uses answerText for short, choiceIndex for MCQ
        if (typeof passMark === 'number') payload.passMark = passMark;
        const g = await gradeQuizApi(backendUrl, token, payload);
        setGrade(g);
        setStep('graded');
        return g;
      } catch (e: unknown) {
        setError(getMessage(e) || 'Grading failed');
        setStep('error');
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
      if (DBG)
        console.info('[ai] cache cleared for course', {
          courseId: selectedCourse.id,
          removed: res?.removed ?? 0,
        });
      return res?.removed ?? 0;
    } catch (e: unknown) {
      if (DBG) console.warn('[ai] clearSelectedCourseCacheNow failed', e);
      throw e;
    }
  }, [backendUrl, token, selectedCourse]);

  const clearTopCoursesCacheNow = useCallback(async () => {
    try {
      const res = await clearTopCoursesCache(backendUrl, { token });
      if (DBG)
        console.info('[ai] top-courses cache cleared', {
          removed: res?.removed ?? 0,
        });
      return res?.removed ?? 0;
    } catch (e: unknown) {
      if (DBG) console.warn('[ai] clearTopCoursesCacheNow failed', e);
      throw e;
    }
  }, [backendUrl, token]);

  return {
    // data
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

    // state
    step,
    error,
    ttsLoading,
    ttsError,

    // pagination (NEW)
    hasMoreCourses,
    coursesCursor,

    // actions
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
    onNarrationEnded,
  };
}
