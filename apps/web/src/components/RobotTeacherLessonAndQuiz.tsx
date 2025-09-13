// apps/web/src/components/RobotTeacherLessonAndQuiz.tsx
import React, { useEffect, useState } from 'react';
import ClassroomThemeShell from '@/components/ClassroomThemeShell';
import QuizConfirmModal from '@/components/QuizConfirmModal';
import PaymentWidget from './PaymentWidget.web';

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
  generateQuizNow: (count: number) => Promise<void> | void;
  safeLessons: number;
  safeQuiz: number;
  // quiz
  quiz: any;
  answers: Record<string, number>;
  onAnswer: (qid: string, idx: number) => void;
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
  allAnswered,
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

  // NEW: track the active attempt id returned by /attempts/start
  const [attemptIdState, setAttemptIdState] = useState<string | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!quiz?.questions?.length) return;
    let start = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => window.clearInterval(id);
  }, [quiz?.questions?.length]);

  return (
    <>
      {/* Classroom */}
      <section id="classroom" className={`relative z-[0] ${compactPlayer && !showCourseList ? 'mx-auto max-w-5xl' : ''}`}>
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
                const timeLabel = timerSec > 0 ? fmtDuration(timerSec) : 'No time limit';
                setConfirmInfo({ lessons: safeLessons, questions: safeQuiz, timeLabel });
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
          {isOrgFlow ? (
            <div
              className={`mt-1 text-xs px-2 py-1 rounded ${
                disableQuiz ? 'bg-red-600/20 text-red-200' : 'bg-white/10 text-white/90'
              }`}
            >
              {disableQuiz ? 'Time up — quiz locked' : `Time left: ${fmtHMSms(displayRemainingMs)}`}
            </div>
          ) : (
            <div className="mt-1 text-xs px-2 py-1 rounded bg-white/10 text-white/90">
              Time elapsed: {Math.floor(elapsedMs / 1000)}s
            </div>
          )}

          <div className="text-xs text-gray-600 dark:text-white/60 mb-2">Answer all to submit.</div>

          <div className="space-y-4">
            {quiz.questions.map((q: any, idx: number) => (
              <div
                key={q.id}
                className="rounded-xl bg-white ring-1 ring-gray-200 p-3 dark:bg-white/5 dark:ring-white/10"
              >
                <div className="text-sm font-medium mb-2 text-darkText dark:text-white">
                  {idx + 1}. {q.prompt}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.choices.map((c: string, i: number) => {
                    const isSelected = answers[q.id] === i;
                    return (
                      <button
                        key={i}
                        onClick={() => onAnswer(q.id, i)}
                        disabled={disableQuiz}
                        className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/30
                          ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-600/30 dark:text-white dark:ring-emerald-500'
                              : 'bg-white text-darkText ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10'
                          }
                          ${disableQuiz ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                if (!requireAuth('grade_quiz', 'Please sign in to submit and grade your quiz.')) return;
                try {
                  if (isOrgFlow && assignmentId) {
                    const r = await fetch(`${backendUrl}/api/orgs/attempts/submit`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        assignmentId,
                        attemptId: attemptIdState ?? undefined, // ⬅ include when known
                        answers: Object.entries(answers).map(([questionId, choiceIndex]) => ({
                          questionId,
                          choiceIndex,
                        })),
                      }),
                    });
                    if (!r.ok) throw new Error(`Submit failed: ${r.status}`);
                    await r.json().catch(() => ({}));
                    await gradeNow();
                  } else {
                    await gradeNow();
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              disabled={!allAnswered || disableQuiz}
              className={`btn ${
                allAnswered && !disableQuiz ? 'bg-emerald-600 hover:bg-emerald-500' : 'opacity-60 cursor-not-allowed'
              }`}
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
                title="Open your Results & Documents page"
              >
                View Results
              </button>
            )}
          </div>

          {grade?.passed && (
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
                            try {
                              await claim(sku.code);
                            } catch {
                              /* ignore claim error */
                            }
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
                              Claim & Generate
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
                          <a href={downUrl} className="btn bg-indigo-600 hover:bg-indigo-500">
                            Download PDF
                          </a>
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

          {grade && !grade.passed && (
            <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 p-3 dark:bg-red-500/10 dark:ring-red-500">
              <div className="text-sm text-red-700 dark:text-red-200">
                You scored {grade.scorePct}%. Review the lesson and try again.
              </div>
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
              // make sure the user is signed in for org attempt APIs
              if (!requireAuth('start_attempt', 'Please sign in to start your attempt.')) return;

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
                  return; // don't proceed to quiz generation if starting failed
                }

                const payload = await r.json().catch(() => ({} as any));

                // ⬅️ capture attempt id for submit
                const newAttemptId =
                  (payload as any)?.attemptId ?? (payload as any)?.attempt_id ?? null;
                if (newAttemptId) setAttemptIdState(String(newAttemptId));

                const ms =
                  Number((payload as any)?.remainingMs ?? (payload as any)?.remaining_ms) ||
                  (timerSec > 0 ? timerSec * 1000 : 0);
                if (ms > 0) setLocalRemainingMs(ms);
              } catch (e) {
                if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
                console.warn('attempt start failed; using local timer fallback', e);
              }
            } else if (timerSec > 0) {
              setLocalRemainingMs(timerSec * 1000);
            }

            // parent-provided wrapper already passes size/track/lessons/assignmentId
            await generateQuizNow(safeQuiz);
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
