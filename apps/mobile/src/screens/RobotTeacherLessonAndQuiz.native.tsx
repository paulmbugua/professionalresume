// apps/mobile/src/screens/RobotTeacherLessonAndQuiz.native.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import tw from '../../tailwind';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Markdown from '@/screens/Markdown.native';
import ClassroomThemeShell from '@/screens/ClassroomThemeShell.native';
import QuizConfirmModal from '@/screens/QuizConfirmModal.native';
import PaymentWidget from './PaymentWidget.native';

import type { DbCourseSize, ProgramTrack } from '@mytutorapp/shared/types';

// ─────────────────────────────────────────────────────────
// fmt helpers
// ─────────────────────────────────────────────────────────
const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;
};
const fmtHMS = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
const fmtHMSms = (ms: number) => fmtHMS(Math.floor(Math.max(0, ms) / 1000));

// ─────────────────────────────────────────────────────────
// types
// ─────────────────────────────────────────────────────────
interface LessonAndQuizProps {
  compactPlayer: boolean;
  showCourseList: boolean;
  // classroom
  displaySsml: string;
  onNext?: () => Promise<boolean> | boolean;
  isBuildingNext?: boolean;
  lessonsArr: any[];
  voiceName: string;
  courseTitle: string;
  isMaximized: boolean;
  onToggleMaximized: () => void;
  course: any;
  outline: any[];
  backendUrl: string;
  onBeforePlay: () => Promise<void> | void;
  onEnded: () => void;
  themeOpen: boolean;
  onThemeOpenChange: (open: boolean) => void;
  // outline → quiz
  isOrgFlow: boolean;
  assignmentId?: string;
  timerSec: number;
  generateQuizNow: (
    numQuestions?: number,
    courseSize?: DbCourseSize,
    programTrack?: ProgramTrack,
    totalLessons?: number,
    assignmentId?: string,
    quizType?: 'mcq' | 'short'
  ) => Promise<void> | void;
  safeLessons: number;
  safeQuiz: number;
  // quiz
  quiz: any;
  answers: Record<string, number | string>;
  onAnswer: (qid: string, value: number | string) => void;
  allAnswered: boolean;
  grade: any;
  gradeNow: () => Promise<void> | void;
  token: string;
  requireAuth: (reason?: string, message?: string) => boolean;
  // cert + payments
  isOrgFlowFlag: boolean;
  skus: any[] | undefined;
  aiCertLoading: boolean;
  aiCertError: string | null | undefined;
  aiCertMsg: string | null | undefined;
  claim: (code: string) => Promise<void>;
  tryGenerateCertificate: () => Promise<any>;
  generateAICert: () => Promise<any>;
  paymentOpen: boolean;
  setPaymentOpen: (b: boolean) => void;
  certUrl: string | null;
  setCertUrl: (s: string | null) => void;
  downUrl: string | null;
  setDownUrl: (s: string | null) => void;
  // timer + lock
  localRemainingMs: number | null;
  setLocalRemainingMs: (ms: number | null) => void;
  displayRemainingMs: number;
  disableQuiz: boolean;
  // results
  onViewResults: (courseId: string, courseTitle: string, grade: any) => void;
  /** Admins can reveal short-answer solutions; learners cannot */
  isAdmin?: boolean;
}

const LessonAndQuizPane: React.FC<LessonAndQuizProps> = ({
  compactPlayer,
  showCourseList,
  displaySsml,
  lessonsArr,
  onNext,
  isBuildingNext,
  voiceName,
  courseTitle,
  isMaximized,
  onToggleMaximized,
  course,
  outline,
  backendUrl,
  onBeforePlay,
  onEnded,
  themeOpen,
  onThemeOpenChange,
  isOrgFlow,
  assignmentId,
  timerSec,
  generateQuizNow,
  safeLessons,
  safeQuiz,
  quiz,
  answers,
  onAnswer,
  grade,
  gradeNow,
  token,
  requireAuth,
  isOrgFlowFlag,
  skus,
  aiCertLoading,
  aiCertError,
  aiCertMsg,
  claim,
  tryGenerateCertificate,
  generateAICert,
  paymentOpen,
  setPaymentOpen,
  certUrl,
  setCertUrl,
  downUrl,
  setDownUrl,
  localRemainingMs,
  setLocalRemainingMs,
  displayRemainingMs,
  disableQuiz,
  onViewResults,
  isAdmin = false,
}) => {
  // ───────────────────────────────────────────────────────
  // state
  // ───────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<{ lessons: number; questions: number; timeLabel: string } | null>(null);

  const startingAttemptRef = useRef(false);
  const submittingRef = useRef(false);

  const lastPlayClickRef = useRef(0);
  const guardedBeforePlay = useCallback(async () => {
    const now = Date.now();
    if (now - lastPlayClickRef.current < 400) return;
    lastPlayClickRef.current = now;
    await onBeforePlay?.();
  }, [onBeforePlay]);

  const [attemptIdState, setAttemptIdState] = useState<string | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [forceUnlock, setForceUnlock] = useState(false);

  // math keypad (native: modal bottom sheet)
  const [mathOpen, setMathOpen] = useState(false);
  const lastShortQidRef = useRef<string | null>(null);
  const [shortHeights, setShortHeights] = useState<Record<string, number>>({});

  // org-locked config read at runtime
  const [orgMeta, setOrgMeta] = useState<{
    quizSize?: number;
    totalLessons?: number;
    timer_s?: number;
    quizType?: 'mcq' | 'short';
  } | null>(null);

  // working answers (number | string)
  const [retakeMode, setRetakeMode] = useState(false);
  const [workingAnswers, setWorkingAnswers] = useState<Record<string, number | string | undefined>>({});

  // certificate persistence (AsyncStorage)
  const lsKey = useMemo(() => (course?.id ? `cert:last:${course.id}` : null), [course?.id]);
  const [persistedCert, setPersistedCert] = useState<{
    certUrl?: string | null;
    downUrl?: string | null;
    certId?: string | null;
    courseId?: string | null;
    courseTitle?: string | null;
    ts?: number;
  } | null>(null);
  const [hideCertPill, setHideCertPill] = useState(false);

  // ───────────────────────────────────────────────────────
  // quiz type helpers (native: no URL params; prefer orgMeta or quiz)
  // ───────────────────────────────────────────────────────
  const normQt = (v: unknown): 'mcq' | 'short' | undefined => {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'short') return 'short';
    if (s === 'mcq') return 'mcq';
    return undefined;
  };

  const enforcedQuizType: 'mcq' | 'short' = useMemo(() => {
    const fromQuiz = typeof quiz?.quizType === 'string' ? String(quiz.quizType).toLowerCase() : undefined;
    const fromOrg = orgMeta?.quizType;
    const t = (fromQuiz || fromOrg || 'mcq') as 'mcq' | 'short';
    return t === 'short' ? 'short' : 'mcq';
  }, [quiz?.quizType, orgMeta?.quizType]);

  const desiredQuizType: 'mcq' | 'short' = orgMeta?.quizType ?? 'mcq';

  // ───────────────────────────────────────────────────────
  // timers & lock
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!quiz?.questions?.length) return;
    let start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [quiz?.questions?.length]);

  useEffect(() => {
    const ids = (quiz?.questions || []).map((q: any) => q.id);
    if (!ids.length) {
      setWorkingAnswers({});
      return;
    }
    setWorkingAnswers(() => {
      const next: Record<string, number | string | undefined> = {};
      for (const q of quiz.questions) {
        const v = (answers && (answers as any)[q.id]) as number | string | undefined;
        if (v !== undefined) next[q.id] = v;
      }
      return next;
    });
  }, [quiz?.questions?.map((q: any) => q.id).join('|')]);

  useEffect(() => {
    (async () => {
      if (!isOrgFlow || !assignmentId || !token) return;
      try {
        const r = await fetch(
          `${backendUrl}/api/orgs/assignments/${encodeURIComponent(assignmentId)}/mine`,
          { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) return;
        const data = await r.json();
        const lc =
          data?.meta?.locked_config ??
          data?.locked_config ??
          data?.assignment?.locked_config ??
          {};
        const t = Number(data?.meta?.timer_s ?? data?.timer_s);
        const rawQt =
          lc?.quizType ??
          lc?.quiz_type ??
          data?.quizType ??
          data?.quiz_type;

        setOrgMeta({
          quizSize: Number(lc?.quizSize ?? lc?.quiz_size) || undefined,
          totalLessons: Number(lc?.totalLessons ?? lc?.total_lessons) || undefined,
          timer_s: Number.isFinite(t) ? t : undefined,
          quizType: normQt(rawQt),
        });
      } catch {/* ignore */}
    })();
  }, [isOrgFlow, assignmentId, token, backendUrl]);

  const displayLessons = orgMeta?.totalLessons ?? safeLessons ?? outline?.length ?? 0;
  const displayQuestions = orgMeta?.quizSize ?? safeQuiz ?? 0;
  const displayTimerSec = orgMeta?.timer_s ?? timerSec ?? 0;

  const baseMs = useMemo(() => {
    const candidates = [
      Number.isFinite(displayRemainingMs) ? Number(displayRemainingMs) : null,
      Number.isFinite(localRemainingMs as any) ? Number(localRemainingMs) : null,
      displayTimerSec > 0 ? displayTimerSec * 1000 : null,
    ].filter((n): n is number => typeof n === 'number' && n !== null);
    if (!candidates.length) return 0;
    const positive = candidates.filter((n) => n > 0);
    return positive.length ? Math.max(...positive) : Math.max(...candidates);
  }, [displayRemainingMs, localRemainingMs, displayTimerSec]);

  const remainingMsTicker = isOrgFlow ? Math.max(0, baseMs - elapsedMs) : 0;

  useEffect(() => {
    if (remainingMsTicker <= 0 && forceUnlock) setForceUnlock(false);
  }, [remainingMsTicker, forceUnlock]);

  const isLocked = useMemo(() => {
    if (!isOrgFlow) return false;
    if (forceUnlock) return false;
    return Boolean(disableQuiz || remainingMsTicker <= 0);
  }, [isOrgFlow, forceUnlock, disableQuiz, remainingMsTicker]);

  // ───────────────────────────────────────────────────────
  // cert persistence (AsyncStorage)
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!lsKey) return;
      try {
        const raw = await AsyncStorage.getItem(lsKey);
        if (raw) setPersistedCert(JSON.parse(raw));
      } catch {/* ignore */}
    })();
  }, [lsKey]);

  useEffect(() => {
    (async () => {
      if (!lsKey) return;
      if (!certUrl && !downUrl) return;
      const certId = downUrl?.match(/\/certificates\/([^/]+)\/download/)?.[1] ?? null;
      const payload = {
        certUrl: certUrl ?? null,
        downUrl: downUrl ?? null,
        certId,
        courseId: course?.id ?? null,
        courseTitle,
        ts: Date.now(),
      };
      setPersistedCert(payload);
      try {
        await AsyncStorage.setItem(lsKey, JSON.stringify(payload));
      } catch {/* ignore */}
    })();
  }, [lsKey, certUrl, downUrl, course?.id, courseTitle]);

  // ───────────────────────────────────────────────────────
  // keypad helpers (short answers)
  // ───────────────────────────────────────────────────────
  const SUBS: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋' };
  const SUPS: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻' };
  const toSub = (s: string) => s.replace(/[0-9+\-]/g, (m) => SUBS[m] || m);
  const toSup = (s: string) => s.replace(/[0-9+\-]/g, (m) => SUPS[m] || m);

  const applyToLastShort = (transformer: (s: string) => string) => {
    const qid = lastShortQidRef.current;
    if (!qid) return;
    const raw = String(workingAnswers[qid] ?? '');
    const next = transformer(raw);
    setWorkingAnswers((p) => ({ ...p, [qid]: next }));
    onAnswer?.(qid, next);
  };

  const insertSymbol = (sym: string) => {
    const qid = lastShortQidRef.current;
    if (!qid) return;
    const raw = String(workingAnswers[qid] ?? '');
    const next = raw + sym;
    setWorkingAnswers((p) => ({ ...p, [qid]: next }));
    onAnswer?.(qid, next);
  };

  // ───────────────────────────────────────────────────────
  // quiz computed
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const qt = enforcedQuizType;
      if (quiz && (quiz as any).quizType !== 'mcq' && (quiz as any).quizType !== 'short') {
        (quiz as any).quizType = qt;
      }
      if (Array.isArray(quiz?.questions)) {
        (quiz as any).questions = quiz.questions.map((q: any) =>
          q?.type === qt ? q : { ...q, type: qt }
        );
      }
    } catch {/* ignore */}
  }, [quiz, enforcedQuizType]);

  const allAnsweredLocal = useMemo(() => {
    const qArr = quiz?.questions || [];
    if (!qArr.length) return false;
    return qArr.every((qq: any) => {
      const v = workingAnswers[qq.id];
      return enforcedQuizType === 'short'
        ? typeof v === 'string' && v.trim() !== ''
        : typeof v === 'number' && Number.isFinite(v) && v >= 0;
    });
  }, [quiz?.questions, workingAnswers, enforcedQuizType]);

  const canSubmit = !isLocked && allAnsweredLocal;

  // ───────────────────────────────────────────────────────
  // handlers
  // ───────────────────────────────────────────────────────
  const handleAnswer = (qid: string, value: number | string) => {
    if (isLocked) return;
    setWorkingAnswers((prev) => ({ ...prev, [qid]: value }));
    onAnswer?.(qid, value);
  };

  const handleSubmit = useCallback(async () => {
    if (!requireAuth('grade_quiz', 'Please sign in to submit and grade your quiz.')) return;
    try {
      // normalize quiz object
      try {
        const qt = enforcedQuizType;
        if (quiz && (quiz as any).quizType !== 'mcq' && (quiz as any).quizType !== 'short') {
          (quiz as any).quizType = qt;
        }
        if (quiz?.questions) {
          (quiz as any).questions = quiz.questions.map((q: any) => ({ ...q, type: qt }));
        }
      } catch {}

      // push normalized answers up
      if (onAnswer && quiz?.questions?.length) {
        for (const q of quiz.questions) {
          const raw = workingAnswers[q.id];
          if (enforcedQuizType === 'short') {
            onAnswer(q.id, String(raw ?? '').trim());
          } else {
            const n = typeof raw === 'number' ? raw : Number(raw);
            if (Number.isFinite(n)) onAnswer(q.id, n);
          }
        }
      }

      if (isOrgFlow && assignmentId) {
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
          const payloadAnswers = (quiz?.questions || []).map((q: any) => {
            const v = workingAnswers[q.id];
            if (enforcedQuizType === 'short') {
              return { questionId: q.id, answerText: String(v ?? '').trim() };
            }
            const idx = typeof v === 'number' ? v : Number(v);
            return { questionId: q.id, choiceIndex: Number.isFinite(idx) ? idx : -1 };
          });

          const r = await fetch(`${backendUrl}/api/orgs/attempts/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              assignmentId,
              attemptId: attemptIdState ?? undefined,
              answers: payloadAnswers,
            }),
          });
          if (!r.ok) throw new Error(`Submit failed: ${r.status}`);
          await gradeNow();
          setRetakeMode(false);
        } finally {
          submittingRef.current = false;
        }
      } else {
        await gradeNow();
        setRetakeMode(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Submit failed', 'Please try again.');
    }
  }, [
    assignmentId,
    backendUrl,
    enforcedQuizType,
    gradeNow,
    isOrgFlow,
    onAnswer,
    quiz,
    requireAuth,
    token,
    workingAnswers,
    attemptIdState,
  ]);

  // ───────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────
  return (
    <>
      {/* Classroom */}
      <View
        style={tw.style(
          'relative z-0',
          compactPlayer && !showCourseList ? 'mx-auto w-full max-w-[68rem]' : ''
        )}
      >
        <View style={tw.style(compactPlayer ? 'rounded-2xl overflow-hidden border border-white/10 bg-white/5' : '')}>
          <ClassroomThemeShell
            ssml={displaySsml}
            lessons={lessonsArr}
            voiceName={voiceName}
            title={courseTitle}
            maximized={isMaximized}
            onToggleMaximize={onToggleMaximized}
            course={course}
            outline={outline}
            backendUrlOverride={backendUrl}
            playing
            playJoinedIfAvailable={false}
            onBeforePlay={guardedBeforePlay}
            onEnded={onEnded}
            onNext={onNext}
            isBuildingNext={isBuildingNext}
            themeOpen={themeOpen}
            onThemeOpenChange={onThemeOpenChange}
            showFloatingThemeButton={false}
          />
        </View>
      </View>

      {/* Outline */}
      {outline.length > 0 && (
        <View style={tw`mt-3 rounded-2xl bg-slate-900/60 border border-slate-800 p-4`}>
          <Text style={tw`text-white font-semibold mb-2`}>Lesson outline</Text>
          <View>
            {outline.filter(Boolean).map((s: any, i: number) => (
              <View key={s?.id ?? `sec-${i}`} style={tw`mb-2`}>
                <Text style={tw`text-white font-medium`}>{s?.title ?? `Lesson ${i + 1}`}</Text>
                {(Array.isArray(s?.keyPoints) ? s.keyPoints : []).map((k: string, idx: number) => (
                  <Text key={idx} style={tw`text-white/80 text-sm ml-3`}>• {k}</Text>
                ))}
              </View>
            ))}
          </View>

          <View style={tw`mt-3 flex-row items-center gap-2`}>
            <TouchableOpacity
              onPress={() => {
                const timeLabel = displayTimerSec > 0 ? fmtDuration(displayTimerSec) : 'No time limit';
                setConfirmInfo({ lessons: displayLessons, questions: displayQuestions, timeLabel });
                setConfirmOpen(true);
              }}
              style={tw`px-3 py-2 rounded-full bg-indigo-600`}
            >
              <Text style={tw`text-white font-semibold text-sm`}>Generate quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quiz */}
      {quiz?.questions?.length ? (
        <View style={tw`mt-3 rounded-2xl bg-slate-900/60 border border-slate-800 p-4`}>
          <Text style={tw`text-white font-semibold text-center`}>Quick quiz</Text>

          {/* time banner */}
          {isOrgFlow ? (
            <View style={tw.style(
              'mt-2 px-2 py-1 rounded',
              isLocked ? 'bg-red-600/20' : 'bg-white/10'
            )}>
              <Text style={tw`text-white text-xs text-center`}>
                {isLocked ? 'Time up — quiz locked' : `Time left: ${fmtHMSms(remainingMsTicker)}`}
              </Text>
            </View>
          ) : (
            <View style={tw`mt-2 px-2 py-1 rounded bg-white/10`}>
              <Text style={tw`text-white text-xs text-center`}>Time elapsed: {Math.floor(elapsedMs / 1000)}s</Text>
            </View>
          )}

          {/* type + keypad */}
          <View style={tw`mt-2 items-center`}>
            <Text style={tw`text-white/80 text-xs`}>
              Answer type: <Text style={tw`text-white font-semibold`}>{enforcedQuizType === 'short' ? 'Short (typed)' : 'Multiple choice (MCQ)'}</Text>
            </Text>
            {enforcedQuizType === 'short' && !isLocked && (
              <TouchableOpacity
                onPress={() => setMathOpen((v) => !v)}
                style={tw`mt-2 px-3 py-1.5 rounded-full bg-indigo-600`}
              >
                <Text style={tw`text-white text-sm`}>∑ Math keypad</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={tw`text-white/70 text-xs text-center mt-2 mb-2`}>Answer all to submit.</Text>

          <View>
            {quiz.questions.map((q: any, idx: number) => {
              const qType = enforcedQuizType;
              return (
                <View key={q.id} style={tw`rounded-xl bg-white/5 border border-white/10 p-3 mb-3`}>
                  <Text style={tw`text-white text-[15px] font-medium mb-2`}>
                    <Text>{idx + 1}. </Text>
                    <Markdown inline>{String(q.display || q.prompt || '')}</Markdown>
                  </Text>

                  {qType === 'short' ? (
                    <View>
                      <TextInput
                        multiline
                        value={String(workingAnswers[q.id] ?? '')}
                        onChangeText={(t) => {
                          lastShortQidRef.current = q.id;
                          handleAnswer(q.id, t);
                        }}
                        onFocus={() => { lastShortQidRef.current = q.id; }}
                        onContentSizeChange={(e) => {
                          const h = Math.min(320, Math.max(40, e.nativeEvent.contentSize.height));
                          setShortHeights((p) => ({ ...p, [q.id]: h }));
                        }}
                        placeholder="Type your answer"
                        placeholderTextColor="#94a3b8"
                        editable={!isLocked}
                        style={tw.style(
                          'text-white bg-slate-800/70 rounded-xl px-3 py-2',
                          isLocked ? 'opacity-60' : ''
                        )}
                      />
                      {/* admin solution reveal */}
                      {isAdmin && (
                        <View style={tw`mt-2`}>
                          <Text style={tw`text-amber-300 text-[11px]`}>Admin: show answer</Text>
                          <View style={tw`mt-1`}>
                            {q.answer ? <Text style={tw`text-white/80 text-xs`}><Text style={tw`font-bold`}>Answer:</Text> {String(q.answer)}</Text> : null}
                            {Array.isArray(q.accept) && q.accept.length > 0 && (
                              <Text style={tw`text-white/80 text-xs`}><Text style={tw`font-bold`}>Accept:</Text> {q.accept.join(', ')}</Text>
                            )}
                            {q.regex ? <Text style={tw`text-white/80 text-xs`}><Text style={tw`font-bold`}>Regex:</Text> {String(q.regex)}</Text> : null}
                            {q.explanation ? <Text style={tw`text-white/80 text-xs mt-1`}><Text style={tw`font-bold`}>Explanation:</Text> {q.explanation}</Text> : null}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={tw`gap-2`}>
                      {(q.choices || []).map((c: string, i: number) => {
                        const isSelected = workingAnswers[q.id] === i;
                        return (
                          <TouchableOpacity
                            key={i}
                            onPress={() => handleAnswer(q.id, i)}
                            disabled={isLocked}
                            style={tw.style(
                              'px-3 py-2.5 rounded-lg border',
                              isSelected
                                ? 'bg-emerald-600/30 border-emerald-500'
                                : 'bg-white/5 border-white/10',
                              isLocked ? 'opacity-60' : ''
                            )}
                          >
                            <Text style={tw`text-white text-[15px]`}><Markdown inline>{String(c || '')}</Markdown></Text>
                          </TouchableOpacity>
                        );
                      })}
                      {(!q.choices || q.choices.length === 0) && (
                        <Text style={tw`text-amber-300 text-[12px]`}>
                          No choices provided for this MCQ. Please refresh or contact your admin.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={tw`mt-2 flex-row flex-wrap items-center gap-2`}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={tw.style(
                'px-4 py-2 rounded-xl',
                canSubmit ? 'bg-emerald-600' : 'bg-slate-700 opacity-60'
              )}
            >
              <Text style={tw`text-white font-semibold`}>Submit quiz</Text>
            </TouchableOpacity>

            {grade && (
              <Text style={tw`text-white/80 text-sm`}>
                Score: <Text style={tw`font-semibold`}>{grade.scorePct}%</Text> (Pass mark {grade.passMark}%)
              </Text>
            )}

            {grade && course?.id && (
              <TouchableOpacity
                onPress={() => onViewResults(course.id, courseTitle, grade)}
                style={tw`px-3 py-2 rounded-full bg-slate-800`}
              >
                <Text style={tw`text-white text-sm`}>View Results</Text>
              </TouchableOpacity>
            )}
          </View>

          {grade && grade.passed && !retakeMode && (
            <View style={tw`mt-3 rounded-xl bg-emerald-600/10 border border-emerald-500 p-3`}>
              <Text style={tw`text-emerald-200 text-sm`}>
                {grade?.passed
                  ? '🎉 Great job! You passed (≥ ' + grade.passMark + '%).'
                  : '🎓 You’re eligible for a certificate.'}
              </Text>

              {isOrgFlowFlag ? (
                <>
                  <Text style={tw`text-white/70 text-xs mt-2`}>
                    Covered by your organization — no payment needed.
                  </Text>
                  <View style={tw`mt-2 flex-row flex-wrap items-center gap-2`}>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const sku = (skus && skus[0]) || null;
                          if (sku) {
                            try { await claim(sku.code); } catch {/* ignore */}
                          }
                          const doc =
                            (await tryGenerateCertificate().catch(() => null)) ||
                            (await generateAICert().catch(() => null));
                          if (doc) {
                            const c: any = doc;
                            setCertUrl(c.url ?? null);
                            setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
                          }
                        } catch (e) {
                          console.error('[org] manual issue failed', e);
                          Alert.alert('Issue failed', 'Please try again.');
                        }
                      }}
                      style={tw`px-4 py-2 rounded-xl bg-emerald-600`}
                    >
                      <Text style={tw`text-white font-semibold`}>Generate Certificate</Text>
                    </TouchableOpacity>

                    {certUrl ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(certUrl)}
                          style={tw`px-3 py-2 rounded-full bg-slate-800`}
                        >
                          <Text style={tw`text-white text-sm`}>View certificate</Text>
                        </TouchableOpacity>
                        {downUrl ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(downUrl || certUrl)}
                            style={tw`px-4 py-2 rounded-xl bg-indigo-600`}
                          >
                            <Text style={tw`text-white font-semibold`}>Download PDF</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                  {!certUrl && (
                    <Text style={tw`text-white/70 text-[12px] mt-2`}>
                      Your certificate will be generated at no cost.
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <View style={tw`mt-2`}>
                    <Text style={tw`text-white/70 text-xs`}>Pay in tokens (no processing fees)</Text>
                    {aiCertLoading ? <Text style={tw`text-white/60 text-xs mt-1`}>Loading certificate options…</Text> : null}
                    {aiCertError ? <Text style={tw`text-red-300 text-xs mt-1`}>{aiCertError}</Text> : null}
                    {aiCertMsg ? <Text style={tw`text-emerald-300 text-xs mt-1`}>{aiCertMsg}</Text> : null}

                    <View style={tw`mt-2`}>
                      {(skus || []).map((sku) => (
                        <View key={sku.code} style={tw`flex-row items-center justify-between rounded-lg border border-white/10 p-2 bg-white/5 mb-2`}>
                          <View>
                            <Text style={tw`text-white font-medium`}>{sku.title}</Text>
                            <Text style={tw`text-white/60 text-[11px]`}>{sku.code}</Text>
                          </View>
                          <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw`text-white font-semibold`}>{sku.price_tokens} Tokens</Text>
                            <TouchableOpacity
                              onPress={async () => {
                                if (!token) return;
                                try {
                                  await claim(sku.code);
                                  const doc = await generateAICert();
                                  const url = (doc as any)?.download_url || (doc as any)?.url;
                                  if (url) Linking.openURL(url);
                                  const c: any = doc || {};
                                  setCertUrl(c.url ?? null);
                                  setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
                                } catch (e) {
                                  console.error('[tokens] claim/generate failed', e);
                                  Alert.alert('Certificate', 'Could not generate certificate.');
                                }
                              }}
                              style={tw`px-3 py-1.5 rounded bg-emerald-600`}
                            >
                              <Text style={tw`text-white text-sm font-semibold`}>Claim & Generate</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Text style={tw`text-white/60 text-xs mt-3`}>
                    Prefer paying with card or PayPal/M-Pesa?
                  </Text>
                  <View style={tw`mt-1 flex-row flex-wrap items-center gap-2`}>
                    <TouchableOpacity onPress={() => setPaymentOpen(true)} style={tw`px-4 py-2 rounded-xl bg-indigo-600`}>
                      <Text style={tw`text-white font-semibold`}>Pay with PayPal / M-Pesa</Text>
                    </TouchableOpacity>

                    {certUrl ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(certUrl)}
                          style={tw`px-3 py-2 rounded-full bg-slate-800`}
                        >
                          <Text style={tw`text-white text-sm`}>View certificate</Text>
                        </TouchableOpacity>
                        {downUrl ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(downUrl || certUrl)}
                            style={tw`px-4 py-2 rounded-xl bg-indigo-600`}
                          >
                            <Text style={tw`text-white font-semibold`}>Download PDF</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}
                  </View>

                  {!certUrl && (
                    <Text style={tw`text-white/70 text-[12px] mt-2`}>
                      Once payment completes (tokens or fiat), we’ll generate your certificate instantly.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {grade && !grade.passed && !retakeMode && (
            <View style={tw`mt-3 rounded-xl bg-red-600/10 border border-red-500 p-3`}>
              <Text style={tw`text-red-200 text-sm`}>
                You scored {grade.scorePct}%. Review the lesson and try again.
              </Text>

              {/* Retry CTA (org flow) */}
              {isOrgFlow && assignmentId ? (
                <View style={tw`mt-3`}>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!requireAuth('start_attempt', 'Please sign in to retry.')) return;
                      if (startingAttemptRef.current) return;
                      startingAttemptRef.current = true;
                      try {
                        const r = await fetch(`${backendUrl}/api/orgs/attempts/start`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ assignmentId }),
                        });
                        if (r.status === 409) {
                          const j = await r.json().catch(() => ({} as any));
                          Alert.alert('No attempts left', j?.message || 'Please contact your instructor.');
                          return;
                        }
                        if (!r.ok) throw new Error(`Start failed: ${r.status}`);
                        const payload = await r.json();
                        const newAttemptId = payload?.attemptId ?? payload?.attempt_id ?? null;
                        if (newAttemptId) setAttemptIdState(String(newAttemptId));

                        const ms =
                          Number(payload?.remainingMs ?? payload?.remaining_ms) ||
                          (displayTimerSec > 0 ? displayTimerSec * 1000 : 0);
                        if (ms > 0) setLocalRemainingMs(ms);

                        setForceUnlock(true);
                        setElapsedMs(0);

                        setRetakeMode(true);
                        setWorkingAnswers({});

                        await generateQuizNow(
                          undefined,
                          undefined,
                          undefined,
                          undefined,
                          assignmentId,
                          desiredQuizType
                        );
                      } catch (e) {
                        console.error('[retry] failed', e);
                        Alert.alert('Retry failed', 'Please try again.');
                      } finally {
                        startingAttemptRef.current = false;
                      }
                    }}
                    style={tw`px-4 py-2 rounded-xl bg-indigo-600`}
                  >
                    <Text style={tw`text-white font-semibold`}>Retry quiz</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={tw`mt-3`}>
                  <TouchableOpacity
                    onPress={async () => {
                      setRetakeMode(true);
                      setWorkingAnswers({});
                      setElapsedMs(0);
                      if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
                      await generateQuizNow(displayQuestions, undefined, undefined, undefined, assignmentId, desiredQuizType);
                    }}
                    style={tw`px-4 py-2 rounded-xl bg-indigo-600`}
                  >
                    <Text style={tw`text-white font-semibold`}>Retry quiz</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Math keypad (native modal) */}
          <Modal visible={mathOpen && enforcedQuizType === 'short' && !isLocked} transparent animationType="fade" onRequestClose={() => setMathOpen(false)}>
            <View style={tw`flex-1 justify-end bg-black/40`}>
              <View style={tw`bg-slate-900 rounded-t-2xl border border-slate-800 p-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={tw`text-white font-semibold`}>Math keypad</Text>
                  <TouchableOpacity onPress={() => setMathOpen(false)} style={tw`px-3 py-1.5 rounded-full bg-slate-800`}>
                    <Text style={tw`text-white text-sm`}>Close</Text>
                  </TouchableOpacity>
                </View>

                <View style={tw`flex-row flex-wrap -m-1`}>
                  {['π','×','÷','±','√','^','≤','≥','≈','∞','°','·','θ','α','β','γ','µ','∑','∫','≠','→','←','↔','∈','∉','∩','∪','∧','∨','⊂','⊆'].map((k) => (
                    <TouchableOpacity key={k} onPress={() => insertSymbol(k)} style={tw`m-1 px-3 py-2 rounded-md bg-slate-800`}>
                      <Text style={tw`text-white text-base`}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={tw`mt-3 flex-row gap-2`}>
                  <TouchableOpacity onPress={() => applyToLastShort(toSub)} style={tw`px-3 py-2 rounded-full bg-slate-800`}>
                    <Text style={tw`text-white`}>Subscript (x₂)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => applyToLastShort(toSup)} style={tw`px-3 py-2 rounded-full bg-slate-800`}>
                    <Text style={tw`text-white`}>Superscript (x²)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={tw`text-white/60 text-[11px] mt-2`}>
                  Tip: focus a short-answer box first, then tap symbols.
                </Text>
              </View>
            </View>
          </Modal>
        </View>
      ) : null}

      {/* Confirm modal */}
      {confirmInfo && (
        <QuizConfirmModal
          open={confirmOpen}
          lessons={confirmInfo.lessons}
          questions={confirmInfo.questions}
          timeLabel={confirmInfo.timeLabel}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            setConfirmOpen(false);

            if (isOrgFlow && assignmentId) {
              if (!requireAuth('start_attempt', 'Please sign in to start your attempt.')) return;

              if (startingAttemptRef.current) return;
              startingAttemptRef.current = true;
              try {
                const r = await fetch(`${backendUrl}/api/orgs/attempts/start`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ assignmentId }),
                });

                if (!r.ok) {
                  let msg = 'Failed to start attempt.';
                  try {
                    const t = await r.text();
                    const j = t ? JSON.parse(t) : null;
                    msg = j?.message || msg;
                  } catch {}
                  Alert.alert('Attempt failed', msg);
                  return;
                }

                const payload = await r.json().catch(() => ({} as any));
                const newAttemptId = payload?.attemptId ?? payload?.attempt_id ?? null;
                if (newAttemptId) setAttemptIdState(String(newAttemptId));

                const ms =
                  Number(payload?.remainingMs ?? payload?.remaining_ms) ||
                  (timerSec > 0 ? timerSec * 1000 : 0);
                if (ms > 0) setLocalRemainingMs(ms);

                setForceUnlock(true);
                setElapsedMs(0);
              } catch (e) {
                if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
              } finally {
                startingAttemptRef.current = false;
              }
            } else if (timerSec > 0) {
              setLocalRemainingMs(timerSec * 1000);
            }

            const numQArg = (isOrgFlow && assignmentId) ? undefined : Math.max(3, displayQuestions || 0);
            await generateQuizNow(numQArg, undefined, undefined, undefined, assignmentId, desiredQuizType);
          }}
        />
      )}

      {/* Payments (non-org) */}
      {!isOrgFlowFlag && (
        <PaymentWidget
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          title="Unlock Certificate"
          showTutorPreview={false}
        />
      )}
    </>
  );
};

export default React.memo(LessonAndQuizPane);
