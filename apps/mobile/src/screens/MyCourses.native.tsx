// apps/mobile/src/pages/MyCourses.native.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import debounce from 'lodash.debounce';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments, useOerCourses, useWrapOerBook } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';
import type { MainStackParamList } from '../navigation/types';
import type { StackNavigationProp } from '@react-navigation/stack';

// ✅ Inline vault list screen (renders under the tab)
import ClassVaultListScreen, { type ClassVaultFilters } from '../screens/ClassVaultListScreen.native';

type TabKey = 'library' | 'courses';
type Nav = StackNavigationProp<MainStackParamList>;

/* ----------------------------- Small UI bits ----------------------------- */
const Chip: React.FC<{ label: string; active?: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw.style(
      'px-3 h-9 rounded-full items-center justify-center mr-2 mb-2',
      active ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]',
    )}
  >
    <Text style={tw.style('text-sm', active ? 'text-white font-semibold' : 'text-[#0d141c] dark:text-white/90')}>
      {label}
    </Text>
  </Pressable>
);

// Compact star text (kept simple like web page)
function StarRow({ avg, count }: { avg?: number; count?: number }) {
  const a = Math.round((avg ?? 0) * 2) / 2;
  const stars = [1, 2, 3, 4, 5]
    .map(i => (a >= i ? '★' : a + 0.5 === i ? '☆' : '☆'))
    .join('');
  return (
    <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>
      {stars} {avg ? avg.toFixed(1) : '—'} ({count ?? 0})
    </Text>
  );
}

/* ----------------------------- Tutor helpers ----------------------------- */

// Safely coerce possible JSON-string objects (e.g. course.user) into real objects
function coerceObj<T = any>(v: unknown): T | undefined {
  if (!v) return undefined;
  if (typeof v === 'object') return v as T;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('{') && s.endsWith('}')) {
      try { return JSON.parse(s) as T; } catch {/* ignore */ }
    }
  }
  return undefined;
}

// Canonical way to pull tutor's user id from many possible shapes
function getTutorUserId(c: any): string | undefined {
  const userObj = coerceObj(c?.user);
  const raw =
    c?.tutor_id ??
    c?.tutorId ??
    c?.instructor?.id ??
    c?.tutor_profile?.id ??
    c?.profile?.id ??
    (userObj ? (userObj as any).id : undefined) ??
    c?.user_id;

  const s = raw == null ? '' : String(raw);
  return s || undefined;
}

// Centralized extractor so tutor name always renders even if backend fields vary
function getTutorInfo(c: unknown): { name: string; id?: string | number } {
  const obj = (c ?? {}) as Record<string, any>;
  const userObj = coerceObj(obj.user);

  const name =
    (typeof obj.tutor === 'string' && obj.tutor) ||
    (typeof obj.tutorName === 'string' && obj.tutorName) ||
    (obj.instructor && typeof obj.instructor.name === 'string' && obj.instructor.name) ||
    (obj.tutor_profile && typeof obj.tutor_profile.name === 'string' && obj.tutor_profile.name) ||
    (obj.profile && typeof obj.profile.name === 'string' && obj.profile.name) ||
    (userObj && typeof (userObj as any).name === 'string' && (userObj as any).name) ||
    '—';

  const id =
    obj.tutorId ??
    obj.tutor_id ??
    obj.instructor?.id ??
    obj.tutor_profile?.id ??
    obj.profile?.id ??
    (userObj ? (userObj as any).id : undefined) ??
    obj.user_id ??
    undefined;

  return { name, id };
}

/* --------------------- OER detection & tutor-upload checks --------------------- */
const s = (x: any) => String(x || '').toLowerCase();

function isOerCourse(c: any): boolean {
  const provider = s(c?.provider);
  const source = s(c?.source || c?.origin || c?.type || c?.category);
  const codeish = s(c?.code || c?.slug || c?.oer_slug);
  return Boolean(
    c?.is_oer ||
      c?.isOer ||
      c?.wrapped_oer ||
      source.includes('oer') ||
      (source.includes('open') && source.includes('text')) ||
      provider.includes('oer') ||
      provider.includes('openstax') ||
      provider.includes('khan') ||
      provider.includes('ck-12') ||
      codeish.includes('oer')
  );
}

function wasUploadedByTutor(c: any): boolean {
  const role = s(c?.uploader_role || c?.created_by_role || c?.owner_role || c?.creatorRole);
  const hasTutorLink =
    Boolean(c?.tutor_id || c?.tutorId || c?.tutor_profile || c?.instructor?.id) ||
    typeof c?.tutor === 'string' ||
    typeof c?.tutorName === 'string';

  if (role) {
    if (['tutor', 'instructor', 'teacher'].includes(role)) return true;
    if (['system', 'oer', 'ingest', 'auto', 'robot'].includes(role)) return false;
  }
  return hasTutorLink;
}

/* ----------------------------- Price / Duration helpers ----------------------------- */
type PriceKey = 'any' | '0-20' | '20-40' | '40-60' | '60+';
const PRICE_RANGES: Record<PriceKey, (n?: number) => boolean> = {
  any: () => true,
  '0-20': (n) => typeof n === 'number' && n >= 0 && n < 20,
  '20-40': (n) => typeof n === 'number' && n >= 20 && n < 40,
  '40-60': (n) => typeof n === 'number' && n >= 40 && n < 60,
  '60+':  (n) => typeof n === 'number' && n >= 60,
};

type DurationKey = 'any' | '<1h' | '1–3h' | '3–6h' | '6h+';

/** best-effort parser: "2h 30m", "150m", "1.5h", "90 min", numbers = hours */
function parseDurationToHours(d?: unknown): number | undefined {
  if (!d) return undefined;
  if (typeof d === 'number' && Number.isFinite(d)) return d;

  const str = String(d).toLowerCase().trim();
  if (!str) return undefined;

  const hMatch = /(\d+(?:\.\d+)?)\s*h/.exec(str);
  const mMatch = /(\d+)\s*m/.exec(str);
  const h = hMatch ? parseFloat(hMatch[1] ?? '0') : 0;
  const m = mMatch ? parseFloat(mMatch[1] ?? '0') : 0;
  if (hMatch || mMatch) return h + m / 60;

  const minOnly = /(\d+)\s*min/.exec(str);
  if (minOnly) return parseFloat(minOnly[1] ?? '0') / 60;

  const plain = parseFloat(str);
  return Number.isFinite(plain) ? plain : undefined;
}

function durationPredicate(key: DurationKey): (hours?: number) => boolean {
  switch (key) {
    case '<1h':  return (h) => typeof h === 'number' && h < 1;
    case '1–3h': return (h) => typeof h === 'number' && h >= 1 && h < 3;
    case '3–6h': return (h) => typeof h === 'number' && h >= 3 && h < 6;
    case '6h+':  return (h) => typeof h === 'number' && h >= 6;
    default:     return () => true;
  }
}

const toPriceNumber = (v?: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.replace(/[^\d.]/g, '');
    const n = parseFloat(m);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

/* ----------------------------- API URL helper ----------------------------- */
const makeApiUrl = (base?: string) => (path: string) => {
  const b = (base || '').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const baseHasApi = /\/api$/.test(b);
  const pathHasApi = /^\/api(\/|$)/.test(p);
  if (baseHasApi && pathHasApi) return b + p.replace(/^\/api/, '');
  if (!baseHasApi && !pathHasApi) return `${b}/api${p}`;
  return b + p;
};

/* --------------------------------- Screen -------------------------------- */
const MyCoursesNative: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { backendUrl, token, profile } = useShopContext();
  const api = makeApiUrl(backendUrl || '');
  const myId = String(profile?.id ?? '');

  // Courses catalog
  const { courses = [], loading, error, fetchCourses } = useCourses({
    backendUrl: backendUrl ?? '',
    token: token ?? '',
  });

  // My enrollments (only used to show "Enrolled/Review" buttons)
  const { enrollments, fetchMine } = useEnrollments({
    backendUrl: backendUrl ?? '',
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  // OER books (free) + wrapper
  const { courses: oerCourses = [], loading: oerLoading, error: oerError } = useOerCourses();
  const { wrapBook } = useWrapOerBook();

  // Tabs
  const [tab, setTab] = useState<TabKey>('library');

  // 🔹 Chip filters (courses tab)
  const [subject, setSubject]     = useState<string>('');
  const [level, setLevel]         = useState<string>('');
  const [durationKey, setDurKey]  = useState<DurationKey>('any');
  const [priceKey, setPriceKey]   = useState<PriceKey>('any');

  // ClassVault filters (for the Library tab)
  const [vaultFilters, setVaultFilters] = useState<ClassVaultFilters>({});
  const clearVaultFilters = useCallback(() => setVaultFilters({}), []);

  // Ratings cache { [courseId]: { avg, count, my } }
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number; my: boolean }>>({});
  const [openReview, setOpenReview] = useState<{ id: string; title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Tutor name cache { [userId]: name }
  const [tutorNameById, setTutorNameById] = useState<Record<string, string>>({});

  // Fetch courses + mine
  useEffect(() => { void fetchCourses(); }, [fetchCourses]);
  useEffect(() => { if (token) void fetchMine(); }, [token, fetchMine]);

  // Fast lookup for enrolled course ids
  const enrolledCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrollments as any[]) {
      const cid = String(e?.course_id ?? e?.courseId ?? '');
      if (cid) set.add(cid);
    }
    return set;
  }, [enrollments]);

  // 🔎 Build data-driven chips
  const subjectsList = useMemo(() => {
    const s = new Set<string>();
    (courses as Course[]).forEach((c: any) => {
      const cand = (c.subject ?? c.category ?? '').toString().trim();
      if (cand) s.add(cand);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const levelsList = useMemo(() => {
    const s = new Set<string>();
    (courses as Course[]).forEach((c: any) => c.level && s.add(String(c.level)));
    if (s.size === 0) ['Beginner', 'Intermediate', 'Advanced'].forEach((x) => s.add(x));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  // 1) Hard filter out OER/wrapped items; keep only tutor-uploaded
  const baseFilteredRows = useMemo(() => {
    return (courses as Course[])
      .filter((c: any) => !isOerCourse(c) && wasUploadedByTutor(c));
  }, [courses]);

  // Client-side filters (courses tab)
  const filteredRows = useMemo(() => {
    const durOk = durationPredicate(durationKey);
    return baseFilteredRows.filter((c: any) => {
      // Subject fuzzy (title/category/subject)
      if (subject) {
        const subj = (c.subject ?? c.category ?? c.title ?? '').toString().toLowerCase();
        if (!subj.includes(subject.toLowerCase())) return false;
      }
      // Level fuzzy
      if (level) {
        const cLevel = (c.level ?? '').toString().toLowerCase();
        if (!cLevel || !cLevel.includes(level.toLowerCase())) return false;
      }
      // Duration
      const hours = parseDurationToHours(c.duration);
      if (!durOk(hours)) return false;

      // Price
      const pnum = toPriceNumber(c.price);
      if (!PRICE_RANGES[priceKey](pnum)) return false;

      return true;
    });
  }, [baseFilteredRows, subject, level, durationKey, priceKey]);

  /* ---------- Tutor name resolution & filtering (web parity) ---------- */
  // Resolve tutor user ids present in filteredRows
  const tutorUserIdsInCourses = useMemo(() => {
    const set = new Set<string>();
    (filteredRows as any[]).forEach((c) => {
      const id = getTutorUserId(c);
      if (id) set.add(id);
    });
    return Array.from(set);
  }, [filteredRows]);

  // Seed cache from embedded user objects
  useEffect(() => {
    const seed: Record<string, string> = {};
    (filteredRows as any[]).forEach((c) => {
      const u = coerceObj<{ id?: string | number; name?: string }>((c as any).user);
      const id = u?.id != null ? String(u.id) : '';
      if (id && typeof u?.name === 'string' && !tutorNameById[id]) {
        seed[id] = u.name;
      }
    });
    if (Object.keys(seed).length) setTutorNameById((prev) => ({ ...prev, ...seed }));
  }, [filteredRows, tutorNameById]);

  // Batch fetch missing tutor names via /api/profile?userIds=...
  const missingTutorUserIds = useMemo(
    () => tutorUserIdsInCourses.filter((id) => !tutorNameById[id]),
    [tutorUserIdsInCourses, tutorNameById]
  );

  const fetchTutorNamesByUserIds = useCallback(async (ids: string[]): Promise<Record<string, string>> => {
    if (!ids.length) return {};
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const url = api(`/api/profile?userIds=${encodeURIComponent(ids.join(','))}`);
      const res = await fetch(url, { headers });
      if (!res.ok) return {};
      const payload = await res.json();
      // Collect simple {id->name} pairs from common response shapes
      const out: Record<string, string> = {};
      const pickIdLocal = (it: any) => String(it?.user_id ?? it?.userId ?? it?.user ?? it?.id ?? '');
      const pickNameLocal = (it: any) => it?.name ?? it?.fullName ?? it?.displayName ?? it?.username ?? '—';
      const add = (it: any) => {
        const id = pickIdLocal(it);
        const name = pickNameLocal(it);
        if (id && name && name !== '—') out[id] = name;
      };
      if (Array.isArray(payload)) payload.forEach(add);
      else if (payload && typeof payload === 'object') {
        const arr =
          payload.profiles ?? payload.items ?? payload.data ?? payload.results ?? payload.rows ?? payload.users;
        if (Array.isArray(arr)) arr.forEach(add);
        else for (const v of Object.values(payload)) if (v && typeof v === 'object') add(v);
      }
      return out;
    } catch { return {}; }
  }, [api, token]);

  useEffect(() => {
    if (!missingTutorUserIds.length) return;
    let cancelled = false;
    (async () => {
      const map = await fetchTutorNamesByUserIds(missingTutorUserIds);
      if (!cancelled && Object.keys(map).length) {
        setTutorNameById((prev) => ({ ...prev, ...map }));
      }
    })();
    return () => { cancelled = true; };
  }, [missingTutorUserIds, fetchTutorNamesByUserIds]);

  // Resolve a display tutor name for a course row
  const resolveTutorName = useCallback((c: any): string | undefined => {
    const rawInfo = getTutorInfo(c);
    const userId = getTutorUserId(c) ?? (rawInfo.id != null ? String(rawInfo.id) : '');
    const name = (userId && tutorNameById[userId]) ? tutorNameById[userId] : rawInfo.name;
    return name && name !== '—' ? name : undefined;
  }, [tutorNameById]);

  // Only show courses that have a resolved tutor name (parity with web)
  const displayRows = useMemo(
    () => filteredRows.filter(c => !!resolveTutorName(c)),
    [filteredRows, resolveTutorName]
  );

  /* ----------------------- Ratings prefetch (visible) ----------------------- */
  const fetchCourseRatings = useCallback(
    async (courseId: string) => {
      try {
        const res = await fetch(`${backendUrl}/api/reviews/courses/${courseId}`);
        if (!res.ok) return;
        const data = await res.json();
        const avg = Number(data?.avgRating ?? 0);
        const count = Number(data?.totalReviews ?? 0);
        const my = Array.isArray(data?.reviews)
          ? data.reviews.some((r: any) => String(r.studentId) === myId)
          : false;
        setRatings((prev) => ({ ...prev, [courseId]: { avg, count, my } }));
      } catch {/* silent */}
    },
    [backendUrl, myId]
  );

  const debouncedFetchCourseRatings = useRef(
    debounce((courseId: string) => { void fetchCourseRatings(courseId); }, 200)
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    for (const it of viewableItems) {
      const id = String(it?.item?.id ?? '');
      if (id && !ratings[id]) debouncedFetchCourseRatings.current(id);
    }
  }).current;

  /* ------------------------------ Rendering ------------------------------ */

  const renderCourseCard = ({ item }: { item: Course }) => {
    const cid = String(item.id);
    const tutorName = resolveTutorName(item);
    const priceDisplay =
      typeof item.price === 'number' ? `$${item.price}` :
      typeof item.price === 'string' ? item.price : '—';

    const isEnrolled = enrolledCourseIds.has(cid);
    const r = ratings[cid];

    return (
      <Pressable
        style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-3 mb-3`}
        onPress={() => navigation.navigate('CourseDetails', { courseId: cid })}
      >
        <View style={tw`flex-row items-start justify-between`}>
          <Text style={tw`font-semibold text-sm flex-1 pr-2 text-slate-900 dark:text-white`} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>{item.level ?? '—'}</Text>
        </View>

        {/* Tutor name (resolved) */}
        <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-1`} numberOfLines={1}>
          {tutorName ?? '—'}
        </Text>

        <View style={tw`flex-row items-center justify-between mt-2`}>
          <Text style={tw`text-xs text-[#49739c] dark:text-white/70`} numberOfLines={1}>
            {String(item.duration ?? '—')}
          </Text>
          <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>{priceDisplay}</Text>
        </View>

        <View style={tw`flex-row items-center justify-between mt-2`}>
          <View>
            {r ? <StarRow avg={r.avg} count={r.count} /> : <Text style={tw`text-xs text-[#49739c] dark:text-white/70 opacity-70`}>—</Text>}
          </View>

          {isEnrolled ? (
            r?.my ? (
              <Pressable
                style={tw`h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
                onPress={() => navigation.navigate('CourseProgress', { courseId: cid })}
              >
                <Text style={tw`text-xs font-semibold text-slate-900 dark:text-white`}>Enrolled</Text>
              </Pressable>
            ) : (
              <Pressable
                style={tw`h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
                onPress={() => setOpenReview({ id: cid, title: item.title })}
              >
                <Text style={tw`text-xs font-semibold text-slate-900 dark:text-white`}>Review</Text>
              </Pressable>
            )
          ) : (
            <Pressable
              style={tw`h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
              onPress={() => navigation.navigate('CourseDetails', { courseId: cid })}
            >
              <Text style={tw`text-xs font-semibold text-slate-900 dark:text-white`}>View</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  // Tabs header (pills)
  const headerTabs = (
    <View style={tw`flex-row self-start rounded-xl p-1 bg-[#e7edf4] dark:bg-[#172534] border border-[#cedbe8] dark:border-white/10`}>
      <Pressable
        onPress={() => setTab('library')}
        style={tw.style('h-9 px-3 rounded-lg items-center justify-center', tab === 'library' && 'bg-white dark:bg-[#0f1821]')}
      >
        <Text style={tw.style('text-xs font-semibold', tab === 'library' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/70')}>
          Explore Videos & Notes
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setTab('courses')}
        style={tw.style('h-9 px-3 rounded-lg items-center justify-center', tab === 'courses' && 'bg-white dark:bg-[#0f1821]')}
      >
        <Text style={tw.style('text-xs font-semibold', tab === 'courses' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/70')}>
          Explore Courses
        </Text>
      </Pressable>
    </View>
  );

  // Optional tiny spinner while role/profile is resolving (defensive)
  if (token && !profile) {
    return (
      <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Checking your account…</Text>
      </View>
    );
  }

  /* ------------------------------- OER Books UI ------------------------------- */
  const oerBooks = useMemo(() => {
    return (oerCourses as any[]).filter((c) => c?.kind === 'book');
  }, [oerCourses]);

  const renderOerBooks = (
    <View style={tw`px-4 mt-2`}>
      <Text style={tw`text-base font-bold text-slate-900 dark:text-white mb-2`}>My Free OER Books</Text>

      {oerLoading && (
        <View style={tw`py-2`}><Text style={tw`text-sm text-[#49739c] dark:text-white/70`}>Loading books…</Text></View>
      )}
      {!!oerError && !oerLoading && (
        <View style={tw`py-2`}><Text style={tw`text-sm text-red-600 dark:text-red-400`}>Failed to load OER books.</Text></View>
      )}

      {!oerLoading && !oerError && oerBooks.length === 0 && (
        <View style={tw`py-2`}><Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>No OER books available.</Text></View>
      )}

      {!oerLoading && !oerError && oerBooks.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-1`}>
          {oerBooks.map((c: any) => {
            const idOrSlug = String(c.slug ?? c.id);
            return (
              <View
                key={idOrSlug}
                style={tw`w-64 mr-3 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-3`}
              >
                <View style={tw`flex-row items-start justify-between`}>
                  <Text style={tw`font-semibold text-sm text-slate-900 dark:text-white flex-1 pr-2`} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={tw`text-[11px] px-2 py-0.5 rounded bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white/90`}>BOOK</Text>
                </View>
                <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-1`} numberOfLines={1}>
                  {(c.subject ?? '—')}{c.level ? ` • ${c.level}` : ''}
                </Text>

                <View style={tw`mt-3 flex-row`}>
                  <Pressable
                    style={tw`flex-1 h-9 rounded-lg bg-[#3d99f5] items-center justify-center`}
                    onPress={async () => {
                      try {
                        const { courseId } = await wrapBook(idOrSlug);
                        navigation.navigate('CourseProgress', { courseId: String(courseId) });
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to start book course');
                      }
                    }}
                  >
                    <Text style={tw`text-white text-xs font-semibold`}>Learn with RobotTeacher</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      {/* Header */}
      <View style={tw`px-4 pt-6 pb-2`}>
        <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>My Courses</Text>
        <Text style={tw`text-[#49739c] dark:text-white/70 text-xs mt-1`}>
          Access your learning library or discover structured courses to level up.
        </Text>

        <View style={tw`mt-3`}>{headerTabs}</View>
      </View>

      {/* Content switches by tab */}
      {tab === 'library' ? (
        // 🔹 Inline ClassVault list (no navigation)
        <View style={tw`flex-1`}>
          <ClassVaultListScreen
            filters={vaultFilters}
            clearFilters={clearVaultFilters}
          />
        </View>
      ) : (
        <View style={tw`flex-1`}>
          {/* OER Books section (parity with web) */}
          {renderOerBooks}

          {/* Title for Courses section */}
          <View style={tw`px-4 mt-3 mb-1`}>
            <Text style={tw`text-[20px] font-bold text-slate-900 dark:text-white`}>Explore Courses</Text>
            <Text style={tw`text-[#49739c] dark:text-white/70 text-xs`}>
              Find the perfect course to enhance your skills and knowledge.
            </Text>
          </View>

          {/* 🔹 FindTutor-style chip filters */}
          <View style={tw`px-0`}>
            {/* Subject */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-2 pr-2 px-4`}>
              <Chip label={subject ? `Subject: ${subject}` : 'Any subject'} active={!!subject} onPress={() => setSubject('')} />
              {subjectsList.map((s) => (
                <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />
              ))}
            </ScrollView>

            {/* Level */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2 px-4`}>
              <Chip label={level ? `Level: ${level}` : 'Any level'} active={!!level} onPress={() => setLevel('')} />
              {levelsList.map((lv) => (
                <Chip key={lv} label={lv} active={level === lv} onPress={() => setLevel(lv)} />
              ))}
            </ScrollView>

            {/* Duration */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2 px-4`}>
              {(['any','<1h','1–3h','3–6h','6h+'] as DurationKey[]).map((k) => (
                <Chip
                  key={k}
                  label={k === 'any' ? 'Any duration' : k}
                  active={durationKey === k}
                  onPress={() => setDurKey(k)}
                />
              ))}
            </ScrollView>

            {/* Price */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2 px-4`}>
              {(['any','0-20','20-40','40-60','60+'] as PriceKey[]).map((k) => (
                <Chip
                  key={k}
                  label={k === 'any' ? 'Any price' : (k === '60+' ? '$60+': `$${k}`)}
                  active={priceKey === k}
                  onPress={() => setPriceKey(k)}
                />
              ))}
            </ScrollView>

            {/* Optional text search (placeholder for future) */}
            <View style={tw`rounded-xl overflow-hidden mt-1 px-4`}>
              <View style={tw`flex-row items-center bg-[#e7edf4] dark:bg-[#172534] h-10 px-3 rounded-xl`}>
                <Text style={tw`text-base mr-2`}>🔎</Text>
                <TextInput
                  placeholder="Search course title"
                  placeholderTextColor="#49739c"
                  onChangeText={() => {/* reserved for future wiring */}}
                  style={tw`flex-1 text-[#0d141c] dark:text-white`}
                  editable={false}
                />
                <Pressable
                  onPress={() => { setSubject(''); setLevel(''); setDurKey('any'); setPriceKey('any'); }}
                  style={tw`ml-2 px-3 h-7 rounded-full bg-white/70 dark:bg-white/10 items-center justify-center`}
                >
                  <Text style={tw`text-xs text-[#0d141c] dark:text-white`}>Reset</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Course list */}
          {loading ? (
            <View style={tw`py-6 items-center`}>
              <ActivityIndicator />
              <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Loading courses…</Text>
            </View>
          ) : error ? (
            <View style={tw`py-6 items-center px-4`}>
              <Text style={tw`text-sm text-red-600 dark:text-red-400 text-center`}>Failed to load courses.</Text>
            </View>
          ) : displayRows.length === 0 ? (
            <View style={tw`py-6 items-center px-4`}>
              <Text style={tw`text-sm text-[#49739c] dark:text-white/70 text-center`}>No courses match your filters.</Text>
            </View>
          ) : (
            <FlatList
              data={displayRows}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCourseCard}
              contentContainerStyle={tw`pb-6 px-4`}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
            />
          )}
        </View>
      )}

      {/* Review modal (lightweight inline) */}
      {openReview && (
        <View style={tw`absolute inset-0 bg-black/40 items-center justify-center p-4`}>
          <View style={tw`w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-4 border border-[#cedbe8] dark:border-white/10`}>
            <Text style={tw`text-lg font-bold mb-1 text-slate-900 dark:text-white`}>Rate this course</Text>
            <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mb-3`}>{openReview.title}</Text>

            <View style={tw`flex-row items-center gap-2 mb-3`}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => setReviewRating(n)}>
                  <Text style={n <= reviewRating ? tw`text-yellow-500 text-2xl` : tw`text-[#49739c] text-2xl`}>★</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Optional comment (max 500 chars)"
              maxLength={500}
              multiline
              style={tw`w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white min-h-[90px]`}
              placeholderTextColor="#7a8aa0"
            />

            <View style={tw`mt-4 flex-row items-center gap-2 justify-end`}>
              <Pressable onPress={() => setOpenReview(null)} style={tw`h-10 px-4 rounded-xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 items-center justify-center`}>
                <Text style={tw`text-sm text-slate-900 dark:text-white`}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={posting || reviewRating < 1}
                onPress={async () => {
                  if (!openReview || reviewRating < 1) return;
                  setPosting(true);
                  try {
                    const res = await fetch(`${backendUrl}/api/reviews/courses/${openReview.id}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
                    });
                    if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Failed to submit review');
                    await fetchCourseRatings(openReview.id);
                    setOpenReview(null);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to submit review');
                  } finally { setPosting(false); }
                }}
                style={tw.style('px-4 h-10 rounded-xl items-center justify-center bg-[#3d99f5]', (posting || reviewRating < 1) && 'opacity-60')}
              >
                <Text style={tw`text-white text-sm font-semibold`}>{posting ? 'Saving…' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default MyCoursesNative;
