// apps/mobile/src/pages/CourseDetails.native.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import debounce from 'lodash.debounce';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments } from '@mytutorapp/shared/hooks';
import { useCourseReviews } from '@mytutorapp/shared/hooks/useCourseReviews';
import type { Course } from '@mytutorapp/shared/types';
import type { MainStackParamList } from '../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

interface MaybeInstructor {
  tutorName?: string;
  instructor?: { name?: string; bio?: string };
}

type Nav = StackNavigationProp<MainStackParamList, 'CourseDetails'>;
type Rt = RouteProp<MainStackParamList, 'CourseDetails'>;

/* --------------------------------- Stars --------------------------------- */
const StarRow: React.FC<{ avg?: number; count?: number }> = ({ avg = 0, count = 0 }) => {
  const a = Math.round(avg * 2) / 2;
  const stars = [1, 2, 3, 4, 5].map((i) => (
    <Text key={i} className={`mr-0.5 ${a >= i ? 'text-yellow-500' : a + 0.5 === i ? 'text-yellow-500/70' : 'text-yellow-500/30'}`}>
      ★
    </Text>
  ));
  return (
    <View className="flex-row items-center">
      {stars}
      <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary ml-1">{avg.toFixed(1)} ({count})</Text>
    </View>
  );
};

/** Coerce any price-like value to whole tokens (non-negative int) */
function toTokens(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : 0;
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

const CourseDetailsNative: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const courseId = String(route.params?.courseId ?? '');

  const { backendUrl, token, profile, tokens: walletTokens = 0 } = useShopContext();
  const role = String(profile?.role ?? '').toLowerCase();
  const myId = String(profile?.id ?? '');

  // --- Fetch course details ---
  const {
    selectedCourse,
    loading: loadingCourse,
    error: courseError,
    fetchCourseById,
  } = useCourses({ backendUrl, token });

  useEffect(() => {
    if (courseId) void fetchCourseById(courseId);
  }, [courseId, fetchCourseById]);

  const c: Course | null | undefined = selectedCourse ?? null;

  // --- Enrollments + Purchase flow ---
  const {
    enroll, // kept for symmetry / fallback usages
    cancel,
    enrollments,
    loading: enrollmentsLoading,
    error: enrollError,
    fetchMine,
    purchaseCourseAndEnroll, // ✅ purchase + auto-enroll
  } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  useEffect(() => {
    if (token) void fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const myEnrollment = useMemo(() => {
    if (!courseId) return undefined;
    return enrollments.find((e: any) => String(e?.course_id ?? e?.courseId) === String(courseId));
  }, [enrollments, courseId]);

  // Always treat price as tokens
  const priceTokens = useMemo(() => toTokens(c?.price), [c?.price]);
  const hasEnough = walletTokens >= priceTokens;

  // Tutor block
  const mi = (c ?? {}) as Course & MaybeInstructor;
  const tutorName = mi.tutorName || mi.instructor?.name || 'Your tutor';
  const tutorBio = mi.instructor?.bio || 'Experienced educator';

  // -------- Reviews wiring --------
  const { avg, count, hasMyReview, reload, submit, posting } = useCourseReviews(
    backendUrl,
    courseId,
    { myStudentId: myId, token: token ?? '' }
  );
  const debouncedReload = useMemo(() => debounce(() => { void reload(); }, 200), [reload]);
  useEffect(() => () => debouncedReload.cancel(), [debouncedReload]);

  const [openReview, setOpenReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // ----- Actions -----
  const confirm = (title: string, message: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'OK', onPress: () => resolve(true) },
      ]);
    });

  const onPurchaseAndEnroll = async () => {
    if (!courseId || !c) return;

    const proceed = await confirm(
      'Purchase & Enroll',
      `You are about to purchase "${c.title}" for ${priceTokens} tokens.\n\nThis amount will be deducted from your balance (${walletTokens} tokens). Continue?`
    );
    if (!proceed) return;

    // If balance is insufficient → navigate to BuyTokens
    if (!hasEnough) {
      const goBuy = await confirm('Insufficient balance', 'Not enough tokens. Would you like to buy more now?');
      if (goBuy) navigation.navigate('BuyTokens');
      return;
    }

    try {
      await purchaseCourseAndEnroll(courseId, priceTokens);
      navigation.navigate('CourseProgress', { courseId });
    } catch (e: any) {
      const msg: string = e?.message || '';
      if (/insufficient/i.test(msg)) {
        const go = await confirm('Insufficient balance', 'Not enough tokens. Buy more now?');
        if (go) navigation.navigate('BuyTokens');
      }
    }
  };

  const onContinue = () => {
    if (!courseId) return;
    navigation.navigate('CourseProgress', { courseId });
  };

  const onUnenroll = async () => {
    if (!(myEnrollment?.id)) return;
    try {
      await cancel(String(myEnrollment.id));
      debouncedReload();
    } catch {}
  };

  const onSubmitReview = useCallback(async () => {
    if (rating < 1 || !courseId) return;
    await submit(rating, comment);
    setOpenReview(false);
    setRating(0);
    setComment('');
  }, [submit, rating, comment, courseId]);

  // ----- Guards / states -----
  if (!courseId) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-red-600">Missing course id.</Text>
      </View>
    );
  }
  if (loadingCourse && !c) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator />
        <Text className="mt-2">Loading course…</Text>
      </View>
    );
  }
  if (courseError && !c) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-red-600">Failed to load course.</Text>
      </View>
    );
  }
  if (!c) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text>Course not found.</Text>
      </View>
    );
  }

  const isEnrolled = Boolean(myEnrollment);
  const disablePrimary = !token || enrollmentsLoading;

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-darkBg" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="max-w-[900px] self-center w-full px-4 py-8">
        {/* Header */}
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 pr-4">
            <Text className="text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-darkTextPrimary">
              {c.title}
            </Text>
            {!!c.description && (
              <Text className="mt-2 text-[#49739c] dark:text-darkTextSecondary">{c.description}</Text>
            )}

            {/* ⭐ Rating row */}
            <View className="mt-2">
              <StarRow avg={avg} count={count} />
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {!!c.level && (
                <Pill>Level: {c.level}</Pill>
              )}
              {!!c.duration && (
                <Pill>Duration: {c.duration}</Pill>
              )}
              <Pill>Price: {priceTokens} tokens</Pill>
            </View>

            {/* Balance helper */}
            <Text className="mt-2 text-sm text-[#49739c] dark:text-darkTextSecondary">
              Your balance: {walletTokens} tokens
            </Text>
          </View>

          {/* Actions column */}
          <View className="w-[180px] gap-2">
            {role === 'tutor' ? (
              <Pressable
               onPress={() => navigation.navigate('Courses')}
                className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
              >
                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manage / Share</Text>
              </Pressable>
            ) : isEnrolled ? (
              <>
                <Pressable
                  onPress={onContinue}
                  className="rounded-xl h-10 px-5 bg-[#3d99f5] items-center justify-center"
                >
                  <Text className="text-white text-sm font-semibold">Continue Course</Text>
                </Pressable>

                <Pressable
                  onPress={onUnenroll}
                  className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] items-center justify-center
                             border border-[#cedbe8] dark:border-darkCard"
                >
                  <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Unenroll</Text>
                </Pressable>

                {/* Review button when enrolled & not yet reviewed */}
                {!hasMyReview && (
                  <Pressable
                    onPress={() => setOpenReview(true)}
                    className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
                  >
                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review this course</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View className="gap-2">
                <Pressable
                  onPress={onPurchaseAndEnroll}
                  disabled={disablePrimary}
                  className={`rounded-xl h-10 px-5 items-center justify-center ${disablePrimary ? 'opacity-60' : ''} bg-[#3d99f5]`}
                >
                  <Text className="text-white text-sm font-semibold">
                    {enrollmentsLoading ? 'Checking…' : 'Purchase & Enroll'}
                  </Text>
                </Pressable>

                {!hasEnough && (
                  <Pressable
                    onPress={() => navigation.navigate('BuyTokens')}
                    className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] items-center justify-center
                               border border-[#cedbe8] dark:border-darkCard"
                  >
                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Buy Tokens</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Achievements quick link */}
            <Pressable
              onPress={() => navigation.navigate('Achievements')}
              className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center"
            >
              <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Achievements</Text>
            </Pressable>

            {/* Back */}
            <Pressable
              onPress={() => navigation.goBack()}
              className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] items-center justify-center
                         border border-[#cedbe8] dark:border-darkCard"
            >
              <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Back</Text>
            </Pressable>

            {!!enrollError && (
              <Text className="text-xs text-red-600 mt-1">{String(enrollError)}</Text>
            )}
          </View>
        </View>

        {/* Tutor card */}
        <View className="mt-6 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4">
          <Text className="text-lg font-bold mb-3 text-slate-900 dark:text-white">About the tutor</Text>
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-full bg-[#e7edf4] dark:bg-[#172534]" />
            <View className="flex-1">
              <Text className="font-semibold text-slate-900 dark:text-white">{tutorName}</Text>
              <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary">{tutorBio}</Text>
            </View>
          </View>
        </View>

        {/* Syllabus preview */}
        <View className="mt-6 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4">
          <Text className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Syllabus</Text>
          {Array.isArray(c.syllabus) && c.syllabus.length > 0 ? (
            <View className="gap-2">
              {c.syllabus.slice(0, 12).map((w) => (
                <View key={w.week} className="flex-row">
                  <Text className="font-medium text-slate-900 dark:text-white">Week {w.week}: </Text>
                  <Text className="flex-1 text-slate-800 dark:text-slate-300">{w.topic || 'TBA'}</Text>
                  {!!w.assignment && (
                    <Text className="block text-sm text-[#49739c] dark:text-darkTextSecondary">
                      {'\n'}Assignment: {w.assignment}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[#49739c] dark:text-darkTextSecondary">No syllabus yet.</Text>
          )}
        </View>
      </View>

      {/* Review modal */}
      <Modal visible={openReview} transparent animationType="fade" onRequestClose={() => setOpenReview(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center">
          <View className="w-11/12 max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-4 border border-[#cedbe8] dark:border-darkCard">
            <Text className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Rate this course</Text>
            <Text className="text-sm text-[#49739c] dark:text-darkTextSecondary mb-3">{c.title}</Text>

            <View className="flex-row items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
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
              className="w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] text-slate-900 dark:text-slate-100"
              placeholderTextColor="#7a8aa0"
            />

            <View className="mt-4 flex-row items-center gap-2">
              <Pressable
                disabled={posting || rating < 1}
                onPress={onSubmitReview}
                className={`px-4 h-10 rounded-xl items-center justify-center ${posting || rating < 1 ? 'opacity-60' : ''} bg-[#3d99f5]`}
              >
                <Text className="text-white text-sm font-semibold">{posting ? 'Saving…' : 'Submit'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setOpenReview(false)}
                className="px-4 h-10 rounded-xl items-center justify-center bg-white dark:bg-[#0f1821]
                           border border-[#cedbe8] dark:border-darkCard"
              >
                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

/* --------------------------------- UI Bits -------------------------------- */
const Pill: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <View className="h-8 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] items-center justify-center">
    <Text className="text-sm text-slate-900 dark:text-slate-100">{children}</Text>
  </View>
);

export default CourseDetailsNative;
