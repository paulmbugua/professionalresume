// packages/shared/hooks/useAiCourseFlow.ts
import { useCallback, useMemo, useState } from 'react';
import {
  fetchTopCourses,
  createOutline,
  createLessonSSML,
  createQuiz,
  gradeQuizApi,
  createAiSandboxCourse,
  // Optional: one-shot bundle (outline → lessons → quiz)
  // createCoursePackage,
} from '../api/aiCourseApi';
import { useRobotSpeaker } from './useRobotSpeaker';

// 🔹 Certificate types & API (unchanged)
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
  // New granular lesson types
  AILesson,
  LessonPack, // lessons[] + joinedSsml (+ optional notice)
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
  limit?: number;       // UI hint only
  append?: boolean;     // UI behavior
  cursor?: string|null; // UI hint only
  page?: 'next'|'prev'|number|string; // UI hint only
  aiOnly?: boolean;     // forwarded to API
};

export function useAiCourse(backendUrl: string, token?: string) {
  // ---------------------------
  // AI flow state
  // ---------------------------
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TopCourse | null>(null);

  const [outline, setOutline] = useState<AiOutlineSection[]>([]);

  // New: multi-lesson support
  const [lessons, setLessons] = useState<AILesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [joinedSsml, setJoinedSsml] = useState<string>(''); // concatenated
  // Backward-compat single-blob SSML for existing player:
  const [ssml, setSsml] = useState<string>('');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const [step, setStep] = useState<StartState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Optional signal if backend returned a degraded scaffold (quota/rate-limited)
  const [degradedNotice, setDegradedNotice] = useState<{ degraded: boolean; reason: string } | null>(null);

  // Certificate
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  // Robot TTS (UI owns speak(); we only track reset/errors)
  const { reset: resetTts, loading: ttsLoading, error: ttsError } = useRobotSpeaker();

  // ---------------------------
  // Load top courses
  // ---------------------------
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

  // ---------------------------
  // Select course → reset flow
  // ---------------------------
  const selectCourse = useCallback(
    (course: TopCourse | null) => {
      setSelectedCourse(course);
      setOutline([]);

      setLessons([]);
      setCurrentLessonIndex(0);
      setJoinedSsml('');
      setSsml(''); // keep old player empty

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

  // ---------------------------
  // Helpers: lessons
  // ---------------------------
  const currentLesson = useMemo(
    () => (lessons.length ? lessons[currentLessonIndex] : null),
    [lessons, currentLessonIndex]
  );

  const hasPrevLesson = useMemo(
    () => currentLessonIndex > 0,
    [currentLessonIndex]
  );
  const hasNextLesson = useMemo(
    () => currentLessonIndex < lessons.length - 1,
    [currentLessonIndex, lessons.length]
  );

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

  // ---------------------------
  // Start AI (outline → lessons)
  // Fast-boot strategy:
  //   1) Outline
  //   2a) Fetch only the first lesson now (immediate playback)
  //   2b) Prefetch remaining lessons in the background and merge
  // ---------------------------
  const startWithAI = useCallback(
    async (opts?: {
      level?: 'beginner' | 'intermediate' | 'advanced';
      minutes?: number;
      voiceName?: string;
    }) => {
      if (!selectedCourse) return;
      setError(null);
      setStep('outlining');

      try {
        // 1) Outline
        const o = await createOutline(backendUrl, {
          courseId: selectedCourse.id,
          level: opts?.level ?? 'beginner',
          targetMinutes: opts?.minutes ?? 25,
        });
        const ol = o.outline ?? [];
        setOutline(ol);

        // 2a) FAST BOOT: fetch just the first lesson now
        setStep('narrating');

        // We pass only the first section of the outline to make the request tiny and fast.
        const firstPack: LessonPack = await createLessonSSML(backendUrl, {
          courseId: selectedCourse.id,
          outline: ol.slice(0, 1), // first section only
          voiceName: opts?.voiceName ?? 'en-US-JennyNeural',
        });

        // Prime the UI immediately
        setLessons(firstPack.lessons ?? []);
        setJoinedSsml(firstPack.joinedSsml ?? '');
        setCurrentLessonIndex(0);
        // Backward-compat: keep old player working with a single SSML blob
        setSsml(firstPack.lessons?.[0]?.ssml ?? '');
        setDegradedNotice(firstPack.notice ?? null);

        setStep('ready'); // UI can start speaking now

        // 2b) BACKGROUND: fetch the remaining lessons (full course)
        // Non-blocking: user continues listening to first lesson.
        (async () => {
          try {
            const restPack: LessonPack = await createLessonSSML(backendUrl, {
              courseId: selectedCourse.id,
              outline: ol, // full outline
              voiceName: opts?.voiceName ?? 'en-US-JennyNeural',
            });

            // Merge/replace if we got more lessons than the boot pack.
            if ((restPack.lessons?.length || 0) > (firstPack.lessons?.length || 0)) {
              setLessons(restPack.lessons ?? []);
              setJoinedSsml(restPack.joinedSsml ?? '');
              // Keep current index at 0 so audio/captions continue seamlessly.
              // If you want to auto-advance, let the ClassroomPlayer handle it on audio end.
              if (!ssml) {
                setSsml(restPack.lessons?.[0]?.ssml ?? '');
              }
              // Preserve any degraded notice from the fuller pack
              if (restPack.notice) setDegradedNotice(restPack.notice);
            }
          } catch (bgErr) {
            // Non-fatal: user can still complete first lesson.
            // Keep this silent in UI; log for diagnostics if needed.
            // console.warn('[ai] background lessons fetch failed', bgErr);
          }
        })();
      } catch (e: any) {
        setError(e?.message || 'AI failed to prepare this lesson');
        setStep('error');
      }
    },
    [backendUrl, selectedCourse, ssml]
  );

  // ---------------------------
  // Custom topic flow
  // ---------------------------
  const startCustomTopic = useCallback(
    async (
      title: string,
      opts?: {
        level?: 'beginner' | 'intermediate' | 'advanced';
        minutes?: number;
        voiceName?: string;
      }
    ) => {
      setError(null);
      try {
        const sandbox = await createAiSandboxCourse(backendUrl, title);
        selectCourse({
          id: sandbox.id,
          title: sandbox.title,
          blurb: sandbox.description || '',
        } as TopCourse);
        await startWithAI({
          level: opts?.level,
          minutes: opts?.minutes,
          voiceName: opts?.voiceName,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to start custom topic');
        setStep('error');
      }
    },
    [backendUrl, selectCourse, startWithAI]
  );

  // ---------------------------
  // Quiz
  // ---------------------------
  const generateQuizNow = useCallback(
    async (numQuestions = 6) => {
      if (!selectedCourse || !outline.length) return;
      setError(null);
      setStep('quizzing');
      try {
        const q = await createQuiz(backendUrl, {
          courseId: selectedCourse.id,
          outline,
          numQuestions,
        });
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

  // ---------------------------
  // Grade (auth)
  // ---------------------------
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

  // ---------------------------
  // Certificate (auth)
  // ---------------------------
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

  // ---------------------------
  // Exports
  // ---------------------------
  return {
    // data
    topCourses,
    selectedCourse,
    outline,

    // lessons
    lessons,
    currentLessonIndex,
    currentLesson,
    joinedSsml, // concatenated full-course SSML
    ssml,       // BACK-COMPAT: identical to joinedSsml for old player (first lesson on fast-boot)
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
