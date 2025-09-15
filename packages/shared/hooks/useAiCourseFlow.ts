// packages/shared/hooks/useAiCourseFlow.ts
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  fetchTopCourses,
  createOutline,
  createQuiz,
  gradeQuizApi,
  createAiSandboxCourse,
  createLessonSSML,
  clearCourseCache,
  clearTopCoursesCache,
} from '../api/aiCourseApi';
import { useRobotSpeaker } from './useRobotSpeaker';
import { buildGradePayload } from '../utils/buildGradePayload';
import { useTtsQueue } from './useTtsQueue';

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
  offset?: number;
};

type CourseSize = DbCourseSize;

type FlowHints = {
  orgQuizType?: 'mcq' | 'short';
  urlQuizTypeHint?: 'mcq' | 'short';
  defaultQuizType?: 'mcq' | 'short';
};

// ---------- config/constants ----------
const PREFETCH_AHEAD = Number(import.meta.env.VITE_PREFETCH_AHEAD ?? 2);
const LESSON_BATCH = 1;
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
  { minutes: number; paragraphs: number; sentencesPerParagraph: number; finalQuizSize: number }
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
    e?.headers?.['retry-after'] ?? e?.headers?.['Retry-After'] ?? e?.retryAfter ?? e?.retryAfterSec;
  if (typeof hdr === 'number') {
    const seconds = hdr > 1000 ? hdr / 1000 : hdr;
    return Math.max(250, Math.round(seconds * 1000));
  }
  if (typeof hdr === 'string') {
    const n = Number(hdr.trim());
    if (!Number.isNaN(n)) return Math.max(250, Math.round(n * 1000));
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

// ---------- defaults (declare BEFORE any usage) ----------
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

// local augmentation for API responses that include queue hints
type LQueue = { nextStart: number | null; total: number };
type LessonPackWithQueue = LessonPack & { queue?: LQueue };

export function useAiCourse(
  backendUrl: string,
  token?: string,
  flowHints?: FlowHints
) {
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TopCourse | null>(null);
  const [outline, setOutline] = useState<AiOutlineSection[]>([]);

  const [lessons, setLessons] = useState<AILesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [joinedSsml, setJoinedSsml] = useState<string>('');
  const [ssml, setSsml] = useState<string>('');

  const { enqueue, clear: clearQueue, playNext } = useTtsQueue((next) => {
    if (next?.trim()) setSsml(next);
  });

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const [step, setStep] = useState<StartState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [degradedNotice, setDegradedNotice] =
    useState<{ degraded: boolean; reason: string } | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  const [hasMoreCourses, setHasMoreCourses] = useState<boolean>(false);
  const [coursesCursor, setCoursesCursor] = useState<string | null>(null);

  const { reset: resetTts, loading: ttsLoading, error: ttsError } = useRobotSpeaker();

  const fullPackInFlightRef = useRef<Promise<void> | null>(null);
  const gotFullPackRef = useRef(false);

  // Track/abort a single “run” of outline+lessons generation
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Background prefetcher controls
  const fetchAbortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef(false);

  // Prefetcher knobs
  const lastVoiceRef = useRef(DEFAULT_SIZE.voiceName);
  const lastSizeRef = useRef<CourseSize>(DEFAULT_SIZE.courseSize);
  const enqueuedIdsRef = useRef<Set<string>>(new Set());
  // Server queue hint and outline ref
  const [serverQueue, setServerQueue] = useState<LQueue | undefined>(undefined);
  const outlineRef = useRef<AiOutlineSection[]>([]);
  useEffect(() => {
    outlineRef.current = outline;
  }, [outline]);

  // cleanup
  useEffect(() => {
    return () => {
      try {
        abortRef.current?.abort('unmount');
      } catch {}
      try {
        fetchAbortRef.current?.abort();
      } catch {}
    };
  }, []);

  // ---------- Top courses (with pagination) ----------
  const loadTopCourses = useCallback(
    async (opts?: LoadTopOptions) => {
      const { aiOnly = false } = opts || {};
      setError(null);
      try {
        const raw: any = await fetchTopCourses(backendUrl, {
          aiOnly,
          limit: opts?.limit,
          cursor: opts?.cursor,
          page: opts?.page,
          offset: opts?.offset,
        } as any);

        const rows: TopCourse[] = Array.isArray(raw)
          ? raw
          : (raw?.rows as TopCourse[]) ??
            (raw?.courses as TopCourse[]) ??
            (raw?.data as TopCourse[]) ??
            [];

        const hasMoreFlag = raw?.hasMore ?? raw?.has_more ?? raw?.hasNext;
        const cursorPresent = raw?.nextCursor != null || typeof raw?.next_cursor !== 'undefined';
        const normalizedHasMore: boolean =
          Boolean(hasMoreFlag ?? cursorPresent) && rows.length > 0;
        const normalizedCursor: string | null =
          raw?.nextCursor ?? raw?.next_cursor ?? raw?.cursor ?? null;

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
          const seen = new Set<string>();
          const deduped = merged.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
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
      setServerQueue(undefined);

      if (DBG) console.info('[ai] selectCourse', { courseId: course?.id || null });
    },
    [resetTts, clearQueue]
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

  // ---------- helpers used by prefetch ----------
  const appendLessons = useCallback((pack: LessonPackWithQueue) => {
    setLessons((prev) => {
      const next = [...prev, ...(pack?.lessons || [])];
      const seen = new Set<string>();
      return next.filter((l) => {
        const id = String(l?.id ?? l?.title ?? '');
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    });
    if (pack?.queue) setServerQueue(pack.queue);
  }, []);

  // Background prefetcher
  const prefetchNextIfNeeded = useCallback(
    async (queue: LQueue | undefined, ol: AiOutlineSection[]) => {
      if (!queue || queue.nextStart == null) return;
      if (inflightRef.current) return;
      if (!selectedCourse?.id) return;

      const have = lessons.length;
      const wantUpTo = Math.min(queue.total, have + PREFETCH_AHEAD);
      if (have >= wantUpTo) return;

      inflightRef.current = true;
      try {
        fetchAbortRef.current?.abort();
        const ac = new AbortController();
        fetchAbortRef.current = ac;

        const res = await fetch(`${backendUrl}/api/ai/lesson-ssml`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
          body: JSON.stringify({
            courseId: selectedCourse.id,
            outline: ol,
            voiceName: lastVoiceRef.current,
            courseSize: lastSizeRef.current,
            start: queue.nextStart,
            count: LESSON_BATCH,
          }),
        });

        const data = (await res.json()) as LessonPackWithQueue;
        if (Array.isArray(data?.lessons) && data.lessons.length) {
          appendLessons(data);
          if (data.queue) {
            setServerQueue(data.queue);
            await prefetchNextIfNeeded(data.queue, ol);
          }
        }
      } catch {
        // ignore background fetch errors
      } finally {
        inflightRef.current = false;
      }
    },
    [appendLessons, backendUrl, lessons.length, selectedCourse?.id]
  );

  useEffect(() => {
    if (!serverQueue) return;
    prefetchNextIfNeeded(serverQueue, outlineRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQueue?.nextStart]);

  // ---------- Foreground chunking ----------
  async function fetchLessonsInBatches(
    _baseUrl: string,
    courseId: string,
    fullOutline: AiOutlineSection[],
    voice: string,
    knobs: ReturnType<typeof buildKnobs>,
    alreadyHave: number,
    onBatch: (pack: LessonPack, startIndex: number) => void,
    signal?: AbortSignal,
    _assignmentId?: string,
    _token?: string
  ) {
    let produced = alreadyHave;
    while (produced < fullOutline.length) {
      if (signal?.aborted) throw signal.reason || new Error('Aborted');
      const start = produced;
      const count = Math.min(BATCH_SIZE, fullOutline.length - start);

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

    const defaultTrackBySize: Record<CourseSize, ProgramTrack> = {
      mini: 'module',
      standard: 'certificate',
      extended: 'certificate',
      deep_dive: 'diploma',
      bootcamp: 'degree',
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
      programTrack,
      totalLessons: input?.totalLessons,
    };
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

      // keep prefetcher knobs updated for this run
      lastVoiceRef.current = voice;
      lastSizeRef.current = knobs.courseSize;

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

        if (!Array.isArray(ol) || ol.length === 0) {
          setStep('error');
          setError(
            'AI could not generate an outline for this course. Try a smaller size or another topic.'
          );
          if (DBG) console.warn('[ai] empty outline; aborting lesson generation');
          return;
        }

        setStep('narrating');

        const firstPack = (await createLessonSSML(
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
        )) as LessonPackWithQueue;

        if (runIdRef.current !== myRun) return;
        setLessons(firstPack.lessons ?? []);
        setJoinedSsml(firstPack.joinedSsml ?? '');
        setCurrentLessonIndex(0);
        setSsml(firstPack.lessons?.[0]?.ssml || firstPack.joinedSsml || '');
        setDegradedNotice(firstPack.notice ?? null);

        // queue hint
        setServerQueue(firstPack.queue);
        if (firstPack.queue) prefetchNextIfNeeded(firstPack.queue, ol);

        setStep('ready');
        const firstId = String(firstPack.lessons?.[0]?.id ?? 'L1');
        enqueuedIdsRef.current.add(firstId);
        if (DBG)
          console.info('[ai] firstPack ready', {
            lessons: firstPack.lessons?.length || 0,
            joinedBytes: (firstPack.joinedSsml || '').length,
          });

        // Stream/batch the rest — append incoming lessons
        fetchLessonsInBatches(
          backendUrl,
          selectedCourse.id,
          ol,
          voice,
          knobs,
          firstPack.lessons?.length || 0,
          (pack) => {
            if (runIdRef.current !== myRun) return;
            if (DBG) console.groupCollapsed('[ai] onBatch', { got: pack?.lessons?.length || 0 });

            setLessons((prev) => {
              const next = [...(prev || []), ...(pack.lessons || [])];
              const seen = new Set<string>();
              return next.filter((l: AILesson) => {
                const key = String(l?.id ?? l?.title ?? '');
                if (!key) return true;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            });

            (pack.lessons || []).forEach((L) => {
              const id = String(L?.id ?? '');
              if (!id || enqueuedIdsRef.current.has(id)) return;
              enqueuedIdsRef.current.add(id);
              if (L?.ssml?.trim()) enqueue(L.ssml);
            });

            setJoinedSsml((prev) => {
              const current = prev?.trim() ? prev : firstPack.joinedSsml || '';
              const incoming =
                pack.joinedSsml || (pack.lessons || []).map((l) => l.ssml).join('\n\n');
              return (current ? current + '\n\n' : '') + incoming;
            });
            if (pack.notice) setDegradedNotice(pack.notice);
            if (DBG) console.groupEnd();
          },
          signal,
          opts?.assignmentId,
          token
        ).catch((e: unknown) => {
          if (DBG) console.warn('[ai] fetchLessonsInBatches failed', e);
        });

        // Opportunistic full pack fetch
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
        if (abortRef.current?.signal?.aborted) {
          abortRef.current = null;
        }
      }

      if (DBG) console.groupEnd();
    },
    [backendUrl, selectedCourse, token, enqueue, ssml, prefetchNextIfNeeded]
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

  // --------- generateQuizNow (honors arg/org/url/default) ----------
  const generateQuizNow = useCallback(
    async (
      numQuestions?: number,
      courseSize?: CourseSize,
      programTrack?: ProgramTrack,
      totalLessons?: number,
      assignmentId?: string,
      quizType?: 'mcq' | 'short'
    ) => {
      const effectiveQt: 'mcq' | 'short' =
        (quizType as 'mcq' | 'short' | undefined) ??
        flowHints?.orgQuizType ??
        flowHints?.urlQuizTypeHint ??
        flowHints?.defaultQuizType ??
        'mcq';

      console.log('[qt] generateQuizNow args', {
        numQuestions,
        courseSize,
        programTrack,
        totalLessons,
        assignmentId,
        quizType_in: effectiveQt,
      });

      if (!selectedCourse || !outline.length) return;
      setError(null);
      setStep('quizzing');
      setQuiz(null);

      const size = courseSize || DEFAULT_SIZE.courseSize;
      const preset = SIZE_PRESETS[size];

      try {
        setQuiz(null);
        setAnswers({});
        setGrade(null);

        const safeOutline = (outline || []).map((s: any) => ({
          id: s?.id,
          title: String(s?.title || '').slice(0, 200),
          keyPoints: (Array.isArray(s?.keyPoints) ? s.keyPoints : [])
            .map((k: any) => String(k || '').trim())
            .filter(Boolean)
            .slice(0, 10),
        }));

        const qt: 'mcq' | 'short' = effectiveQt;

        const wantedNumQ =
          typeof numQuestions === 'number' && Number.isFinite(numQuestions)
            ? Math.max(1, Math.floor(numQuestions))
            : undefined;

        const base = {
          courseId: selectedCourse.id,
          outline: safeOutline,
          courseSize: size,
          level: DEFAULT_SIZE.level,
          programTrack,
          totalLessons: totalLessons ?? safeOutline.length,
          assignmentId,
          quizType: qt,
        };

        const quizReq: AiQuizRequest = wantedNumQ
          ? { ...base, numQuestions: wantedNumQ }
          : {
              ...base,
              targetMinutes: preset.minutes,
              paragraphs: preset.paragraphs,
              sentencesPerParagraph: preset.sentencesPerParagraph,
              finalQuizSize: preset.finalQuizSize,
            };

        const dbg: Record<string, unknown> = {
          courseId: base.courseId,
          outlineLen: safeOutline.length,
          courseSize: base.courseSize,
          level: base.level,
          programTrack: base.programTrack,
          totalLessons: base.totalLessons,
          assignmentId: base.assignmentId,
          quizType: base.quizType,
        };
        if (wantedNumQ) dbg.numQuestions = wantedNumQ;
        else {
          dbg.targetMinutes = preset.minutes;
          dbg.paragraphs = preset.paragraphs;
          dbg.sentencesPerParagraph = preset.sentencesPerParagraph;
          dbg.finalQuizSize = preset.finalQuizSize;
        }
        console.log('[ui] /api/ai/quiz payload →', dbg);

        const q = await createQuiz(backendUrl, quizReq, { token });
        setQuiz(q.quiz);
        setAnswers({});
        if (DBG) console.info('[ai] quiz generated', { questions: q.quiz?.questions?.length || 0 });
      } catch (e: unknown) {
        setQuiz(null);
        setError(getMessage(e) || 'AI failed to generate quiz');
        setStep('error');
      }
    },
    [
      backendUrl,
      selectedCourse,
      outline,
      token,
      flowHints?.orgQuizType,
      flowHints?.urlQuizTypeHint,
      flowHints?.defaultQuizType,
    ]
  );
  // ----------------------------------------------------------------

  const answerQuestion = useCallback((questionId: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  type AnyQuiz = Quiz | null | undefined;
  type AnyQuestion = (Quiz['questions'][number] & Record<string, unknown>) | undefined;

  function inferIsShort(q: AnyQuiz): boolean {
    const qt = (q as any)?.quizType;
    if (qt === 'short') return true;
    if (qt === 'mcq') return false;
    const first = (q?.questions?.[0] as AnyQuestion) || undefined;
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
      if (!token) {
        setError('Please sign in to submit and grade your quiz.');
        return;
      }
      if (!quiz?.questions?.length) return;
      setError(null);
      try {
        const payload: any = buildGradePayload(quiz, answers);
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
        console.info('[ai] top-courses cache cleared', { removed: res?.removed ?? 0 });
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

    // pagination
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

    clearSelectedCourseCacheNow,
    clearTopCoursesCacheNow,
    onNarrationEnded,
  };
}
