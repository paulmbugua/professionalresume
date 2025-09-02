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

// 🔹 Reuse your existing certificate types & API
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
  LessonSSMLResponse,
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
  limit?: number;      // UI hint only (ignored here if API doesn’t support)
  append?: boolean;    // UI behavior
  cursor?: string|null;// UI hint only
  page?: 'next'|'prev'|number|string; // UI hint only
  aiOnly?: boolean;    // forwarded to API (2nd arg)
};

export function useAiCourse(backendUrl: string, token?: string) {
  // AI flow state
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TopCourse | null>(null);

  const [outline, setOutline] = useState<AiOutlineSection[]>([]);
  const [ssml, setSsml] = useState<string>('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const [step, setStep] = useState<StartState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Certificate results
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  // Robot TTS (UI will call speak; the hook won’t)
  const { reset: resetTts, loading: ttsLoading, error: ttsError } = useRobotSpeaker();

  // ---- Load top courses (keep to 1–2 args for fetchTopCourses) ----
  const loadTopCourses = useCallback(
    async (opts?: LoadTopOptions) => {
      const { aiOnly = false } = opts || {};
      setError(null);
      try {
        // IMPORTANT: call with only 1–2 args to satisfy current API signature
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

  // ---- Select a course → reset flow ----
  const selectCourse = useCallback(
    (course: TopCourse | null) => {
      setSelectedCourse(course);
      setOutline([]);
      setSsml('');
      setQuiz(null);
      setAnswers({});
      setGrade(null);
      setCertificate(null);
      resetTts();      // ensure no stale timings/visemes
      setStep('idle');
      setError(null);
    },
    [resetTts]
  );

  // ---- Start AI (outline → ssml). UI will trigger TTS when ssml updates. ----
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
        const o = await createOutline(backendUrl, {
          courseId: selectedCourse.id,
          level: opts?.level ?? 'beginner',
          targetMinutes: opts?.minutes ?? 25,
        });
        setOutline(o.outline ?? []);
        setStep('narrating');

        const s: LessonSSMLResponse = await createLessonSSML(backendUrl, {
          courseId: selectedCourse.id,
          outline: o.outline ?? [],
          voiceName: opts?.voiceName ?? 'en-US-JennyNeural',
        });

        // ⬇️ Do NOT call speak() here—UI (VideoClassroom) owns TTS.
        setSsml(s.ssml || '');

        setStep('ready');
      } catch (e: any) {
        setError(e?.message || 'AI failed to prepare this lesson');
        setStep('error');
      }
    },
    [backendUrl, selectedCourse]
  );

  // ---- Custom topic: create sandbox course, then reuse same flow ----
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

  // ---- Quiz ----
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

  // ---- Grade (auth) ----
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

  // ---- Certificate (auth) ----
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
    ssml,
    quiz,
    answers,
    grade,
    certificate,
    step,
    error,
    ttsLoading,
    ttsError,

    // actions
    loadTopCourses,
    selectCourse,
    startWithAI,
    startCustomTopic,
    generateQuizNow,
    answerQuestion,
    allAnswered,
    gradeNow,
    tryGenerateCertificate,
  };
}
