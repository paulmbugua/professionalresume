// apps/web/src/components/RobotTeacherLessonAndQuiz.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Markdown from '@/components/Markdown.web';
import ClassroomThemeShell from '@/components/ClassroomThemeShell';
import QuizConfirmModal from '@/components/QuizConfirmModal';
import PaymentWidget from './PaymentWidget.web';
import type { DbCourseSize, ProgramTrack, AICertificateIssuance } from '@mytutorapp/shared/types';
import { downloadCertificateFile, downloadTranscriptFile } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import AntiCheatGuard from '@/components/AntiCheatGuard.web';
import { useAttemptIntegrity } from '@mytutorapp/shared/hooks/useAttemptIntegrity';
import { getStableDeviceId } from '@mytutorapp/shared/utils/deviceId';

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

// Helper: pull a certId out of the API response/url
const extractCertId = (doc: any): string | null => {
  if (!doc) return null;
  const direct = doc?.certId || doc?.certificateId || doc?.id;
  if (typeof direct === 'string' && direct) return direct;

  const u = String(doc?.download_url || doc?.downloadUrl || doc?.url || '');
  const m =
    u.match(/\/certificates\/([^/]+)\/(?:download|view|raw)?/i) ||
    u.match(/[?&]certId=([^&]+)/i);
  return m?.[1] ?? null;
};

// ---- Quiz size helpers ----
const MIN_PER_LESSON = 4;

function isInt(n: unknown): boolean {
  return Number.isInteger(typeof n === 'string' ? Number(n) : n);
}

/** Minimum questions required given lesson granularity */
function minQuestionsFor(totalLessons: number, opts?: { lessonIndex?: number }) {
  const units = isInt(opts?.lessonIndex) ? 1 : Math.max(1, Number(totalLessons) || 0);
  return MIN_PER_LESSON * units;
}

/** Applies the min-per-lesson rule to any requested count */
function applyMinPerLesson(
  requested: number | undefined | null,
  totalLessons: number,
  opts?: { lessonIndex?: number }
) {
  const req = Number(requested ?? 0);
  const minQ = minQuestionsFor(totalLessons, opts);
  return Math.max(minQ, Number.isFinite(req) ? req : 0);
}


// normalize to 0–100 with 2dp (handles 0–1 too)
const toPct = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n > 0 && n <= 1 ? Math.round(n * 10000) / 100 : Math.round(n * 100) / 100;
};

function buildTranscriptSections(quiz: any, grade: any) {
  if (!quiz?.questions?.length) return [];
  const per = Array.isArray(grade?.perQuestion) ? grade.perQuestion : null;

  return [{
    sectionTitle: 'Quiz Scores',
    items: quiz.questions.map((q: any, i: number) => {
      // prefer per-question % if present, else boolean correct -> 100/0, else 0
      let s = 0;
      if (per && Number.isFinite(per[i]?.scorePct)) s = toPct(per[i].scorePct);
      else if (typeof per?.[i]?.correct === 'boolean') s = per[i].correct ? 100 : 0;
      else if (Array.isArray(grade?.correct) && typeof grade.correct[i] === 'boolean') s = grade.correct[i] ? 100 : 0;

      const label = String(q.display || q.prompt || `Question ${i + 1}`);
      return { label, scorePct: s };
    }),
  }];
}

function logFew<T>(arr: T[] | null | undefined, n = 8): T[] {
  return Array.isArray(arr) ? arr.slice(0, n) : [];
}

// Helper: pull a transcript id out of the API response/url
const extractTranscriptId = (doc: any): string | null => {
  if (!doc) return null;
  const direct = doc?.transcriptId || doc?.id;
  if (typeof direct === 'string' && direct) return direct;
  const u = String(doc?.download_url || doc?.url || '');
  const m = u.match(/\/transcripts\/([^/]+)\/(?:download|view|raw)?/i);
  return m?.[1] ?? null;
};

const slug = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'certificate';

type RequestStartArgs = { runId?: string } | void;

interface LessonAndQuizProps {
  compactPlayer: boolean;
  showCourseList: boolean;
  onPlayerReady?: () => void;
  // classroom
  displaySsml: string;
  onNext?: () => Promise<boolean> | boolean;
  onPrev?: () => Promise<boolean> | boolean;
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
  claim: (code: string, courseId?: string | null) => Promise<AICertificateIssuance>;

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
  /** Admins can reveal short-answer solutions; learners cannot */
  isAdmin?: boolean;
}

const LessonAndQuizPane: React.FC<LessonAndQuizProps> = ({
  compactPlayer,
  showCourseList,
  displaySsml,
  lessonsArr,
  onPlayerReady,
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
  onPrev,
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
  // allAnswered,
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
  currentIdx,
}) => {
  const { tokens = 0, refreshUserDetails } = useShopContext();

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
    attempt, attemptId,
    deviceId: boundDeviceId, bindDeviceId,
    quizActive, markActive, markNotActive,
    elapsedMs, backgrounds, suspicions,
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

  // elapsed wall-clock since quiz loaded
  const [forceUnlock, setForceUnlock] = useState(false);

  // keypad overlay
  const [mathOpen, setMathOpen] = useState(false);
  const [overlayPos, setOverlayPos] = useState<{ left: number; top: number } | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<boolean>(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const keypadAnchorRef = useRef<HTMLDivElement | null>(null); // header/toolbar area
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
    } catch { return undefined; }
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

  // ---------- PERSISTENT CERTIFICATE (localStorage) ----------
  const lsKey = React.useMemo(() => (course?.id ? `cert:last:${course.id}` : null), [course?.id]);
  const [persistedCert, setPersistedCert] = useState<{
    certUrl?: string | null;
    downUrl?: string | null;
    certId?: string | null;
    courseId?: string | null;
    courseTitle?: string | null;
    ts?: number;
  } | null>(null);

  // Debug snapshot for router
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

  useEffect(() => {
    hasSignaledReadyRef.current = false;
  }, [activeRunId]);

  // load from localStorage on mount
  useEffect(() => {
    if (!lsKey) return;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) setPersistedCert(JSON.parse(raw));
    } catch {}
  }, [lsKey]);

  // after persistedCert is loaded
  useEffect(() => {
    if (!token || !persistedCert) return;
    if (!certUrl && persistedCert.certUrl) setCertUrl(persistedCert.certUrl);
    if (!downUrl && persistedCert.downUrl) setDownUrl(persistedCert.downUrl);
  }, [token, persistedCert, certUrl, downUrl, setCertUrl, setDownUrl]);

  // save to localStorage whenever we have a new certUrl/downUrl
  useEffect(() => {
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
      localStorage.setItem(lsKey, JSON.stringify(payload));
    } catch {}
  }, [lsKey, certUrl, downUrl, course?.id, courseTitle]);

  // optional: allow hiding the pill (but keep it restorable on next mount)
  const [hideCertPill, setHideCertPill] = useState(false);

  // Payment state:
  // - certPaid: standard OR extended (unlocks certificate)
  // - extendedPaid: extended only (unlocks transcript too)
  const [certPaid, setCertPaid] = useState(false);
  const [extendedPaid, setExtendedPaid] = useState(false);

  const anyAffordable = React.useMemo(() => {
    return (skus || []).some((sku) => {
      const price = Number(sku?.price_tokens ?? sku?.priceTokens ?? sku?.price ?? 0);
      return (Number(tokens) || 0) >= price;
    });
  }, [skus, tokens]);

  const api = React.useCallback(async function <T = any>(path: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (r.status === 204) return null as any;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e: any = new Error((data as any)?.error || `Request failed: ${r.status}`);
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }, [backendUrl, token]);

  // Helpers to recognise SKU tier
  function looksExtendedSku(sku: any): boolean {
  const s = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');
  const title = s(sku?.title);
  const code  = s(sku?.code);
  const tier  = s(sku?.tier || sku?.plan || sku?.level || sku?.kind);
  const tags  = Array.isArray(sku?.tags) ? sku.tags.map(s) : [];
  // match extended intent broadly
  return (
    tier.includes('extended') ||
    title.includes('extended') ||
    title.includes('transcript') ||
    /\b(ext|extended|xtra|plus)\b/.test(code) ||
    tags.includes('extended') || tags.includes('transcript')
  );
}

const extendedKey = React.useMemo(
  () => (course?.id ? `transcript:extended:${course.id}` : null),
  [course?.id]
);

const setLocalExtended = React.useCallback((on: boolean) => {
  if (!extendedKey) return;
  try {
    if (on) localStorage.setItem(extendedKey, '1');
    else localStorage.removeItem(extendedKey);
  } catch {}
}, [extendedKey]);


  // Centralised post-generate handler (auto-download + state flags)
  const handleGeneratedCert = React.useCallback(async (doc: any, assumeExtended: boolean) => {
    if (!doc) return;
    setCertUrl(doc?.url ?? null);
    const anyUrl = doc?.download_url ?? doc?.downloadUrl ?? doc?.url ?? null;
    setDownUrl(anyUrl);

    // mark paid state immediately for responsive UI
     setCertPaid(true);
      if (assumeExtended) {
        setExtendedPaid(true);
        setLocalExtended(true);               // <= ADD THIS
      }

    // try authenticated download first
    const certId = extractCertId(doc);
    const fileName = `${slug(courseTitle)}-${certId || 'certificate'}.pdf`;
    if (certId) {
      try {
        await downloadCertificateFile(backendUrl, token, certId, fileName);
      } catch (e) {
        console.error('[download] direct failed, fallback', e);
        if (anyUrl) window.location.href = anyUrl;
      }
    } else if (anyUrl) {
      // same-tab navigation as softer fallback
      window.location.href = anyUrl;
    } else {
      alert('Certificate generated, but no download link was returned.');
    }

    // refresh balances and derive server-side entitlements
    try { await refreshUserDetails(); } catch {}
    try { await checkPaymentStatus(); } catch {}
  }, [backendUrl, token, courseTitle, refreshUserDetails]);

  // Manual re-download
  const downloadCertificateNow = React.useCallback(async () => {
    if (!requireAuth('download_certificate', 'Please sign in to download your certificate.')) return;
    const certId = extractCertId({ url: downUrl }) || (persistedCert?.certId ?? null);
    const fileName = `${slug(courseTitle)}-${certId || 'certificate'}.pdf`;
    if (certId) {
      try {
        await downloadCertificateFile(backendUrl, token, certId, fileName);
        return;
      } catch (e) {
        console.error('[redownload] direct failed, fallback', e);
      }
    }
    if (downUrl) {
      window.location.href = downUrl;
    } else if (certUrl) {
      window.open(certUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('No certificate available yet.');
    }
  }, [backendUrl, token, downUrl, certUrl, persistedCert?.certId, courseTitle, requireAuth]);
const downloadTranscript = React.useCallback(async () => {
  if (!requireAuth('download_transcript', 'Please sign in to download your transcript.')) return;

  // Org: always allowed. Non-org: Extended required.
  if (!isOrgFlowFlag && !extendedPaid) {
    setPaymentOpen(true);
    return;
  }

  const courseId = course?.id;
  if (!courseId) { alert('Missing course ID.'); return; }

  try {
    // Build payload (server still computes if these are omitted)
    const payload: any = { courseId };

    // Prefer client-computed results when available
    if (Number.isFinite((grade as any)?.scorePct)) payload.overallPct = Number(grade.scorePct);
    if (Number.isFinite((grade as any)?.passMark)) payload.passMark   = Number(grade.passMark);

    // If you already added buildTranscriptSections/toPct earlier, you can include detailed sections:
    // const sections = buildTranscriptSections(quiz, grade);
    // if (sections.length) payload.sections = sections;
    // Include actual outline names so the PDF can list them
     if (Array.isArray(outline) && outline.length) {
   payload.lessonsLearnt = outline
     .map((s: any) => String(s?.title || '').trim())
     .filter(Boolean);
 }

    // ── DEBUG: outbound payload
    console.groupCollapsed('%c[transcript] client → /api/transcripts/generate', 'color:#0ea5e9');
    console.log('endpoint:', `${backendUrl}/api/transcripts/generate`);
    console.log('payload:', payload);
    console.log('derived from grade:', {
      gradeScorePct: grade?.scorePct,
      gradePassMark: grade?.passMark,
      hasSections: Array.isArray(payload.sections),
      sectionsCount: Array.isArray(payload.sections?.[0]?.items) ? payload.sections[0].items.length : 0,
    });
    if (Array.isArray(payload.sections?.[0]?.items)) {
      console.table(logFew(payload.sections[0].items).map((it: any, i: number) => ({
        '#': i + 1,
        label: String(it.label).slice(0, 80),
        scorePct: it.scorePct,
      })));
      if (payload.sections[0].items.length > 8) {
        console.log(`…and ${payload.sections[0].items.length - 8} more items`);
      }
    }
    

    console.groupEnd();

    const t: any = await api(`/api/transcripts/generate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // ── DEBUG: server response
    console.groupCollapsed('%c[transcript] server ← /api/transcripts/generate', 'color:#10b981');
    console.log('response:', t);
    const trId = extractTranscriptId(t);
    const anyUrl = t?.download_url ?? t?.url ?? null;
    console.log('parsed:', { trId, download_url: anyUrl });
    console.groupEnd();

    const fileName = `${slug(courseTitle || 'transcript')}-${(trId || 'transcript')}.pdf`;
    if (trId) {
      await downloadTranscriptFile(backendUrl, token, trId, fileName);
    } else if (anyUrl) {
      window.location.href = anyUrl;
    } else {
      alert('Transcript generated, but no download link was returned.');
    }
  } catch (e: any) {
    console.groupCollapsed('%c[transcript] generate/download failed', 'color:#ef4444');
    console.error(e);
    console.groupEnd();

    if (e?.status === 402 || e?.data?.error === 'CERT_PAYMENT_REQUIRED' || e?.data?.error === 'EXTENDED_REQUIRED') {
      alert('You need the Extended certificate to download a transcript. If you just bought it, please refresh this page.');
      setPaymentOpen(true);
      return;
    }
    alert('Could not generate/download transcript. Please try again from the Results page.');
  }
}, [api, course?.id, isOrgFlowFlag, extendedPaid, requireAuth, setPaymentOpen, backendUrl, token, courseTitle, quiz, grade]);


  const onRequestStartGuarded = React.useCallback(
    async (args?: RequestStartArgs) => {
      const runId =
        args && typeof args === 'object' && 'runId' in args
          ? (args as any).runId ?? null
          : null;
      setActiveRunId(runId);
      try {
        setPreparing(true);
        await onStart?.();
      } finally {
        setPreparing(false);
      }
    },
    [onStart]
  );

  // Check if the user has paid for this course's certificate
  const checkPaymentStatus = React.useCallback(async () => {
    try {
      const courseId = course?.id;
      if (!courseId) { setCertPaid(false); setExtendedPaid(false); return; }

      const s = await api<any>(`/api/certificates/status?courseId=${encodeURIComponent(courseId)}`).catch(() => null);

      const tier = typeof s?.tier === 'string' ? s.tier.toLowerCase() : null;
      const hasExtended =
        s?.extended === true || s?.canTranscript === true || tier === 'extended';

      const hasAnyCert =
        hasExtended || s?.paid === true || s?.hasCertificate === true || s?.canCertificate === true || tier === 'standard';

      const localExt = extendedKey ? localStorage.getItem(extendedKey) === '1' : false;

      setCertPaid(Boolean(hasAnyCert || downUrl));
      setExtendedPaid(prev => Boolean(prev || isOrgFlowFlag || hasExtended || localExt));
    } catch {
      // fallback: keep any optimistic state + org coverage
      setCertPaid(Boolean(downUrl));
      setExtendedPaid(prev => Boolean(prev || isOrgFlowFlag));
    }
  }, [api, course?.id, downUrl, isOrgFlowFlag, extendedKey]);


  // Initial + course-change checks
  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  // Re-check after the payment panel closes
  const prevPaymentOpenRef = useRef(paymentOpen);
  useEffect(() => {
    if (prevPaymentOpenRef.current && !paymentOpen) {
      checkPaymentStatus();
    }
    prevPaymentOpenRef.current = paymentOpen;
  }, [paymentOpen, checkPaymentStatus]);

  // -----------------------------------------------------------
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

  useEffect(() => {
    const ts = Number(quiz?.timerSec);
    if (Number.isFinite(ts) && ts > 0) {
      setLocalRemainingMs(ts * 1000);
      if (!quizActive) markActive(); // make sure elapsedMs starts
    }
  }, [quiz?.timerSec, markActive, quizActive, setLocalRemainingMs]);

  // Modal display values (prefer org-locked)
  const displayLessons = orgMeta?.totalLessons ?? safeLessons ?? outline?.length ?? 0;
  const requestedQForDisplay = Number(orgMeta?.quizSize ?? safeQuiz ?? 0);
  const displayQuestions = applyMinPerLesson(requestedQForDisplay, displayLessons);
  const displayTimerSec = Number(quiz?.timerSec) || (orgMeta?.timer_s ?? timerSec ?? 0);
  const hasTimer = displayTimerSec > 0;
  // Non-org: did the user manually set lesson count?
  const manualLessonsSelected = React.useMemo(
    () => !isOrgFlow && Number.isFinite(Number(safeLessons)) && Number(safeLessons) > 0,
    [isOrgFlow, safeLessons]
  );

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

  // What we *ask* the generator to create if we haven't got orgMeta yet
  const desiredQuizType: 'mcq' | 'short' = orgMeta?.quizType ?? urlQuizTypeHint ?? 'mcq';

  const isLoggedIn = Boolean(token);
  const hasPersistedCert = Boolean(persistedCert?.certUrl || persistedCert?.downUrl);
  const canSeeCertPanel = isLoggedIn && !retakeMode && (
    Boolean(grade?.passed) || hasPersistedCert || certPaid
  );
  const hasTranscriptAccess = Boolean(isOrgFlowFlag || extendedPaid);
  const hasCertificateDoc = Boolean(certUrl || downUrl || persistedCert?.certUrl || persistedCert?.downUrl);

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
    } catch { /* ignore */ }
  }, [quiz, enforcedQuizType]);

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
  const SUBS: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋' };
  const SUPS: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻' };
  function toSub(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUBS[m] || m); }
  function toSup(s: string) { return s.replace(/[0-9+\-]/g, (m) => SUPS[m] || m); }

  // Normalize 'quizType' from any raw value
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
    const end   = (input as any).selectionEnd ?? input.value.length;
    const next  = input.value.slice(0, start) + text + input.value.slice(end);
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
    const end   = (input as any).selectionEnd ?? 0;
    if (start === end) {
      const next = transformer(input.value);
      (input as any).value = next;
      handleAnswer(qid, next);
      return;
    }
    const sel   = input.value.slice(start, end);
    const rep   = transformer(sel);
    const next  = input.value.slice(0, start) + rep + input.value.slice(end);
    const delta = rep.length - sel.length;
    (input as any).value = next;
    (input as any).setSelectionRange?.(start, end + delta);
    handleAnswer(qid, next);
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    const max = 320;
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
    const top  = clamp(r.top + r.height + 8,            M, Math.max(M, window.innerHeight - H - M));
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
        const top  = clamp(overlayPos.top,  M, Math.max(M, window.innerHeight - h - M));
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
    const top  = overlayPos ? overlayPos.top  : rect.top;
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
    const nextTop  = clamp(dragStartRef.current.top  + dy, M, Math.max(M, window.innerHeight - h - M));
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
            playing
            playJoinedIfAvailable={hasJoined}
            onBeforePlay={guardedBeforePlay}
            onEnded={onEnded}
            onNext={onNext}
            onPrev={onPrev}
            activeIndex={currentIdx}
            isBuildingNext={isBuildingNext}
            themeOpen={themeOpen}
            plannedCount={safeLessons}
            onThemeOpenChange={onThemeOpenChange}
            showFloatingThemeButton={false}
            onRequestStart={async (args?: RequestStartArgs) => {
              if (preparing || (displaySsml && displaySsml.trim()) || (lessonsArr?.length ?? 0) > 0) {
                return;
              }
              await onRequestStartGuarded(args);
            }}
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
          timerSec: Number(quiz?.timerSec) || (orgMeta?.timer_s ?? timerSec ?? 0),
        }}
        onTooManyBackgrounds={() => {
          if (shownLockAlertRef.current) return;
          shownLockAlertRef.current = true;
          if (canSubmit) {
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
                  try {
                    const qt = enforcedQuizType;
                    if (quiz && (quiz as any).quizType !== 'mcq' && (quiz as any).quizType !== 'short') {
                      (quiz as any).quizType = qt;
                    }
                    if (quiz?.questions) {
                      (quiz as any).questions = quiz.questions.map((q: any) => ({ ...q, type: qt }));
                    }
                  } catch {}
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

          {canSeeCertPanel && (
            <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 dark:bg-emerald-500/10 dark:ring-emerald-500">
              <div className="text-sm text-emerald-800 dark:text-emerald-200">
                {grade?.passed
                  ? <>🎉 Great job! You passed (≥ {grade.passMark}%).</>
                  : hasPersistedCert
                    ? <>🎓 You’ve already generated a certificate for this course.</>
                    : <>🎓 Certificate actions</>}
              </div>

              {isOrgFlowFlag ? (
                <>
                  <div className="mt-2 text-xs text-gray-600 dark:text-white/70">
                    Covered by your organization — no payment needed.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const sku = (skus && skus[0]) || null;
                          if (sku) {
                            try { await claim(sku.code,course?.id); } catch { /* ignore claim error */ }
                          }
                          const doc: any =
                            (await tryGenerateCertificate().catch(() => null)) ||
                            (await generateAICert().catch(() => null));
                          await handleGeneratedCert(doc, /*assumeExtended*/ true);
                        } catch (e) {
                          console.error('[org] manual issue failed', e);
                        }
                      }}
                      className="btn bg-emerald-600 hover:bg-emerald-500"
                    >
                      Generate Certificate
                    </button>

                    {(certUrl || downUrl) && (
                      <div className="mt-2 flex gap-2">
                        {certUrl && (
                          <a href={certUrl} target="_blank" rel="noreferrer" className="chip">
                            View certificate
                          </a>
                        )}
                        <button
                            className={`chip ${hasCertificateDoc ? '' : 'opacity-50 cursor-not-allowed'}`}
                            onClick={downloadCertificateNow}
                            disabled={!hasCertificateDoc}
                            title={hasCertificateDoc ? 'Download your certificate' : 'Generate your certificate first'}
                          >
                            Download certificate
                          </button>
                        <button
                          className="btn bg-indigo-600 hover:bg-indigo-500"
                          onClick={downloadTranscript}
                          type="button"
                        >
                          Download Transcript
                        </button>
                      </div>
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
                      Certificates require payment. <b>Extended</b> includes a downloadable transcript.
                    </div>
                    {aiCertLoading && <div className="text-xs text-gray-500">Loading certificate options…</div>}
                    {aiCertError && <div className="text-xs text-red-600">{aiCertError}</div>}
                    {aiCertMsg && <div className="text-xs text-emerald-700 dark:text-emerald-300">{aiCertMsg}</div>}

                    {/* Balance */}
                    <div className="text-[11px] text-gray-600 dark:text-white/70">
                      Your balance: <b>{Number(tokens) || 0}</b> tokens
                    </div>

                    <div className="space-y-2">
                      {(skus || []).map((sku) => {
                        const price = Number(sku?.price_tokens ?? sku?.priceTokens ?? sku?.price ?? 0);
                        const hasEnoughTokens = (Number(tokens) || 0) >= price;
                        const canClaimNow = Boolean(grade?.passed) && hasEnoughTokens; // pass + enough tokens
                        const isExtended = looksExtendedSku(sku);

                        return (
                          <div
                            key={sku.code}
                            className="flex items-center justify-between rounded-lg ring-1 ring-gray-200 dark:ring-white/10 p-2 bg-white dark:bg-white/5"
                          >
                            <div>
                              <div className="text-sm font-medium">{sku.title}</div>
                              <div className="text-[11px] text-gray-600 dark:text-white/60">{sku.code}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{price} Tokens</span>

                              <button
                                disabled={!canClaimNow}
                                title={
                                  !grade?.passed
                                    ? 'Pass the quiz first'
                                    : !hasEnoughTokens
                                      ? 'Not enough tokens'
                                      : 'Claim & generate'
                                }
                                onClick={async () => {
                                  if (!token || !canClaimNow) return;
                                  try {
                                    await claim(sku.code, course?.id);
                                    const doc: any = await generateAICert();
                                    // Immediately reflect the purchase in UI
                                    setCertPaid(true);
                                    if (isExtended) {
                                      setExtendedPaid(true);
                                      setLocalExtended(true);             // <= ADD THIS
                                    }
                                    await handleGeneratedCert(doc, /*assumeExtended*/ isExtended);
                                  } catch (e) {
                                    console.error('[tokens] claim/generate failed', e);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded text-sm text-white ${
                                  canClaimNow ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/50 cursor-not-allowed'
                                }`}
                              >
                                Claim &amp; Generate
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top-up nudge if the cheapest SKU isn’t affordable */}
                    {(skus?.length ?? 0) > 0 &&
                      (Number(tokens) || 0) < Number(skus?.[0]?.price_tokens ?? skus?.[0]?.priceTokens ?? skus?.[0]?.price ?? 0) && (
                      <div className="mt-2">
                        <div className="text-[11px] text-gray-600 dark:text-white/70">
                          Not enough tokens? <b>Top up and try again.</b>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => setPaymentOpen(true)} className="btn bg-indigo-600 hover:bg-indigo-500">
                            Buy tokens
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-white/60">
                    Prefer paying with card or PayPal/M-Pesa?
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <button onClick={() => setPaymentOpen(true)} className="btn bg-indigo-600 hover:bg-indigo-500">
                      Pay with PayPal / M-Pesa
                    </button>

                    {certUrl && (
                      <a href={certUrl} target="_blank" rel="noreferrer" className="chip">
                        View certificate
                      </a>
                    )}

                   <button
                      className={`chip ${hasCertificateDoc ? '' : 'opacity-50 cursor-not-allowed'}`}
                      onClick={downloadCertificateNow}
                      disabled={!hasCertificateDoc}
                      title={hasCertificateDoc ? 'Download your certificate' : 'Generate your certificate first'}
                    >
                      Download certificate
                    </button>

                    <button
                      className={`btn ${hasTranscriptAccess ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'}`}
                      onClick={downloadTranscript}
                      disabled={!hasTranscriptAccess}
                      title={hasTranscriptAccess ? 'Download your transcript' : 'Buy the Extended certificate to unlock transcripts'}
                      type="button"
                    >
                      Download Transcript
                    </button>

                  </div>

                  {!certUrl && (
                    <p className="text-[12px] text-gray-600 dark:text-white/70 mt-2">
                      Once payment completes (tokens or fiat), you can generate your certificate instantly.
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
                        const att = await startAttempt({
                          assignmentId: assignmentId!,
                          timerSec: timerSecEff,
                          heartbeatSec: 15,
                          maxBackgrounds: 2,
                          maxSuspicion: 5,
                        });
                        const ms =
                          Number(att?.remainingMs ?? 0) ||
                          (timerSecEff > 0 ? timerSecEff * 1000 : 0);
                        if (ms > 0) setLocalRemainingMs(ms);
                        setForceUnlock(true);
                        setRetakeMode(true);
                        setWorkingAnswers({});
                        markActive();
                        await generateQuizNow(
                          undefined,
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
                        const minOptsRetry = manualLessonsSelected ? {} : { lessonIndex: currentIdx };
                      const retryQ = applyMinPerLesson(displayQuestions, displayLessons, minOptsRetry);
                      await generateQuizNow(
                        retryQ,
                        undefined,
                        undefined,                        
                        manualLessonsSelected ? Number(safeLessons) : undefined,
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

      {/* Confirm modal + payment widget */}
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

                const ms = (att?.remainingMs ?? 0) || (timerSecEff > 0 ? timerSecEff * 1000 : 0);
                if (ms > 0) setLocalRemainingMs(ms);

                markActive();
                setForceUnlock(true);
              } catch (e) {
                console.warn('attempt start failed; using local timer fallback', e);
                if (timerSec > 0) setLocalRemainingMs(timerSec * 1000);
              } finally {
                startingAttemptRef.current = false;
              }
            } else if (timerSec > 0) {
              setLocalRemainingMs(timerSec * 1000);
              markActive();
            }

            // Compute desired (apply min; use single-lesson min when lessonIndex is present)
            const desiredRequested =
              (orgMeta?.quizSize ?? undefined) ??
              (safeQuiz ?? undefined) ??
              Number(confirmInfo.questions || 0);

             // Non-org + manual lessons: enforce min = 4 * safeLessons (ignore lessonIndex for min)
            const minOpts = manualLessonsSelected ? {} : { lessonIndex: currentIdx };
            const desiredQ = applyMinPerLesson(
              Number(desiredRequested || 0),
             displayLessons,
              minOpts
            );

            // Respect org-locked size by not overriding it
            const passNumQ =
              (isOrgFlow && assignmentId && Number.isFinite(orgMeta?.quizSize))
                ? undefined
                : desiredQ;
                 const passTotalLessons = manualLessonsSelected ? Number(safeLessons) : undefined;

            await generateQuizNow(
              passNumQ,
              undefined,             // courseSize
              undefined,             // programTrack
              passTotalLessons,
              assignmentId,
              desiredQuizType,
              { lessonIndex: currentIdx }
            );

          }}
        />
      )}

      {!isOrgFlowFlag && (
        <PaymentWidget
          isOpen={paymentOpen}
          onClose={async () => {
            setPaymentOpen(false);
            try { await refreshUserDetails(); } catch {}
            try { await checkPaymentStatus(); } catch {}
          }}
          title="Unlock Certificate"
          showTutorPreview={false}
        />
      )}
    </>
  );
};

export default React.memo(LessonAndQuizPane)