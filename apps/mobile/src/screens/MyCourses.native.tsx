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
} from 'react-native';
import debounce from 'lodash.debounce';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments } from '@mytutorapp/shared/hooks';
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

// Compact star text
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

// Centralized extractor so tutor name always renders even if backend fields vary
function getTutorInfo(c: unknown): { name: string; id?: string | number } {
  const obj = (c ?? {}) as Record<string, any>;

  const name =
    (typeof obj.tutor === 'string' && obj.tutor) ||
    (typeof obj.tutorName === 'string' && obj.tutorName) ||
    (obj.instructor && typeof obj.instructor.name === 'string' && obj.instructor.name) ||
    (obj.tutor_profile && typeof obj.tutor_profile.name === 'string' && obj.tutor_profile.name) ||
    (obj.profile && typeof obj.profile.name === 'string' && obj.profile.name) ||
    '—';

  const id =
    obj.tutorId ?? obj.tutor_id ?? obj.instructor?.id ?? obj.tutor_profile?.id ?? obj.profile?.id ?? undefined;

  return { name, id };
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
  if (typeof d === 'number' && Number.isFinite(d)) return d; // already hours

  const s = String(d).toLowerCase().trim();
  if (!s) return undefined;

  // "xh ym"
  const hMatch = /(\d+(?:\.\d+)?)\s*h/.exec(s);
  const mMatch = /(\d+)\s*m/.exec(s);

  // NOTE: capture groups can be undefined in TS typing, so default to '0'
  const h = hMatch ? parseFloat(hMatch[1] ?? '0') : 0;
  const m = mMatch ? parseFloat(mMatch[1] ?? '0') : 0;
  if (hMatch || mMatch) return h + m / 60;

  // "90 min"
  const minOnly = /(\d+)\s*min/.exec(s);
  if (minOnly) return parseFloat(minOnly[1] ?? '0') / 60;

  // plain number string -> assume hours
  const plain = parseFloat(s);
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

/* --------------------------------- Screen -------------------------------- */

const MyCoursesNative: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { backendUrl, token, profile } = useShopContext();
  const roleStr = String((profile as any)?.role ?? '').toLowerCase();
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

  // Fetch courses
  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  // Fetch my enrollments only if logged in
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
    // friendly defaults if backend doesn't provide
    if (s.size === 0) ['Beginner', 'Intermediate', 'Advanced'].forEach((x) => s.add(x));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  // Client-side filters (courses tab)
  const filteredRows = useMemo(() => {
    const durOk = durationPredicate(durationKey);
    return (courses as Course[]).filter((c: any) => {
      // Subject
      if (subject) {
        const subj = (c.subject ?? c.category ?? c.title ?? '').toString().toLowerCase();
        if (!subj.includes(subject.toLowerCase())) return false;
      }
      // Level (exact match if provided by backend; otherwise fuzzy)
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
  }, [courses, subject, level, durationKey, priceKey]);

  // Ratings wiring (native)
  const fetchCourseRatings = useCallback(
  async (courseId: string) => {
    if (!backendUrl) return; // ← guard when undefined
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
    } catch {
      // silent
    }
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

  // Review flow
  const openReviewFor = useCallback((courseId: string, title: string) => {
    setOpenReview({ id: courseId, title });
    setReviewRating(0);
    setReviewComment('');
  }, []);

  const submitCourseReview = useCallback(async () => {
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
      console.warn(e?.message || 'Failed to submit review');
    } finally { setPosting(false); }
  }, [backendUrl, token, openReview, reviewRating, reviewComment, fetchCourseRatings]);

  /* ------------------------------ Rendering ------------------------------ */

  const renderCourseCard = ({ item }: { item: Course }) => {
    const cid = String(item.id);
    const { name: tutorName } = getTutorInfo(item);
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
          {tutorName}
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
                onPress={() => openReviewFor(cid, item.title)}
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

  // Optional tiny spinner while role is resolving
  if (token && !roleStr) {
    return (
      <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Checking your account…</Text>
      </View>
    );
  }

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
        <View style={tw`flex-1 px-4`}>
          {/* Title for Courses section */}
          <View style={tw`mt-2 mb-1`}>
            <Text style={tw`text-[20px] font-bold text-slate-900 dark:text-white`}>Explore Courses</Text>
            <Text style={tw`text-[#49739c] dark:text-white/70 text-xs`}>
              Find the perfect course to enhance your skills and knowledge.
            </Text>
          </View>

          {/* 🔹 FindTutor-style chip filters */}
          <View>
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

            {/* Optional text search (local to Courses tab) */}
            <View style={tw`rounded-xl overflow-hidden mt-1`}>
              <View style={tw`flex-row items-center bg-[#e7edf4] dark:bg-[#172534] h-10 px-3`}>
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
            <View style={tw`py-6 items-center`}>
              <Text style={tw`text-sm text-red-600 dark:text-red-400`}>Failed to load courses.</Text>
            </View>
          ) : filteredRows.length === 0 ? (
            <View style={tw`py-6 items-center`}>
              <Text style={tw`text-sm text-[#49739c] dark:text-white/70`}>No courses match your filters.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCourseCard}
              contentContainerStyle={tw`pb-6`}
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
                onPress={submitCourseReview}
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
