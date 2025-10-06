// apps/web/src/components/RobotTeacherLessonAndQuiz.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Markdown from '@/components/Markdown.web';
import ClassroomThemeShell from '@/components/ClassroomThemeShell';
import QuizConfirmModal from '@/components/QuizConfirmModal';
import type { DbCourseSize, ProgramTrack } from '@mytutorapp/shared/types';
import AntiCheatGuard from '@/components/AntiCheatGuard.web';
import { useAttemptIntegrity } from '@mytutorapp/shared/hooks/useAttemptIntegrity';
import { getStableDeviceId } from '@mytutorapp/shared/utils/deviceId';

const fmtHMS = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
const fmtHMSms = (ms: number) => fmtHMS(Math.floor(Math.max(0, ms) / 1000));

const pickTimerSec = (quizTimer: unknown, orgTimer?: number, defaultTimer?: number) =>
  (Number(quizTimer) || (orgTimer ?? defaultTimer ?? 0));


type RequestStartArgs = { runId?: string } | void;

interface LessonAndQuizProps {
  compactPlayer: boolean;
  showCourseList: boolean;
  onPlayerReady?: () => void;
  allAnswered?: boolean;

  startSignal?: number;
  // classroom
  displaySsml: string;
  onNext?: () => Promise<boolean> | boolean;
  isBuildingNext?: boolean;
  lessonsArr: any[];
  voiceName: string;
  onStart: () => Promise<void> | void;
  onPlayerLoadingChange?: (b: boolean) => void;
  courseTitle: string;
  isMaximized: boolean;
  hasJoined: boolean;
  onToggleMaximized: () => void;
  currentIdx: number;
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
    quizType?: 'mcq' | 'short',
    opts?: { lessonIndex?: number }
  ) => Promise<void> | void;
  safeLessons: number;
  safeQuiz: number;

  // quiz
  quiz: any;
  answers: Record<string, number | string>;
  onAnswer: (qid: string, value: number | string) => void;
  grade: any;
  gradeNow: () => Promise<void> | void;
  token: string;
  requireAuth: (reason?: string, message?: string) => boolean;

  // timer + lock from parent
  localRemainingMs: number | null;
  setLocalRemainingMs: (ms: number | null) => void;
  displayRemainingMs: number;
  disableQuiz: boolean;

  // results (navigation)
  onViewResults: (courseId: string, courseTitle: string, grade: any) => void;

  /** Admins can reveal short-answer solutions; learners cannot */
  isAdmin?: boolean;
}

const LessonAndQuizPane: React.FC<LessonAndQuizProps> = ({
  compactPlayer,
  showCourseList,
  displaySsml,
  lessonsArr,
  onPlayerReady,
  startSignal,
  onNext,
  isBuildingNext,
  voiceName,
  onPlayerLoadingChange: onPlayerLoadingChangeProp,
  courseTitle,
  isMaximized,
  onToggleMaximized,
  course,
  outline,
  backendUrl,
  onBeforePlay,
  hasJoined,
  onStart,
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
  localRemainingMs,
  setLocalRemainingMs,
  displayRemainingMs,
  disableQuiz,
  onViewResults,
  isAdmin = false,
  currentIdx,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<{
    lessons: number;
    questions: number;
    timeLabel?: string;
    timerSec?: number | string | null;
    elapsedMs?: number | string | null;
  } | null>(null);

  // prevent rapid double POSTs
  const startingAttemptRef = useRef(false);
  const submittingRef = useRef(false);

  // ─── Attempt integrity (web) ─────────────────────────────────────────
  const {
    attempt,
    deviceId: boundDeviceId,
    bindDeviceId,
    quizActive,
    markActive,
    markNotActive,
    elapsedMs,
    backgrounds,
    suspicions,
    start: startAttempt,
    submit: submitAttempt,
    bumpSuspicion,
  } = useAttemptIntegrity(backendUrl, token);

  const lastPlayClickRef = useRef(0);
  const guardedBeforePlay = React.useCallback(async () => {
    const now = Date.now();
    if (now - lastPlayClickRef.current < 400) return; // double-click/tap guard
    lastPlayClickRef.current = now;
    await onBeforePlay?.(); // ensure current lesson & prefetch; no regeneration
  }, [onBeforePlay]);

  const [forceUnlock, setForceUnlock] = useState(false);

  // keypad overlay (for short answers)
  const [mathOpen, setMathOpen] = useState(false);
  const [overlayPos, setOverlayPos] = useState<{ left: number; top: number } | null>(null);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<boolean>(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const keypadAnchorRef = useRef<HTMLDivElement | null>(null);
  const userDraggedRef = useRef(false);
  const hasSignaledReadyRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const shownLockAlertRef = React.useRef(false);

  // last focused short input (for insertion)
  const lastShortInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuizTypeHint: 'mcq' | 'short' | undefined = React.useMemo(() => {
    const fromRouter = searchParams.get('qt');
    if (fromRouter) return normQt(fromRouter);
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const q = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
      const fromHash = new URLSearchParams(q).get('qt');
      return normQt(fromHash);
    } catch {
      return undefined;
    }
  }, [searchParams, location.key]);

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

  // Debug snapshot of what the router sees (works in BrowserRouter & HashRouter)
  useEffect(() => {
    try {
      console.info('[qt] router snapshot', {
        pathname: location.pathname,
        search: location.search,
        hash: typeof window !== 'undefined' ? window.location.hash : '',
        qt_from_router: searchParams.get('qt'),
      });
    } catch {}
  }, [location.key, searchParams]);

  // Bind a stable device id (once)
  useEffect(() => {
    (async () => {
      const id = await getStableDeviceId();
      bindDeviceId(id);
    })();
  }, [bindDeviceId]);

  // a new run means a new player lifecycle — allow ready to fire again
  useEffect(() => {
    hasSignaledReadyRef.current = false;
  }, [activeRunId]);

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

        if (!ignore) {
          setOrgMeta({
            quizSize: Number(lc?.quizSize ?? lc?.quiz_size) || undefined,
            totalLessons: Number(lc?.totalLessons ?? lc?.total_lessons) || undefined,
            timer_s: Number.isFinite(t) ? t : undefined,
            quizType: normQt(rawQt),
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

  // Initialize timer from quiz (if any)
  useEffect(() => {
    const ts = Number(quiz?.timerSec);
    if (Number.isFinite(ts) && ts > 0) {
      setLocalRemainingMs(ts * 1000);
      if (!quizActive) markActive(); // make sure elapsedMs starts
    }
  }, [quiz?.timerSec, markActive, quizActive, setLocalRemainingMs]);

  // Modal display values (prefer org-locked)
  const displayLessons = orgMeta?.totalLessons ?? safeLessons ?? outline?.length ?? 0;
  const displayQuestions = orgMeta?.quizSize ?? safeQuiz ?? 0;
  const displayTimerSec = Number(quiz?.timerSec) || (orgMeta?.timer_s ?? timerSec ?? 0);
  const hasTimer = displayTimerSec > 0;

  // hydrate workingAnswers whenever a (new) quiz arrives
  useEffect(() => {
    const ids = (quiz?.questions || []).map((q: any) => q.id);
    if (!ids.length) {
      setWorkingAnswers({});
      return;
    }
    setWorkingAnswers(() => {
      const next: Record<string, number | string | undefined> = {};
      const isMcq = enforcedQuizType === 'mcq';
      for (const q of quiz.questions) {
        const v = (answers && (answers as any)[q.id]) as number | string | undefined;
        if (v === undefined) continue;
        next[q.id] = isMcq ? Number(v) : String(v);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.questions?.map((q: any) => q.id).join('|')]);

  // Enforced single quiz type for the whole quiz (no mixing)
  const enforcedQuizType: 'mcq' | 'short' = React.useMemo(() => {
    const fromQuiz = typeof quiz?.quizType === 'string' ? String(quiz.quizType).toLowerCase() : undefined;
    const fromOrg = orgMeta?.quizType;
    const t = (fromQuiz || fromOrg || urlQuizTypeHint || 'mcq') as 'mcq' | 'short';
    return t === 'short' ? 'short' : 'mcq';
  }, [quiz?.quizType, orgMeta?.quizType, urlQuizTypeHint]);

  // What we ask the generator to create if we haven't got orgMeta yet
  const desiredQuizType: 'mcq' | 'short' = orgMeta?.quizType ?? urlQuizTypeHint ?? 'mcq';

  // Ensure uniform quiz shape
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

  // Activate attempt timer if we have questions
  useEffect(() => {
    if (quiz?.questions?.length && !quizActive) {
      markActive();
    }
  }, [quiz?.questions?.length, quizActive, markActive]);

  // Choose a robust timer base
  const baseMs = React.useMemo(() => {
    const candidates = [
      Number.isFinite(displayRemainingMs) ? Number(displayRemainingMs) : null,
      Number.isFinite(localRemainingMs as any) ? Number(localRemainingMs) : null,
      hasTimer ? displayTimerSec * 1000 : null,
    ].filter((n): n is number => typeof n === 'number' && n !== null);
    if (!candidates.length) return 0;
    const positive = candidates.filter((n) => n > 0);
    return positive.length ? Math.max(...positive) : Math.max(...candidates);
  }, [displayRemainingMs, localRemainingMs, hasTimer, displayTimerSec]);

  const remainingMsTicker = Math.max(0, baseMs - elapsedMs);
  useEffect(() => {
    if (remainingMsTicker <= 0 && forceUnlock) setForceUnlock(false);
  }, [remainingMsTicker, forceUnlock]);

  const isLocked = React.useMemo(() => {
    if (forceUnlock) return false;
    return Boolean(disableQuiz || (hasTimer && remainingMsTicker <= 0));
  }, [forceUnlock, disableQuiz, hasTimer, remainingMsTicker]);

  // Generic answer handler
  const handleAnswer = (qid: string, value: number | string) => {
    if (isLocked) return;
    setWorkingAnswers((prev) => ({ ...prev, [qid]: value }));
    if (onAnswer) onAnswer(qid, value);
  };

  const allAnsweredLocal = React.useMemo(() => {
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

  // Sub/sup helpers
  const SUBS: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋' };
  const SUPS: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
  function toSub(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUBS[m] || m); }
  function toSup(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUPS[m] || m); }

  function normQt(v: unknown): 'mcq' | 'short' | undefined {
    const s = String(v ?? '').trim().toLowerCase();
    if (s === 'short') return 'short';
    if (s === 'mcq') return 'mcq';
    return undefined;
  }

  // Selection helpers
  function getActiveShortInput(): HTMLInputElement | HTMLTextAreaElement | null {
    if (typeof document === 'undefined') return lastShortInputRef.current;
    if (lastShortInputRef.current && document.body.contains(lastShortInputRef.current)) {
      return lastShortInputRef.current;
    }
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const tag = el.tagName;
    if ((tag === 'INPUT' || tag === 'TEXTAREA') && el.getAttribute('data-qid')) {
      return el as HTMLInputElement | HTMLTextAreaElement;
    }
    return null;
  }

  function insertAtCursor(text: string) {
    const input = getActiveShortInput();
    if (!input) return;
    input.focus();
    const qid = input.getAttribute('data-qid')!;
    const start = (input as any).selectionStart ?? input.value.length;
    const end = (input as any).selectionEnd ?? input.value.length;
    const next = input.value.slice(0, start) + text + input.value.slice(end);
    (input as any).value = next;
    const caret = start + text.length;
    (input as any).setSelectionRange?.(caret, caret);
    handleAnswer(qid, next);
  }

  function transformSelection(transformer: (s: string) => string) {
    const input = getActiveShortInput();
    if (!input) return;
    input.focus();
    const qid = input.getAttribute('data-qid')!;
    const start = (input as any).selectionStart ?? 0;
    const end = (input as any).selectionEnd ?? 0;
    if (start === end) {
      const next = transformer(input.value);
      (input as any).value = next;
      handleAnswer(qid, next);
      return;
    }
    const sel = input.value.slice(start, end);
    const rep = transformer(sel);
    const next = input.value.slice(0, start) + rep + input.value.slice(end);
    const delta = rep.length - sel.length;
    (input as any).value = next;
    (input as any).setSelectionRange?.(start, end + delta);
    handleAnswer(qid, next);
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    const max = 320; // px cap
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  }

  // ---- Keypad positioning relative to header (centered) ----
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  function positionKeypadAtHeaderCenter() {
    const M = 8, W = 352, H = 240;
    const anchor = keypadAnchorRef.current;
    if (!anchor) { setOverlayPos(null); return; }
    const r = anchor.getBoundingClientRect();
    const left = clamp(r.left + (r.width / 2) - W / 2, M, Math.max(M, window.innerWidth - W - M));
    const top = clamp(r.top + r.height + 8, M, Math.max(M, window.innerHeight - H - M));
    setOverlayPos({ left, top });
  }

  // Re-position if open and not user-dragged
  useEffect(() => {
    if (!mathOpen) return;
    const ensure = () => {
      if (userDraggedRef.current) {
        if (!overlayRef.current || !overlayPos) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const w = rect.width || 352;
        const h = rect.height || 240;
        const M = 8;
        const left = clamp(overlayPos.left, M, Math.max(M, window.innerWidth - w - M));
        const top = clamp(overlayPos.top, M, Math.max(M, window.innerHeight - h - M));
        if (left !== overlayPos.left || top !== overlayPos.top) setOverlayPos({ left, top });
      } else {
        positionKeypadAtHeaderCenter();
      }
    };
    window.addEventListener('resize', ensure);
    window.addEventListener('scroll', ensure, true);
    return () => {
      window.removeEventListener('resize', ensure);
      window.removeEventListener('scroll', ensure, true);
    };
  }, [mathOpen, overlayPos]);

  // Dragging (mouse + touch)
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number }>({ x: 0, y: 0, left: 0, top: 0 });

  const beginDrag = (clientX: number, clientY: number) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const left = overlayPos ? overlayPos.left : rect.left;
    const top = overlayPos ? overlayPos.top : rect.top;
    dragStartRef.current = { x: clientX, y: clientY, left, top };
    draggingRef.current = true;
    userDraggedRef.current = true;
    if (!overlayPos) setOverlayPos({ left, top });
  };
  const onMove = (clientX: number, clientY: number) => {
    if (!draggingRef.current || !overlayRef.current) return;
    const M = 8;
    const rect = overlayRef.current.getBoundingClientRect();
    const w = rect.width || 352;
    const h = rect.height || 240;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    const nextLeft = clamp(dragStartRef.current.left + dx, M, Math.max(M, window.innerWidth - w - M));
    const nextTop = clamp(dragStartRef.current.top + dy, M, Math.max(M, window.innerHeight - h - M));
    setOverlayPos({ left: nextLeft, top: nextTop });
  };
  const endDrag = () => { draggingRef.current = false; };

  useEffect(() => {
    if (!mathOpen) return;
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const mu = () => endDrag();
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  }, [mathOpen]);

  useEffect(() => {
    if (!mathOpen) return;
    const tm = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const t = e.touches[0]; onMove(t.clientX, t.clientY);
    };
    const tu = () => endDrag();
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', tu);
    window.addEventListener('touchcancel', tu);
    return () => {
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', tu);
      window.removeEventListener('touchcancel', tu);
    };
  }, [mathOpen]);

    const onRequestStartGuarded = React.useCallback(
    async (args?: RequestStartArgs) => {
      const runId =
        args && typeof args === 'object' && 'runId' in args
          ? (args as any).runId ?? null
          : null;
      // If the player started us, runId is null → use a sentinel so clearing works
      const effectiveRunId = runId ?? '__local__';
      setActiveRunId(effectiveRunId);
      setPreparing(true);
      // Tell parent/player we’re entering the loading phase
      try { onPlayerLoadingChangeProp?.(true); } catch {}
      await onStart?.();
      // ⛔️ DO NOT setPreparing(false) here — the player will clear it via onPlayerLoadingChange(false)
    },
    [onStart, onPlayerLoadingChangeProp]
  );

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
              ? 'relative rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-white dark:ring-white/10 dark:bg-white/5'
              : 'relative'
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
            startSignal={startSignal} 
            playing
            playJoinedIfAvailable={hasJoined}
            onBeforePlay={guardedBeforePlay}
            onEnded={onEnded}
            onNext={onNext}
            isBuildingNext={isBuildingNext}
            themeOpen={themeOpen}
            onThemeOpenChange={onThemeOpenChange}
            showFloatingThemeButton={false}
            onRequestStart={onRequestStartGuarded}
             onPlayerLoadingChange={(b: boolean) => {
              if (activeRunId !== null) setPreparing(b);
              if (!b && !hasSignaledReadyRef.current) {
                hasSignaledReadyRef.current = true;
                onPlayerReady?.();
              }
              wasLoadingRef.current = b;
              onPlayerLoadingChangeProp?.(b);
            }}
          />

          {preparing && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 dark:bg-black/45 backdrop-blur-sm"
              aria-live="polite"
              aria-busy="true"
              role="status"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              <span className="sr-only">Preparing next section…</span>
            </div>
          )}
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
                const timeLabel = displayTimerSec > 0 ? fmtHMS(displayTimerSec) : 'No time limit';
                setConfirmInfo({
                  lessons: displayLessons,
                  questions: displayQuestions,
                  timeLabel,
                  timerSec: displayTimerSec,
                  elapsedMs,
                });
                setConfirmOpen(true);
              }}
              className="chip chip-active"
            >
              Generate quiz
            </button>
          </div>
        </section>
      )}

      <AntiCheatGuard
        deviceId={boundDeviceId}
        quizActive={quizActive}
        elapsedMs={elapsedMs}
        backgrounds={backgrounds}
        suspicions={suspicions}
        policy={{
          heartbeatSec: attempt?.heartbeatSec ?? 15,
          maxBackgrounds: attempt?.maxBackgrounds ?? 2,
          maxSuspicion: attempt?.maxSuspicion ?? 5,
          timerSec: (Number(quiz?.timerSec) || (orgMeta?.timer_s ?? timerSec ?? 0)),
        }}

        onTooManyBackgrounds={() => {
          if (shownLockAlertRef.current) return;
          shownLockAlertRef.current = false;
          if (canSubmit) {
            // fire-and-forget; errors are caught in the submit handler
            (async () => {
              try {
                const payloadAnswers = (quiz?.questions || []).map((q: any) => {
                  const v = workingAnswers[q.id];
                  if (enforcedQuizType === 'short') {
                    return { questionId: q.id, answerText: String(v ?? '').trim() };
                  }
                  const idx = typeof v === 'number' ? v : Number(v);
                  return { questionId: q.id, choiceIndex: Number.isFinite(idx) ? idx : -1 };
                });
                const assignmentKey = assignmentId || `free:${course?.id || course?.slug || courseTitle || 'free-course'}`;
                await submitAttempt(assignmentKey, payloadAnswers);
                await gradeNow();
                markNotActive();
              } catch {
                alert('We had to lock the quiz due to too many app switches.');
              }
            })();
          } else {
            alert('Quiz locked due to too many app switches. Please submit or retry.');
          }
        }}
        onBumpSuspicion={(d) => bumpSuspicion(d)}
      />

      {/* Quiz */}
      {quiz?.questions?.length ? (
        <section className="panel p-4 relative">
          <div className="font-semibold text-darkText dark:text-white text-center">Quick quiz</div>

          {/* time banner */}
          <div
            className={`mt-1 text-xs px-2 py-1 rounded text-center ${
              isLocked ? 'bg-red-600/20 text-red-200' : 'bg-white/10 text-white/90'
            }`}
          >
            {hasTimer
              ? (isLocked ? 'Time up — quiz locked' : `Time left: ${fmtHMSms(remainingMsTicker)}`)
              : `Time elapsed: ${Math.floor(elapsedMs / 1000)}s`}
          </div>

          {/* Type + keypad toggle (centered) */}
          <div ref={keypadAnchorRef} className="mt-2 flex flex-col items-center gap-2">
            <div className="text-xs text-gray-600 dark:text-white/70">
              Answer type:&nbsp;<b>{enforcedQuizType === 'short' ? 'Short (typed)' : 'Multiple choice (MCQ)'}</b>
            </div>
            {enforcedQuizType === 'short' && !isLocked && (
              <button
                type="button"
                onClick={() => { setMathOpen((v) => !v); if (!userDraggedRef.current) positionKeypadAtHeaderCenter(); }}
                className="px-3 py-1.5 rounded-full text-sm bg-indigo-600 text-white hover:bg-indigo-500 shadow"
                title="Open math keypad"
                aria-expanded={mathOpen}
              >
                ∑ Math keypad
              </button>
            )}
          </div>

          <div className="text-xs text-gray-600 dark:text-white/60 mb-2 text-center">Answer all to submit.</div>

          <div className="space-y-4">
            {quiz.questions.map((q: any, idx: number) => {
              const qType = enforcedQuizType;
              return (
                <div
                  key={q.id}
                  className="rounded-xl bg-white ring-1 ring-gray-200 p-3 dark:bg-white/5 dark:ring-white/10"
                >
                  <div className="text-[15px] font-medium mb-2 text-darkText dark:text-white">
                    <span className="mr-1">{idx + 1}.</span>
                    <Markdown inline>{String(q.display || q.prompt || '')}</Markdown>
                  </div>

                  {qType === 'short' ? (
                    <div className="space-y-2">
                      <textarea
                        className={`input text-[15px] ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        data-qid={q.id}
                        rows={1}
                        value={String(workingAnswers[q.id] ?? '')}
                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                        onInput={(e) => autoGrow(e.currentTarget)}
                        onFocus={(e) => { lastShortInputRef.current = e.currentTarget; autoGrow(e.currentTarget); }}
                        onKeyDown={(e) => {
                          if (e.altKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); insertAtCursor('π'); }
                          if (e.altKey && e.key === '=') { e.preventDefault(); transformSelection(toSup); }
                          if (e.altKey && e.key === '-') { e.preventDefault(); transformSelection(toSub); }
                        }}
                        placeholder="Type your answer (press Enter for a new line)"
                        disabled={isLocked}
                        style={{ resize: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}
                        aria-label="Short answer"
                      />
                      {/* Admin-only solution reveal */}
                      {isAdmin && (
                        <details className="mt-1">
                          <summary className="text-[11px] cursor-pointer text-amber-700 dark:text-amber-300 select-none">
                            Admin: show answer
                          </summary>
                          <div className="text-[12px] mt-1 text-gray-700 dark:text-white/70">
                            {q.answer && <div><b>Answer:</b> {String(q.answer)}</div>}
                            {Array.isArray(q.accept) && q.accept.length > 0 && (
                              <div><b>Accept:</b> {q.accept.join(', ')}</div>
                            )}
                            {q.regex && <div><b>Regex:</b> <code>{String(q.regex)}</code></div>}
                            {q.explanation && <div className="mt-1"><b>Explanation:</b> {q.explanation}</div>}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.choices || []).map((c: string, i: number) => {
                        const isSelected = Number(workingAnswers[q.id]) === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswer(q.id, i)}
                            disabled={isLocked}
                            className={`text-left px-3 py-2.5 rounded-lg text-[15px] ring-1 transition
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

                  // push normalized answers to parent
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
                      // build payload answers (mcq + short)
                      const payloadAnswers = (quiz?.questions || []).map((q: any) => {
                        const v = workingAnswers[q.id];
                        if (enforcedQuizType === 'short') {
                          return { questionId: q.id, answerText: String(v ?? '').trim() };
                        }
                        const idx = typeof v === 'number' ? v : Number(v);
                        return { questionId: q.id, choiceIndex: Number.isFinite(idx) ? idx : -1 };
                      });

                      // submit attempt (org + non-org supported by hook)
                      try {
                        const assignmentKey = assignmentId || `free:${course?.id || course?.slug || courseTitle || 'free-course'}`;
                        await submitAttempt(assignmentKey, payloadAnswers);
                      } catch (e) {
                        console.error('submitAttempt failed', e);
                      }

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
                Score: <span className="font-semibold">{grade.scorePct}%</span> (Pass mark {grade.passMark}%)
              </span>
            )}
          </div>

          {/* Passed → Single source of truth: navigate to Results for claiming/generation */}
          {grade && grade.passed && !retakeMode && (
            <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 dark:bg-emerald-500/10 dark:ring-emerald-500">
              <div className="text-sm text-emerald-800 dark:text-emerald-200">
                🎉 Great job! You passed (≥ {grade.passMark}%).
              </div>
              <div className="mt-3">
                <button
                  className="btn bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => course?.id && onViewResults(course.id, courseTitle, grade)}
                  title="Open your Results & Documents page to claim & generate"
                >
                  Claim &amp; Generate
                </button>
              </div>
            </div>
          )}

          {/* Failed → Retry */}
          {grade && !grade.passed && !retakeMode && (
            <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 p-3 dark:bg-red-500/10 dark:ring-red-500">
              <div className="text-sm text-red-700 dark:text-red-200">
                You scored {grade.scorePct}%. Review the lesson and try again.
              </div>

              {/* Retry CTA (org flow) */}
              {isOrgFlow && assignmentId && (
                <div className="mt-3">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                    onClick={async () => {
                      if (!requireAuth('start_attempt', 'Please sign in to retry.')) return;
                      if (startingAttemptRef.current) return;
                      startingAttemptRef.current = true;
                      try {
                        const timerSecEff = (orgMeta?.timer_s ?? timerSec ?? 0) > 0 ? Number(orgMeta?.timer_s ?? timerSec) : 0;

                        // Start via hook (updates attempt/attemptId internally)
                        const att = await startAttempt({
                          assignmentId: assignmentId!,
                          timerSec: timerSecEff,
                          heartbeatSec: 15,
                          maxBackgrounds: 2,
                          maxSuspicion: 5,
                        });

                        const ms =
                          Number((att as any)?.remainingMs ?? 0) ||
                          (timerSecEff > 0 ? timerSecEff * 1000 : 0);
                        if (ms > 0) setLocalRemainingMs(ms);

                        setForceUnlock(true);
                        setRetakeMode(true);
                        setWorkingAnswers({});

                        markActive();

                        await generateQuizNow(
                          undefined,           // org lock decides size
                          undefined,
                          undefined,
                          undefined,
                          assignmentId,
                          desiredQuizType,
                          { lessonIndex: currentIdx }
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

              {/* Retry CTA (non-org flow) */}
              {!isOrgFlow && (
                <div className="mt-3">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
                    onClick={async () => {
                      setRetakeMode(true);
                      setWorkingAnswers({});
                      if (timerSec > 0) setLocalRemainingMs(displayTimerSec * 1000);
                      markActive();
                      await generateQuizNow(
                        displayQuestions,
                        undefined,
                        undefined,
                        undefined,
                        assignmentId,
                        desiredQuizType,
                        { lessonIndex: currentIdx }
                      );
                    }}
                  >
                    Retry quiz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---- Pinned, centered keypad overlay (draggable) ---- */}
          {mathOpen && enforcedQuizType === 'short' && !isLocked && (
            <div
              ref={overlayRef}
              className={`fixed z-50 max-w-[22rem] rounded-2xl ring-1 ring-gray-200 bg-white p-3 shadow-2xl
                          dark:bg-white/5 dark:ring-white/10 backdrop-blur ${overlayPos ? '' : 'bottom-20 right-4'}`}
              style={overlayPos ? { left: overlayPos.left, top: overlayPos.top } : undefined}
              role="dialog"
              aria-label="Math keypad"
            >
              {/* Drag handle + close */}
              <div
                className="text-sm font-semibold mb-2 text-darkText dark:text-white cursor-move select-none flex items-center justify-between"
                onMouseDown={(e) => { userDraggedRef.current = true; beginDrag(e.clientX, e.clientY); }}
                onTouchStart={(e) => { const t = e.touches[0]; userDraggedRef.current = true; beginDrag(t.clientX, t.clientY); }}
              >
                <span>Math keypad</span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setMathOpen(false)}
                  title="Close keypad"
                >
                  Close
                </button>
              </div>

              {/* Symbols grid */}
              <div className="grid grid-cols-8 gap-1 text-lg">
                {['π','×','÷','±','√','^','≤','≥','≈','∞','°','·','θ','α','β','γ','µ','∑','∫','≠','→','←','↔','∈','∉','∩','∪','∧','∨','⊂','⊆'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="px-2 py-1 rounded-md ring-1 ring-gray-200 bg-white hover:bg-gray-50
                               dark:bg-white/10 dark:ring-white/10 dark:hover:bg-white/20"
                    onClick={() => insertAtCursor(k)}
                    title={`Insert ${k}`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Sub/Sup actions */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="chip"
                  onClick={() => transformSelection(toSub)}
                  title="Convert selection to subscript digits/signs"
                >
                  Subscript (x₂)
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => transformSelection(toSup)}
                  title="Convert selection to superscript digits/signs"
                >
                  Superscript (x²)
                </button>
              </div>

              <div className="mt-2 text-[11px] text-gray-500 dark:text-white/60">
                Tip: click into your answer box, then tap a symbol. Shortcuts — Alt+P (π), Alt+= (superscript), Alt+- (subscript).
                Drag this panel by its header.
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Confirm modal */}
      {confirmInfo && (
        <QuizConfirmModal
          open={confirmOpen}
          lessons={confirmInfo.lessons}
          questions={confirmInfo.questions}
          timeLabel={confirmInfo.timeLabel}
          timerSec={confirmInfo.timerSec}
          elapsedMs={confirmInfo.elapsedMs}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            setConfirmOpen(false);

            if (isOrgFlow && assignmentId) {
              if (!requireAuth('start_attempt', 'Please sign in to start your attempt.')) return;
              if (startingAttemptRef.current) return;
              startingAttemptRef.current = true;
              try {
                const timerSecEff = (orgMeta?.timer_s ?? timerSec ?? 0) > 0 ? Number(orgMeta?.timer_s ?? timerSec) : 0;

                const att = await startAttempt({
                    assignmentId,
                    timerSec: timerSecEff,
                    heartbeatSec: 15,
                    maxBackgrounds: 2,
                    maxSuspicion: 5,
                  });

                  // prefer attempt’s server value; else fall back to effective display timer
                  const displayTimerSec = pickTimerSec(quiz?.timerSec, orgMeta?.timer_s, timerSec);
                  const remainingMs =
                    Number((att as any)?.remainingMs ?? 0) ||
                    (displayTimerSec > 0 ? displayTimerSec * 1000 : 0);

                  if (remainingMs > 0) setLocalRemainingMs(remainingMs);


                markActive();
                setForceUnlock(true);
              } catch (e) {
                console.warn('attempt start failed; using local timer fallback', e);
                if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
              } finally {
                startingAttemptRef.current = false;
              }
            } else if (timerSec > 0) {
              // non-org flow still gets a local timer
              setLocalRemainingMs(timerSec * 1000);
              markActive();
            }

            const desiredQuestions =
              (orgMeta?.quizSize ?? undefined) ??
              (safeQuiz ?? undefined) ??
              Number(confirmInfo.questions || 0);

            const numQArg = Math.max(3, Number(desiredQuestions || 0));

            console.log('[ui] desiredQuizType →', { org: orgMeta?.quizType, url: urlQuizTypeHint, final: desiredQuizType });

            await generateQuizNow(
              (isOrgFlow && assignmentId && Number.isFinite(orgMeta?.quizSize as any))
                ? undefined  // let backend enforce locked size
                : numQArg,   // otherwise, send our chosen number
              undefined,
              undefined,
              undefined,
              assignmentId,
              desiredQuizType,
              { lessonIndex: currentIdx }
            );
          }}
        />
      )}
    </>
  );
};

export default React.memo(LessonAndQuizPane);
