// apps/mobile/src/pages/MyCourses.native.tsx
/* eslint-disable no-console */
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
  Image,
  Linking,
  useWindowDimensions,
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

/* ----------------------------- Helpers ----------------------------- */

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

/* Duration / Price filtering */
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

/* ----------------------------- API URL & Routes ----------------------------- */
const makeApiUrl = (base?: string) => (path: string) => {
  const b = (base || '').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const baseHasApi = /\/api$/.test(b);
  const pathHasApi = /^\/api(\/|$)/.test(p);
  if (baseHasApi && pathHasApi) return b + p.replace(/^\/api/, '');
  if (!baseHasApi && !pathHasApi) return `${b}/api${p}`;
  return b + p;
};

const toWebBase = (base?: string) => (base || '').replace(/\/+$/, '').replace(/\/api$/i, '');

const sanitizeId = (routeId?: string) => {
  let s = routeId ?? '';
  try { s = decodeURIComponent(s); } catch {}
  if (s.startsWith(':id')) s = s.slice(3);
  if (s.startsWith(':')) s = s.slice(1);
  return s;
};

/* --------------------- OER Video Collection helpers --------------------- */
type OerCollection = {
  id: string | number;
  title: string;
  description?: string;
  subject?: string;
  thumbnail_url?: string | null;
  cover_url?: string | null;
  items_count?: number;
  created_at?: string;
  content_kind?: string | null;
  provider?: string | null;
  collection_type?: string | null;
  slug?: string | null;
  [k: string]: any;
};

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

const isOerVideoCollectionStrict = (c: OerCollection): boolean => {
  const kind = norm(c.content_kind);
  if (kind === 'video' || kind === 'videos') return true;

  // Accept common “video-ish” collection hints
  const ctype = norm(c.collection_type);
  if (ctype.includes('video') || ctype.includes('playlist')) return true;

  const title = norm(c.title);
  if (/\b(video|playlist|lecture|record(ed)?|stream)\b/.test(title)) return true;

  return false;
};

const isOpenStaxDoc = (c: OerCollection): boolean => {
  const prov = norm(c.provider);
  const slug = norm(c.slug);
  const title = norm(c.title);
  return prov.includes('openstax') || slug.includes('openstax') || title.includes('openstax');
};

// Extra guard: explicit doc-kind check
const isDocKind = (c: OerCollection): boolean => {
  const kind = norm(c.content_kind);
  return kind === 'doc' || kind === 'docs';
};

// Normalize varied payloads
function toArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.data)) return parsed.data;
      return [];
    } catch { return []; }
  }
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data)) return val.data;
  if (Array.isArray(val?.rows)) return val.rows;
  if (typeof val === 'object') {
    for (const k of ['collections', 'results', 'list']) {
      if (Array.isArray((val as any)[k])) return (val as any)[k];
    }
    const vals = Object.values(val);
    return vals.every((v) => typeof v === 'object') ? (vals as T[]) : [];
  }
  return [];
}

/* ----------------------------- Small cards ----------------------------- */
const OerVideoCard: React.FC<{
  col: OerCollection;
  onPress: () => void;
}> = ({ col, onPress }) => {
  const thumb =
    col.cover_url ||
    col.thumbnail_url ||
    `https://picsum.photos/seed/${encodeURIComponent(String(col.slug ?? col.id ?? col.title ?? 'oer'))}/800/450`;

  return (
    <Pressable
      onPress={onPress}
      style={tw`flex-1 mr-3 mb-3 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-3`}
    >
      <Image
        source={{ uri: thumb }}
        style={tw`w-full h-36 rounded-lg bg-slate-200 dark:bg-white/5`}
        resizeMode="cover"
      />
      <Text style={tw`mt-2 font-semibold text-sm text-slate-900 dark:text-white`} numberOfLines={2}>
        {col.title}
      </Text>
      <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-0.5`} numberOfLines={1}>
        {(col.subject ?? '—')} • {col.items_count ?? 0} item{(col.items_count ?? 0) === 1 ? '' : 's'}
      </Text>
      <View style={tw`mt-2`}>
        <Text style={tw`text-[11px] px-2 py-0.5 self-start rounded bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white/90`}>
          VIDEO
        </Text>
      </View>
    </Pressable>
  );
};

const OerBookCard: React.FC<{
  book: any;
  onReader: () => void;
  onLearn: () => void;
}> = ({ book, onReader, onLearn }) => {
  const thumb =
    book.thumbnail_url ||
    book.cover_url ||
    `https://picsum.photos/seed/${encodeURIComponent(String(book.slug ?? book.id ?? book.title ?? 'oer'))}/800/450`;

  // 👉 Reader on top, RobotTeacher below
  return (
    <View style={tw`w-1/2 pr-2 mb-3`}>
      <View style={tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-3`}>
        <Image
          source={{ uri: thumb }}
          style={tw`w-full h-36 rounded-lg bg-slate-200 dark:bg-white/5`}
          resizeMode="cover"
        />
        <View style={tw`mt-2 flex-row items-start justify-between`}>
          <Text style={tw`font-semibold text-sm text-slate-900 dark:text-white flex-1 pr-2`} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={tw`text-[11px] px-2 py-0.5 rounded bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white/90`}>BOOK</Text>
        </View>
        <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-1`} numberOfLines={1}>
          {(book.subject ?? '—')}{book.level ? ` • ${book.level}` : ''}
        </Text>

        <View style={tw`mt-3`}>
          <Pressable style={tw`h-10 rounded-lg bg-[#3d99f5] items-center justify-center mb-2`} onPress={onReader}>
            <Text style={tw`text-white text-xs font-semibold`}>Reader</Text>
          </Pressable>
          <Pressable
            style={tw`h-10 rounded-lg bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 items-center justify-center`}
            onPress={onLearn}
          >
            <Text style={tw`text-xs font-semibold text-slate-900 dark:text-white`}>RobotTeacher</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

/* --------------------------------- Screen -------------------------------- */
const MyCoursesNative: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { backendUrl, token, profile } = useShopContext();
  const api = React.useMemo(() => makeApiUrl(backendUrl || ''), [backendUrl]);
  const myId = String(profile?.id ?? '');
  const { height } = useWindowDimensions();

  // sensible viewport allocations so each section gets room to scroll
  const SECTION_MIN = 440;
  const classesHeight = Math.max(SECTION_MIN, Math.floor(height * 0.52));
  const videosHeight  = Math.max(SECTION_MIN, Math.floor(height * 0.52));

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

  // ------------------ Available Classes (Vault) filters ------------------
  const CLASS_SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const;
  const CLASS_GRADES = ['Any', 'Primary', 'Middle', 'High', 'College'] as const;
  const TOP_COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'India', 'Kenya', 'France', 'South Africa', 'Nigeria', 'Qatar'] as const;

  const [classSubject, setClassSubject] = useState<string>('');  // '' == Any subject
  const [classGrade, setClassGrade]     = useState<string>('');  // '' == Any grade
  const [classCountry, setClassCountry] = useState<string>('');  // '' == Any country

  // ClassVault filters (for the Library tab)
  const [vaultFilters, setVaultFilters] = useState<ClassVaultFilters>({});
  const clearVaultFilters = useCallback(() => {
    setClassSubject('');
    setClassGrade('');
    setClassCountry('');
    setVaultFilters({});
  }, []);

  // Keep ClassVaultListScreen in sync with our filter chips
  useEffect(() => {
    setVaultFilters(prev => ({
      ...prev,
      subject: classSubject || undefined,
      grade:   classGrade   || undefined,
      country: classCountry || undefined,
    }));
  }, [classSubject, classGrade, classCountry]);

  // Ratings cache { [courseId]: { avg, count, my } }
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number; my: boolean }>>({});
  const [openReview, setOpenReview] = useState<{ id: string; title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Tutor name cache { [userId]: name }
  const [tutorNameById, setTutorNameById] = useState<Record<string, string>>({});

  // OER Video collections state (Library tab)
  const [oerVideoCols, setOerVideoCols] = useState<OerCollection[]>([]);
  const [loadingVCols, setLoadingVCols] = useState(false);
  const [errVCols, setErrVCols] = useState<string | null>(null);

  // OER Videos in-section filters
  const [oerVideoSubject, setOerVideoSubject] = useState<string>(''); // '' == Any subject

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
        const cLevel = (c.level ?? '').toString().lowerCase?.() ?? String(c.level ?? '').toLowerCase();
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
  const tutorUserIdsInCourses = useMemo(() => {
    const set = new Set<string>();
    (filteredRows as any[]).forEach((c) => {
      const id = getTutorUserId(c);
      if (id) set.add(id);
    });
    return Array.from(set);
  }, [filteredRows]);

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
  },[backendUrl, token, api]);

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

  const resolveTutorName = useCallback((c: any): string | undefined => {
    const rawInfo = getTutorInfo(c);
    const userId = getTutorUserId(c) ?? (rawInfo.id != null ? String(rawInfo.id) : '');
    const name = (userId && tutorNameById[userId]) ? tutorNameById[userId] : rawInfo.name;
    return name && name !== '—' ? name : undefined;
  }, [tutorNameById]);

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

  /* ----------------------- OER Video Collections fetch ----------------------- */
  useEffect(() => {
    if (!backendUrl) return;
    const ac = new AbortController();
    (async () => {
      setLoadingVCols(true); setErrVCols(null);
      try {
        let r = await fetch(api('/oer/collections?kind=video&limit=48'), { signal: ac.signal });
        let arr = r.ok ? toArray<OerCollection>(await r.json().catch(() => [])) : [];
        if (arr.length === 0) {
          r = await fetch(api('/oer/collections?kind=videos&limit=48'), { signal: ac.signal });
          if (r.ok) arr = toArray<OerCollection>(await r.json().catch(() => []));
        }
        if (arr.length === 0) {
          r = await fetch(api('/oer/collections?limit=48'), { signal: ac.signal });
          if (r.ok) {
            const all = toArray<OerCollection>(await r.json().catch(() => []));
            arr = all.filter((c) => isOerVideoCollectionStrict(c) && !isDocKind(c) && !isOpenStaxDoc(c));
          }
        }
        const cleaned = arr.filter((c) => isOerVideoCollectionStrict(c) && !isDocKind(c) && !isOpenStaxDoc(c));
        setOerVideoCols(cleaned);
      } catch (e: any) {
        if (!ac.signal.aborted) setErrVCols(String(e?.message || e) || 'Failed to fetch');
      } finally {
        if (!ac.signal.aborted) setLoadingVCols(false);
      }
    })();
    return () => ac.abort();
  }, [backendUrl, api]);

  /* ------------------------------- OER Books data ------------------------------- */
  const oerBooks = useMemo(() => {
    return (oerCourses as any[]).filter((c) => c?.kind === 'book');
  }, [oerCourses]);

  const openOerReader = useCallback((idOrSlug: string | number) => {
    const web = toWebBase(backendUrl || '');
    const url = `${web}/oer/${encodeURIComponent(sanitizeId(String(idOrSlug)))}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Open Reader', 'Could not open the reader link.');
    });
  }, [backendUrl]);

  /* ------------------------------ Rendering ------------------------------ */

  if (token && !profile) {
    return (
      <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Checking your account…</Text>
      </View>
    );
  }

  // Course card (Courses tab)
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
          Explore Videos &amp; Notes
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

  /* --------------------------- OER Videos UI (vertical) --------------------------- */
  const oerVideoSubjects = useMemo(() => {
    const s = new Set<string>();
    oerVideoCols.forEach(c => {
      const subj = (c.subject ?? '').toString().trim();
      if (subj) s.add(subj);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [oerVideoCols]);

  const filteredOerVideos = useMemo(() => {
    if (!oerVideoSubject) return oerVideoCols; // '' == Any
    const key = oerVideoSubject.toLowerCase();
    return oerVideoCols.filter(c => (c.subject ?? '').toString().toLowerCase().includes(key));
  }, [oerVideoCols, oerVideoSubject]);

  const renderOerVideoItem = ({ item }: { item: OerCollection }) => (
    <OerVideoCard
      col={item}
      onPress={() => navigation.navigate('VideoCollection', { id: String(item.slug ?? item.id) })}
    />
  );

  /* --------------------------- COURSES TAB LIST --------------------------- */
  const CoursesListHeader = (
    <View>
      {/* Title */}
      <View style={tw`mt-3 mb-1`}>
        <Text style={tw`text-[20px] font-bold text-slate-900 dark:text-white px-0`}>Explore Courses</Text>
        <Text style={tw`text-[#49739c] dark:text-white/70 text-xs px-0`}>
          Find the perfect course to enhance your skills and knowledge.
        </Text>
      </View>

      {/* Filters (scroll with content) */}
      <View style={tw`px-0`}>
        {/* Subject */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-2 pr-2`}>
          <Chip label={subject ? `Subject: ${subject}` : 'Any subject'} active={!!subject} onPress={() => setSubject('')} />
          {subjectsList.map((s) => (
            <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />
          ))}
        </ScrollView>

        {/* Level */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
          <Chip label={level ? `Level: ${level}` : 'Any level'} active={!!level} onPress={() => setLevel('')} />
          {levelsList.map((lv) => (
            <Chip key={lv} label={lv} active={level === lv} onPress={() => setLevel(lv)} />
          ))}
        </ScrollView>

        {/* Duration */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
          {(['any','0-20','20-40','40-60','60+'] as PriceKey[]).map((k) => (
            <Chip
              key={k}
              label={k === 'any' ? 'Any price' : (k === '60+' ? '$60+': `$${k}`)}
              active={priceKey === k}
              onPress={() => setPriceKey(k)}
            />
          ))}
        </ScrollView>

        {/* Search + Reset */}
        <View style={tw`rounded-xl overflow-hidden mt-1`}>
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

      {/* My Free OER Books (AFTER filters and scrolls with content) */}
      <View style={tw`mt-4`}>
        <Text style={tw`text-base font-bold text-slate-900 dark:text-white mb-2 px-0`}>My Free OER Books</Text>

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
          <View style={tw`-mx-1 px-1`}>
            {/* 2-column vertical grid */}
            <View style={tw`flex-row flex-wrap`}>
              {oerBooks.map((c: any) => {
                const idOrSlug = String(c.slug ?? c.id);
                return (
                  <OerBookCard
                    key={idOrSlug}
                    book={c}
                    onReader={() => openOerReader(idOrSlug)}
                    onLearn={async () => {
                      try {
                        const { courseId } = await wrapBook(idOrSlug);
                        navigation.navigate('CourseProgress', { courseId: String(courseId) });
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to start book course');
                      }
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={tw`h-[1px] bg-[#cedbe8] dark:bg-white/10 my-4`} />
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
        <View style={tw`flex-1 px-4`}>
          {/* ───── Available Classes: filters + vertically scrollable list ───── */}
          <Text style={tw`text-base font-bold text-slate-900 dark:text-white mb-2`}>Available Classes</Text>

          {/* Filters that affect ClassVaultListScreen; include Any subject/grade/country */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
            <Chip label={classSubject ? `Subject: ${classSubject}` : 'Any subject'} active={!!classSubject} onPress={() => setClassSubject('')} />
            {CLASS_SUBJECTS.map((s) => (
              <Chip key={s} label={s} active={classSubject === s} onPress={() => setClassSubject(s)} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
            <Chip label={classGrade ? `Grade: ${classGrade}` : 'Any grade'} active={!!classGrade} onPress={() => setClassGrade('')} />
            {CLASS_GRADES.filter(g => g !== 'Any').map((g) => (
              <Chip key={g} label={g} active={classGrade === g} onPress={() => setClassGrade(g)} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
            <Chip label={classCountry ? `Country: ${classCountry}` : 'Any country'} active={!!classCountry} onPress={() => setClassCountry('')} />
            {TOP_COUNTRIES.map((c) => (
              <Chip key={c} label={c} active={classCountry === c} onPress={() => setClassCountry(c)} />
            ))}
          </ScrollView>

          {/* Give the vault its own tall vertical area to swipe upward */}
          <View style={tw.style('rounded-xl overflow-hidden mt-1', { height: classesHeight })}>
            <ClassVaultListScreen
              filters={vaultFilters}
              clearFilters={clearVaultFilters}
            />
          </View>

          {/* ───── Free OER Video Collections — vertically scrollable ───── */}
          <View style={tw`mt-5`}>
            <Text style={tw`text-base font-bold text-slate-900 dark:text-white mb-2`}>Free OER Video Collections</Text>

            {/* OER video subject chips (include Any subject reset) */}
            {oerVideoSubjects.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`pb-2`}>
                <Chip
                  label={oerVideoSubject ? `Subject: ${oerVideoSubject}` : 'Any subject'}
                  active={!!oerVideoSubject}
                  onPress={() => setOerVideoSubject('')}
                />
                {oerVideoSubjects.map((subj) => (
                  <Chip
                    key={subj}
                    label={subj}
                    active={oerVideoSubject === subj}
                    onPress={() => setOerVideoSubject(subj)}
                  />
                ))}
              </ScrollView>
            )}

            {loadingVCols && <Text style={tw`text-sm text-[#49739c] dark:text-white/70`}>Loading collections…</Text>}
            {errVCols && !loadingVCols && <Text style={tw`text-sm text-red-600 dark:text-red-400`}>{errVCols}</Text>}

            {!loadingVCols && !errVCols && (
              filteredOerVideos.length === 0 ? (
                <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>No free OER video collections yet.</Text>
              ) : (
                <View style={tw.style({ height: videosHeight })}>
                  <FlatList
                    data={filteredOerVideos}
                    keyExtractor={(item) => String(item.slug ?? item.id)}
                    renderItem={renderOerVideoItem}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )
            )}
          </View>
        </View>
      ) : (
        <View style={tw`flex-1`}>
          {/* Courses tab: one vertical FlatList where filters + OER Books live in the header so everything scrolls together */}
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
            <FlatList
              data={[]}
              ListHeaderComponent={
                <View style={tw`px-4`}>
                  {CoursesListHeader}
                  <Text style={tw`text-sm text-[#49739c] dark:text-white/70 text-center mb-4`}>No courses match your filters.</Text>
                </View>
              }
              renderItem={null as any}
              keyExtractor={() => 'x'}
            />
          ) : (
            <FlatList
              data={displayRows}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCourseCard}
              contentContainerStyle={tw`pb-6 px-4`}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
              ListHeaderComponent={<View>{CoursesListHeader}</View>}
              ListHeaderComponentStyle={tw`px-0`}
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
