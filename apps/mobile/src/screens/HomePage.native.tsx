/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import debounce from 'lodash.debounce';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import { useHomePage } from '@mytutorapp/shared/hooks';
import { useCourses } from '@mytutorapp/shared/hooks';
import { fetchVideoReviews } from '@mytutorapp/shared/api/classVaultApi';
import { useShopContext } from '@mytutorapp/shared/context';

import type { MainStackParamList } from '../navigation/types';
import type { Profile, Course, RecordedVideo } from '@mytutorapp/shared/types';

import tw from '../../tailwind';
import { useThemePref } from '../theme/ThemeContext';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                */
/* ------------------------------------------------------------------ */
const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

const HERO_BG =
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2000&auto=format&fit=crop';

const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const;

const VISIBLE_LIMIT = 6;
const DEBOUNCE_MS = 250;

type Ratingish = {
  avgRating?: number;
  rating?: number;
  stars?: number;
  ratingsCount?: number;
  reviewCount?: number;
  totalReviews?: number;
  count?: number;
};

// Loosen type: we only READ optional rating/count-like fields.
function extractRating(x: any): { avg: number; count: number } {
  const avgRaw = x?.avgRating ?? x?.rating ?? x?.stars ?? 0;
  const countRaw = x?.ratingsCount ?? x?.reviewCount ?? x?.totalReviews ?? x?.count ?? 0;
  const avg = Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : 0;
  const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;
  return { avg, count };
}

function starRow(avg: number): string {
  const rounded = Math.round(avg * 2) / 2; // nearest 0.5
  const out: string[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) out.push('★');
    else if (rounded + 0.5 === i) out.push('☆');
    else out.push('☆');
  }
  return out.join('');
}

function resolveTutorImage(p: Profile | Record<string, unknown>, backendUrl: string): string {
  const g = (p as Record<string, unknown>)?.gallery;
  const g0 = Array.isArray(g) ? g[0] : undefined;
  if (typeof g0 === 'string' && g0.length > 0) {
    if (/^https?:\/\//i.test(g0)) return g0;
    if (g0.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${g0}`;
  }
  const fallbackName =
    typeof (p as Record<string, unknown>)?.name === 'string'
      ? ((p as Record<string, unknown>).name as string)
      : 'Tutor';
  return FALLBACK_AVATAR(fallbackName);
}

function coursePrice(c: Course): string {
  return typeof c.price === 'number' ? `$${c.price.toLocaleString()}` : (c.price ?? '');
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const HomePageNative: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { backendUrl } = useShopContext();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useThemePref(); // 'light' | 'dark'

  // Height of your floating footer overlay area (button halo + tiles)
  const FOOTER_OVERLAY_PX = 84; // tweak if you ever change Footer sizing
  const bottomPad = Math.max(FOOTER_OVERLAY_PX, FOOTER_OVERLAY_PX + insets.bottom);
  const NAV_SPACER_PX = 12; // gentle top gap; tweak 8–16 if you like
  const HERO_HEIGHT_PX = 260; // matches web feel; tweak 240–300

  const { filteredProfiles, loading } = useHomePage();
  const {
    featuredCourses = [],
    featuredVideos = [],
    recommendedCourses = [],
    fetchFeaturedCourses,
    fetchFeaturedVideos,
    fetchRecommendedCourses,
  } = useCourses({ backendUrl });

  useEffect(() => {
    if (!backendUrl) return;
    void fetchFeaturedCourses({ limit: VISIBLE_LIMIT, minCount: 2 });
    void fetchFeaturedVideos({ limit: VISIBLE_LIMIT, minCount: 1 });
    void fetchRecommendedCourses({ limit: VISIBLE_LIMIT, minCount: 1 });
  }, [backendUrl, fetchFeaturedCourses, fetchFeaturedVideos, fetchRecommendedCourses]);

  /* -------------------------- Featured Tutors --------------------------- */
  const tutorProfiles: Profile[] = useMemo(
    () => filteredProfiles.filter((p: Profile) => p.role === 'tutor'),
    [filteredProfiles]
  );

  const getTutorAvg = (p: any) => Number((p?.avgRating ?? p?.rating) ?? 0);

  const featuredTutors = useMemo(() => {
    const rows: {
      id: string;
      name: string;
      subject: string;
      image: string;
      category?: string;
      ratingAvg: number;
      ratingCount: number;
    }[] = [];

    SUBJECTS.forEach((subject) => {
      const matches = tutorProfiles.filter((p: Profile) =>
        (p.category ?? '').toLowerCase().includes(subject.toLowerCase())
      );
      if (matches.length === 0) return;

      const best = matches.reduce((a: Profile, b: Profile) => (getTutorAvg(b) > getTutorAvg(a) ? b : a));
      const image = resolveTutorImage(best, backendUrl);
      const { avg, count } = extractRating(best);

      rows.push({
        id: String((best as any).user_id ?? (best as any).id ?? ''),
        name: best.name ?? 'Tutor',
        subject,
        image,
        category: best.category,
        ratingAvg: avg,
        ratingCount: count,
      });
    });

    return rows.slice(0, VISIBLE_LIMIT);
  }, [tutorProfiles, backendUrl]);

  /* ----------------------- Ratings Prefetch (Courses) -------------------- */
  const [courseRatings, setCourseRatings] = useState<Record<string, { avg: number; count: number }>>(
    {}
  );
  const fetchingCourseIdsRef = useRef<Set<string>>(new Set());

  const fetchCourseRatings = async (courseId: string) => {
    if (!backendUrl || fetchingCourseIdsRef.current.has(courseId) || courseRatings[courseId]) return;
    try {
      fetchingCourseIdsRef.current.add(courseId);
      const res = await fetch(`${backendUrl}/api/reviews/courses/${courseId}`);
      if (!res.ok) return;
      const data: { avgRating?: number; totalReviews?: number } = await res.json();
      const avg = Number(data?.avgRating ?? 0) || 0;
      const count = Number(data?.totalReviews ?? 0) || 0;
      setCourseRatings((prev) => (prev[courseId] ? prev : { ...prev, [courseId]: { avg, count } }));
    } catch {
      // keep UI smooth
    } finally {
      fetchingCourseIdsRef.current.delete(courseId);
    }
  };

  const debouncedFetchCourseRatings = useMemo(
    () => debounce((cid: string) => void fetchCourseRatings(cid), DEBOUNCE_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backendUrl, courseRatings]
  );
  useEffect(() => () => debouncedFetchCourseRatings.cancel(), [debouncedFetchCourseRatings]);

  useEffect(() => {
    const ids = [...featuredCourses.slice(0, VISIBLE_LIMIT), ...recommendedCourses.slice(0, VISIBLE_LIMIT)]
      .map((c: Course) => String(c.id))
      .filter(Boolean);
    ids.forEach((cid) => debouncedFetchCourseRatings(cid));
  }, [featuredCourses, recommendedCourses, debouncedFetchCourseRatings]);

  /* ------------------------ Ratings Prefetch (Videos) -------------------- */
  const [videoRatings, setVideoRatings] = useState<
    Record<string | number, { avg: number; count: number }>
  >({});
  const fetchingVideoIdsRef = useRef<Set<string | number>>(new Set());

  const fetchVideoRating = async (vid: number | string) => {
    if (!backendUrl || fetchingVideoIdsRef.current.has(vid) || videoRatings[vid]) return;
    try {
      fetchingVideoIdsRef.current.add(vid);
      const reviews = await fetchVideoReviews(backendUrl, Number(vid));
      const count = Array.isArray(reviews) ? reviews.length : 0;
      const avg = count
        ? Number((reviews.reduce((s, r) => s + Number((r as { rating: number }).rating), 0) / count).toFixed(2))
        : 0;
      setVideoRatings((prev) => (prev[vid] ? prev : { ...prev, [vid]: { avg, count } }));
    } catch {
      // silent
    } finally {
      fetchingVideoIdsRef.current.delete(vid);
    }
  };

  const debouncedFetchVideoRating = useMemo(
    () => debounce((vid: string | number) => void fetchVideoRating(vid), DEBOUNCE_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backendUrl, videoRatings]
  );
  useEffect(() => () => debouncedFetchVideoRating.cancel(), [debouncedFetchVideoRating]);
  useEffect(() => {
    (featuredVideos as RecordedVideo[]).slice(0, VISIBLE_LIMIT).forEach((v) => debouncedFetchVideoRating(v.id));
  }, [featuredVideos, debouncedFetchVideoRating]);

  /* ------------------------------ Loading -------------------------------- */
  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-50 dark:bg-[#0b1016]`}>
        <ActivityIndicator size="large" color={resolvedScheme === 'dark' ? '#ffffff' : '#0d141c'} />
        <Text style={tw`mt-2 text-[#0d141c] dark:text-white/90`}>Loading tutor profiles...</Text>
      </View>
    );
  }

  /* ---------------------------------------------------------------------- */
  return (
    <ScrollView
      style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero — full width, background covers, CTAs fully inside */}
      <View style={[tw`w-full`, { marginTop: NAV_SPACER_PX }]}>
        <View
          style={[
            tw`w-full items-center justify-center px-4`,
            { height: HERO_HEIGHT_PX },
          ]}
        >
          <Image
            source={{ uri: HERO_BG }}
            style={tw`absolute inset-0 w-full h-full`}
            resizeMode="cover"
            blurRadius={2}
          />
          {/* dark overlay for legibility */}
          <View style={tw`absolute inset-0 bg-black/30`} />

          {/* Content stays INSIDE the hero bounds */}
          <View style={tw`w-full items-center justify-center px-4`}>
            <Text style={tw`text-white text-3xl font-extrabold text-center`}>
              Unlock Your Potential with Expert Tutors
            </Text>
            <Text style={tw`text-white/90 mt-2 text-center`}>
              Connect with top-rated tutors for personalized learning experiences.
            </Text>

            {/* CTAs live INSIDE the hero */}
            <View style={tw`flex-row gap-3 mt-4`}>
              <TouchableOpacity
                onPress={() => navigation.navigate('FindTutor')}
                style={tw`bg-pink-600 rounded-xl h-11 px-6 justify-center items-center`}
                accessibilityRole="button"
                accessibilityLabel="Find a Tutor"
              >
                <Text style={tw`text-white font-semibold`}>Find a Tutor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('RobotTutor')}
                style={tw`rounded-xl h-11 px-6 justify-center items-center bg-white dark:bg-[#0f1821]`}
                accessibilityRole="button"
                accessibilityLabel="Learn with AI"
              >
                <Text style={tw`font-semibold text-pink-600 dark:text-pink-300`}>Learn with AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Featured Tutors */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Tutors</Text>
        </View>

        {featuredTutors.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No featured tutors yet.</Text>
        ) : (
          <View style={tw`mt-3 flex-row flex-wrap -mx-1`}>
            {featuredTutors.slice(0, VISIBLE_LIMIT).map((t) => (
              <TouchableOpacity
                key={`${t.id}-${t.subject}`}
                onPress={() => navigation.navigate('Profile', { id: String(t.id) })}
                style={tw`w-1/2 px-1 mb-3`}
              >
                <View style={tw`rounded-2xl p-3 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                  <Image
                    source={{ uri: t.image }}
                    style={tw`w-16 h-16 rounded-full self-center`}
                    resizeMode="cover"
                  />
                  <View style={tw`mt-2 items-center`}>
                    <Text numberOfLines={1} style={tw`text-[13px] font-medium text-[#0d141c] dark:text-white`}>{t.name}</Text>
                    <Text numberOfLines={1} style={tw`text-[11px] text-slate-600 dark:text-slate-400`}>{t.subject}</Text>
                    <Text style={tw`text-yellow-600 dark:text-yellow-400 text-[11px] mt-1`}>
                      {starRow(t.ratingAvg)} {t.ratingCount > 0 ? `(${t.ratingCount})` : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Featured Courses */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Courses</Text>
        </View>

        {featuredCourses.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No featured courses yet.</Text>
        ) : (
          <View style={tw`mt-3`}>
            {featuredCourses.slice(0, VISIBLE_LIMIT).map((c: Course) => {
              const cid = String(c.id);
              const base = extractRating(c);
              const r = courseRatings[cid] ?? base;
              return (
                <View key={cid} style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                  <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>{c.title}</Text>
                  <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>{starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}</Text>
                  <Text numberOfLines={2} style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                    {c.description || 'Learn with a top-rated course.'}
                  </Text>
                  <View style={tw`flex-row mt-2`}>
                    <Text style={tw`text-slate-600 dark:text-slate-400 text-xs mr-3`}>Level: {c.level ?? '—'}</Text>
                    {c.price != null && <Text style={tw`text-slate-600 dark:text-slate-400 text-xs`}>{coursePrice(c)}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Featured Videos */}
<div style={tw`mt-6 px-4`}>
  <View style={tw`flex-row items-center justify-between`}>
    <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Videos</Text>
  </View>

  {featuredVideos.length === 0 ? (
    <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No videos to show yet.</Text>
  ) : (
    <View style={tw`mt-3`}>
      {(featuredVideos as RecordedVideo[])
        .slice(0, VISIBLE_LIMIT)
        .map((v: RecordedVideo) => {
          const subject = (v as any).subject ?? v.title ?? 'Video';
          const grade = (v as any).grade_level ?? '—';
          const priceTokens = Number.isFinite(Number((v as any).price)) ? Number((v as any).price) : 0;
          const base = extractRating(v as unknown as Ratingish);
          const r = videoRatings[v.id] ?? base;

          return (
            <TouchableOpacity
              key={String(v.id)}
              onPress={() => navigation.navigate('ClassVaultDetail', { id: Number(v.id) })}
              style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}
            >
              <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>
                {v.title ?? subject}
              </Text>
              <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>
                {starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}
              </Text>
              <Text style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                {subject} • Grade {grade}
              </Text>
              <Text style={tw`text-slate-700 dark:text-slate-200 text-sm mt-2`}>
                <Text style={tw`font-medium`}>Price:</Text> {priceTokens.toFixed(2)} tokens
              </Text>
              <Text style={tw`text-pink-600 dark:text-pink-400 mt-2`}>Purchase →</Text>
            </TouchableOpacity>
          );
        })}
    </View>
  )}
</div>


      {/* Recommended Courses */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Recommended Courses</Text>
        </View>

        {recommendedCourses.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No recommendations yet.</Text>
        ) : (
          <View style={tw`mt-3`}>
            {recommendedCourses.slice(0, VISIBLE_LIMIT).map((c: Course) => {
              const cid = String(c.id);
              const base = extractRating(c);
              const r = courseRatings[cid] ?? base;
              return (
                <View key={cid} style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                  <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>{c.title}</Text>
                  <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>{starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}</Text>
                  <Text numberOfLines={2} style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                    {c.description || 'Top picks based on quality and popularity.'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default HomePageNative;
