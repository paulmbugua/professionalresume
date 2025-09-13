// apps/web/src/components/RobotTeacherLessonAndQuiz.tsx
import React, { useEffect, useState, useRef } from 'react';
import Markdown from '@/components/Markdown.web';
import ClassroomThemeShell from '@/components/ClassroomThemeShell';
import QuizConfirmModal from '@/components/QuizConfirmModal';
import PaymentWidget from './PaymentWidget.web';
import type { DbCourseSize, ProgramTrack } from '@mytutorapp/shared/types';
import { downloadCertificateFile } from '@mytutorapp/shared/api';

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

interface LessonAndQuizProps {
  compactPlayer: boolean;
  showCourseList: boolean;
  // classroom
  displaySsml: string;
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
    assignmentId?: string
  ) => Promise<void> | void;
  safeLessons: number;
  safeQuiz: number;
  // quiz
  quiz: any;
  answers: Record<string, number | string>;
  onAnswer: (qid: string, value: number | string) => void;
  allAnswered: boolean; // kept for compatibility; not used internally
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
  // timer + lock from parent
  localRemainingMs: number | null;
  setLocalRemainingMs: (ms: number | null) => void;
  displayRemainingMs: number;
  disableQuiz: boolean;
  // results
  onViewResults: (courseId: string, courseTitle: string, grade: any) => void;
}

const LessonAndQuizPane: React.FC<LessonAndQuizProps> = ({
  compactPlayer,
  showCourseList,
  displaySsml,
  lessonsArr,
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
  // allAnswered, // not used internally
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
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<{ lessons: number; questions: number; timeLabel: string } | null>(null);

  // prevent rapid double POSTs
  const startingAttemptRef = useRef(false);
  const submittingRef = useRef(false);

  // active attempt id returned by /attempts/start
  const [attemptIdState, setAttemptIdState] = useState<string | null>(null);

  // elapsed wall-clock since quiz loaded
  const [elapsedMs, setElapsedMs] = useState(0);
  const [forceUnlock, setForceUnlock] = useState(false);

  // org-locked config for modal & generation
  const [orgMeta, setOrgMeta] = useState<{
    quizSize?: number;
    totalLessons?: number;
    timer_s?: number;
    quizType?: 'mcq' | 'short';
  } | null>(null);

  // local retry & working answers (supports number | string)
  const [retakeMode, setRetakeMode] = useState(false);
  const [workingAnswers, setWorkingAnswers] = useState<Record<string, number | string | undefined>>({});

  // Fetch learner's view of the assignment (to read locked_config)
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!isOrgFlow || !assignmentId || !token) return;
      try {
        const r = await fetch(
          `${backendUrl}/api/orgs/assignments/${encodeURIComponent(assignmentId)}/mine`,
          { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) return;
        const data = await r.json();
        const lc = data?.meta?.locked_config || {};
        const t = Number(data?.meta?.timer_s);
        const qt = typeof lc?.quizType === 'string' ? String(lc.quizType).toLowerCase() : undefined;

        if (!ignore) {
          setOrgMeta({
            quizSize: Number(lc?.quizSize) || undefined,
            totalLessons: Number(lc?.totalLessons) || undefined,
            timer_s: Number.isFinite(t) ? t : undefined,
            quizType: qt === 'short' ? 'short' : qt === 'mcq' ? 'mcq' : undefined,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOrgFlow, assignmentId, token, backendUrl]);

  // Modal display values (prefer org-locked)
  const displayLessons = orgMeta?.totalLessons ?? safeLessons ?? outline?.length ?? 0;
  const displayQuestions = orgMeta?.quizSize ?? safeQuiz ?? 0;
  const displayTimerSec = orgMeta?.timer_s ?? timerSec ?? 0;

  // elapsed clock ticks while a quiz is visible
  useEffect(() => {
    if (!quiz?.questions?.length) return;
    let start = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => window.clearInterval(id);
  }, [quiz?.questions?.length]);

  // hydrate workingAnswers whenever a (new) quiz arrives
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.questions?.map((q: any) => q.id).join('|')]);

  // Enforced single quiz type for the whole quiz (no mixing)
  const enforcedQuizType: 'mcq' | 'short' = React.useMemo(() => {
    const fromQuiz = typeof quiz?.quizType === 'string' ? String(quiz.quizType).toLowerCase() : undefined;
    const fromOrg = orgMeta?.quizType;
    const t = (fromQuiz || fromOrg || 'mcq') as 'mcq' | 'short';
    return t === 'short' ? 'short' : 'mcq';
  }, [quiz?.quizType, orgMeta?.quizType]);

  // Ensure the quiz object the grader sees is always uniform & typed (runs when quiz/type changes)
  useEffect(() => {
    if (!quiz) return;
    try {
      const qt = enforcedQuizType;
      if (quiz && (quiz as any).quizType !== 'mcq' && (quiz as any).quizType !== 'short') {
        (quiz as any).quizType = qt;
      }
      if (Array.isArray(quiz.questions)) {
        (quiz as any).questions = quiz.questions.map((q: any) =>
          q?.type === qt ? q : { ...q, type: qt }
        );
      }
    } catch {
      /* ignore */
    }
  }, [quiz, enforcedQuizType]);

  // Choose a robust timer base: prefer any positive values & use the largest
  const baseMs = React.useMemo(() => {
    const candidates = [
      Number.isFinite(displayRemainingMs) ? Number(displayRemainingMs) : null,
      Number.isFinite(localRemainingMs as any) ? Number(localRemainingMs) : null,
      displayTimerSec > 0 ? displayTimerSec * 1000 : null,
    ].filter((n): n is number => typeof n === 'number' && n !== null);

    if (!candidates.length) return 0;
    const positive = candidates.filter((n) => n > 0);
    return positive.length ? Math.max(...positive) : Math.max(...candidates);
  }, [displayRemainingMs, localRemainingMs, displayTimerSec]);

  // Ticking time-left for banner
  const remainingMsTicker = isOrgFlow ? Math.max(0, baseMs - elapsedMs) : 0;

  // when the countdown hits zero, drop the override
  useEffect(() => {
    if (remainingMsTicker <= 0 && forceUnlock) setForceUnlock(false);
  }, [remainingMsTicker, forceUnlock]);

  // Local lock flag used everywhere in this component
  const isLocked = React.useMemo(() => {
    if (!isOrgFlow) return false;
    if (forceUnlock) return false; // unlock locally after /attempts/start
    return Boolean(disableQuiz || remainingMsTicker <= 0);
  }, [isOrgFlow, forceUnlock, disableQuiz, remainingMsTicker]);

  // Generic local onAnswer that updates local map + parent
  const handleAnswer = (qid: string, value: number | string) => {
    if (isLocked) return;
    setWorkingAnswers((prev) => ({ ...prev, [qid]: value }));
    if (onAnswer) onAnswer(qid, value);
  };

  // Local completion (use workingAnswers, not parent allAnswered) — uses enforcedQuizType only
  const allAnsweredLocal = React.useMemo(() => {
    const qArr = quiz?.questions || [];
    if (!qArr.length) return false;
    return qArr.every((qq: any) => {
      const v = workingAnswers[qq.id];
      return enforcedQuizType === 'short'
        ? typeof v === 'string' && v.trim() !== ''
        : typeof v === 'number' && v >= 0;
    });
  }, [quiz?.questions, workingAnswers, enforcedQuizType]);

  // Convenience submit guard
  const canSubmit = !isLocked && allAnsweredLocal;

  // Helpers for chemistry/notation
  const SUBS: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋' };
  const SUPS: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻' };
  function toSub(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUBS[m] || m); }
  function toSup(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUPS[m] || m); }

  return (
    <>
      {/* Classroom */}
      <section
        id="classroom"
        className={`relative z-[0] ${compactPlayer && !showCourseList ? 'mx-auto max-w-5xl' : ''}`}
      >
        <div
          className={
            compactPlayer
              ? 'rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-white dark:ring-white/10 dark:bg-white/5'
              : ''
          }
          style={compactPlayer ? { maxHeight: '76vh' } : undefined}
        >
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
            onBeforePlay={onBeforePlay}
            onEnded={onEnded}
            themeOpen={themeOpen}
            onThemeOpenChange={onThemeOpenChange}
            showFloatingThemeButton={false}
          />
        </div>
      </section>

      {/* Outline */}
      {outline.length > 0 && (
        <section className="panel p-4">
          <div className="font-semibold mb-2 text-darkText dark:text-white">Lesson outline</div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-white/80">
            {outline.filter(Boolean).map((s: any, i: number) => (
              <li key={s?.id ?? `sec-${i}`}>
                <span className="font-medium text-darkText dark:text-white">
                  {s?.title ?? `Lesson ${i + 1}`}
                </span>
                <ul className="list-disc list-inside ml-4">
                  {((s?.keyPoints || []) as string[]).map((k: string, idx: number) => (
                    <li key={idx} className="text-gray-700 dark:text-white/70">
                      {k}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={async () => {
                const timeLabel = displayTimerSec > 0 ? fmtDuration(displayTimerSec) : 'No time limit';
                setConfirmInfo({ lessons: displayLessons, questions: displayQuestions, timeLabel });
                setConfirmOpen(true);
              }}
              className="chip chip-active"
            >
              Generate quiz
            </button>
          </div>
        </section>
      )}

      {/* Quiz */}
      {quiz?.questions?.length ? (
        <section className="panel p-4">
          <div className="font-semibold text-darkText dark:text-white">Quick quiz</div>

          {/* banner */}
          {isOrgFlow ? (
            <div className={`mt-1 text-xs px-2 py-1 rounded ${isLocked ? 'bg-red-600/20 text-red-200' : 'bg-white/10 text-white/90'}`}>
              {isLocked ? 'Time up — quiz locked' : `Time left: ${fmtHMSms(remainingMsTicker)}`}
            </div>
          ) : (
            <div className="mt-1 text-xs px-2 py-1 rounded bg-white/10 text-white/90">
              Time elapsed: {Math.floor(elapsedMs / 1000)}s
            </div>
          )}

          {/* Type chip (clarity for learners) */}
          <div className="mt-2 text-xs text-gray-600 dark:text-white/70">
            Answer type:&nbsp;
            <b>{enforcedQuizType === 'short' ? 'Short (typed)' : 'Multiple choice (MCQ)'}</b>
          </div>

          <div className="text-xs text-gray-600 dark:text-white/60 mb-2">Answer all to submit.</div>

          <div className="space-y-4">
            {quiz.questions.map((q: any, idx: number) => {
              const qType = enforcedQuizType;

              return (
                <div
                  key={q.id}
                  className="rounded-xl bg-white ring-1 ring-gray-200 p-3 dark:bg-white/5 dark:ring-white/10"
                >
                  <div className="text-sm font-medium mb-2 text-darkText dark:text-white">
                    <span className="mr-1">{idx + 1}.</span>
                    <Markdown inline>{String(q.display || q.prompt || '')}</Markdown>
                  </div>

                  {qType === 'short' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="chip"
                          onClick={() => {
                            const cur = String(workingAnswers[q.id] ?? '');
                            handleAnswer(q.id, toSub(cur));
                          }}
                          disabled={isLocked}
                          title="Convert digits to subscripts"
                        >
                          x₂ (sub)
                        </button>
                        <button
                          type="button"
                          className="chip"
                          onClick={() => {
                            const cur = String(workingAnswers[q.id] ?? '');
                            handleAnswer(q.id, toSup(cur));
                          }}
                          disabled={isLocked}
                          title="Convert digits/signs to superscripts"
                        >
                          x²⁺ (sup)
                        </button>
                      </div>
                      <input
                        className={`input ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={String(workingAnswers[q.id] ?? '')}
                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                        placeholder="Type your answer (e.g., H₂SO₄, SO₄²⁻)"
                        disabled={isLocked}
                      />
                      {q.explanation && (
                        <div className="text-[11px] text-gray-500 dark:text-white/60">{q.explanation}</div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.choices || []).map((c: string, i: number) => {
                        const isSelected = workingAnswers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswer(q.id, i)}
                            disabled={isLocked}
                            className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition
                              ${isSelected
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-600/30 dark:text-white dark:ring-emerald-500'
                                : 'bg-white text-darkText ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10'
                              }
                              ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <Markdown inline>{String(c || '')}</Markdown>
                          </button>
                        );
                      })}
                      {(!q.choices || q.choices.length === 0) && (
                        <div className="text-[12px] text-amber-700 dark:text-amber-300">
                          No choices provided for this MCQ. Please refresh or contact your admin.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                if (!requireAuth('grade_quiz', 'Please sign in to submit and grade your quiz.')) return;
                try {
                  // 🔒 Make 100% sure the quiz carries its type right before grading
                  try {
                    const qt = enforcedQuizType; // 'mcq' | 'short'
                    if (quiz && (quiz as any).quizType !== 'mcq' && (quiz as any).quizType !== 'short') {
                      (quiz as any).quizType = qt;
                    }
                    if (quiz?.questions) {
                      (quiz as any).questions = quiz.questions.map((q: any) => ({ ...q, type: qt }));
                    }
                  } catch { /* ignore */ }

                  if (isOrgFlow && assignmentId) {
                    if (submittingRef.current) return;
                    submittingRef.current = true;
                    try {
                      // Build per-question answer payload (choiceIndex OR answerText) using enforced type
                      const payloadAnswers = (quiz?.questions || []).map((q: any) => {
                        const v = workingAnswers[q.id];
                        return enforcedQuizType === 'short'
                          ? { questionId: q.id, answerText: String(v ?? '') }
                          : { questionId: q.id, choiceIndex: Number(v) };
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
                      await r.json().catch(() => ({}));
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
                }
              }}
              disabled={!canSubmit}
              className={`btn ${canSubmit ? 'bg-emerald-600 hover:bg-emerald-500' : 'opacity-60 cursor-not-allowed'}`}
            >
              Submit quiz
            </button>

            {grade && (
              <span className="text-sm text-darkText dark:text-white/80">
                Score: <span className="font-semibold">{grade.scorePct}%</span> (Pass mark {grade.passMark}
                %)
              </span>
            )}

            {grade && course?.id && (
              <button
                onClick={() => onViewResults(course.id, courseTitle, grade)}
                className="chip"
                title="Open your Results &amp; Documents page"
              >
                View Results
              </button>
            )}
          </div>

          {grade?.passed && !retakeMode && (
            <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 dark:bg-emerald-500/10 dark:ring-emerald-500">
              <div className="text-sm text-emerald-800 dark:text-emerald-200">
                🎉 Great job! You passed (≥ {grade.passMark}%).
              </div>

              {isOrgFlowFlag ? (
                <>
                  <div className="mt-2 text-xs text-gray-700 dark:text-white/70">
                    Covered by your organization — no payment needed.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const sku = (skus && skus[0]) || null;
                          if (sku) {
                            try { await claim(sku.code); } catch { /* ignore claim error */ }
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
                        }
                      }}
                      className="btn bg-emerald-600 hover:bg-emerald-500"
                    >
                      Generate Certificate
                    </button>

                    {certUrl && (
                      <>
                        <a href={certUrl} target="_blank" rel="noreferrer" className="chip">
                          View certificate
                        </a>
                        {downUrl && (
                          <a href={downUrl} className="btn bg-indigo-600 hover:bg-indigo-500">
                            Download PDF
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  {!certUrl && (
                    <p className="text-[12px] text-gray-600 dark:text-white/70 mt-2">
                      Your certificate will be generated at no cost.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-gray-600 dark:text-white/70">
                      Pay in tokens (no processing fees)
                    </div>
                    {aiCertLoading && <div className="text-xs text-gray-500">Loading certificate options…</div>}
                    {aiCertError && <div className="text-xs text-red-600">{aiCertError}</div>}
                    {aiCertMsg && <div className="text-xs text-emerald-700 dark:text-emerald-300">{aiCertMsg}</div>}

                    <div className="space-y-2">
                      {(skus || []).map((sku) => (
                        <div
                          key={sku.code}
                          className="flex items-center justify-between rounded-lg ring-1 ring-gray-200 dark:ring-white/10 p-2 bg-white dark:bg-white/5"
                        >
                          <div>
                            <div className="text-sm font-medium">{sku.title}</div>
                            <div className="text-[11px] text-gray-600 dark:text-white/60">{sku.code}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{sku.price_tokens} Tokens</span>
                            <button
                              onClick={async () => {
                                if (!token) return;
                                try {
                                  await claim(sku.code);
                                  const doc = await generateAICert();
                                  const url = (doc as any)?.download_url || (doc as any)?.url;
                                  if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                  const c: any = doc || {};
                                  setCertUrl(c.url ?? null);
                                  setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
                                } catch (e) {
                                  console.error('[tokens] claim/generate failed', e);
                                }
                              }}
                              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500"
                            >
                              Claim &amp; Generate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-white/60">
                    Prefer paying with card or PayPal/M-Pesa?
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <button onClick={() => setPaymentOpen(true)} className="btn bg-indigo-600 hover:bg-indigo-500">
                      Pay with PayPal / M-Pesa
                    </button>

                    {certUrl && (
                      <>
                        <a href={certUrl} target="_blank" rel="noreferrer" className="chip">
                          View certificate
                        </a>

                        {downUrl && (
                          <button
                            className="btn bg-indigo-600 hover:bg-indigo-500"
                            onClick={async () => {
                              if (!requireAuth('download_certificate', 'Please sign in to download your certificate.')) return;

                              // downUrl looks like: <API>/api/certificates/<id>/download
                              const m = downUrl.match(/\/certificates\/([^/]+)\/download/);
                              const certId = m?.[1];

                              if (certId) {
                                try {
                                  await downloadCertificateFile(
                                    backendUrl,
                                    token,
                                    certId,
                                    `${courseTitle.replace(/\s+/g, '-').toLowerCase()}-${certId}.pdf`
                                  );
                                } catch (e) {
                                  console.error('Download failed', e);
                                  if (certUrl) window.open(certUrl, '_blank', 'noopener,noreferrer');
                                }
                              } else {
                                if (certUrl) window.open(certUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            Download PDF
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {!certUrl && (
                    <p className="text-[12px] text-gray-600 dark:text-white/70 mt-2">
                      Once payment completes (tokens or fiat), we’ll generate your certificate instantly.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {grade && !grade.passed && !retakeMode && (
            <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 p-3 dark:bg-red-500/10 dark:ring-red-500">
              <div className="text-sm text-red-700 dark:text-red-200">
                You scored {grade.scorePct}%. Review the lesson and try again.
              </div>

              {/* Retry CTA (org flow): starts a NEW attempt until max attempts is reached */}
              {isOrgFlow && assignmentId && (
                <div className="mt-3">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                    onClick={async () => {
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
                          alert(j?.message || 'No attempts left.');
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

                        // unlock immediately & reset elapsed clock
                        setForceUnlock(true);
                        setElapsedMs(0);

                        // clear selections and hide old grade while retrying
                        setRetakeMode(true);
                        setWorkingAnswers({});

                        await generateQuizNow(
                          displayQuestions,
                          undefined,
                          undefined,
                          undefined,
                          assignmentId
                        );
                      } catch (e) {
                        console.error('[retry] failed', e);
                      } finally {
                        startingAttemptRef.current = false;
                      }
                    }}
                  >
                    Retry quiz
                  </button>
                </div>
              )}

              {/* Retry CTA (non-org flow): just clears selections and (optionally) regenerates */}
              {!isOrgFlow && (
                <div className="mt-3">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                    onClick={async () => {
                      setRetakeMode(true);
                      setWorkingAnswers({});
                      setElapsedMs(0);
                      if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
                      await generateQuizNow(displayQuestions, undefined, undefined, undefined, assignmentId);
                    }}
                  >
                    Retry quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}

      {/* Confirm modal + payment widget */}
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
                  alert(msg);
                  return;
                }

                const payload = await r.json().catch(() => ({} as any));

                const newAttemptId =
                  (payload as any)?.attemptId ?? (payload as any)?.attempt_id ?? null;
                if (newAttemptId) setAttemptIdState(String(newAttemptId));

                const ms =
                  Number((payload as any)?.remainingMs ?? (payload as any)?.remaining_ms) ||
                  (timerSec > 0 ? timerSec * 1000 : 0);
                if (ms > 0) setLocalRemainingMs(ms);

                // unlock immediately & reset elapsed clock
                setForceUnlock(true);
                setElapsedMs(0);
              } catch (e) {
                if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
                console.warn('attempt start failed; using local timer fallback', e);
              } finally {
                startingAttemptRef.current = false;
              }
            } else if (timerSec > 0) {
              setLocalRemainingMs(timerSec * 1000);
            }

            // NOTE: the server must generate a quiz of a single type according to assignment.locked_config.quizType
            await generateQuizNow(displayQuestions, undefined, undefined, undefined, assignmentId);
          }}
        />
      )}

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

/**
 * Backend note (keep on the server side, shown here for clarity):
 *
 * // inside your generate/attempts start handler
 * const assignment = await db.getAssignment(assignmentId);
 * const qType = assignment.locked_config?.quizType?.toLowerCase() === 'short' ? 'short' : 'mcq';
 *
 * const quiz = await buildQuiz({ /* ... * / type: qType });
 * quiz.quizType = qType; // include for the UI
 * quiz.questions = quiz.questions.map(q => ({ ...q, type: qType })); // force uniform type
 */
