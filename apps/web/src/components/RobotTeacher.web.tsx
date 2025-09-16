/* eslint-disable no-console */
/* apps/web/src/components/RobotTeacher.web.tsx */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrgAssignment } from '@mytutorapp/shared/hooks/useOrgAssignment';
import { useAiCourse } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context';
import { useAICertificates } from '@mytutorapp/shared/hooks';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';
import OrgShareDialog from '@/components/org/OrgShareDialog';

import ControlsPanel from './RobotTeacherControls';
import LessonAndQuizPane from './RobotTeacherLessonAndQuiz';

import type { TopCourse } from '@mytutorapp/shared/types';

const dbgEnabled = () => {
  if (typeof window === 'undefined') return false;
  const qs = new URLSearchParams(window.location.search);
  if (qs.has('dbg') || qs.get('debug') === '1') return true;
  return (
    localStorage.getItem('DBG_SHARE') === '1' ||
    localStorage.getItem('DBG_AI') === '1'
  );
};

export const dlog = (...args: any[]) => {
  if (dbgEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[RobotTeacher]', ...args);
  }
};

type RobotTeacherProps = {
  defaultVoice?: string;
  initialSsml?: string;
  voiceName?: string;
  themeOpen?: boolean;
  onThemeOpenChange?: (open: boolean) => void;
};

const PRESETS = [
  { key: 'quick', label: 'Quick', min: 10 },
  { key: 'standard', label: 'Standard', min: 20 },
  { key: 'extended', label: 'Extended', min: 30 },
  { key: 'intensive', label: 'Intensive', min: 45 },
  { key: 'marathon', label: 'Marathon', min: 60 },
] as const;
export type SizePresetKey = (typeof PRESETS)[number]['key'];

const TRACKS = [
  { key: 'module', label: 'Module', lessons: 8 },
  { key: 'certificate', label: 'Certificate', lessons: 12 },
  { key: 'diploma', label: 'Diploma', lessons: 18 },
  { key: 'degree', label: 'Degree', lessons: 24 },
] as const;
export type TrackKey = (typeof TRACKS)[number]['key'];

const sizeToCourseSize: Record<
  SizePresetKey,
  'mini' | 'standard' | 'extended' | 'deep_dive' | 'bootcamp'
> = {
  quick: 'mini',
  standard: 'standard',
  extended: 'extended',
  intensive: 'deep_dive',
  marathon: 'bootcamp',
};

function getCourseBlurb(c: TopCourse): string {
  const maybe = (c as unknown as Record<string, unknown>)['description'];
  return typeof maybe === 'string' && maybe.trim() ? (maybe as string) : c.blurb;
}

/* Minimal course list (unchanged styling & behavior) */
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
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="input !py-2 !px-3 text-sm"
        />
        <button onClick={onRefresh} className="chip" title="Reload list">
          Refresh
        </button>
        <button
          onClick={onLoadMore}
          disabled={!hasMore}
          className={`chip ${hasMore ? 'chip-active' : ''}`}
          title="Load more courses"
        >
          {hasMore ? 'Load more' : 'All loaded'}
        </button>
      </div>

      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
        {visible.length ? (
          visible.map((l, i) => {
            const active = l.id === activeId;
            return (
              <button
                key={l.id}
                onClick={() => onSelect(l.id)}
                className={`chip ${active ? 'chip-active' : ''} whitespace-nowrap`}
                title={l.blurb || l.title}
              >
                {String(i + 1).padStart(2, '0')} • {l.title}
              </button>
            );
          })
        ) : (
          <span className="text-sm text-gray-500 dark:text-white/60">No courses found.</span>
        )}
      </div>

      <div className="hidden md:block">
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {visible.length ? (
            visible.map((l, i) => {
              const active = l.id === activeId;
              return (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition
                  ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-600/40 dark:text-white dark:ring-indigo-500'
                      : 'bg-white ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:ring-white/10 dark:text-white/90 dark:hover:bg-white/10'
                  }`}
                  title={l.blurb || l.title}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-white/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{l.title}</span>
                  </div>
                  {l.blurb ? (
                    <div className="text-[11px] text-gray-500 dark:text-white/60 line-clamp-2 mt-0.5">
                      {l.blurb}
                    </div>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="text-sm text-gray-500 dark:text-white/60">No courses found. Try another search.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const RobotTeacher: React.FC<RobotTeacherProps> = ({
  defaultVoice = 'en-US-JennyNeural',
  initialSsml = '',
  voiceName,
  themeOpen: themeOpenProp,
  onThemeOpenChange,
}) => {
  const compactPlayer = true;
  const navigate = useNavigate();
  const location = useLocation();
  const sp = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const normQt = (v?: string | null): 'mcq' | 'short' | undefined => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'short' ? 'short' : s === 'mcq' ? 'mcq' : undefined;
};
const urlQuizTypeHint = normQt(sp.get('qt'));


  // ── Query params ─────────────────────────────────────────
  const assignmentIdParam = sp.get('assignmentId'); // string | null
  const courseIdParam     = sp.get('courseId');     // string | null

  // Unconditional mount ping
  useEffect(() => {
    console.log('[RobotTeacher] mounted', { DBG_ENABLED: dbgEnabled() });
  }, []);

  useEffect(() => {
    const prevX = document.body.style.overflowX;
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = prevX;
    };
  }, []);

  const [isMaximized, setIsMaximized] = useState(false);
   const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
  const prev = document.body.style.overflow;
  const shouldLock = isMaximized && !shareOpen; // ⬅️ don't lock when the dialog is open
  if (shouldLock) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = ''; // allow normal page scrollbar
  }
  return () => {
    document.body.style.overflow = prev;
  };
}, [isMaximized, shareOpen]);

  const effectiveVoice = voiceName || defaultVoice;
  const { backendUrl, token, role: globalRole } = useShopContext();
  const isGlobalAdmin = globalRole === 'admin' || globalRole === 'superadmin';

  const [internalThemeOpen, setInternalThemeOpen] = useState(false);
  const isThemeControlled = typeof themeOpenProp === 'boolean';
  const themeOpen = isThemeControlled ? (themeOpenProp as boolean) : internalThemeOpen;
  const setThemeOpen = (next: boolean | ((s: boolean) => boolean)) => {
    const v = typeof next === 'function' ? (next as (s: boolean) => boolean)(themeOpen) : next;
    if (!isThemeControlled) setInternalThemeOpen(v);
    onThemeOpenChange?.(v);
  };

  const ai = useAiCourse(backendUrl, token || undefined, {
  urlQuizTypeHint,        // from ?qt=...
  defaultQuizType: 'mcq', // fallback if nothing else is set
  // orgQuizType: ...     // optional; see note below
});

  const {
    topCourses,
    selectedCourse,
    outline,
    lessons,
    ssml,
    joinedSsml,
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
    nextLesson,
    hasNextLesson,
    clearSelectedCourseCacheNow,
    clearTopCoursesCacheNow,
  } = ai;

  const { skus, loading: aiCertLoading, error: aiCertError, message: aiCertMsg, claim, generate: generateAICert } =
    useAICertificates({ backendUrl, token: token || '', courseId: selectedCourse?.id });

  // org assignment context (ONLY declare once)
  const orgAssign = useOrgAssignment();
  const assignmentId = orgAssign?.assignmentId ?? undefined;
  const isOrgFlow = Boolean(orgAssign?.assignmentId);

  // class & content knobs
  const [classLevel, setClassLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [sizePreset, setSizePreset] = useState<SizePresetKey>('standard');
  const [minutes, setMinutes] = useState<number>(20);
  const [totalLessons, setTotalLessons] = useState<number>(8);
  const [quizCount, setQuizCount] = useState<number>(16);
  const [programTrack, setProgramTrack] = useState<TrackKey>('module');
  const [customTitle, setCustomTitle] = useState('');


  // NEW: timer kept in parent for authoritative locking
  const [localRemainingMs, setLocalRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (localRemainingMs == null || localRemainingMs <= 0) return;
    const id = window.setInterval(() => {
      setLocalRemainingMs(ms => (ms == null ? null : Math.max(0, ms - 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [localRemainingMs]);

  const timerSec =
    Number(
      (orgAssign as any)?.timerS ??
      (orgAssign as any)?.timerSec ??
      (orgAssign as any)?.timer_s ??
      (orgAssign as any)?.lockedConfig?.timer_s ??
      0
    ) || 0;

  const displayRemainingMs =
    (orgAssign?.remainingMs ?? 0) > 0 ? (orgAssign?.remainingMs as number) :
    (localRemainingMs ?? 0);

  // Misc flags
  type MaybeCompat = {
    hasMoreCourses?: boolean;
    coursesHasMore?: boolean;
    hasMore?: boolean;
    coursesCursor?: string | null;
    nextCursor?: string | null;
    degradedNotice?: { degraded?: boolean } | null;
  };
  const compat = ai as unknown as MaybeCompat;
  const hasMoreCourses: boolean = Boolean(compat?.hasMoreCourses ?? compat?.coursesHasMore ?? compat?.hasMore);
  const coursesCursor: string | null = compat?.coursesCursor ?? compat?.nextCursor ?? null;
  const degraded: boolean = Boolean(
    (ai as { degradedNotice?: { degraded?: boolean } | null })?.degradedNotice?.degraded ?? compat?.degradedNotice?.degraded
  );

  const busy = step === 'outlining' || step === 'narrating' || ttsLoading;
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [downUrl, setDownUrl] = useState<string | null>(null);

  // org context for sharing
  const { activeOrgId, org: orgCtx, isStarterTier } = useOrg();
  const rolesRaw = [
    ...(Array.isArray(orgCtx?.roles) ? orgCtx.roles : []),
    orgCtx?.my_role,
    orgCtx?.role,
  ].filter(Boolean).map(r => String(r).toLowerCase());
  const roles = new Set(rolesRaw);
  const isAdminOwner = roles.has('owner') || roles.has('admin');
  const isInstructor = roles.has('instructor') || roles.has('teacher');
  const canShareUi = Boolean(activeOrgId && (isAdminOwner || isInstructor || isGlobalAdmin));

  const isLockedLearner = Boolean(orgAssign?.locked ?? (isOrgFlow && !canShareUi));
  const showMinimalControls = isLockedLearner;
  const showCourseList = !isLockedLearner;

  const trackLessons = useMemo(() => {
    const t = TRACKS.find((x) => x.key === programTrack) ?? TRACKS[0];
    return t.lessons;
  }, [programTrack]);

  const restrictStarter = Boolean(activeOrgId && isStarterTier);
  const knobsDisabled = restrictStarter || isLockedLearner;
  const capMinutes = (m?: number) => (restrictStarter ? Math.min(m ?? 30, 30) : (m ?? 20));

  const lockedMinutes  = (orgAssign as any)?.lockedConfig?.minutes as number | undefined;
  const lockedLessons  = (orgAssign as any)?.lockedConfig?.totalLessons as number | undefined;
  const lockedQuizSize = (orgAssign as any)?.lockedConfig?.quizSize as number | undefined;

  const minutesEffective = isLockedLearner
    ? capMinutes(typeof lockedMinutes === 'number' ? lockedMinutes : minutes)
    : minutes;

  const safeLessons = isLockedLearner
    ? (typeof lockedLessons === 'number' ? Math.max(1, lockedLessons) : trackLessons)
    : totalLessons;

  const safeQuiz = isLockedLearner
    ? (typeof lockedQuizSize === 'number' ? Math.max(4, lockedQuizSize) : 16)
    : quizCount;

  // reflect lock defaults
  useEffect(() => {
    if (!isLockedLearner) return;
    const lc = (orgAssign as any)?.lockedConfig || {};
    if (typeof lc.minutes === 'number') setMinutes(capMinutes(lc.minutes));
    if (typeof lc.totalLessons === 'number') setTotalLessons(Math.max(1, lc.totalLessons));
    if (typeof lc.quizSize === 'number') setQuizCount(Math.max(4, lc.quizSize));
  }, [isLockedLearner, (orgAssign as any)?.lockedConfig]);

  useEffect(() => {
    if (!restrictStarter || isLockedLearner) return;
    setMinutes(m => capMinutes(m));
    setTotalLessons(trackLessons);
    setQuizCount(16);
  }, [restrictStarter, trackLessons, isLockedLearner]);

  useEffect(() => {
    dlog('env', { backendUrl, tokenPresent: Boolean(token), canShareUi, isInstructor, activeOrgId, isOrgFlow });
  }, [backendUrl, token, canShareUi, isInstructor, activeOrgId, isOrgFlow]);

  useEffect(() => {
    (async () => {
      const preserveIds = courseIdParam ? [courseIdParam] : [];
      try {
        dlog('loadTopCourses:init {limit:200, preserveIds}', { preserveIds });
        await loadTopCourses?.({ limit: 200, preserveIds } as any);
      } catch {
        try {
          dlog('loadTopCourses:init fallback ()');
          await loadTopCourses?.();
        } catch {
          /* ignore */
        }
      }
    })();
  }, [courseIdParam, loadTopCourses]);

  // preselect the assigned course from ?courseId=…
  useEffect(() => {
    if (!courseIdParam || !topCourses?.length) return;
    if (selectedCourse?.id === courseIdParam) return;
    const found = topCourses.find(c => c.id === courseIdParam) || null;
    if (found) selectCourse(found);
  }, [courseIdParam, topCourses, selectedCourse, selectCourse]);

  useEffect(() => { if (isLockedLearner) setShareOpen(false); }, [isLockedLearner]);

  useEffect(() => {
    if (!selectedCourse && Array.isArray(topCourses) && topCourses.length > 0 && !customTitle.trim()) {
      dlog('auto-selecting first course', { id: topCourses[0]?.id, title: topCourses[0]?.title });
      selectCourse(topCourses[0]);
    }
  }, [topCourses, selectedCourse, selectCourse, customTitle]);

  const handleLoadMore = async () => {
    const preserveIds = courseIdParam ? [courseIdParam] : [];
    const opts = coursesCursor
      ? { append: true, cursor: coursesCursor, limit: 200, preserveIds }
      : { append: true, page: 'next', limit: 200, preserveIds };

    try {
      dlog('loadTopCourses:more', opts);
      await loadTopCourses?.(opts as any);
    } catch {
      try {
        dlog('loadTopCourses:more fallback {append:true}');
        await loadTopCourses?.({ append: true, preserveIds } as any);
      } catch {
        dlog('loadTopCourses:more fallback ()');
        await loadTopCourses?.({ preserveIds } as any);
      }
    }
  };

  const refreshCourseList = useCallback(async () => {
    const preserveIds = courseIdParam ? [courseIdParam] : [];
    dlog('refreshCourseList → clearTopCoursesCacheNow + reload', { preserveIds });

    try { await clearTopCoursesCacheNow?.(); } catch {}
    try {
      await loadTopCourses?.({ limit: 200, preserveIds } as any);
    } catch {
      await loadTopCourses?.({ preserveIds } as any);
    }
  }, [clearTopCoursesCacheNow, loadTopCourses, courseIdParam]);

  // Have content already?
  const hasAIContent = useMemo(
    () => Boolean(
      (joinedSsml && String(joinedSsml).trim()) ||
      (ssml && String(ssml).trim()) ||
      (Array.isArray(lessons) && lessons.length > 0)
    ),
    [joinedSsml, ssml, lessons]
  );

  // Build lessons list for the classroom
  const safeLessonsArr = useMemo(() => {
    if (!Array.isArray(lessons) && !Array.isArray(outline)) return [] as any[];
    const totalSlots = Math.max(lessons?.length ?? 0, outline?.length ?? 0);
    const out: {
      id: string;
      title?: string;
      ssml: string;
      markdown?: string;
      formulas?: { id: string; latex: string; speakAs?: string }[];
      tables?: { title: string; columns: string[]; rows: (string | number)[][] }[];
    }[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const L = lessons?.[i] as any;
      const S = outline?.[i] as any;
      if (L && typeof L === 'object' && (L.ssml ?? '') !== '') {
        out.push({
          id: L.id ?? S?.id ?? `L${i + 1}`,
          title: L.title ?? S?.title ?? `Lesson ${i + 1}`,
          ssml: L.ssml as string,
          markdown: L.markdown || '',
          formulas: Array.isArray(L.formulas) ? L.formulas : [],
          tables: Array.isArray(L.tables) ? L.tables : [],
        });
      } else {
        out.push({ id: S?.id ?? `slot-${i}`, title: S?.title ?? `Lesson ${i + 1}`, ssml: '', markdown: '', formulas: [], tables: [] });
      }
    }
    return out;
  }, [lessons, outline]);

  useEffect(() => {
    if (hasAIContent && typeof window !== 'undefined' && window.innerWidth < 768) {
      dlog('mobile: auto-maximize classroom');
      setIsMaximized(true);
    }
  }, [hasAIContent]);

  const displaySsml: string = (hasAIContent ? (joinedSsml || ssml || '') : (initialSsml || '')).trim();

  // Auth helpers
  const goToLoginWithReturn = (reason?: string, message?: string) => {
    const next = `${location.pathname}${location.search}${location.hash}`;
    try { sessionStorage.setItem('auth:returnTo', next); } catch {}
    dlog('navigate → /login', { reason, message, next });
    navigate('/login', { state: { next, reason, message }, replace: true });
  };
  const requireAuth = (reason?: string, message?: string) => {
    if (token) return true;
    goToLoginWithReturn(reason, message);
    return false;
  };

  // Answer helper (stable)
  const disableQuiz = Boolean(
    (isOrgFlow && ((orgAssign?.expired) || (localRemainingMs !== null && localRemainingMs <= 0))) || grade
  );
  const handleAnswer = useCallback((qid: string, value: number | string) => {
  if (disableQuiz) return;
  answerQuestion(qid, value);
}, [disableQuiz, answerQuestion]);

  // Start course (stable)
  const onStart = useCallback(async () => {
    const courseSize = sizeToCourseSize[sizePreset];
    await startWithAI({
      assignmentId,
      courseSize,
      level: classLevel,
      minutes: minutesEffective,
      programTrack,
      totalLessons: safeLessons,
      voiceName: effectiveVoice,
    });
  }, [assignmentId, sizePreset, classLevel, minutesEffective, programTrack, safeLessons, effectiveVoice, startWithAI]);

  const refreshSelectedAI = useCallback(async () => {
    if (!selectedCourse) return;
    const ok = window.confirm('Refresh this course’s AI content?\n\nThis clears the cached outline, narration, and quiz, then regenerates fresh content.');
    if (!ok) return;
    dlog('refreshSelectedAI → clearSelectedCourseCacheNow then reseed', { courseId: selectedCourse.id });
    try { await clearSelectedCourseCacheNow?.(); } catch {}
    selectCourse(selectedCourse);
    await onStart();
  }, [selectedCourse, clearSelectedCourseCacheNow, selectCourse, onStart]);

  return (
    <div className="text-darkText dark:text-white">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* LEFT */}
        <div className={`order-1 space-y-4 sm:space-y-6 ${showCourseList ? 'md:col-span-8' : 'md:col-span-12'}`}>
          <header className="space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-darkText dark:text-white">AI Tutor Studio</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-white/75">
              Free lesson (audio + captions + slides) and quiz. Score <span className="font-semibold">≥ 70%</span> to unlock your certificate
              {isOrgFlow ? ' — covered by your organization' : ''}.
            </p>
          </header>

          {/* 🔹 Org share dialog appears near the page heading */}
            <OrgShareDialog
              open={canShareUi && shareOpen}
              onClose={() => setShareOpen(false)}
              courseId={selectedCourse?.id || null}
              courseTitle={selectedCourse?.title || (customTitle || null)}
              totalLessons={safeLessons}
              quizCount={safeQuiz}
              minutes={capMinutes(minutes)}
            />

          {degraded && (
            <div className="panel p-3 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-500/10 ring-yellow-200 dark:ring-yellow-500/40">
              High demand fallback: content may be simplified, but your progress still counts.
            </div>
          )}

          {/* Step indicator */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {[
              { k: 'course', label: 'Choose' },
              { k: 'outline', label: 'Outline' },
              { k: 'lessons', label: 'Lessons' },
              { k: 'quiz', label: 'Quiz' },
              { k: 'cert', label: 'Certificate' },
            ].map((s, i) => {
              const active =
                (i === 0 && !outline.length) ||
                (i === 1 && step === 'outlining') ||
                (i === 2 && (step === 'narrating' || hasAIContent)) ||
                (i === 3 && (quiz?.questions?.length || step === 'quizzing')) ||
                (i === 4 && Boolean(grade?.passed));
              return (
                <div
                  key={s.k}
                  className={`px-2 py-1 rounded-full ring-1 ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-white/15 dark:text-white dark:ring-white/30'
                      : 'bg-white text-gray-700 ring-gray-200 dark:bg-white/5 dark:text-white/70 dark:ring-white/10'
                  }`}
                >
                  {i + 1}. {s.label}
                </div>
              );
            })}
          </div>

          {/* Controls (child) */}
          <ControlsPanel
            // modes
            showMinimalControls={showMinimalControls}
            isLockedLearner={isLockedLearner}
            canShareUi={canShareUi}
            restrictStarter={restrictStarter}
            knobsDisabled={knobsDisabled}
            onOpenShare={() => { setIsMaximized(false); setShareOpen(true); }} 
            // data
            topCourses={(topCourses || []).map(c => ({ id: c.id, title: c.title }))}
            selectedCourse={selectedCourse ? { id: selectedCourse.id, title: selectedCourse.title } : null}
            onSelectCourse={(id) => {
              const found = (topCourses || []).find((c) => c.id === id) || null;
              dlog('CourseSelect.onChange/Select →', { id, foundTitle: found?.title });
              selectCourse(found);
            }}
            // track + size + level
            PRESETS={PRESETS}
            TRACKS={TRACKS}
            trackLessons={trackLessons}
            sizePreset={sizePreset}
            setSizePreset={setSizePreset}
            minutes={minutes}
            setMinutes={setMinutes}
            classLevel={classLevel}
            setClassLevel={setClassLevel}
            programTrack={programTrack}
            setProgramTrack={setProgramTrack}
            capMinutes={capMinutes}
            // custom topic
            customTitle={customTitle}
            setCustomTitle={(s) => {
              setCustomTitle(s);
              if (s.trim()) selectCourse(null);
            }}
            // actions
            busy={busy}
            hasAIContent={hasAIContent}
            onStart={onStart}
            onRefreshSelectedAI={refreshSelectedAI}
           
            // extras row
            totalLessons={totalLessons}
            setTotalLessons={setTotalLessons}
            quizCount={quizCount}
            setQuizCount={setQuizCount}
          />

          {/* Classroom + Outline + Quiz (child) */}
          <LessonAndQuizPane
            compactPlayer={compactPlayer}
            showCourseList={showCourseList}
            // classroom
            displaySsml={displaySsml}
            lessonsArr={safeLessonsArr}
            voiceName={voiceName || defaultVoice}
            courseTitle={selectedCourse?.title || (customTitle || 'AI Lesson')}
            isMaximized={isMaximized}
            onToggleMaximized={() => setIsMaximized(v => !v)}
            course={selectedCourse || null}
            outline={outline}
            backendUrl={backendUrl}
            // playback
            onBeforePlay={async () => { dlog('Classroom onBeforePlay → beginCourse()'); await onStart(); }}
            onEnded={() => { dlog('Classroom onEnded', { hasNextLesson }); if (hasNextLesson) nextLesson(); }}
            themeOpen={themeOpen}
            onThemeOpenChange={(open) => { dlog('themeOpen →', open); setThemeOpen(open); }}
            // outline → quiz
            isOrgFlow={isOrgFlow}
            assignmentId={assignmentId}
            timerSec={timerSec}
            generateQuizNow={async (
              count,
              _courseSize,
              _programTrack,
              _totalLessons,
              assignmentIdFromChild,
              quizType // <- accept the 6th arg
            ) => {
              await generateQuizNow(
                count,
                sizeToCourseSize[sizePreset],
                programTrack,
                safeLessons,
                assignmentIdFromChild ?? assignmentId,
                quizType // <- forward it to the hook
              );
            }}
            safeLessons={safeLessons}
            safeQuiz={safeQuiz}
            // quiz
            quiz={quiz}
            answers={answers}
            onAnswer={handleAnswer}
            allAnswered={allAnswered}
            grade={grade}
            gradeNow={async () => { await gradeNow(); }} // narrow return type to Promise<void>
            token={token || ''}
            requireAuth={requireAuth}
            // cert + payments
            isOrgFlowFlag={isOrgFlow}
            skus={skus}
            aiCertLoading={aiCertLoading}
            aiCertError={aiCertError}
            aiCertMsg={aiCertMsg}
            claim={async (code) => { await claim(code); }} // narrow to Promise<void>
            tryGenerateCertificate={tryGenerateCertificate}
            generateAICert={generateAICert}
            paymentOpen={paymentOpen}
            setPaymentOpen={setPaymentOpen}
            certUrl={certUrl}
            setCertUrl={setCertUrl}
            downUrl={downUrl}
            setDownUrl={setDownUrl}
            // timer + lock from parent
            localRemainingMs={localRemainingMs}
            setLocalRemainingMs={setLocalRemainingMs}
            displayRemainingMs={displayRemainingMs}
            disableQuiz={disableQuiz}
            // results navigation
            onViewResults={(courseId, courseTitle, g) => {
              dlog('navigate → /results', { courseId, courseTitle, grade: g });
              navigate('/results', {
                state: {
                  courseId,
                  courseTitle,
                  grade: { scorePct: g.scorePct, passMark: g.passMark, passed: g.passed },
                },
              });
            }}
          />
        </div>

        {/* RIGHT: course list (hidden for locked learners) */}
        {showCourseList && (
          <aside className="md:col-span-4 order-2">
            <div className="md:sticky md:top-20 space-y-3">
              <CourseList
                items={(topCourses || []).map((c: TopCourse) => ({ id: c.id, title: c.title, blurb: getCourseBlurb(c) }))}
                activeId={selectedCourse?.id || null}
                onSelect={(id) => {
                  const found = (topCourses || []).find((c) => c.id === id) || null;
                  dlog('CourseList.onSelect', { id, title: found?.title });
                  selectCourse(found);
                }}
                onRefresh={refreshCourseList}
                onLoadMore={handleLoadMore}
                hasMore={Boolean(hasMoreCourses)}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default RobotTeacher;
