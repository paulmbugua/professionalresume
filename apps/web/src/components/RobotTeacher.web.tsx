import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAiCourse } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context';
import { createAiSandboxCourse } from '@mytutorapp/shared/api/aiCourseApi';

import PaymentWidget from './PaymentWidget.web';
import ClassroomPlayer from './ClassroomPlayer.web';

type RobotTeacherProps = {
  defaultVoice?: string;
  initialSsml?: string;
  voiceName?: string;
};

/* ─────────────────────────────────────────────────────────
   Small desktop & mobile course lists (kept here)
   ───────────────────────────────────────────────────────── */
function CourseList({
  items,
  activeId,
  onSelect,
  onRefresh,
  onLoadMore,
  hasMore,
}: {
  items: { id: string; title: string; blurb?: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        (it.title || '').toLowerCase().includes(q) ||
        (it.blurb || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <>
      {/* Mobile chips */}
      <div className="md:hidden w-full -mx-2 px-2">
        {showSearch && (
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg bg-white/10 ring-1 ring-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {visible.length ? (
            visible.map((l, i) => {
              const active = l.id === activeId;
              return (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ring-1 transition ${
                    active
                      ? 'bg-indigo-600/40 text-white ring-indigo-500'
                      : 'bg-white/5 text-white/90 hover:bg-white/10 ring-white/10'
                  }`}
                  title={l.blurb || l.title}
                >
                  {String(i + 1).padStart(2, '0')} • {l.title}
                </button>
              );
            })
          ) : (
            <span className="text-white/60 text-xs">No courses found.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="text-[11px] px-2 py-1.5 rounded bg-white/10 hover:bg-white/20"
            aria-pressed={showSearch}
          >
            {showSearch ? 'Hide search' : 'Search'}
          </button>
          <button
            onClick={onRefresh}
            className="text-[11px] px-2 py-1.5 rounded bg-white/10 hover:bg-white/20"
            title="Reload list"
          >
            Refresh
          </button>
          <button
            onClick={onLoadMore}
            className="text-[11px] px-2.5 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white"
            title="Load more courses"
            disabled={!hasMore}
          >
            {hasMore ? 'Load more' : 'All loaded'}
          </button>
        </div>
      </div>

      {/* Desktop list */}
      <div className="hidden md:flex md:flex-col rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white font-semibold">Available courses</div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              aria-pressed={showSearch}
              title="Search courses"
            >
              {showSearch ? 'Hide search' : 'Search'}
            </button>
            <button
              onClick={onRefresh}
              className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              title="Reload list"
            >
              Refresh
            </button>
            <button
              onClick={onLoadMore}
              className="text-[11px] px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white"
              title="Load more courses"
              disabled={!hasMore}
            >
              {hasMore ? 'Load more' : 'All loaded'}
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg bg-white/10 ring-1 ring-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="space-y-2 md:max-h-[80vh] overflow-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {visible.length ? (
            visible.map((l, i) => {
              const active = l.id === activeId;
              return (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-indigo-600/40 text-white' : 'bg-white/5 text-white/90 hover:bg-white/10'
                  }`}
                  title={l.blurb || l.title}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{l.title}</span>
                  </div>
                  {l.blurb ? (
                    <div className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{l.blurb}</div>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="text-white/60 text-sm">No courses found. Try another search.</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main container/page
   ───────────────────────────────────────────────────────── */
const RobotTeacher: React.FC<RobotTeacherProps> = ({
  defaultVoice = 'en-US-JennyNeural',
  initialSsml = '',
  voiceName,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Avoid horizontal scrollbars globally
  useEffect(() => {
    const prevX = document.body.style.overflowX;
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = prevX;
    };
  }, []);

  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isMaximized) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMaximized]);

  const effectiveVoice = voiceName || defaultVoice;
  const { backendUrl, token } = useShopContext();

  const ai = useAiCourse(backendUrl, token || undefined) as any;
  const {
    topCourses,
    selectedCourse,
    outline,
    ssml,
    quiz,
    answers,
    grade,
    step,
    error,
    ttsLoading,
    ttsError,
    loadTopCourses,
    selectCourse,
    startWithAI,
    generateQuizNow,
    answerQuestion,
    allAnswered,
    gradeNow,
    tryGenerateCertificate,
    startCustomTopic,
  } = ai;

  const hasMoreCourses: boolean = Boolean(ai?.hasMoreCourses ?? ai?.coursesHasMore ?? ai?.hasMore);
  const coursesCursor: string | null = ai?.coursesCursor ?? ai?.nextCursor ?? null;
  const degraded: boolean = Boolean(ai?.degraded) || Boolean(ai?.notice?.degraded);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [downUrl, setDownUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await loadTopCourses?.({ limit: 200 });
      } catch {
        try {
          await loadTopCourses?.();
        } catch {
          /* swallow */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    const opts = coursesCursor
      ? { append: true, cursor: coursesCursor, limit: 200 }
      : { append: true, page: 'next', limit: 200 };
    try {
      await loadTopCourses?.(opts);
    } catch {
      try {
        await loadTopCourses?.({ append: true });
      } catch {
        await loadTopCourses?.();
      }
    }
  };

  useEffect(() => {
    if (!paymentOpen && grade?.passed) {
      (async () => {
        const cert = await tryGenerateCertificate();
        if (cert) {
          setCertUrl((cert as any).url ?? null);
          const dl =
            (cert as any).download_url ??
            (cert as any).downloadUrl ??
            (cert as any).url ??
            null;
          setDownUrl(dl);
        }
      })();
    }
  }, [paymentOpen, grade?.passed, tryGenerateCertificate]);

  const courseItems = useMemo(
    () => (topCourses || []).map((c: any) => ({ id: c.id, title: c.title, blurb: c.blurb })),
    [topCourses]
  );

  // Start custom topic (with fallback API)
  const startCustomTopicSafe = async (title: string) => {
    if (typeof startCustomTopic === 'function') {
      await startCustomTopic(title, { level: 'beginner', minutes: 20, voiceName: effectiveVoice });
      return;
    }
    const sandbox = await createAiSandboxCourse(backendUrl, title);
    selectCourse({ id: sandbox.id, title: sandbox.title, blurb: sandbox.description || '' } as any);
    await startWithAI({ level: 'beginner', minutes: 20, voiceName: effectiveVoice });
  };

  // Only real SSML from AI (single blob fallback)
  const classroomSsml = ssml && ssml.trim().length > 0 ? ssml : '';

  // Lessons (per-lesson TTS preferred if available)
  const lessonsForPlayer: { id: string; title?: string; ssml: string }[] =
    Array.isArray(ai?.lessons)
      ? ai.lessons.map((l: any) => ({ id: l.id, title: l.title, ssml: l.ssml }))
      : [];

  // Auto-maximize on mobile when narration appears
  useEffect(() => {
    const hasAnyNarration = lessonsForPlayer.length > 0 || Boolean(classroomSsml);
    if (hasAnyNarration && typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMaximized(true);
    }
  }, [classroomSsml, lessonsForPlayer.length]);

  // ── Auth helpers: return-to + 401 handling
  const goToLoginWithReturn = (reason?: string, message?: string) => {
    const next = `${location.pathname}${location.search}${location.hash}`;
    try {
      sessionStorage.setItem('auth:returnTo', next);
    } catch {}
    navigate('/login', { state: { next, reason, message }, replace: true });
  };

  const requireAuth = (reason?: string, message?: string) => {
    if (token) return true;
    goToLoginWithReturn(reason, message);
    return false;
  };

  const is401 = (e: any) =>
    e?.status === 401 || e?.code === 'UNAUTHENTICATED' || /401/.test(String(e?.message));

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      {/* Fullscreen overlay for maximized classroom */}
      {isMaximized && (
        <div
          className="fixed inset-0 z-50 bg-[#0b1220] px-2 sm:px-4 py-2 sm:py-4"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="max-w-7xl mx-auto">
            <ClassroomPlayer
              ssml={classroomSsml}
              lessons={lessonsForPlayer}
              voiceName={voiceName || defaultVoice}
              title={selectedCourse?.title || 'AI Lesson'}
              maximized
              onToggleMaximize={() => setIsMaximized(false)}
              // NEW: pass details for the backdrop
              course={selectedCourse || null}
              outline={outline}
              backendUrlOverride={backendUrl}
              playing={true} // slideshow follows audio internally too
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* LEFT: main content */}
        <div className="md:col-span-8 space-y-4 sm:space-y-6 order-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">AI Tutor Studio</h1>
          <p className="text-white/75 text-sm sm:text-base">
            Learn for free: AI lesson (audio + captions + slides) and quiz. Score{' '}
            <span className="font-semibold">≥ 70%</span> to unlock your certificate, then pay the small
            certificate fee to download your PDF.
          </p>

          {Boolean(ai?.degraded || ai?.notice?.degraded) && (
            <div className="rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/40 p-3">
              <div className="text-yellow-200 text-sm">
                We’re in fallback mode due to high demand. You can still take the lesson, quiz, and unlock your
                certificate.
              </div>
            </div>
          )}

          {/* Mobile: course dropdown (theme-aware, drops downward) */}
          <div className="md:hidden">
            <label className="text-xs text-white/70">Choose a course</label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="w-full rounded-xl px-3 py-2 text-sm text-left transition
                           bg-white text-black ring-1 ring-black/10
                           dark:bg-white/10 dark:text-white dark:ring-white/15"
                aria-haspopup="listbox"
                aria-expanded={mobileOpen}
              >
                <span className={`${selectedCourse ? '' : 'opacity-70'}`}>
                  {selectedCourse?.title ||
                    ((topCourses || []).length ? 'Select a course…' : 'Loading courses…')}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.12l3.71-3.89a.75.75 0 111.08 1.04l-4.24 4.45a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                </svg>
              </button>

              {mobileOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-40 max-h-64 overflow-auto rounded-xl shadow-lg
                             bg-white text-black ring-1 ring-black/10
                             dark:bg-[#101826] dark:text-white dark:ring-white/15"
                  role="listbox"
                >
                  {(topCourses || []).length ? (
                    (topCourses || []).map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={selectedCourse?.id === c.id}
                        onClick={() => {
                          setMobileOpen(false);
                          selectCourse(c);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition
                                    hover:bg-black/[0.04] active:bg-black/[0.06]
                                    dark:hover:bg-white/10 dark:active:bg-white/15
                                    ${selectedCourse?.id === c.id ? 'font-medium' : ''}`}
                        title={c.blurb || c.title}
                      >
                        {c.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm opacity-70">Loading courses…</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div className="flex-1">
              <div className="text-xs text-white/70 mb-1">
                Select a course (dropdown on mobile / list on the right), then start with A.I — or type your own
                topic below.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={!selectedCourse || ttsLoading || step === 'outlining' || step === 'narrating'}
                onClick={() =>
                  startWithAI({ level: 'beginner', minutes: 20, voiceName: effectiveVoice })
                }
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${selectedCourse ? 'bg-white/15 hover:bg-white/25' : 'bg-white/10 cursor-not-allowed'}
                `}
                title={selectedCourse ? 'AI will generate outline + narration' : 'Pick a course first'}
              >
                Start with A.I
              </button>
            </div>
          </div>

          {/* Teach me anything */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/70">Or type any topic</label>
              <div className="mt-1 flex flex-col xs:flex-row gap-2">
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Linear Algebra crash course"
                  className="w-full rounded-xl bg-white text-black ring-1 ring-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-white/10 dark:text-white dark:ring-white/10"
                />

                <button
                  disabled={!customTitle.trim() || ttsLoading || step === 'outlining' || step === 'narrating'}
                  onClick={() => customTitle.trim() && startCustomTopicSafe(customTitle.trim())}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                    ${customTitle.trim() ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'}
                  `}
                  title="Spin up an AI sandbox course for this topic"
                >
                  Teach me
                </button>
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                We’ll spin up an AI sandbox course for this topic and run the same lesson → quiz → certificate flow.
              </p>
            </div>
          </div>

          {/* Classroom */}
          <div className="mt-1" id="classroom">
            <ClassroomPlayer
              ssml={classroomSsml}                         // fallback single-blob
              lessons={lessonsForPlayer}                    // preferred per-lesson
              voiceName={voiceName || defaultVoice}
              title={selectedCourse?.title || 'AI Lesson'}
              maximized={false}
              onToggleMaximize={() => setIsMaximized(true)}
              // NEW: give the player context for the backdrop
              course={selectedCourse || null}
              outline={outline}
              backendUrlOverride={backendUrl}
              playing={true}
            />
          </div>

          {/* Outline */}
          {outline.length > 0 && (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              {degraded && (
                <div className="mb-2 rounded-md bg-yellow-500/10 ring-1 ring-yellow-500/30 px-2 py-1 text-[12px] text-yellow-200">
                  Fallback content — auto-generated without the full AI model.
                </div>
              )}
              <div className="font-semibold mb-2">Lesson outline</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-white/80">
                {outline.map((s: any) => (
                  <li key={s.id}>
                    <span className="font-medium text-white">{s.title}</span>
                    <ul className="list-disc list-inside ml-4">
                      {s.keyPoints.map((k: string, idx: number) => (
                        <li key={idx} className="text-white/70">
                          {k}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => generateQuizNow(6)}
                  className="rounded-lg h-10 px-3 bg-white/15 text-white text-sm font-semibold hover:bg-white/25"
                >
                  Generate quiz
                </button>
                {ttsLoading && <span className="text-xs text-white/60">Narration rendering…</span>}
                {(error || ttsError) && (
                  <span className="text-xs text-red-300">{error || ttsError}</span>
                )}
              </div>
            </div>
          )}

          {/* Quiz */}
          {quiz?.questions?.length ? (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              {degraded && (
                <div className="mb-2 rounded-md bg-yellow-500/10 ring-1 ring-yellow-500/30 px-2 py-1 text-[12px] text-yellow-200">
                  Fallback quiz — simplified checks of the main ideas.
                </div>
              )}

              <div className="font-semibold">Quick quiz</div>
              <div className="text-white/60 text-xs mb-2">Answer all to submit.</div>

              <div className="space-y-4">
                {quiz.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="text-sm font-medium mb-2">
                      {idx + 1}. {q.prompt}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c: string, i: number) => {
                        const isSelected = answers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => answerQuestion(q.id, i)}
                            className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition
                              ${isSelected ? 'bg-emerald-600/40 ring-emerald-500' : 'bg-white/5 ring-white/10 hover:bg-white/10'}
                            `}
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
                      await gradeNow();
                    } catch (e: any) {
                      if (is401(e)) {
                        goToLoginWithReturn(
                          'grade_quiz',
                          'Please sign in to submit and grade your quiz.'
                        );
                        return;
                      }
                      console.error('[gradeNow] failed', e);
                    }
                  }}
                  disabled={!allAnswered}
                  className={`rounded-lg h-10 px-4 text-sm font-semibold
                    ${allAnswered ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/40 cursor-not-allowed'}
                  `}
                >
                  Submit quiz
                </button>

                {grade && (
                  <span className="text-sm text-white/80">
                    Score: <span className="font-semibold">{grade.scorePct}%</span> (Pass mark {grade.passMark}%)
                  </span>
                )}

                {grade && selectedCourse?.id && (
                  <button
                    onClick={() =>
                      navigate('/results', {
                        state: {
                          courseId: selectedCourse.id,
                          courseTitle: selectedCourse.title,
                          grade: {
                            scorePct: grade.scorePct,
                            passMark: grade.passMark,
                            passed: grade.passed,
                          },
                        },
                      })
                    }
                    className="h-10 px-4 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 ring-1 ring-white/20"
                    title="Open your Results & Documents page"
                  >
                    View Results
                  </button>
                )}
              </div>

              {grade?.passed && (
                <div className="mt-4 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500 p-3">
                  <div className="text-sm text-emerald-200">
                    🎉 Great job! You passed (≥ {grade.passMark}%). Proceed to unlock your certificate.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (!requireAuth('pay_certificate', 'Please sign in to pay & unlock your certificate.'))
                          return;
                        setPaymentOpen(true);
                      }}
                      className="rounded-lg h-10 px-4 bg-emerald-600 text-white text-sm font-semibold hover:brightness-110"
                    >
                      Pay & unlock certificate
                    </button>

                    {certUrl && (
                      <>
                        <a
                          href={certUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg h-10 px-4 bg-white/10 ring-1 ring-white/20 text-sm font-semibold hover:bg-white/20"
                        >
                          View certificate
                        </a>
                        {downUrl && (
                          <a
                            href={downUrl}
                            className="rounded-lg h-10 px-4 bg-indigo-600 text-white text-sm font-semibold hover:brightness-110"
                          >
                            Download PDF
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  {!certUrl && (
                    <p className="text-[12px] text-white/70 mt-2">
                      After you close the payment panel, we’ll automatically generate your certificate (if eligible).
                    </p>
                  )}
                </div>
              )}

              {grade && !grade.passed && (
                <div className="mt-4 rounded-xl bg-red-500/10 ring-1 ring-red-500 p-3">
                  <div className="text-sm text-red-200">You scored {grade.scorePct}%. Review the lesson and try again.</div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* RIGHT: desktop course list */}
        <aside className="md:col-span-4 order-2">
          <div className="md:sticky md:top-20 space-y-3">
            <CourseList
              items={courseItems}
              activeId={selectedCourse?.id || null}
              onSelect={(id) => {
                const found = (topCourses || []).find((c: any) => c.id === id) || null;
                selectCourse(found);
              }}
              onRefresh={() => {
                loadTopCourses?.({ limit: 200 }).catch(() => loadTopCourses?.());
              }}
              onLoadMore={handleLoadMore}
              hasMore={Boolean(hasMoreCourses)}
            />
          </div>
        </aside>
      </div>

      {/* Payment slide-over */}
      <PaymentWidget
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Unlock Certificate"
        showTutorPreview={false}
      />
    </div>
  );
};

export default RobotTeacher;
