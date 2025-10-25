/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import debounce from 'lodash.debounce';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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

type OerCollection = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  thumbnail_url?: string;
  items_count?: number;
  content_kind?: 'video' | 'doc';
};

/* ----------------------------- Generic utils ---------------------------- */

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

const sStr = (v: any) => String(v ?? '').toLowerCase();
const hasAny = (obj: any, keys: string[]) =>
  keys.some((k) => {
    const v = obj?.[k];
    return v !== undefined && v !== null && String(v).length > 0;
  });

/** TRUE if a record is a video / playlist / stream (paid or OER) */
const isVideoish = (c: any): boolean => {
  const kind = sStr(c?.kind || c?.type || c?.category || c?.resource_type || c?.content_type);
  if (/(^|[^a-z])(video|playlist|recorded|lecture|stream)(s)?($|[^a-z])/.test(kind)) return true;
  if (typeof c?.is_video === 'boolean' && c.is_video) return true;

  if (
    hasAny(c, [
      'video_url',
      'video',
      'videoSrc',
      'preview_url',
      'previewUrl',
      'stream_url',
      'youtube_id',
      'youtubeId',
      'youtube_url',
      'vimeo_id',
      'wistia_id',
    ])
  ) return true;

  return false;
};

/** TRUE if a record is a document-like learning asset (PDF/HTML/books/notes) */
const isDocish = (c: any): boolean => {
  const kind = sStr(c?.kind || c?.type || c?.category || c?.resource_type || c?.content_type);
  const mime = sStr(c?.mime || c?.mime_type || c?.contentType);
  const url = String(c?.file_url || c?.download_url || c?.url || c?.web_url || '');
  if (/(book|textbook|pdf|ebook|document|doc|article|page|html|note|notes|handout|worksheet|guide|summary)/.test(kind)) return true;
  if (mime.includes('pdf') || mime.includes('html')) return true;
  if (/\.pdf($|\?)/i.test(url) || /\.html?($|\?)/i.test(url)) return true;
  if (sStr(c?.provider).includes('openstax')) return true;
  if (hasAny(c, ['html', 'html_content', 'html_url', 'article_html', 'article_url'])) return true;
  return false;
};

const uniqById = <T extends { id?: string | number }>(arr: T[]) => {
  const seen = new Set<string | number>();
  return arr.filter((x) => {
    const key = x?.id ?? Math.random();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Safe for --noUncheckedIndexedAccess
function interleave<T, U>(a: readonly T[], b: readonly U[], limit: number): Array<T | U> {
  const out: Array<T | U> = [];
  let i = 0;
  let j = 0;

  while (out.length < limit && (i < a.length || j < b.length)) {
    if (i < a.length) {
      const ai = a[i++];
      if (ai !== undefined) out.push(ai);
    }
    if (out.length >= limit) break;
    if (j < b.length) {
      const bj = b[j++];
      if (bj !== undefined) out.push(bj);
    }
  }

  return out;
}

/* -------------------- Absolute URL + thumbnail helpers ------------------- */
// Make absolute if backend returns a relative path (RN needs absolute URLs)
function toAbsUrl(backendUrl?: string, src?: string | null): string {
  const u = String(src ?? '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (!backendUrl) return u; // best-effort fallback
  const root = backendUrl.replace(/\/+$/, '');
  const path = u.replace(/^\/+/, '');
  return `${root}/${path}`;
}

// Try common thumbnail fields for course/video/collection objects
function pickThumb(obj: any, backendUrl?: string): string {
  const cand =
    obj?.thumbnail_url ??
    obj?.thumb ??
    obj?.thumbnail ??
    obj?.previewImage ??
    obj?.poster ??
    obj?.image ??
    obj?.cover;
  return toAbsUrl(backendUrl, cand);
}

// Small media block with fixed 16:9 aspect ratio
const CardMedia: React.FC<{ src?: string; alt?: string }> = ({ src }) => (
  <View style={tw`mb-3 overflow-hidden rounded-xl bg-slate-200 dark:bg-white/5`}>
    {src ? (
      <Image
        source={{ uri: src }}
        resizeMode="cover"
        // RN needs numeric size; width: '100%' + aspectRatio is a good pattern
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
    ) : (
      <View style={{ width: '100%', aspectRatio: 16 / 9 }} />
    )}
  </View>
);

/* ------------------------------------------------------------------ */
/* Animation helpers                                                  */
/* ------------------------------------------------------------------ */

/** Simple press scale hook for tappables (must be called unconditionally by its component) */
const usePressScale = (initial = 1) => {
  const scale = useSharedValue(initial);
  const onIn = () => { scale.value = withSpring(0.98, { damping: 20, stiffness: 260 }); };
  const onOut = () => { scale.value = withSpring(1, { damping: 16, stiffness: 200 }); };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { onIn, onOut, style };
};

/** Reveal a block when it scrolls into view (fade + rise) */
const SectionReveal: React.FC<React.PropsWithChildren<{
  scrollY: SharedValue<number>;
  offset?: number;      // start reveal this many px before the section
  duration?: number;
}>> = ({ scrollY, offset = 140, duration = 500, children }) => {
  const yRef = useRef(0);
  const [measured, setMeasured] = useState(false);

  const onLayout = useCallback((e: any) => {
    yRef.current = e.nativeEvent.layout.y;
    setMeasured(true);
  }, []);

  const aStyle = useAnimatedStyle(() => {
    const start = Math.max(0, yRef.current - offset);
    const end = yRef.current + 20;
    const o = interpolate(scrollY.value, [start, end], [0, 1], Extrapolation.CLAMP);
    const ty = interpolate(scrollY.value, [start, end], [16, 0], Extrapolation.CLAMP);
    return { opacity: o, transform: [{ translateY: ty }] };
  });

  return (
    <Animated.View
      onLayout={onLayout}
      entering={FadeIn.duration(duration)}
      style={aStyle}
    >
      {children}
    </Animated.View>
  );
};

const CardFadeIn: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      {children}
    </Animated.View>
  );
};

const SpringButton: React.FC<{ onPress: () => void; bg: string; children: React.ReactNode }> = ({
  onPress,
  bg,
  children,
}) => {
  const { onIn, onOut, style } = usePressScale();
  return (
    <Animated.View style={style}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={0.9}
        style={tw`${bg} rounded-xl h-11 px-6 justify-center items-center`}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const HomePageNative: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const navAny = navigation as unknown as { navigate: (...args: any[]) => void; getState: () => any };
  const hasRoute = (name: string): boolean => {
    try {
      const state = navigation.getState?.();
      const walk = (s: any): boolean => {
        if (!s) return false;
        const names = Array.isArray(s?.routeNames) ? s.routeNames : Array.isArray(s?.routes) ? s.routes.map((r: any) => r.name) : [];
        if (names.includes(name)) return true;
        const routes = Array.isArray(s?.routes) ? s.routes : [];
        for (const r of routes) {
          if (r?.state && walk(r.state)) return true;
        }
        return false;
      };
      return walk(state);
    } catch {
      return false;
    }
  };
  const goTutorProfile = (id: string) => {
    if (hasRoute('Profile')) navAny.navigate('Profile', { id });
  };
  const goCourse = (id: string) => {
    if (hasRoute('CourseDetail')) navAny.navigate('CourseDetail', { id });
    else if (hasRoute('Course')) navAny.navigate('Course', { id });
    else if (hasRoute('Courses')) navAny.navigate('Courses');
  };
  const goRecordedVideo = (id: number) => {
    if (hasRoute('ClassVaultDetail')) navAny.navigate('ClassVaultDetail', { id });
    else if (hasRoute('RecordedVideo')) navAny.navigate('RecordedVideo', { id });
    else if (hasRoute('Videos')) navAny.navigate('Videos');
  };
  const goCollection = (id: string, kind: 'video' | 'doc') => {
    const candidates = kind === 'video'
      ? ['OerCollection', 'VideoCollection', 'CollectionDetail', 'Videos']
      : ['OerCollection', 'DocCollection', 'CollectionDetail', 'Courses'];
    for (const name of candidates) {
      if (hasRoute(name)) {
        // Prefer to pass the id when target expects it.
        if (name === 'Videos' || name === 'Courses') {
          navAny.navigate(name, kind === 'doc' ? { free: 1 } : undefined);
        } else {
          navAny.navigate(name, { id });
        }
        return;
      }
    }
    // Last resort: open course detail if it exists
    if (hasRoute('CourseDetail')) navAny.navigate('CourseDetail', { id });
  };
  const goVideosIndex = () => {
    if (hasRoute('Videos')) navAny.navigate('Videos');
  };
  const goCoursesIndex = () => {
    if (hasRoute('Courses')) navAny.navigate('Courses');
  };

  const { backendUrl } = useShopContext();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useThemePref(); // 'light' | 'dark'

  // Layout constants
  const FOOTER_OVERLAY_PX = 84;
  const bottomPad = Math.max(FOOTER_OVERLAY_PX, FOOTER_OVERLAY_PX + insets.bottom);
  const NAV_SPACER_PX = 12;
  const HERO_HEIGHT_PX = 260;

  const { filteredProfiles, loading } = useHomePage();
  const {
    featuredCourses = [],
    featuredVideos = [],
    recommendedCourses = [],
    fetchFeaturedCourses,
    fetchFeaturedVideos,
    fetchRecommendedCourses,
  } = useCourses({ backendUrl });

  // OER collections (split: docs and videos)
  const [oerDocs, setOerDocs] = useState<OerCollection[]>([]);
  const [oerVideos, setOerVideos] = useState<OerCollection[]>([]);

  useEffect(() => {
    if (!backendUrl) return;
    // strictly docs (pdf/html/books)
    fetch(`${backendUrl}/api/oer/collections?kind=doc&limit=24`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load docs failed'))))
      .then((d) => setOerDocs(Array.isArray(d) ? d : []))
      .catch(() => setOerDocs([]));

    // strictly videos (playlist/video)
    fetch(`${backendUrl}/api/oer/collections?kind=video&limit=24`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load vids failed'))))
      .then((d) => setOerVideos(Array.isArray(d) ? d : []))
      .catch(() => setOerVideos([]));
  }, [backendUrl]);

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
      const image = resolveTutorImage(best, backendUrl!);
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

  /* --------------------------- Scroll driver ----------------------------- */
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  // Hero parallax + subtle zoom + overlay darkening
  const heroStyle = useAnimatedStyle(() => {
    const tY = interpolate(scrollY.value, [0, 180], [0, -24], Extrapolation.CLAMP);
    const sc = interpolate(scrollY.value, [0, 180], [1.02, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY: tY }, { scale: sc }] };
  });
  const heroOverlayStyle = useAnimatedStyle(() => {
    const o = interpolate(scrollY.value, [0, 160], [0.30, 0.50], Extrapolation.CLAMP);
    return { opacity: o };
  });

  /* ---------------------------- OER mixing ------------------------------- */
  // Featured Videos = interleave(recorded videos, OER video collections)
  type MixedVideoItem =
    | { kind: 'recorded'; data: RecordedVideo }
    | { kind: 'oerCollection'; data: OerCollection };

  const featuredRecordedVideos = useMemo(
    () => (featuredVideos as RecordedVideo[]).filter((v: any) => isVideoish(v)),
    [featuredVideos]
  );

  const featuredOerVideoCollections = useMemo(
    () => (oerVideos as OerCollection[]),
    [oerVideos]
  );

  const featuredVideosMixed: MixedVideoItem[] = useMemo(() => {
    const a = featuredRecordedVideos.map((v) => ({ kind: 'recorded', data: v } as MixedVideoItem));
    const b = featuredOerVideoCollections.map((c) => ({ kind: 'oerCollection', data: c } as MixedVideoItem));
    return interleave(a, b, VISIBLE_LIMIT) as MixedVideoItem[];
  }, [featuredRecordedVideos, featuredOerVideoCollections]);

  // ids used in Featured Videos to avoid duplication in Free Videos
  const usedOerVideoCollectionIds = useMemo(() => {
    const s = new Set<string | number>();
    featuredVideosMixed.forEach((it) => {
      if (it.kind === 'oerCollection') s.add(it.data.id);
    });
    return s;
  }, [featuredVideosMixed]);

  // Featured Courses = interleave(normal courses, OER doc collections)
  const featuredNormalCourses = useMemo(
    () => (featuredCourses as Course[]).slice(0, VISIBLE_LIMIT * 2),
    [featuredCourses]
  );

  const featuredCoursesDisplay = useMemo(
    () => interleave<Course, OerCollection>(featuredNormalCourses, oerDocs, VISIBLE_LIMIT),
    [featuredNormalCourses, oerDocs]
  );

  const usedFreeDocIds = useMemo(() => {
    const s = new Set<string | number>();
    (featuredCoursesDisplay as Array<Course | OerCollection>).forEach((c: any) => {
      if ((c?.content_kind ?? '') === 'doc') s.add(c.id);
    });
    return s;
  }, [featuredCoursesDisplay]);

  // Free Courses = remaining OER docs
  const freeCoursesToShow = useMemo(
    () => (oerDocs as OerCollection[]).filter((c) => !usedFreeDocIds.has(c.id)).slice(0, VISIBLE_LIMIT),
    [oerDocs, usedFreeDocIds]
  );

  // Free Videos = remaining OER video collections
  const freeVideoCollections = useMemo(
    () => (oerVideos as OerCollection[]).filter((c) => !usedOerVideoCollectionIds.has(c.id)).slice(0, VISIBLE_LIMIT),
    [oerVideos, usedOerVideoCollectionIds]
  );

  /* ------------------------------ Render -------------------------------- */
  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-50 dark:bg-[#0b1016]`}>
        <ActivityIndicator size="large" color={resolvedScheme === 'dark' ? '#ffffff' : '#0d141c'} />
        <Text style={tw`mt-2 text-[#0d141c] dark:text-white/90`}>Loading tutor profiles...</Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Hero */}
      <View style={[tw`w-full`, { marginTop: NAV_SPACER_PX }]}>
        <Animated.View
          style={[tw`w-full items-center justify-center px-4`, { height: HERO_HEIGHT_PX }, heroStyle]}
        >
          <Image
            source={{ uri: HERO_BG }}
            style={tw`absolute inset-0 w-full h-full`}
            resizeMode="cover"
            blurRadius={2}
          />
          <Animated.View style={[tw`absolute inset-0 bg-black`, heroOverlayStyle]} />

          <View style={tw`w-full items-center justify-center px-4`}>
            <Text style={tw`text-white text-3xl font-extrabold text-center`}>
              Unlock Your Potential with Expert Tutors
            </Text>
            <Text style={tw`text-white/90 mt-2 text-center`}>
              Connect with top-rated tutors for personalized learning experiences.
            </Text>

            <View style={tw`flex-row gap-3 mt-4`}>
              <SpringButton onPress={() => navAny.navigate('FindTutor')} bg="bg-pink-600">
                <Text style={tw`text-white font-semibold`}>Find a Tutor</Text>
              </SpringButton>
              <SpringButton onPress={() => navAny.navigate('RobotTutor')} bg="bg-white dark:bg-[#0f1821]">
                <Text style={tw`font-semibold text-pink-600 dark:text-pink-300`}>Learn with AI</Text>
              </SpringButton>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Featured Tutors */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Tutors</Text>
        </View>

        {featuredTutors.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No featured tutors yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY}>
            <View style={tw`mt-3 flex-row flex-wrap -mx-1`}>
              {featuredTutors.slice(0, VISIBLE_LIMIT).map((t) => (
                <TouchableOpacity
                  key={`${t.id}-${t.subject}`}
                  onPress={() => goTutorProfile(String(t.id))}
                  style={tw`w-1/2 px-1 mb-3`}
                  activeOpacity={0.9}
                >
                  <CardFadeIn>
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
                  </CardFadeIn>
                </TouchableOpacity>
              ))}
            </View>
          </SectionReveal>
        )}
      </View>

      {/* Featured Courses (MIX: normal + OER docs) */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Courses</Text>
        </View>

        {featuredCoursesDisplay.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No featured courses yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY} offset={160}>
            <View style={tw`mt-3`}>
              {featuredCoursesDisplay.slice(0, VISIBLE_LIMIT).map((c: any) => {
                const isDoc = (c?.content_kind ?? '') === 'doc';
                const cid = String(c.id);
                const base = extractRating(c);
                const r = courseRatings[cid] ?? base;
                const thumb = pickThumb(c, backendUrl);

                return (
                  <TouchableOpacity
                    key={`featc-${cid}`}
                    onPress={() => (isDoc ? goCollection(cid, 'doc') : goCourse(cid))}
                    activeOpacity={0.9}
                  >
                    <CardFadeIn>
                      <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                        <CardMedia src={thumb} />
                        <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>{c.title}</Text>
                        <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>{starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}</Text>
                        <Text numberOfLines={2} style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                          {c.description || (isDoc ? 'Open & free to start learning.' : 'Learn with a top-rated course.')}
                        </Text>
                        <View style={tw`flex-row mt-2`}>
                          {isDoc ? (
                            <>
                              <Text style={tw`text-emerald-700 dark:text-emerald-300 text-xs mr-3`}>Free</Text>
                              <Text style={tw`text-slate-600 dark:text-slate-400 text-xs`}>Level: {c.level ?? '—'}</Text>
                            </>
                          ) : (
                            <>
                              <Text style={tw`text-slate-600 dark:text-slate-400 text-xs mr-3`}>Level: {c.level ?? '—'}</Text>
                              {c.price != null && <Text style={tw`text-slate-600 dark:text-slate-400 text-xs`}>{coursePrice(c)}</Text>}
                            </>
                          )}
                        </View>
                      </View>
                    </CardFadeIn>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionReveal>
        )}
      </View>

      {/* Featured Videos (MIX: recorded + OER collections) */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Featured Videos</Text>
          <TouchableOpacity onPress={goVideosIndex}><Text style={tw`text-pink-600`}>See All</Text></TouchableOpacity>
        </View>

        {featuredVideosMixed.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No videos to show yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY} offset={160}>
            <View style={tw`mt-3`}>
              {featuredVideosMixed.slice(0, VISIBLE_LIMIT).map((item) => {
                if (item.kind === 'recorded') {
                  const v = item.data;
                  const subject = (v as any).subject ?? v.title ?? 'Video';
                  const grade = (v as any).grade_level ?? '—';
                  const priceTokens = Number.isFinite(Number((v as any).price)) ? Number((v as any).price) : 0;
                  const base = extractRating(v as unknown as Ratingish);
                  const r = videoRatings[v.id] ?? base;
                  const thumb = pickThumb(v, backendUrl);

                  return (
                    <TouchableOpacity
                      key={`vid-rec-${String(v.id)}`}
                      onPress={() => goRecordedVideo(Number(v.id))}
                      activeOpacity={0.9}
                    >
                      <CardFadeIn>
                        <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                          <CardMedia src={thumb} />
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
                        </View>
                      </CardFadeIn>
                    </TouchableOpacity>
                  );
                }

                const col = item.data;
                const thumb = pickThumb(col, backendUrl);
                return (
                  <TouchableOpacity
                    key={`vid-col-${col.id}`}
                    onPress={() => goCollection(String(col.id), 'video')}
                    activeOpacity={0.9}
                  >
                    <CardFadeIn>
                      <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                        <CardMedia src={thumb} />
                        <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>
                          {col.title ?? 'Collection'}
                        </Text>
                        <Text style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                          Free Video Collection{typeof col.items_count === 'number' ? ` • ${col.items_count} item${col.items_count === 1 ? '' : 's'}` : ''}
                        </Text>
                        <Text style={tw`text-pink-600 dark:text-pink-400 mt-2`}>View Collection →</Text>
                      </View>
                    </CardFadeIn>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionReveal>
        )}
      </View>

      {/* Free Courses (OER docs only) */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Free Courses</Text>
          <TouchableOpacity onPress={goCoursesIndex}><Text style={tw`text-pink-600`}>Browse Free</Text></TouchableOpacity>
        </View>

        {freeCoursesToShow.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No free courses yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY} offset={160}>
            <View style={tw`mt-3`}>
              {freeCoursesToShow.slice(0, VISIBLE_LIMIT).map((c) => {
                const cid = String(c.id);
                const base = extractRating(c);
                const r = courseRatings[cid] ?? base;
                const thumb = pickThumb(c, backendUrl);
                return (
                  <TouchableOpacity
                    key={`free-${cid}`}
                    onPress={() => goCollection(cid, 'doc')}
                    activeOpacity={0.9}
                  >
                    <CardFadeIn>
                      <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                        <CardMedia src={thumb} />
                        <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>{c.title}</Text>
                        <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>{starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}</Text>
                        <Text numberOfLines={2} style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                          {c.description || 'Open & free to start learning.'}
                        </Text>
                        <View style={tw`flex-row mt-2`}>
                          <Text style={tw`text-emerald-700 dark:text-emerald-300 text-xs mr-3`}>Free</Text>
                          <Text style={tw`text-slate-600 dark:text-slate-400 text-xs`}>Level: {(c as any).level ?? '—'}</Text>
                        </View>
                      </View>
                    </CardFadeIn>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionReveal>
        )}
      </View>

      {/* Free Videos (remaining OER video collections) */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Free Videos</Text>
          <TouchableOpacity onPress={goVideosIndex}><Text style={tw`text-pink-600`}>See All</Text></TouchableOpacity>
        </View>

        {freeVideoCollections.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No free videos to show yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY} offset={160}>
            <View style={tw`mt-3`}>
              {freeVideoCollections.slice(0, VISIBLE_LIMIT).map((col) => {
                const thumb = pickThumb(col, backendUrl);
                return (
                  <TouchableOpacity
                    key={`col-${col.id}`}
                    onPress={() => goCollection(String(col.id), 'video')}
                    activeOpacity={0.9}
                  >
                    <CardFadeIn>
                      <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                        <CardMedia src={thumb} />
                        <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>
                          {col.title ?? 'Collection'}
                        </Text>
                        <Text style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                          Free Video Collection{typeof col.items_count === 'number' ? ` • ${col.items_count} item${col.items_count === 1 ? '' : 's'}` : ''}
                        </Text>
                        <Text style={tw`text-pink-600 dark:text-pink-400 mt-2`}>View Collection →</Text>
                      </View>
                    </CardFadeIn>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionReveal>
        )}
      </View>

      {/* Recommended Courses (unchanged list, no videos) */}
      <View style={tw`mt-6 px-4`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-xl font-bold text-[#0d141c] dark:text-white`}>Recommended Courses</Text>
          <TouchableOpacity onPress={goCoursesIndex}><Text style={tw`text-pink-600`}>Browse all</Text></TouchableOpacity>
        </View>

        {recommendedCourses.length === 0 ? (
          <Text style={tw`text-slate-600 dark:text-slate-300 mt-2`}>No recommendations yet.</Text>
        ) : (
          <SectionReveal scrollY={scrollY} offset={160}>
            <View style={tw`mt-3`}>
              {(recommendedCourses as Course[]).slice(0, VISIBLE_LIMIT).map((c: Course) => {
                const cid = String(c.id);
                const base = extractRating(c);
                const r = courseRatings[cid] ?? base;
                const thumb = pickThumb(c, backendUrl);
                return (
                  <TouchableOpacity key={`recc-${cid}`} onPress={() => goCourse(cid)} activeOpacity={0.9}>
                    <CardFadeIn>
                      <View style={tw`mb-3 rounded-2xl p-4 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10`}>
                        <CardMedia src={thumb} />
                        <Text numberOfLines={1} style={tw`font-semibold text-[#0d141c] dark:text-white`}>{c.title}</Text>
                        <Text style={tw`text-yellow-600 dark:text-yellow-400 text-xs mt-1`}>{starRow(r.avg)} {r.count > 0 ? `(${r.count})` : ''}</Text>
                        <Text numberOfLines={2} style={tw`text-slate-600 dark:text-slate-400 text-sm mt-1`}>
                          {c.description || 'Top picks based on quality and popularity.'}
                        </Text>
                      </View>
                    </CardFadeIn>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionReveal>
        )}
      </View>
    </Animated.ScrollView>
  );
};

export default HomePageNative;
