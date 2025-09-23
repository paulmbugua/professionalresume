// apps/mobile/src/pages/MyCourses.native.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
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

const CaretDown = ({ size = 20 }: { size?: number }) => (
  <View style={{ width: size, height: size }}>
    <Text style={tw`text-xs`}>▾</Text>
  </View>
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
    obj.tutorId ??
    obj.tutor_id ??
    obj.instructor?.id ??
    obj.tutor_profile?.id ??
    obj.profile?.id ??
    undefined;

  return { name, id };
}

const PillButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw`h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] items-center justify-center flex-row`}
  >
    <Text style={tw`text-xs font-medium text-slate-900 dark:text-white mr-1`}>{label}</Text>
    <CaretDown size={16} />
  </Pressable>
);

const OutlineButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw`h-9 px-3 rounded-xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 items-center justify-center`}
  >
    <Text style={tw`text-xs font-medium text-slate-900 dark:text-white`}>{label}</Text>
  </Pressable>
);

/* ------------------------------ Filter Sheet ----------------------------- */

const FilterSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  subject: string; setSubject: (v: string) => void;
  level: string; setLevel: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  onClear: () => void;
}> = ({
  visible, onClose,
  subject, setSubject,
  level, setLevel,
  duration, setDuration,
  price, setPrice,
  onClear,
}) => {
  const fields: Array<[label: string, value: string, setter: (v: string) => void]> = [
    ['Subject',  subject,  setSubject],
    ['Level',    level,    setLevel],
    ['Duration', duration, setDuration],
    ['Price',    price,    setPrice],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/40 justify-end`}>
        <View style={tw`rounded-t-2xl bg-white dark:bg-[#0f1821] p-4`}>
          <Text style={tw`text-base font-bold text-slate-900 dark:text-white mb-2`}>Filters</Text>

          <ScrollView style={tw`max-h-[60vh]`}>
            {fields.map(([label, val, setter]) => (
              <View key={label} style={tw`mb-3`}>
                <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mb-1`}>{label}</Text>
                <TextInput
                  value={val}
                  onChangeText={setter}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  style={tw`h-10 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white`}
                  placeholderTextColor="#7a8aa0"
                />
              </View>
            ))}
          </ScrollView>

          <View style={tw`mt-2 flex-row justify-between`}>
            <OutlineButton label="Clear" onPress={onClear} />
            <Pressable
              onPress={onClose}
              style={tw`h-9 px-4 rounded-xl bg-[#3d99f5] items-center justify-center`}
            >
              <Text style={tw`text-white text-xs font-semibold`}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* --------------------------------- Review -------------------------------- */

const ReviewModal: React.FC<{
  visible: boolean;
  title: string;
  rating: number;
  setRating: (n: number) => void;
  comment: string;
  setComment: (t: string) => void;
  posting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ visible, title, rating, setRating, comment, setComment, posting, onSubmit, onCancel }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={tw`flex-1 bg-black/40 items-center justify-center p-4`}>
        <View style={tw`w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-4 border border-[#cedbe8] dark:border-white/10`}>
          <Text style={tw`text-lg font-bold mb-1 text-slate-900 dark:text-white`}>Rate this course</Text>
          <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mb-3`}>{title}</Text>

          <View style={tw`flex-row items-center gap-2 mb-3`}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text style={n <= rating ? tw`text-yellow-500 text-2xl` : tw`text-[#49739c] text-2xl`}>★</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Optional comment (max 500 chars)"
            maxLength={500}
            multiline
            style={tw`w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-white min-h-[90px]`}
            placeholderTextColor="#7a8aa0"
          />

          <View style={tw`mt-4 flex-row items-center gap-2 justify-end`}>
            <OutlineButton label="Cancel" onPress={onCancel} />
            <Pressable
              disabled={posting || rating < 1}
              onPress={onSubmit}
              style={tw.style(
                `px-4 h-10 rounded-xl items-center justify-center bg-[#3d99f5]`,
                (posting || rating < 1) && `opacity-60`,
              )}
            >
              <Text style={tw`text-white text-sm font-semibold`}>{posting ? 'Saving…' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* --------------------------------- Screen -------------------------------- */

const MyCoursesNative: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { backendUrl, token, profile } = useShopContext();
  const roleStr = String((profile as any)?.role ?? '').toLowerCase();
  const myId = String(profile?.id ?? '');

  // Courses catalog
  const { courses = [], loading, error, fetchCourses } = useCourses({ backendUrl, token });

  // My enrollments (only used to show "Enrolled/Review" buttons)
  const { enrollments, fetchMine } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  // Tabs
  const [tab, setTab] = useState<TabKey>('library');

  // Course filters
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ClassVault filters (optional — kept minimal to render the list)
  const [vaultFilters, setVaultFilters] = useState<ClassVaultFilters>({});
  const clearVaultFilters = useCallback(() => setVaultFilters({}), []);

  // Ratings cache { [courseId]: { avg, count, my } }
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number; my: boolean }>>({});
  const [openReview, setOpenReview] = useState<{ id: string; title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Fetch courses
  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  // Fetch my enrollments only if logged in
  useEffect(() => {
    if (token) void fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fast lookup for enrolled course ids
  const enrolledCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrollments as any[]) {
      const cid = String(e?.course_id ?? e?.courseId ?? '');
      if (cid) set.add(cid);
    }
    return set;
  }, [enrollments]);

  // Client-side filters (courses tab)
  const filteredRows = useMemo(() => {
    return (courses as Course[]).filter((c) => {
      const title = String(c.title ?? '').toLowerCase();
      const cLevel = String(c.level ?? '');
      const cDuration = String(c.duration ?? '').toLowerCase();
      const cPrice = typeof c.price === 'number' ? `$${c.price}` : String(c.price ?? '');

      const okLevel = level ? cLevel === level : true;
      const okSubject = subject ? title.includes(subject.toLowerCase()) : true;
      const okDuration = duration ? cDuration.includes(duration.toLowerCase()) : true;
      const okPrice = price ? cPrice.toLowerCase().includes(price.toLowerCase()) : true;

      return okLevel && okSubject && okDuration && okPrice;
    });
  }, [courses, subject, level, duration, price]);

  // Ratings wiring (native)
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
      } catch {
        // silent
      }
    },
    [backendUrl, myId]
  );

  const debouncedFetchCourseRatings = useRef(
    debounce((courseId: string) => {
      void fetchCourseRatings(courseId);
    }, 200)
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    for (const it of viewableItems) {
      const id = String(it?.item?.id ?? '');
      if (id && !ratings[id]) debouncedFetchCourseRatings.current(id);
    }
  }).current;

  // Open review modal
  const openReviewFor = useCallback((courseId: string, title: string) => {
    setOpenReview({ id: courseId, title });
    setReviewRating(0);
    setReviewComment('');
  }, []);

  // Submit review
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
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || 'Failed to submit review');
      }
      await fetchCourseRatings(openReview.id);
      setOpenReview(null);
    } catch (e: any) {
      console.warn(e?.message || 'Failed to submit review');
    } finally {
      setPosting(false);
    }
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
          <Text style={tw`font-semibold text-sm flex-1 pr-2 text-slate-900 dark:text-white`}>{item.title}</Text>
          <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>{item.level ?? '—'}</Text>
        </View>

        <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-1`}>{tutorName}</Text>

        <View style={tw`flex-row items-center justify-between mt-2`}>
          <Text style={tw`text-xs text-[#49739c] dark:text-white/70`}>{item.duration ?? '—'}</Text>
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
        style={tw.style(
          `h-9 px-3 rounded-lg items-center justify-center`,
          tab === 'library' && `bg-white dark:bg-[#0f1821]`,
        )}
      >
        <Text style={tw.style(
          `text-xs font-semibold`,
          tab === 'library' ? `text-slate-900 dark:text-white` : `text-slate-700 dark:text-white/70`
        )}>
          Explore Videos & Notes
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setTab('courses')}
        style={tw.style(
          `h-9 px-3 rounded-lg items-center justify-center`,
          tab === 'courses' && `bg-white dark:bg-[#0f1821]`,
        )}
      >
        <Text style={tw.style(
          `text-xs font-semibold`,
          tab === 'courses' ? `text-slate-900 dark:text-white` : `text-slate-700 dark:text-white/70`
        )}>
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
            // If you later add a search box in this screen, pass its value here:
            // searchTerm={search}
          />
        </View>
      ) : (
        <View style={tw`flex-1 px-4`}>
          {/* Header + Filters */}
          <View style={tw`mt-2 mb-2`}>
            <View style={tw`flex-row flex-wrap items-start`}>
              <View style={tw`flex-1 pr-3 min-w-[220px]`}>
                <Text style={tw`text-[20px] font-bold text-slate-900 dark:text-white`}>Explore Courses</Text>
                <Text style={tw`text-[#49739c] dark:text-white/70 text-xs`}>
                  Find the perfect course to enhance your skills and knowledge.
                </Text>
              </View>
            </View>

            {/* Filters row */}
            <View style={tw`mt-3`}>
              <View style={tw`flex-row flex-wrap`}>
                <View style={tw`flex-row`}>
                  <View style={tw`mr-2 mb-2`}><PillButton label="Subject" onPress={() => setFiltersOpen(true)} /></View>
                  <View style={tw`mr-2 mb-2`}><PillButton label="Level" onPress={() => setFiltersOpen(true)} /></View>
                  <View style={tw`mr-2 mb-2`}><PillButton label="Duration" onPress={() => setFiltersOpen(true)} /></View>
                  <View style={tw`mr-2 mb-2`}><PillButton label="Price" onPress={() => setFiltersOpen(true)} /></View>
                </View>

                {(subject || level || duration || price) ? (
                  <View style={tw`mb-2`}>
                    <OutlineButton
                      label="Clear"
                      onPress={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }}
                    />
                  </View>
                ) : null}
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

      {/* Filter sheet (courses tab) */}
      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        subject={subject} setSubject={setSubject}
        level={level} setLevel={setLevel}
        duration={duration} setDuration={setDuration}
        price={price} setPrice={setPrice}
        onClear={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }}
      />

      {/* Review modal */}
      <ReviewModal
        visible={!!openReview}
        title={openReview?.title ?? ''}
        rating={reviewRating}
        setRating={setReviewRating}
        comment={reviewComment}
        setComment={setReviewComment}
        posting={posting}
        onSubmit={submitCourseReview}
        onCancel={() => setOpenReview(null)}
      />
    </View>
  );
};

export default MyCoursesNative;
