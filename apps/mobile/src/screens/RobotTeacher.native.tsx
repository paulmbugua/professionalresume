/* eslint-disable no-console */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import tw from '../../tailwind';

import { useOrgAssignment } from '@mytutorapp/shared/hooks/useOrgAssignment';
import { useAiCourse } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context';
import { useAICertificates } from '@mytutorapp/shared/hooks';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

import type { TopCourse } from '@mytutorapp/shared/types';
import type { MainStackParamList } from '../navigation/types';

import ControlsPanel from './RobotTeacherControls.native';
import LessonAndQuizPane from './RobotTeacherLessonAndQuiz.native';
import OrgShareDialog from '@/screens/org/OrgShareDialog.native';

// ─────────────────────────────────────────────────────────
// Utils / Debug
// ─────────────────────────────────────────────────────────
const dbgEnabled = () => __DEV__;
export const dlog = (...args: any[]) => {
  if (dbgEnabled()) console.log('[RobotTeacher]', ...args);
};

// ─────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────
type RobotTeacherRoute =
  | RouteProp<MainStackParamList, 'ClassVaultLibrary'>
  | RouteProp<MainStackParamList, 'Home'>
  | any;

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

const getCourseBlurb = (c: TopCourse): string => {
  const maybe = (c as unknown as Record<string, unknown>)['description'];
  return typeof maybe === 'string' && maybe.trim() ? (maybe as string) : c.blurb;
};

const normQt = (v?: string | null): 'mcq' | 'short' | undefined => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'short' ? 'short' : s === 'mcq' ? 'mcq' : undefined;
};

// ─────────────────────────────────────────────────────────
// CourseList (native)
// ─────────────────────────────────────────────────────────
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
    <View style={tw`rounded-2xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-3`}>
      {/* Actions */}
      <View style={tw`flex-row items-center gap-2 mb-2`}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search courses…"
          placeholderTextColor="#7a8aa0"
          style={tw`flex-1 rounded-xl px-3 py-2 bg-[#e7edf4] dark:bg-[#172534] text-[#0d141c] dark:text-white`}
        />
        <TouchableOpacity onPress={onRefresh} style={tw`px-3 py-2 rounded-lg bg-white dark:bg-[#172534] border border-[#cedbe8] dark:border-white/15`}>
          <Text style={tw`text-[#0d141c] dark:text-white text-xs font-semibold`}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onLoadMore}
          disabled={!hasMore}
          style={tw.style(
            'px-3 py-2 rounded-lg',
            hasMore ? 'bg-indigo-600' : 'bg-white dark:bg-[#172534] border border-[#cedbe8] dark:border-white/15 opacity-70'
          )}
        >
          <Text style={tw`${hasMore ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-xs font-semibold`}>
            {hasMore ? 'Load more' : 'All loaded'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`md:hidden -mx-1 px-1 pb-2`}>
        <View style={tw`flex-row gap-2`}>
          {visible.length ? (
            visible.map((l, i) => {
              const active = l.id === activeId;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => onSelect(l.id)}
                  style={tw.style(
                    'px-3 py-2 rounded-full border',
                    active
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white dark:bg-[#172534] border-[#cedbe8] dark:border-white/15'
                  )}
                >
                  <Text style={tw`${active ? 'text-white' : 'text-[#0d141c] dark:text-white'} text-xs`}>
                    {String(i + 1).padStart(2, '0')} • {l.title}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>No courses found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Vertical list */}
      <View style={tw`hidden md:flex`}>
        <ScrollView
          style={tw`max-h-[70vh]`}
          contentContainerStyle={[tw`pr-1`, { paddingBottom: 16 }]}
         
        >
          {visible.length ? (
            visible.map((l, i) => {
              const active = l.id === activeId;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => onSelect(l.id)}
                  style={tw.style(
                    'w-full rounded-lg px-3 py-2 mb-2 border',
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-600'
                      : 'bg-white dark:bg-[#172534] border-[#cedbe8] dark:border-white/10'
                  )}
                >
                  <View style={tw`flex-row items-center gap-2`}>
                    <Text style={tw`text-[#49739c] dark:text-white/70 text-[11px]`}>
                      {String(i + 1).padStart(2, '0')}
                    </Text>
                    <Text style={tw`text-[#0d141c] dark:text-white flex-1`} numberOfLines={1}>
                      {l.title}
                    </Text>
                  </View>
                  {l.blurb ? (
                    <Text style={tw`text-[#49739c] dark:text-white/70 text-[11px] mt-0.5`} numberOfLines={2}>
                      {l.blurb}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>No courses found. Try another search.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────
const RobotTeacher: React.FC<RobotTeacherProps> = ({
  defaultVoice = 'en-US-JennyNeural',
  initialSsml = '',
  voiceName,
  themeOpen: themeOpenProp,
  onThemeOpenChange,
}) => {

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const route = useRoute<RobotTeacherRoute>();

  const params = (route.params ?? {}) as {
    assignmentId?: string | null;
    courseId?: string | null;
    qt?: 'mcq' | 'short' | string | null;
  };

  const urlQuizTypeHint = normQt(params.qt);

  useEffect(() => {
    dlog('mounted', { DBG_ENABLED: dbgEnabled(), params });
  }, [params]);

  const [isMaximized, setIsMaximized] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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
    urlQuizTypeHint,
    defaultQuizType: 'mcq',
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
    onBeforePlay: aiOnBeforePlay,
    onEnded: aiOnEnded,
    currentIdx,
    getLessonAt,
    goNext,
    isBuildingNext,
    clearSelectedCourseCacheNow,
    clearTopCoursesCacheNow,
  } = ai as any;

  const { skus, loading: aiCertLoading, error: aiCertError, message: aiCertMsg, claim, generate: generateAICert } =
    useAICertificates({ backendUrl, token: token || '', courseId: selectedCourse?.id });

  const orgAssign = useOrgAssignment();
  const assignmentId = orgAssign?.assignmentId ?? undefined;
  const isOrgFlow = Boolean(orgAssign?.assignmentId);

  // knobs
  const [classLevel, setClassLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [sizePreset, setSizePreset] = useState<SizePresetKey>('standard');
  const [minutes, setMinutes] = useState<number>(20);
  const [totalLessons, setTotalLessons] = useState<number>(8);
  const [quizCount, setQuizCount] = useState<number>(16);
  const [programTrack, setProgramTrack] = useState<TrackKey>('module');
  const [customTitle, setCustomTitle] = useState('');
  const [uiPreparing, setUiPreparing] = useState(false);
  const [playerReady, setPlayerReady] = useState(false); 
  const prevCourseIdRef = useRef<string | null>(null);

  // overrides (parity with web)
  const [overrideLessons, setOverrideLessons] = useState(false);
  const [overrideQuiz, setOverrideQuiz] = useState(false);

  const defaultQuizForLessons = (n: number) => Math.max(4, n * 2);

  // timer
  const [localRemainingMs, setLocalRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    if (localRemainingMs == null || localRemainingMs <= 0) return;
    const id = setInterval(() => {
      setLocalRemainingMs((ms) => (ms == null ? null : Math.max(0, ms - 1000)));
    }, 1000);
    return () => clearInterval(id);
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

  // org role context
  const { activeOrgId, org: orgCtx, isStarterTier } = useOrg();
  const rolesRaw = [
    ...(Array.isArray(orgCtx?.roles) ? orgCtx.roles : []),
    orgCtx?.my_role,
    orgCtx?.role,
  ].filter(Boolean).map((r) => String(r).toLowerCase());
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

  // 🔒 locked config
  const lockedMinutes  = (orgAssign as any)?.lockedConfig?.minutes as number | undefined;
  const lockedLessons  = (orgAssign as any)?.lockedConfig?.totalLessons as number | undefined;
  const lockedQuizSize = (orgAssign as any)?.lockedConfig?.quizSize as number | undefined;

  const minutesEffective = isLockedLearner
    ? capMinutes(typeof lockedMinutes === 'number' ? lockedMinutes : minutes)
    : minutes;

  // parity with web: compute *effective* values first…
  const lessonsEffective = isLockedLearner
    ? (typeof lockedLessons === 'number' ? Math.max(1, lockedLessons) : trackLessons)
    : (overrideLessons ? totalLessons : trackLessons);

  const quizEffective = isLockedLearner
    ? (typeof lockedQuizSize === 'number' ? Math.max(4, lockedQuizSize) : 16)
    : (overrideQuiz ? quizCount : defaultQuizForLessons(lessonsEffective));

  // …and the *safe* values we actually pass down
  const safeLessons = lessonsEffective;
  const safeQuiz = quizEffective;

  // reflect lock defaults
  useEffect(() => {
    if (!isLockedLearner) return;
    const lc = (orgAssign as any)?.lockedConfig || {};
    if (typeof lc.minutes === 'number') setMinutes(capMinutes(lc.minutes));
    if (typeof lc.totalLessons === 'number') setTotalLessons(Math.max(1, lc.totalLessons));
    if (typeof lc.quizSize === 'number') setQuizCount(Math.max(4, lc.quizSize));
  }, [isLockedLearner, orgAssign?.lockedConfig]);

  // keep counts in sync with track when not overriding (parity with web)
  useEffect(() => {
    if (!isLockedLearner && !overrideLessons) {
      setTotalLessons(trackLessons);
    }
    if (!isLockedLearner && !overrideQuiz) {
      setQuizCount(defaultQuizForLessons(trackLessons));
    }
  }, [trackLessons, isLockedLearner, overrideLessons, overrideQuiz]);

  // starter tier caps
  useEffect(() => {
    if (!restrictStarter || isLockedLearner) return;
    setMinutes((m) => capMinutes(m));
    setTotalLessons(trackLessons);
    setQuizCount(16);
  }, [restrictStarter, trackLessons, isLockedLearner]);

  useEffect(() => {
    dlog('env', { backendUrl, tokenPresent: Boolean(token), canShareUi, isInstructor, activeOrgId, isOrgFlow });
  }, [backendUrl, token, canShareUi, isInstructor, activeOrgId, isOrgFlow]);

  // load top courses on mount
  useEffect(() => {
    (async () => {
      const preserveIds = params.courseId ? [params.courseId] : [];
      try {
        dlog('loadTopCourses:init {limit:200, preserveIds}', { preserveIds });
        await loadTopCourses?.({ limit: 200, preserveIds } as any);
      } catch {
        try {
          dlog('loadTopCourses:init fallback ()');
          await loadTopCourses?.();
        } catch { /* ignore */ }
      }
    })();
  }, [params.courseId, loadTopCourses]);

  // preselect course from route param
  useEffect(() => {
    if (!params.courseId || !topCourses?.length) return;
    if (selectedCourse?.id === params.courseId) return;
    const found = topCourses.find((c: TopCourse) => c.id === params.courseId) || null;
    if (found) {
      setUiPreparing(true);
      setPlayerReady(false); 
      selectCourse(found);
    }
  }, [params.courseId, topCourses, selectedCourse, selectCourse]);

  useEffect(() => { if (isLockedLearner) setShareOpen(false); }, [isLockedLearner]);

  useEffect(() => {
    if (!selectedCourse && Array.isArray(topCourses) && topCourses.length > 0 && !customTitle.trim()) {
      dlog('auto-selecting first course', { id: topCourses[0]?.id, title: topCourses[0]?.title });
      selectCourse(topCourses[0]);
    }
  }, [topCourses, selectedCourse, selectCourse, customTitle]);

  const handleLoadMore = async () => {
    const preserveIds = params.courseId ? [params.courseId] : [];
    const compat = ai as any;
    const coursesCursor: string | null = compat?.coursesCursor ?? compat?.nextCursor ?? null;
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
    const preserveIds = params.courseId ? [params.courseId] : [];
    dlog('refreshCourseList → clearTopCoursesCacheNow + reload', { preserveIds });
    try { await clearTopCoursesCacheNow?.(); } catch {}
    try {
      await loadTopCourses?.({ limit: 200, preserveIds } as any);
    } catch {
      await loadTopCourses?.({ preserveIds } as any);
    }
  }, [clearTopCoursesCacheNow, loadTopCourses, params.courseId]);

  const hasAIContent = useMemo(
    () => Boolean(
      (joinedSsml && String(joinedSsml).trim()) ||
      (ssml && String(ssml).trim()) ||
      (Array.isArray(lessons) && lessons.length > 0)
    ),
    [joinedSsml, ssml, lessons]
  );

  const lessonsArr = useMemo(() => {
    const L = typeof getLessonAt === 'function' ? getLessonAt(currentIdx) : null;
    return L ? [L] : [];
  }, [getLessonAt, currentIdx]);

  useEffect(() => {
    if (hasAIContent) setIsMaximized(true);
  }, [hasAIContent]);

  const displaySsml: string = (hasAIContent ? (joinedSsml || ssml || '') : (initialSsml || '')).trim();

  // Auth helpers
  const goToLoginWithReturn = (reason?: string, message?: string) => {
    dlog('navigate → Login', { reason, message });
    navigation.navigate('Login' as any, { reason, message } as any);
  };
  const requireAuth = (reason?: string, message?: string) => {
    if (token) return true;
    goToLoginWithReturn(reason, message);
    return false;
  };

  // Quiz answer helper
  const disableQuiz = Boolean(
    (isOrgFlow && ((orgAssign?.expired) || (localRemainingMs !== null && localRemainingMs <= 0))) || grade
  );
  const handleAnswer = useCallback((qid: string, value: number | string) => {
    if (disableQuiz) return;
    answerQuestion(qid, value);
  }, [disableQuiz, answerQuestion]);

  // Start
  const onStart = useCallback(async () => {
    const courseSize = sizeToCourseSize[sizePreset];
    setUiPreparing(true);
    setPlayerReady(false);
    try {
      // if no selected course and there’s a custom title, mirror the web path
      if (!selectedCourse && customTitle.trim()) {
        await startCustomTopic(customTitle.trim(), {
          assignmentId,
          courseSize,
          level: classLevel,
          minutes: minutesEffective,
          programTrack,
          totalLessons: safeLessons,
          voiceName: effectiveVoice,
        });
      } else {
        await startWithAI({
          assignmentId,
          courseSize,
          level: classLevel,
          minutes: minutesEffective,
          programTrack,
          totalLessons: safeLessons,
          voiceName: effectiveVoice,
        });
      }
    } catch (e) {
      setUiPreparing(false);
      throw e;
    }
  }, [
    assignmentId, sizePreset, classLevel, minutesEffective, programTrack, safeLessons,
    effectiveVoice, startWithAI, startCustomTopic, selectedCourse, customTitle
  ]);

  // show Preparing… when switching courses
  useEffect(() => {
    const cid = selectedCourse?.id || null;
    if (prevCourseIdRef.current === null) {
      prevCourseIdRef.current = cid;
      return;
    }
    if (cid !== prevCourseIdRef.current) {
      setUiPreparing(true);
      setPlayerReady(false);
      prevCourseIdRef.current = cid;
    }
  }, [selectedCourse?.id]);

  // drop spinner on AI/TTS errors
  useEffect(() => { if (error || ttsError) setUiPreparing(false); }, [error, ttsError]);

  const refreshSelectedAI = useCallback(async () => {
    if (!selectedCourse) return;
    Alert.alert(
      'Refresh AI Content',
      'This clears the cached outline, narration, and quiz, then regenerates fresh content.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          style: 'destructive',
          onPress: async () => {
            dlog('refreshSelectedAI → clearSelectedCourseCacheNow then reseed', { courseId: selectedCourse.id });
            setUiPreparing(true);
            try { await clearSelectedCourseCacheNow?.(); } catch {}
            selectCourse(selectedCourse);
            await onStart();
          },
        },
      ]
    );
  }, [selectedCourse, clearSelectedCourseCacheNow, selectCourse, onStart]);

  // Compat flags from hook (for "hasMore")
  const compat = ai as any;
  const hasMoreCourses: boolean = Boolean(compat?.hasMoreCourses ?? compat?.coursesHasMore ?? compat?.hasMore);
  const degraded: boolean = Boolean(compat?.degradedNotice?.degraded);

   return (
    <SafeAreaView edges={['bottom']} style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView
        contentContainerStyle={[
          tw`px-3 py-4 md:px-5 md:py-6`,
          { paddingBottom: (insets?.bottom ?? 0) + 24 } // keep last items above footer
        ]}
      >
        {/* LEFT (main) */}
        <View style={tw`${showCourseList ? 'md:w-2/3' : 'md:w-full'} w-full`}>
          <View style={tw`mb-4`}>
            <Text style={tw`text-[#0d141c] dark:text-white font-black text-2xl md:text-3xl`}>AI Tutor Studio</Text>
            <Text style={tw`text-[#49739c] dark:text-white/80 mt-1`}>
              Free lesson (audio + captions + slides) and quiz. Score <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>≥ 70%</Text> to unlock your certificate
              {isOrgFlow ? ' — covered by your organization' : ''}.
            </Text>
          </View>

          {/* Share dialog near header */}
          <Modal visible={canShareUi && shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
            <OrgShareDialog
              open={canShareUi && shareOpen}
              onClose={() => setShareOpen(false)}
              courseId={selectedCourse?.id || null}
              courseTitle={selectedCourse?.title || (customTitle || null)}
              totalLessons={safeLessons}
              quizCount={safeQuiz}
              minutes={capMinutes(minutes)}
            />
          </Modal>

          {degraded && (
            <View style={tw`rounded-xl p-3 bg-yellow-50 border border-yellow-300 mb-3`}>
              <Text style={tw`text-yellow-700 dark:text-yellow-200 text-sm`}>
                High demand fallback: content may be simplified, but your progress still counts.
              </Text>
            </View>
          )}

          {/* Step indicator */}
          <View style={tw`flex-row flex-wrap items-center gap-2 mb-3`}>
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
                <View
                  key={s.k}
                  style={tw.style(
                    'px-2 py-1 rounded-full border',
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-600'
                      : 'bg-white dark:bg-[#172534] border-[#cedbe8] dark:border-white/10'
                  )}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white text-[11px]`}>
                    {i + 1}. {s.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Controls */}
          <ControlsPanel
            showMinimalControls={showMinimalControls}
            isLockedLearner={isLockedLearner}
            canShareUi={canShareUi}
            restrictStarter={restrictStarter}
            knobsDisabled={knobsDisabled}
            onOpenShare={() => { setIsMaximized(false); setShareOpen(true); }}
            busy={uiPreparing || !playerReady ||  step === 'outlining' || step === 'narrating' || ttsLoading}
            topCourses={(topCourses || []).map((c: TopCourse) => ({ id: c.id, title: c.title }))}
            selectedCourse={selectedCourse ? { id: selectedCourse.id, title: selectedCourse.title } : null}
            onSelectCourse={(id) => {
              const found = (topCourses || []).find((c: TopCourse) => c.id === id) || null;
              dlog('CourseSelect.onChange/Select →', { id, foundTitle: found?.title });
              setUiPreparing(true);
              selectCourse(found);
            }}

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

            // override toggles (if your native Controls has switches; otherwise ignore)
            totalLessons={totalLessons}
            setTotalLessons={setTotalLessons}
            quizCount={quizCount}
            setQuizCount={setQuizCount}

            customTitle={customTitle}
            setCustomTitle={(s: string) => {
              setCustomTitle(s);
              if (s.trim()) selectCourse(null);
            }}

            hasAIContent={hasAIContent}
            onStart={onStart}
            onRefreshSelectedAI={refreshSelectedAI}
          />

          {/* Classroom / Outline / Quiz */}
          <LessonAndQuizPane
            compactPlayer={true}
            showCourseList={showCourseList}
            displaySsml={displaySsml}
            onNext={goNext}
            isBuildingNext={isBuildingNext}
            onPlayerReady={() => {
              setPlayerReady(true);   // ⬅️ NEW
              setUiPreparing(false);
            }}
            lessonsArr={lessonsArr}
            voiceName={voiceName || defaultVoice}
            courseTitle={selectedCourse?.title || (customTitle || 'AI Lesson')}
            isMaximized={isMaximized}
            onToggleMaximized={() => setIsMaximized((v: boolean) => !v)}
            course={selectedCourse || null}
            currentIdx={currentIdx}
            outline={outline}
            backendUrl={backendUrl}
            onBeforePlay={async () => { dlog('Classroom onBeforePlay (hook)'); await aiOnBeforePlay?.(); }}
            onEnded={() => { dlog('Classroom onEnded (hook)'); aiOnEnded?.(); }}
            themeOpen={themeOpen}
            onThemeOpenChange={(open: boolean) => { dlog('themeOpen →', open); setThemeOpen(open); }}

            isOrgFlow={isOrgFlow}
            assignmentId={assignmentId}
            timerSec={timerSec}
            generateQuizNow={async (
              count?: number,
              _courseSize?: string,
              _programTrack?: string,
              _totalLessons?: number,
              assignmentIdFromChild?: string,
              quizType?: 'mcq' | 'short',
              opts?: { lessonIndex?: number }
            ) => {
              const n = typeof count === 'number' ? count : safeQuiz;
              await generateQuizNow(
                n,
                sizeToCourseSize[sizePreset] as any,
                programTrack as any,
                safeLessons,
                assignmentIdFromChild ?? assignmentId,
                quizType,
                opts
              );
            }}

            safeLessons={safeLessons}
            safeQuiz={safeQuiz}

            quiz={quiz}
            answers={answers}
            onAnswer={handleAnswer}
            allAnswered={allAnswered}
            grade={grade}
            gradeNow={async () => { await gradeNow(); }}
            token={token || ''}
            requireAuth={requireAuth}

            // cert + payments
            isOrgFlowFlag={isOrgFlow}
            skus={skus}
            aiCertLoading={aiCertLoading}
            aiCertError={aiCertError}
            aiCertMsg={aiCertMsg}
            claim={async (code: string) => { await claim(code); }}
            tryGenerateCertificate={tryGenerateCertificate}
            generateAICert={generateAICert}
            paymentOpen={false}
            setPaymentOpen={() => {}}
            certUrl={null}
            setCertUrl={() => {}}
            downUrl={null}
            setDownUrl={() => {}}

            // timer + lock
            localRemainingMs={localRemainingMs}
            setLocalRemainingMs={setLocalRemainingMs}
            displayRemainingMs={displayRemainingMs}
            disableQuiz={disableQuiz}

            // results navigation
            onViewResults={(courseId: string, courseTitle: string, g: { scorePct: number; passMark: number; passed: boolean }) => {
              dlog('navigate → Results', { courseId, courseTitle, grade: g });
              navigation.navigate('ClassVaultDetail', { id: Number(courseId) } as any);
            }}
          />
        </View>

        {/* RIGHT (course list) */}
        {showCourseList && (
          <View style={tw`w-full md:w-1/3 mt-4 md:mt-0 md:pl-4`}>
            <CourseList
              items={(topCourses || []).map((c: TopCourse) => ({
                id: c.id,
                title: c.title,
                blurb: getCourseBlurb(c),
              }))}
              activeId={selectedCourse?.id || null}
              onSelect={(id) => {
                const found = (topCourses || []).find((c: TopCourse) => c.id === id) || null;
                dlog('CourseList.onSelect', { id, title: found?.title });
                setUiPreparing(true);
                setPlayerReady(false);
                selectCourse(found);
              }}
              onRefresh={refreshCourseList}
              onLoadMore={handleLoadMore}
              hasMore={Boolean(hasMoreCourses)}
            />
          </View>
        )}
      </ScrollView>
     </SafeAreaView>
  );
};

export default RobotTeacher;
