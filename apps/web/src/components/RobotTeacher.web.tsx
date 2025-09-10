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

import PaymentWidget from './PaymentWidget.web';
import ClassroomThemeShell from '@/components/ClassroomThemeShell';

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

const dlog = (...args: any[]) => {
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
type SizePresetKey = (typeof PRESETS)[number]['key'];

const TRACKS = [
  { key: 'module', label: 'Module', lessons: 8 },
  { key: 'certificate', label: 'Certificate', lessons: 12 },
  { key: 'diploma', label: 'Diploma', lessons: 18 },
  { key: 'degree', label: 'Degree', lessons: 24 },
] as const;
type TrackKey = (typeof TRACKS)[number]['key'];

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

/* Minimal dropdown (unchanged styling) */
function CourseSelect({
  options,
  value,
  onChange,
  placeholder = 'Select a course…',
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  

  return (
    <div ref={ref} className="relative z-[30]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          block w-full rounded-xl px-3 pr-9 py-2 text-sm text-left
          border border-gray-300 bg-white text-darkText
          focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500
          dark:border-darkCard dark:bg-[#172534] dark:text-white
        "
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? selected.label : <span className="text-gray-500 dark:text-white/60">{placeholder}</span>}
      </button>

      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </span>

      <div
        className={`${open ? 'block' : 'hidden'} absolute left-0 right-0 top-[calc(100%+6px)] max-h-64 overflow-auto rounded-xl ring-1 ring-gray-200 bg-white shadow-lg dark:ring-white/10 dark:bg-[#0f1821]`}
        role="listbox"
      >
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-white/60">No courses available</div>
        ) : (
          options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
                className={`w-full text-left px-3 py-2 text-sm ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600/30 dark:text-white'
                    : 'text-darkText hover:bg-gray-50 dark:text-white dark:hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const location = useLocation();

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
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isMaximized) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMaximized]);

  const effectiveVoice = voiceName || defaultVoice;
  const { backendUrl, token } = useShopContext();

  const [internalThemeOpen, setInternalThemeOpen] = useState(false);
  const isThemeControlled = typeof themeOpenProp === 'boolean';
  const themeOpen = isThemeControlled ? (themeOpenProp as boolean) : internalThemeOpen;
  const setThemeOpen = (next: boolean | ((s: boolean) => boolean)) => {
    const v = typeof next === 'function' ? (next as (s: boolean) => boolean)(themeOpen) : next;
    if (!isThemeControlled) setInternalThemeOpen(v);
    onThemeOpenChange?.(v);
  };

  const ai = useAiCourse(backendUrl, token || undefined);
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
  const isOrgFlow = Boolean(orgAssign?.assignmentId);
  const timedOut = Boolean(isOrgFlow && orgAssign?.expired);
  const disableQuiz = Boolean(isOrgFlow && (orgAssign?.expired || grade));
  const orgIssueOnceRef = useRef(false);

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

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [downUrl, setDownUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  // org context for sharing
  const { isOwnerOrAdmin, activeOrgId, org: orgCtx } = useOrg();
 const { role: globalRole } = useShopContext();
 const isGlobalAdmin = globalRole === 'admin' || globalRole === 'superadmin';

  const isInstructor =
    orgCtx?.my_role === 'instructor' ||
    orgCtx?.role === 'instructor' ||
    (Array.isArray(orgCtx?.roles) && orgCtx.roles.includes('instructor'));
 const canShare = (isOwnerOrAdmin || isInstructor || isGlobalAdmin) && !!activeOrgId;
  const [shareOpen, setShareOpen] = useState(false);
  const sharePromptedRef = useRef(false);
  const handleShareCancel = React.useCallback(() => {
  dlog('share dialog: cancel');
  setShareOpen(false);
  sharePromptedRef.current = false; // allow auto-open again on next course/topic selection
}, []);

const handleShareClose = React.useCallback(() => {
  dlog('share dialog: close');
  setShareOpen(false); // keep the gate true; user explicitly closed
}, []);

  const [classLevel, setClassLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [sizePreset, setSizePreset] = useState<SizePresetKey>('standard');
  const [minutes, setMinutes] = useState<number>(20);
  const [programTrack, setProgramTrack] = useState<TrackKey>('module');

  const trackLessons = useMemo(() => {
    const t = TRACKS.find((x) => x.key === programTrack) ?? TRACKS[0];
    return t.lessons;
  }, [programTrack]);

  /* ------------------------------- Debug taps ------------------------------ */
  useEffect(() => {
    dlog('env', { backendUrl, tokenPresent: Boolean(token), canShare, isOwnerOrAdmin, isInstructor, activeOrgId, isOrgFlow });
  }, [backendUrl, token, canShare, isOwnerOrAdmin, isInstructor, activeOrgId, isOrgFlow]);

  useEffect(() => {
    if (!topCourses?.length) return;
    dlog('topCourses loaded', { count: topCourses.length });
  }, [topCourses?.length]);

  useEffect(() => {
    if (!selectedCourse?.id) return;
    dlog('selectedCourse changed →', { id: selectedCourse.id, title: selectedCourse.title });
  }, [selectedCourse?.id, selectedCourse?.title]);

  useEffect(() => {
    if (!outline?.length) return;
    dlog('outline ready', { sections: outline.length });
  }, [outline?.length]);

  useEffect(() => {
    if (!lessons?.length) return;
    dlog('lessons ready', { lessons: lessons.length });
  }, [lessons?.length]);

  useEffect(() => {
    if (!quiz?.questions?.length) return;
    dlog('quiz ready', { questions: quiz.questions.length });
  }, [quiz?.questions?.length]);

  useEffect(() => {
    if (!grade) return;
    dlog('grade updated', grade);
  }, [grade]);

  useEffect(() => {
    dlog('shareOpen →', shareOpen);
  }, [shareOpen]);

  // Open the share dialog once when we have something to share
  useEffect(() => {
    if (!canShare) return;
    if (sharePromptedRef.current) return;

    const hasSelectedCourse = Boolean(selectedCourse?.id);
    const hasCustomTopic = Boolean(customTitle.trim());
    if (hasSelectedCourse || hasCustomTopic) {
      dlog('Auto-opening Share dialog', {
        hasSelectedCourse,
        hasCustomTopic,
        courseId: selectedCourse?.id,
        courseTitle: selectedCourse?.title,
        customTitle,
      });
      setShareOpen(true);
      sharePromptedRef.current = true; // only once per mount
    }
  }, [canShare, selectedCourse?.id, customTitle]);

  useEffect(() => {
    (async () => {
      try {
        dlog('loadTopCourses:init {limit:200}');
        await loadTopCourses?.({ limit: 200 });
      } catch {
        try {
          dlog('loadTopCourses:init fallback ()');
          await loadTopCourses?.();
        } catch {
          /* ignore */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCourse && Array.isArray(topCourses) && topCourses.length > 0 && !customTitle.trim()) {
      dlog('auto-selecting first course', { id: topCourses[0]?.id, title: topCourses[0]?.title });
      selectCourse(topCourses[0]);
    }
  }, [topCourses, selectedCourse, selectCourse, customTitle]);

  const handleLoadMore = async () => {
    const opts = coursesCursor ? { append: true, cursor: coursesCursor, limit: 200 } : { append: true, page: 'next', limit: 200 };
    try {
      dlog('loadTopCourses:more', opts);
      await loadTopCourses?.(opts as any);
    } catch {
      try {
        dlog('loadTopCourses:more fallback {append:true}');
        await loadTopCourses?.({ append: true } as any);
      } catch {
        dlog('loadTopCourses:more fallback ()');
        await loadTopCourses?.();
      }
    }
  };

  const refreshCourseList = useCallback(async () => {
    dlog('refreshCourseList → clearTopCoursesCacheNow + reload');
    try {
      await clearTopCoursesCacheNow?.();
    } catch {}
    try {
      await loadTopCourses?.({ limit: 200 });
    } catch {
      await loadTopCourses?.();
    }
  }, [clearTopCoursesCacheNow, loadTopCourses]);

  // Move this ABOVE beginCourse
const hasAIContent = useMemo(
  () =>
    Boolean(
      (joinedSsml && String(joinedSsml).trim()) ||
        (ssml && String(ssml).trim()) ||
        (Array.isArray(lessons) && lessons.length > 0)
    ),
  [joinedSsml, ssml, lessons]
);


  const beginCourse = useCallback(async () => {
    if (hasAIContent) {
      dlog('beginCourse: already have AI content — skipping regenerate');
      return;
    }

    const commonKnobs = {
      level: classLevel,
      minutes,
      voiceName: effectiveVoice,
      programTrack,
      courseSize: sizeToCourseSize[sizePreset],
      paragraphs: trackLessons,
    };

    if (customTitle.trim()) {
      dlog('beginCourse: startCustomTopic', { title: customTitle.trim(), ...commonKnobs });
      await startCustomTopic(customTitle.trim(), commonKnobs);
      return;
    }
    if (selectedCourse) {
      dlog('beginCourse: startWithAI', { courseId: selectedCourse.id, title: selectedCourse.title, ...commonKnobs });
      await startWithAI(commonKnobs);
      return;
    }
    dlog('beginCourse aborted: select a course or type a topic.');
  }, [hasAIContent, classLevel, minutes, effectiveVoice, programTrack, sizePreset, trackLessons, customTitle, selectedCourse, startWithAI, startCustomTopic]);

  const refreshSelectedAI = useCallback(async () => {
    if (!selectedCourse) return;
    const ok = window.confirm('Refresh this course’s AI content?\n\nThis clears the cached outline, narration, and quiz, then regenerates fresh content.');
    if (!ok) return;
    dlog('refreshSelectedAI → clearSelectedCourseCacheNow then reseed', { courseId: selectedCourse.id });
    try {
      await clearSelectedCourseCacheNow?.();
    } catch {}
    selectCourse(selectedCourse);
    await beginCourse();
  }, [selectedCourse, clearSelectedCourseCacheNow, selectCourse, beginCourse]);

  useEffect(() => {
    (async () => {
      if (!grade?.passed) return;

      dlog('grade passed; issuing certificate flow', { isOrgFlow });

      if (isOrgFlow && !orgIssueOnceRef.current) {
        orgIssueOnceRef.current = true;
        try {
          const sku = (skus && skus[0]) || null;
          if (sku) {
            try {
              dlog('[org] claim sku', sku);
              await claim(sku.code);
            } catch (e) {
              dlog('[org] claim failed (continuing)', e);
            }
          }
          dlog('[org] tryGenerateCertificate → generateAICert fallback');
          const doc = (await tryGenerateCertificate().catch(() => null)) || (await generateAICert().catch(() => null));
          if (doc) {
            const c: any = doc;
            setCertUrl(c.url ?? null);
            setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
            dlog('[org] certificate ready', { view: c.url, download: c.download_url ?? c.downloadUrl });
          }
        } catch (e) {
          console.error('[org] auto-issue failed', e);
        }
        return;
      }

      if (!isOrgFlow && !paymentOpen) {
        dlog('[self] tryGenerateCertificate (pre-payment)');
        const cert = await tryGenerateCertificate().catch(() => null);
        if (cert) {
          const c: any = cert;
          setCertUrl(c.url ?? null);
          setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
          dlog('[self] certificate ready', { view: c.url, download: c.download_url ?? c.downloadUrl });
        }
      }
    })();
  }, [grade?.passed, isOrgFlow, paymentOpen, tryGenerateCertificate, generateAICert, skus, claim]);

  const courseItems = useMemo(
    () =>
      (topCourses || []).map((c: TopCourse) => ({
        id: c.id,
        title: c.title,
        blurb: getCourseBlurb(c),
      })),
    [topCourses]
  );

  const handleTeachMe = useCallback(async () => {
    const title = customTitle.trim();
    if (!title) return;
    const commonKnobs = {
      level: classLevel,
      minutes,
      voiceName: effectiveVoice,
      programTrack,
      courseSize: sizeToCourseSize[sizePreset],
      paragraphs: trackLessons,
    };
    dlog('Teach Me clicked → startCustomTopic', { title, ...commonKnobs, canShare });
    await startCustomTopic(title, commonKnobs);
    if (canShare) setShareOpen(true);
  }, [customTitle, classLevel, minutes, effectiveVoice, trackLessons, startCustomTopic, sizePreset, programTrack, canShare]);

  

  const displaySsml: string = (hasAIContent ? joinedSsml || ssml || '' : initialSsml || '').trim();

  const safeLessons = useMemo(() => {
    if (!Array.isArray(lessons) && !Array.isArray(outline)) return [];
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
      const L = lessons?.[i] as unknown as {
        id?: string;
        title?: string;
        ssml?: string;
        markdown?: string;
        formulas?: { id: string; latex: string; speakAs?: string }[];
        tables?: { title: string; columns: string[]; rows: (string | number)[][] }[];
      } | undefined;
      const S = outline?.[i] as unknown as { id?: string; title?: string } | undefined;
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
        out.push({
          id: S?.id ?? `slot-${i}`,
          title: S?.title ?? `Lesson ${i + 1}`,
          ssml: '',
          markdown: '',
          formulas: [],
          tables: [],
        });
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

  const goToLoginWithReturn = (reason?: string, message?: string) => {
    const next = `${location.pathname}${location.search}${location.hash}`;
    try {
      sessionStorage.setItem('auth:returnTo', next);
    } catch {}
    dlog('navigate → /login', { reason, message, next });
    navigate('/login', { state: { next, reason, message }, replace: true });
  };
  const requireAuth = (reason?: string, message?: string) => {
    if (token) return true;
    goToLoginWithReturn(reason, message);
    return false;
  };
  const is401 = (e: unknown) => {
    const err = e as { status?: number; code?: string | number; message?: string };
    return err?.status === 401 || err?.code === 'UNAUTHENTICATED' || /401/.test(String(err?.message));
  };

  const busy = step === 'outlining' || step === 'narrating' || ttsLoading;

  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!quiz?.questions?.length) return;
    let start = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => window.clearInterval(id);
  }, [quiz?.questions?.length]);

  const handleAnswer = (qid: string, i: number) => {
    if (disableQuiz) return;
    dlog('answerQuestion', { qid, index: i });
    answerQuestion(qid, i);
  };

  return (
    <div className="text-darkText dark:text-white">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* LEFT */}
        <div className="md:col-span-8 space-y-4 sm:space-y-6 order-1">
          <header className="space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-darkText dark:text-white">AI Tutor Studio</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-white/75">
              Free lesson (audio + captions + slides) and quiz. Score <span className="font-semibold">≥ 70%</span> to unlock your certificate
              {isOrgFlow ? ' — covered by your organization' : ''}.
            </p>
          </header>

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

          {/* Controls */}
          <section className="panel p-3 sm:p-4 relative z-10 overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Course */}
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-600 dark:text-white/70">Course</label>
                <div className="mt-1 relative z-[20]">
                  <CourseSelect
                    value={selectedCourse?.id || ''}
                    onChange={(id) => {
                      const found = (topCourses || []).find((c) => c.id === id) || null;
                      dlog('CourseSelect.onChange →', { id, foundTitle: found?.title });
                      selectCourse(found);
                    }}
                    options={(topCourses || []).map((c) => ({ value: c.id, label: c.title }))}
                    placeholder={(topCourses || []).length ? 'Select a course…' : 'Loading…'}
                  />
                </div>
              </div>

              {/* Program Track */}
              <div className="lg:col-span-3">
                <label className="text-xs text-gray-600 dark:text-white/70">Program track</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {TRACKS.map((t) => {
                    const active = programTrack === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => {
                          dlog('setProgramTrack', t.key);
                          setProgramTrack(t.key);
                        }}
                        className={`chip ${active ? 'chip-active' : ''}`}
                        title={`${t.label}: ~${t.lessons} lessons`}
                      >
                        {t.label} ({t.lessons})
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-gray-600 dark:text-white/60">
                  Track controls lesson count. We generate ~{trackLessons} lessons for this course.
                </p>
              </div>

              {/* Lesson size + minutes */}
              <div className="lg:col-span-3">
                <label className="text-xs text-gray-600 dark:text-white/70">Lesson size</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => {
                      const active = sizePreset === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => {
                            dlog('setSizePreset', p.key);
                            setSizePreset(p.key);
                            setMinutes((m) => (m < p.min ? p.min : m));
                          }}
                          className={`chip ${active ? 'chip-active' : ''}`}
                          title={`${p.label} (~${p.min} min+)`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-600 dark:text-white/70">Minutes</label>
                    <input
                      type="number"
                      min={8}
                      max={600}
                      step={1}
                      value={minutes}
                      onChange={(e) => {
                        const v = Math.max(8, Math.min(600, Number(e.target.value) || 0));
                        dlog('setMinutes', v);
                        setMinutes(v);
                        const next = [...PRESETS].reverse().find((x) => v >= x.min) ?? PRESETS[0];
                        setSizePreset(next.key as SizePresetKey);
                      }}
                      className="input !w-24 !py-1.5 !px-2 text-[12px]"
                    />
                  </div>
                </div>
              </div>

              {/* Level */}
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-600 dark:text-white/70">Level</label>
                <div className="mt-1 flex rounded-lg ring-1 ring-gray-200 overflow-hidden dark:ring-white/15">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lv) => {
                    const active = classLevel === lv;
                    return (
                      <button
                        key={lv}
                        onClick={() => {
                          dlog('setClassLevel', lv);
                          setClassLevel(lv);
                        }}
                        className={`flex-1 px-2.5 py-1.5 text-[11px] capitalize transition ${
                          active
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-white/20 dark:text-white dark:ring-white/30'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15'
                        }`}
                        aria-pressed={active}
                        title={lv}
                      >
                        {lv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start/Continue + Refresh + Share */}
              <div className="lg:col-span-3 flex items-end gap-2">
                <button
                  onClick={() => {
                    dlog('Start/Continue clicked', { busy, hasAIContent, selectedCourse: selectedCourse?.id, customTitle: customTitle.trim() });
                    beginCourse();
                  }}
                  disabled={busy || (!selectedCourse && !customTitle.trim())}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold transition ring-1 ${
                    busy || (!selectedCourse && !customTitle.trim())
                      ? 'opacity-60 cursor-not-allowed bg-indigo-50 text-indigo-700 ring-indigo-300 dark:bg-indigo-600/30 dark:text-white dark:ring-indigo-500'
                      : 'bg-indigo-50 text-indigo-700 ring-indigo-300 hover:bg-indigo-100 dark:bg-indigo-600/40 dark:text-white dark:ring-indigo-500 dark:hover:bg-indigo-600/50'
                  }`}
                  title="AI will generate outline + narration"
                >
                  {busy ? 'Preparing…' : hasAIContent ? 'Continue lesson' : 'Start with A.I'}
                </button>

                {selectedCourse && (
                  <button onClick={refreshSelectedAI} className="chip" title="Clear this course’s cache (outline, narration, quiz) and regenerate">
                    Refresh AI
                  </button>
                )}

                {canShare && (
                  <button
                    onClick={() => {
                      dlog('Share button clicked', {
                        canShare,
                        courseId: selectedCourse?.id,
                        courseTitle: selectedCourse?.title,
                        customTitle: customTitle.trim(),
                      });
                      setShareOpen(true);
                    }}
                    disabled={!selectedCourse?.id && !customTitle.trim()}
                    className={`chip ${selectedCourse?.id ? 'chip-active' : ''}`}
                    title={selectedCourse?.id ? 'Share this course with your learners' : 'Select or generate a course first'}
                  >
                    Share with learners
                  </button>
                )}
              </div>
            </div> {/* ✅ close grid ONLY */}

            {/* Custom topic */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600 dark:text-white/70">Or type any topic</label>
                <input
                  value={customTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const v = e.currentTarget.value;
                    setCustomTitle(v);
                    if (v.trim()) {
                      dlog('Typing customTitle →', v);
                      selectCourse(null);
                    }
                  }}
                  placeholder="e.g., Linear Algebra crash course"
                  className="input mt-1"
                />
              </div>
              <div className="flex items-end">
                <button
                  disabled={!customTitle.trim() || busy}
                  onClick={handleTeachMe}
                  className={`w-full md:w-auto px-4 py-2 rounded-xl text-sm font-semibold transition ring-1 ${
                    !customTitle.trim() || busy
                      ? 'opacity-60 cursor-not-allowed bg-indigo-50 text-indigo-700 ring-indigo-300 dark:bg-indigo-600/30 dark:text-white dark:ring-indigo-500'
                      : 'bg-indigo-50 text-indigo-700 ring-indigo-300 hover:bg-indigo-100 dark:bg-indigo-600/40 dark:text-white dark:ring-indigo-500 dark:hover:bg-indigo-600/50'
                  }`}
                  title="Spin up an AI sandbox course for this topic"
                >
                  Teach me
                </button>
              </div>
            </div>

            {(error || ttsError) && !ttsLoading && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error || ttsError}</p>}
          </section>

          <section id="classroom" className="relative z-[0]">
            <ClassroomThemeShell
              ssml={displaySsml}
              lessons={safeLessons}
              voiceName={voiceName || defaultVoice}
              title={selectedCourse?.title || (customTitle || 'AI Lesson')}
              maximized={isMaximized}
              onToggleMaximize={() => {
                dlog('toggle maximize', !isMaximized);
                setIsMaximized((v) => !v);
              }}
              course={selectedCourse || null}
              outline={outline}
              backendUrlOverride={backendUrl}
              playing
              playJoinedIfAvailable={false}
              onBeforePlay={() => {
                dlog('Classroom onBeforePlay → beginCourse()');
                beginCourse();
              }}
              onEnded={() => {
                dlog('Classroom onEnded', { hasNextLesson });
                if (hasNextLesson) nextLesson();
              }}
              themeOpen={themeOpen}
              onThemeOpenChange={(open) => {
                dlog('themeOpen →', open);
                setThemeOpen(open);
              }}
              showFloatingThemeButton={false}
            />
          </section>

          {/* Outline */}
          {outline.length > 0 && (
            <section className="panel p-4">
              <div className="font-semibold mb-2 text-darkText dark:text-white">Lesson outline</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-white/80">
                {outline.filter(Boolean).map((s, i: number) => (
                  <li key={(s as { id?: string })?.id ?? `sec-${i}`}>
                    <span className="font-medium text-darkText dark:text-white">{(s as { title?: string })?.title ?? `Lesson ${i + 1}`}</span>
                    <ul className="list-disc list-inside ml-4">
                      {(((s as unknown as { keyPoints?: string[] })?.keyPoints) || []).map((k: string, idx: number) => (
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
                    dlog('Generate quiz clicked');
                    await generateQuizNow();
                    dlog('Generate quiz done');
                  }}
                  className="chip chip-active"
                >
                  Generate quiz
                </button>
                {ttsLoading && <span className="text-xs text-gray-600 dark:text-white/60">Narration rendering…</span>}
              </div>
            </section>
          )}

          {/* Quiz */}
          {quiz?.questions?.length ? (
            <section className="panel p-4">
              <div className="font-semibold text-darkText dark:text-white">Quick quiz</div>
              {isOrgFlow ? (
                <div className={`mt-1 text-xs px-2 py-1 rounded ${timedOut ? 'bg-red-600/20 text-red-200' : 'bg-white/10 text-white/90'}`}>
                  {timedOut ? 'Time up — quiz locked' : `Time left: ${Math.max(0, Math.floor((orgAssign?.remainingMs ?? 0) / 1000))}s`}
                </div>
              ) : (
                <div className="mt-1 text-xs px-2 py-1 rounded bg-white/10 text-white/90">Time elapsed: {Math.floor(elapsedMs / 1000)}s</div>
              )}
              <div className="text-xs text-gray-600 dark:text-white/60 mb-2">Answer all to submit.</div>

              <div className="space-y-4">
                {quiz.questions.map((q, idx: number) => (
                  <div key={q.id} className="rounded-xl bg-white ring-1 ring-gray-200 p-3 dark:bg-white/5 dark:ring-white/10">
                    <div className="text-sm font-medium mb-2 text-darkText dark:text-white">
                      {idx + 1}. {q.prompt}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c: string, i: number) => {
                        const isSelected = answers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswer(q.id, i)}
                            disabled={disableQuiz}
                            className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-600/40 dark:text-white dark:ring-emerald-500'
                                : 'bg-white text-darkText ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10'
                            } ${disableQuiz ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                    dlog('Submit quiz clicked', { allAnswered, disableQuiz, authed: Boolean(token) });
                    if (!requireAuth('grade_quiz', 'Please sign in to submit and grade your quiz.')) return;
                    try {
                      await gradeNow();
                      dlog('gradeNow → success');
                    } catch (e: unknown) {
                      if (is401(e)) {
                        const next = `${location.pathname}${location.search}${location.hash}`;
                        try {
                          sessionStorage.setItem('auth:returnTo', next);
                        } catch {}
                        dlog('gradeNow → 401, navigate to login');
                        navigate('/login', {
                          state: { next, reason: 'grade_quiz', message: 'Please sign in to submit and grade your quiz.' },
                          replace: true,
                        });
                        return;
                      }
                      console.error('[gradeNow] failed', e);
                    }
                  }}
                  disabled={!allAnswered || disableQuiz}
                  className={`btn ${allAnswered && !disableQuiz ? 'bg-emerald-600 hover:bg-emerald-500' : 'opacity-60 cursor-not-allowed'}`}
                >
                  Submit quiz
                </button>

                {grade && (
                  <span className="text-sm text-darkText dark:text-white/80">
                    Score: <span className="font-semibold">{grade.scorePct}%</span> (Pass mark {grade.passMark}%)
                  </span>
                )}

                {grade && selectedCourse?.id && (
                  <button
                    onClick={() => {
                      dlog('navigate → /results', { courseId: selectedCourse.id, courseTitle: selectedCourse.title, grade });
                      navigate('/results', {
                        state: {
                          courseId: selectedCourse.id,
                          courseTitle: selectedCourse.title,
                          grade: { scorePct: grade.scorePct, passMark: grade.passMark, passed: grade.passed },
                        },
                      });
                    }}
                    className="chip"
                    title="Open your Results & Documents page"
                  >
                    View Results
                  </button>
                )}
              </div>

              {grade?.passed && (
                <div className="mt-4 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 dark:bg-emerald-500/10 dark:ring-emerald-500">
                  <div className="text-sm text-emerald-800 dark:text-emerald-200">🎉 Great job! You passed (≥ {grade.passMark}%).</div>

                  {isOrgFlow ? (
                    <>
                      <div className="mt-2 text-xs text-gray-700 dark:text-white/70">Covered by your organization — no payment needed.</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={async () => {
                            if (orgIssueOnceRef.current) return;
                            orgIssueOnceRef.current = true;
                            try {
                              const sku = (skus && skus[0]) || null;
                              if (sku) {
                                try {
                                  dlog('[org] manual claim sku', sku);
                                  await claim(sku.code);
                                } catch {}
                              }
                              dlog('[org] manual cert generate');
                              const doc = (await tryGenerateCertificate().catch(() => null)) || (await generateAICert().catch(() => null));
                              if (doc) {
                                const c: any = doc;
                                setCertUrl(c.url ?? null);
                                setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
                                dlog('[org] manual certificate ready', { view: c.url, download: c.download_url ?? c.downloadUrl });
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
                      {!certUrl && <p className="text-[12px] text-gray-600 dark:text-white/70 mt-2">Your certificate will be generated at no cost.</p>}
                    </>
                  ) : (
                    <>
                      <div className="mt-2 space-y-2">
                        <div className="text-xs text-gray-600 dark:text-white/70">Pay in tokens (no processing fees)</div>

                        {aiCertLoading && <div className="text-xs text-gray-500">Loading certificate options…</div>}
                        {aiCertError && <div className="text-xs text-red-600">{aiCertError}</div>}
                        {aiCertMsg && <div className="text-xs text-emerald-700 dark:text-emerald-300">{aiCertMsg}</div>}

                        <div className="space-y-2">
                          {(skus || []).map((sku) => (
                            <div key={sku.code} className="flex items-center justify-between rounded-lg ring-1 ring-gray-200 dark:ring-white/10 p-2 bg-white dark:bg-white/5">
                              <div>
                                <div className="text-sm font-medium">{sku.title}</div>
                                <div className="text-[11px] text-gray-600 dark:text-white/60">{sku.code}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{sku.price_tokens} Tokens</span>
                                <button
                                  onClick={async () => {
                                    if (!token) return goToLoginWithReturn('pay_certificate', 'Please sign in.');
                                    try {
                                      dlog('[tokens] claim', sku.code);
                                      await claim(sku.code);
                                      dlog('[tokens] generateAICert');
                                      const doc = await generateAICert();
                                      const url = (doc as any)?.download_url || (doc as any)?.url;
                                      if (url) window.open(url, '_blank', 'noopener,noreferrer');

                                      const c: any = doc || {};
                                      setCertUrl(c.url ?? null);
                                      setDownUrl(c.download_url ?? c.downloadUrl ?? c.url ?? null);
                                      dlog('[tokens] certificate ready', { view: c.url, download: c.download_url ?? c.downloadUrl });
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

                      <div className="mt-3 text-xs text-gray-500 dark:text-white/60">Prefer paying with card or PayPal/M-Pesa?</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            if (!token) return goToLoginWithReturn('pay_certificate', 'Please sign in.');
                            dlog('open PaymentWidget');
                            setPaymentOpen(true);
                          }}
                          className="btn bg-indigo-600 hover:bg-indigo-500"
                        >
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

                      {!certUrl && <p className="text-[12px] text-gray-600 dark:text-white/70 mt-2">Once payment completes (tokens or fiat), we’ll generate your certificate instantly.</p>}
                    </>
                  )}
                </div>
              )}

              {grade && !grade.passed && (
                <div className="mt-4 rounded-xl bg-red-50 ring-1 ring-red-200 p-3 dark:bg-red-500/10 dark:ring-red-500">
                  <div className="text-sm text-red-700 dark:text-red-200">You scored {grade.scorePct}%. Review the lesson and try again.</div>
                </div>
              )}
            </section>
          ) : null}
        </div>

        {/* RIGHT: course list */}
        <aside className="md:col-span-4 order-2">
          <div className="md:sticky md:top-20 space-y-3">
            <CourseList
              items={courseItems}
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
      </div>

      {/* 🔹 Org share dialog lives at page root so it overlays correctly */}
      <OrgShareDialog
        open={shareOpen}
        onClose={handleShareClose}
        onCancel={handleShareCancel}   // ← NEW
        courseId={selectedCourse?.id || null}
        courseTitle={selectedCourse?.title || (customTitle || null)}
      />


      {/* Payment slide-over (not shown in org-assignment flow) */}
      {!isOrgFlow && (
        <PaymentWidget
          isOpen={paymentOpen}
          onClose={() => {
            dlog('PaymentWidget.onClose');
            setPaymentOpen(false);
          }}
          title="Unlock Certificate"
          showTutorPreview={false}
        />
      )}
    </div>
  );
};

export default RobotTeacher;
