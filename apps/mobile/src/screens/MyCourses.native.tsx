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
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';
import type { MainStackParamList } from '../navigation/types';
import type { StackNavigationProp } from '@react-navigation/stack';

type TabKey = 'library' | 'courses';

type Nav = StackNavigationProp<MainStackParamList>;

/* ----------------------------- Small UI bits ----------------------------- */

const CaretDown = ({ size = 20 }: { size?: number }) => (
  <View style={{ width: size, height: size }}>
    <Text>▾</Text>
  </View>
);

// Compact star text
function StarRow({ avg, count }: { avg?: number; count?: number }) {
  const a = Math.round((avg ?? 0) * 2) / 2;
  const stars = [1, 2, 3, 4, 5]
    .map(i => (a >= i ? '★' : a + 0.5 === i ? '☆' : '☆'))
    .join('');
  return (
    <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary">
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
    className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] items-center justify-center flex-row gap-x-1"
  >
    <Text className="text-xs font-medium text-slate-900 dark:text-slate-100">{label}</Text>
    <CaretDown size={16} />
  </Pressable>
);

const OutlineButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable
    onPress={onPress}
    className="h-9 px-3 rounded-xl bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-darkCard items-center justify-center"
  >
    <Text className="text-xs font-medium text-slate-900 dark:text-slate-100">{label}</Text>
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
      <View className="flex-1 bg-black/40 justify-end">
        <View className="rounded-t-2xl bg-white dark:bg-[#0f1821] p-4">
          <Text className="text-base font-bold text-slate-900 dark:text-white mb-2">Filters</Text>

          <ScrollView className="max-h-[60vh]">
  {fields.map(([label, val, setter]) => (
    <View key={label} className="mb-3">
      <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary mb-1">
        {label}
      </Text>
      <TextInput
        value={val}
        onChangeText={setter}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="h-10 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-slate-100"
        placeholderTextColor="#7a8aa0"
      />
    </View>
  ))}
</ScrollView>


          <View className="mt-2 flex-row justify-between">
            <OutlineButton label="Clear" onPress={onClear} />
            <Pressable
              onPress={onClose}
              className="h-9 px-4 rounded-xl bg-[#3d99f5] items-center justify-center"
            >
              <Text className="text-white text-xs font-semibold">Done</Text>
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
      <View className="flex-1 bg-black/40 items-center justify-center p-4">
        <View className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-4 border border-[#cedbe8] dark:border-darkCard">
          <Text className="text-lg font-bold mb-1 text-slate-900 dark:text-white">Rate this course</Text>
          <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary mb-3">{title}</Text>

          <View className="flex-row items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text className={n <= rating ? 'text-yellow-500 text-2xl' : 'text-[#49739c] text-2xl'}>★</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Optional comment (max 500 chars)"
            maxLength={500}
            multiline
            className="w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-slate-100 min-h-[90px]"
            placeholderTextColor="#7a8aa0"
          />

          <View className="mt-4 flex-row items-center gap-2 justify-end">
            <OutlineButton label="Cancel" onPress={onCancel} />
            <Pressable
              disabled={posting || rating < 1}
              onPress={onSubmit}
              className={`px-4 h-10 rounded-xl items-center justify-center ${posting || rating < 1 ? 'opacity-60' : ''} bg-[#3d99f5]`}
            >
              <Text className="text-white text-sm font-semibold">{posting ? 'Saving…' : 'Submit'}</Text>
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
  const role = String(profile?.role ?? '').toLowerCase();
  const myId = String(profile?.id ?? '');

  // Courses catalog
  const { courses = [], loading, error, fetchCourses } = useCourses({ backendUrl, token });

  // My enrollments
  const { enrollments, fetchMine, loading: enrollmentsLoading } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  const [tab, setTab] = useState<TabKey>('library');

  // Filters
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Ratings cache { [courseId]: { avg, count, my } }
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number; my: boolean }>>({});
  const [openReview, setOpenReview] = useState<{ id: string; title: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (token) void fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fast lookup: set of enrolled course IDs (tolerate snake_case / camelCase)
  const enrolledCourseIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrollments as any[]) {
      const cid = String(e?.course_id ?? e?.courseId ?? '');
      if (cid) set.add(cid);
    }
    return set;
  }, [enrollments]);

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

  // ------- Ratings wiring (native) --------
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
        // swallow
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
      // Basic alert; you can swap for a toast/snackbar
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
        className="rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-3 mb-3"
        onPress={() => navigation.navigate('CourseDetails', { courseId: cid })}
      >
        <View className="flex-row items-start justify-between gap-2">
          <Text className="font-semibold text-sm flex-1 pr-2">{item.title}</Text>
          <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary">{item.level ?? '—'}</Text>
        </View>

        <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary mt-1">{tutorName}</Text>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary">{item.duration ?? '—'}</Text>
          <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary">{priceDisplay}</Text>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <View>
            {r ? <StarRow avg={r.avg} count={r.count} /> : <Text className="text-xs text-[#49739c] dark:text-darkTextSecondary opacity-70">—</Text>}
          </View>

          {isEnrolled ? (
            r?.my ? (
              <Pressable
                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
                onPress={() => navigation.navigate('CourseProgress', { courseId: cid })}
              >
                <Text className="text-xs font-semibold text-slate-900 dark:text-slate-100">Enrolled</Text>
              </Pressable>
            ) : (
              <Pressable
                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
                onPress={() => openReviewFor(cid, item.title)}
              >
                <Text className="text-xs font-semibold text-slate-900 dark:text-slate-100">Review</Text>
              </Pressable>
            )
          ) : (
            <Pressable
              className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
              onPress={() => navigation.navigate('CourseDetails', { courseId: cid })}
            >
              <Text className="text-xs font-semibold text-slate-900 dark:text-slate-100">View</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const headerTabs = (
    <View className="flex-row self-start rounded-xl p-1 bg-[#e7edf4] dark:bg-[#172534] border border-[#cedbe8] dark:border-darkCard">
      <Pressable
        onPress={() => setTab('library')}
        className={`h-9 px-3 rounded-lg items-center justify-center ${tab === 'library' ? 'bg-white dark:bg-[#0f1821] shadow' : ''}`}
      >
        <Text className={`text-xs font-semibold ${tab === 'library' ? 'text-slate-900 dark:text-darkTextPrimary' : 'text-slate-700 dark:text-darkTextSecondary'}`}>
          Explore Videos & Notes
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setTab('courses')}
        className={`h-9 px-3 rounded-lg items-center justify-center ${tab === 'courses' ? 'bg-white dark:bg-[#0f1821] shadow' : ''}`}
      >
        <Text className={`text-xs font-semibold ${tab === 'courses' ? 'text-slate-900 dark:text-darkTextPrimary' : 'text-slate-700 dark:text-darkTextSecondary'}`}>
          Explore Courses
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-darkBg">
      <View className="px-4 pt-6 pb-2">
        <Text className="text-[24px] font-bold leading-tight text-slate-900 dark:text-darkTextPrimary">My Courses</Text>
        <Text className="text-[#49739c] dark:text-darkTextSecondary text-xs mt-1">
          Access your learning library or discover structured courses to level up.
        </Text>

        <View className="mt-3">{headerTabs}</View>
      </View>

      {tab === 'library' ? (
        <View className="p-4">
          {/* If you have a native ClassVaultList component you want to embed, render it here instead */}
          <Pressable
            onPress={() => navigation.navigate('ClassVaultLibrary')}
            className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 items-center justify-center"
          >
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">Open ClassVault Library</Text>
            <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary">Videos • Notes • Past Papers</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1 px-4">
          {/* Section header + filters */}
          <View className="flex-row items-center justify-between mt-2 mb-2">
            <View className="flex-1 pr-3">
              <Text className="text-[20px] font-bold text-slate-900 dark:text-darkTextPrimary">Explore Courses</Text>
              <Text className="text-[#49739c] dark:text-darkTextSecondary text-xs">
                Find the perfect course to enhance your skills and knowledge.
              </Text>
            </View>

            <View className="flex-row gap-2">
              <PillButton label="Subject" onPress={() => setFiltersOpen(true)} />
              <PillButton label="Level" onPress={() => setFiltersOpen(true)} />
              <PillButton label="Duration" onPress={() => setFiltersOpen(true)} />
              <PillButton label="Price" onPress={() => setFiltersOpen(true)} />
              {(subject || level || duration || price) ? (
                <OutlineButton label="Clear" onPress={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }} />
              ) : null}
            </View>
          </View>

          {/* List */}
          {loading ? (
            <View className="py-6 items-center">
              <ActivityIndicator />
              <Text className="mt-2 text-sm">Loading courses…</Text>
            </View>
          ) : error ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-red-600">Failed to load courses.</Text>
            </View>
          ) : filteredRows.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary">No courses match your filters.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCourseCard}
              contentContainerStyle={{ paddingBottom: 24 }}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
            />
          )}
        </View>
      )}

      {/* Filter sheet */}
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
