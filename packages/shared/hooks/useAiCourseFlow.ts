// packages/shared/hooks/useAiCourseFlow.ts
import { useCallback, useMemo, useState } from 'react';
import {
  fetchTopCourses,
  createOutline,
  createLessonSSML,
  createQuiz,
  gradeQuizApi,
  createAiSandboxCourse,
} from '../api/aiCourseApi';
import { useRobotSpeaker } from './useRobotSpeaker';

import type { Certificate } from '@mytutorapp/shared/types';
import {
  getEligibility as certGetEligibility,
  generateCertificate as certGenerate,
} from '@mytutorapp/shared/api';

import type {
  TopCourse,
  AiOutlineSection,
  Quiz,
  GradeResult,
  AILesson,
  LessonPack,
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

/** ─────────────────────────────────────────────────────────
 * NEW: size presets (client-side hints to match backend)
 * Minutes are approximate narration targets per lesson pack.
 * ───────────────────────────────────────────────────────── */
type CourseSize = 'mini' | 'standard' | 'extended' | 'deep_dive' | 'bootcamp';

const SIZE_PRESETS: Record<CourseSize, {
  minutes: number;
  paragraphs: number;
  sentencesPerParagraph: number;
  finalQuizSize: number;
}> = {
  mini:       { minutes: 12, paragraphs: 8,  sentencesPerParagraph: 2, finalQuizSize: 4  },
  standard:   { minutes: 25, paragraphs: 10, sentencesPerParagraph: 2, finalQuizSize: 6  },
  extended:   { minutes: 32, paragraphs: 12, sentencesPerParagraph: 2, finalQuizSize: 8  },
  deep_dive:  { minutes: 45, paragraphs: 14, sentencesPerParagraph: 2, finalQuizSize: 10 },
  bootcamp:   { minutes: 60, paragraphs: 16, sentencesPerParagraph: 2, finalQuizSize: 12 },
};

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

  const loadTopCourses = useCallback(
    async (opts?: LoadTopOptions) => {
      const { aiOnly = false } = opts || {};
      setError(null);
      try {
        const rows = await fetchTopCourses(backendUrl, aiOnly);
        setTopCourses(prev => (opts?.append ? [...prev, ...rows] : rows));
        return rows;
      } catch (e: any) {
        setError(e?.message || 'Failed to load courses');
        throw e;
      }
    },
    [backendUrl]
  );

  const selectCourse = useCallback(
    (course: TopCourse | null) => {
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
    },
    [resetTts]
  );

  const currentLesson = useMemo(
    () => (lessons.length ? lessons[currentLessonIndex] : null),
    [lessons, currentLessonIndex]
  );
  const hasPrevLesson = useMemo(() => currentLessonIndex > 0, [currentLessonIndex]);
  const hasNextLesson = useMemo(() => currentLessonIndex < lessons.length - 1, [currentLessonIndex, lessons.length]);

  const goToLesson = useCallback((index: number) => {
    if (!lessons.length) return;
    const clamped = Math.max(0, Math.min(index, lessons.length - 1));
    setCurrentLessonIndex(clamped);
  }, [lessons.length]);
  const nextLesson = useCallback(() => {
    if (!lessons.length) return;
    setCurrentLessonIndex(i => Math.min(i + 1, lessons.length - 1));
  }, [lessons.length]);
  const prevLesson = useCallback(() => {
    if (!lessons.length) return;
    setCurrentLessonIndex(i => Math.max(i - 1, 0));
  }, [lessons.length]);

  /** Default knobs (courseSize-first). */
  const DEFAULT_SIZE = {
    level: 'beginner' as const,
    courseSize: 'standard' as CourseSize,
    voiceName: 'en-US-JennyNeural',
  };

  /** Build knobs from a chosen size (with optional overrides). */
  function buildKnobs(input?: {
    courseSize?: CourseSize;
    level?: 'beginner' | 'intermediate' | 'advanced';
    minutes?: number;
    paragraphs?: number;
    sentencesPerParagraph?: number;
    finalQuizSize?: number;
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
      });

      try {
        // 1) Outline with courseSize
        const o = await createOutline(backendUrl, {
          courseId: selectedCourse.id,
          level: knobs.level,
          targetMinutes: knobs.targetMinutes,
          courseSize: knobs.courseSize,
          paragraphs: knobs.paragraphs,
          sentencesPerParagraph: knobs.sentencesPerParagraph,
        });
        const ol = o.outline ?? [];
        setOutline(ol);

        // 2a) FAST BOOT: only lesson 1 for instant playback
        setStep('narrating');
        const firstPack: LessonPack = await createLessonSSML(backendUrl, {
          courseId: selectedCourse.id,
          outline: ol.slice(0, 1),
          voiceName: voice,
          count: 1,
          level: knobs.level,
          targetMinutes: knobs.targetMinutes,
          courseSize: knobs.courseSize,
          paragraphs: knobs.paragraphs,
          sentencesPerParagraph: knobs.sentencesPerParagraph,
        });

        setLessons(firstPack.lessons ?? []);
        setJoinedSsml(firstPack.joinedSsml ?? '');
        setCurrentLessonIndex(0);
        setSsml(firstPack.lessons?.[0]?.ssml ?? '');
        setDegradedNotice(firstPack.notice ?? null);
        setStep('ready');

        // 2b) BACKGROUND: fetch full set with same knobs
        (async () => {
          try {
            const restPack: LessonPack = await createLessonSSML(backendUrl, {
              courseId: selectedCourse.id,
              outline: ol,
              voiceName: voice,
              level: knobs.level,
              targetMinutes: knobs.targetMinutes,
              courseSize: knobs.courseSize,
              paragraphs: knobs.paragraphs,
              sentencesPerParagraph: knobs.sentencesPerParagraph,
            });

            if ((restPack.lessons?.length || 0) > (firstPack.lessons?.length || 0)) {
              setLessons(restPack.lessons ?? []);
              setJoinedSsml(restPack.joinedSsml ?? '');
              if (!ssml) setSsml(restPack.lessons?.[0]?.ssml ?? '');
              if (restPack.notice) setDegradedNotice(restPack.notice);
            }
          } catch {
            /* non-fatal */
          }
        })();
      } catch (e: any) {
        setError(e?.message || 'AI failed to prepare this lesson');
        setStep('error');
      }
    },
    [backendUrl, selectedCourse, ssml]
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
      }
    ) => {
      setError(null);
      try {
        const sandbox = await createAiSandboxCourse(backendUrl, title);
        setSelectedCourse({
          id: sandbox.id,
          title: sandbox.title,
          blurb: sandbox.description || '',
        } as TopCourse);
        await startWithAI({
          courseSize: opts?.courseSize || DEFAULT_SIZE.courseSize,
          level: opts?.level || DEFAULT_SIZE.level,
          minutes: opts?.minutes ?? SIZE_PRESETS[opts?.courseSize || DEFAULT_SIZE.courseSize].minutes,
          voiceName: opts?.voiceName || DEFAULT_SIZE.voiceName,
          paragraphs: opts?.paragraphs ?? SIZE_PRESETS[opts?.courseSize || DEFAULT_SIZE.courseSize].paragraphs,
          sentencesPerParagraph:
            opts?.sentencesPerParagraph ??
            SIZE_PRESETS[opts?.courseSize || DEFAULT_SIZE.courseSize].sentencesPerParagraph,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to start custom topic');
        setStep('error');
      }
    },
    [backendUrl, startWithAI]
  );

  const generateQuizNow = useCallback(
    async (numQuestions?: number, courseSize?: CourseSize) => {
      if (!selectedCourse || !outline.length) return;
      setError(null);
      setStep('quizzing');

      const size = courseSize || DEFAULT_SIZE.courseSize;
      const preset = SIZE_PRESETS[size];

      try {
        const payload =
          typeof numQuestions === 'number'
            ? { courseId: selectedCourse.id, outline, numQuestions }
            : {
                courseId: selectedCourse.id,
                outline,
                level: DEFAULT_SIZE.level,
                targetMinutes: preset.minutes,
                courseSize: size,
                paragraphs: preset.paragraphs,
                sentencesPerParagraph: preset.sentencesPerParagraph,
                // Let backend choose, but send a hint:
                finalQuizSize: preset.finalQuizSize,
              };

        const q = await createQuiz(backendUrl, payload as any);
        setQuiz(q.quiz);
        setAnswers({});
      } catch (e: any) {
        setError(e?.message || 'AI failed to generate quiz');
        setStep('error');
      }
    },
    [backendUrl, selectedCourse, outline]
  );

  const answerQuestion = useCallback((questionId: string, choiceIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceIndex }));
  }, []);

  const allAnswered = useMemo(() => {
    if (!quiz?.questions?.length) return false;
    return quiz.questions.every(q => Number.isInteger(answers[q.id]));
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
        const payload = {
          quiz,
          answers: Object.keys(answers).map(qid => ({
            questionId: qid,
            choiceIndex: answers[qid],
          })),
          passMark,
        };
        const g = await gradeQuizApi(backendUrl, token, payload);
        setGrade(g);
        setStep('graded');
        return g;
      } catch (e: any) {
        setError(e?.message || 'Grading failed');
        setStep('error');
        throw e;
      }
    },
    [backendUrl, token, quiz, answers]
  );

  const tryGenerateCertificate = useCallback(async () => {
    if (!token) {
      setError('Please sign in to request your certificate.');
      return null;
    }
    if (!selectedCourse) return null;

    try {
      const elig = await certGetEligibility(backendUrl, token, selectedCourse.id);
      if (!elig.eligible) {
        setError(elig.reason || 'Not eligible for certificate yet.');
        return null;
      }
      const cert = await certGenerate(backendUrl, token, selectedCourse.id);
      setCertificate(cert);
      return cert;
    } catch (e: any) {
      setError(e?.message || 'Certificate generation failed');
      return null;
    }
  }, [backendUrl, token, selectedCourse]);

  return {
    // data
    topCourses,
    selectedCourse,
    outline,

    // lessons
    lessons,
    currentLessonIndex,
    currentLesson,
    joinedSsml,
    ssml,
    degradedNotice,

    // quiz
    quiz,
    answers,
    grade,

    // cert
    certificate,

    // status
    step,
    error,
    ttsLoading,
    ttsError,

    // actions
    loadTopCourses,
    selectCourse,

    startWithAI,
    startCustomTopic,

    // lesson navigation
    goToLesson,
    nextLesson,
    prevLesson,
    hasNextLesson,
    hasPrevLesson,

    // quiz actions
    generateQuizNow,
    answerQuestion,
    allAnswered,
    gradeNow,

    // certificate
    tryGenerateCertificate,
  };
}
