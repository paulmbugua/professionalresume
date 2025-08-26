// apps/web/src/pages/HomePage.web.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { useHomePage } from '@mytutorapp/shared/hooks';
import { useCourses } from '@mytutorapp/shared/hooks';
import type { Profile, Course } from '@mytutorapp/shared/types';
import { fetchVideoReviews } from '@mytutorapp/shared/api/classVaultApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faStar as faStarSolid,
  faStarHalfAlt as faStarHalf,
  faStar as faStarOutlineAlias,
  faPlayCircle,
} from '@fortawesome/free-solid-svg-icons';

import {
  motion,
  useReducedMotion,
  Variants,
} from 'framer-motion';

// Optional hero/thumbnail helper; swap to your own if preferred.
import CourseHero from '../components/CourseHero';

const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

const HERO_BG =
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2000&auto=format&fit=crop';

const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const;

const VISIBLE_LIMIT = 8;
const DEBOUNCE_MS = 250;

/* ----------------------------- Motion variants ---------------------------- */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, when: 'beforeChildren' } },
};

/* ----------------------------- UI helpers -------------------------------- */
function StarRow({ avg }: { avg: number }) {
  const rounded = Math.round(avg * 2) / 2;
  const icons: JSX.Element[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) {
      icons.push(<FontAwesomeIcon key={i} icon={faStarSolid as IconProp} className="text-yellow-500" />);
    } else if (rounded + 0.5 === i) {
      icons.push(<FontAwesomeIcon key={i} icon={faStarHalf as IconProp} className="text-yellow-500" />);
    } else {
      icons.push(<FontAwesomeIcon key={i} icon={faStarOutlineAlias as IconProp} className="text-yellow-500 opacity-30" />);
    }
  }
  return <span aria-label={`Rated ${avg} out of 5`} className="inline-flex gap-0.5">{icons}</span>;
}

function extractRating(x: any): { avg: number; count: number } {
  const avg = Number(x?.avgRating ?? x?.rating ?? x?.stars ?? 0);
  const count = Number(x?.ratingsCount ?? x?.reviewCount ?? x?.totalReviews ?? x?.count ?? 0);
  return { avg: Number.isFinite(avg) ? avg : 0, count: Number.isFinite(count) ? count : 0 };
}

/* ------------------------------------------------------------------------- */

const HomePage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion() ?? false;

  const { filteredProfiles, loading } = useHomePage();
  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? '';

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
    void fetchFeaturedCourses({ limit: 8, minCount: 2 });
    void fetchFeaturedVideos({ limit: 6, minCount: 1 });
    void fetchRecommendedCourses({ limit: 6, minCount: 1 });
  }, [backendUrl, fetchFeaturedCourses, fetchFeaturedVideos, fetchRecommendedCourses]);

  /* -------------------------- Featured Tutors --------------------------- */
  const tutorProfiles: Profile[] = useMemo(
    () => filteredProfiles.filter((p) => p.role === 'tutor') as unknown as Profile[],
    [filteredProfiles]
  );

  const resolveTutorImage = (p: any, fallbackName?: string) => {
    const g0 = Array.isArray(p?.gallery) ? p.gallery[0] : undefined;
    if (typeof g0 === 'string' && g0.length > 0) {
      if (/^https?:\/\//i.test(g0)) return g0;
      if (g0.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${g0}`;
    }
    return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
  };

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
      const matches = tutorProfiles.filter((p) =>
        (p.category ?? '').toLowerCase().includes(subject.toLowerCase())
      );
      if (matches.length === 0) return;

      const best = matches.reduce((a, b) => (getTutorAvg(b) > getTutorAvg(a) ? b : a));
      const image = resolveTutorImage(best, best?.name || 'Tutor');
      const { avg, count } = extractRating(best);

      rows.push({
        id: (best as any).user_id ?? (best as any).id ?? String(best?.name ?? subject),
        name: (best as any).name ?? 'Tutor',
        subject,
        image,
        category: (best as any).category,
        ratingAvg: avg,
        ratingCount: count,
      });
    });
    return rows;
  }, [tutorProfiles, backendUrl]);

  const coursePrice = (c: Course) =>
    typeof c.price === 'number' ? `$${c.price.toLocaleString()}` : (c.price ?? '');

  /* ----------------------- Ratings Prefetch (Courses) -------------------- */
  const [courseRatings, setCourseRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const fetchingCourseIdsRef = useRef<Set<string>>(new Set());

  const fetchCourseRatings = async (courseId: string) => {
    if (!backendUrl || fetchingCourseIdsRef.current.has(courseId) || courseRatings[courseId]) return;
    try {
      fetchingCourseIdsRef.current.add(courseId);
      const res = await fetch(`${backendUrl}/api/reviews/courses/${courseId}`);
      if (!res.ok) return;
      const data = await res.json();
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
    const ids = [
      ...featuredCourses.slice(0, VISIBLE_LIMIT),
      ...recommendedCourses.slice(0, VISIBLE_LIMIT),
    ]
      .map((c: any) => String(c?.id))
      .filter(Boolean);

    ids.forEach((cid) => debouncedFetchCourseRatings(cid));
  }, [featuredCourses, recommendedCourses, debouncedFetchCourseRatings]);

  /* ------------------------ Ratings Prefetch (Videos) -------------------- */
  const [videoRatings, setVideoRatings] = useState<Record<string | number, { avg: number; count: number }>>({});
  const fetchingVideoIdsRef = useRef<Set<string | number>>(new Set());

  const fetchVideoRating = async (vid: number | string) => {
    if (!backendUrl || fetchingVideoIdsRef.current.has(vid) || videoRatings[vid]) return;
    try {
      fetchingVideoIdsRef.current.add(vid);
      const reviews = await fetchVideoReviews(backendUrl, Number(vid));
      const count = Array.isArray(reviews) ? reviews.length : 0;
      const avg = count
        ? Number((reviews.reduce((s: number, r: any) => s + Number(r.rating), 0) / count).toFixed(2))
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
    featuredVideos.slice(0, VISIBLE_LIMIT).forEach((v: any) => debouncedFetchVideoRating(v.id));
  }, [featuredVideos, debouncedFetchVideoRating]);

  const prefetchCourseOnHover = (cid: string) => debouncedFetchCourseRatings(cid);
  const prefetchVideoOnHover = (vid: number | string) => debouncedFetchVideoRating(vid);

  // Which featured-video card shows native controls (preview always playing)
  const [openPreviewId, setOpenPreviewId] = useState<string | number | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
        Loading tutor profiles...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary overflow-x-hidden">
      {/* decorative soft glows (subtle, behind content) */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl bg-indigo-300/20" />
          <div className="absolute top-10 right-10 h-80 w-80 rounded-full blur-3xl bg-cyan-300/20" />
        </div>
      )}

      <main className="flex-1">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Hero */}
          <motion.section
            className="relative overflow-hidden rounded-2xl"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div
              className="min-h-[52vh] lg:minh-[60vh] bg-cover bg-center flex flex-col items-center justify-center gap-4 sm:gap-5 px-4 text-center"
              style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.55)), url("${HERO_BG}")` }}
            >
              <motion.h2
                className="font-black tracking-tight text-[clamp(1.75rem,4vw,3.25rem)] text-darkTextPrimary"
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                Unlock Your Potential with Expert Tutors
              </motion.h2>

              <motion.p
                className="max-w-[800px] text-darkTextPrimary/90"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.08 }}
              >
                Connect with top-rated tutors for personalized learning experiences.
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.16 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/find-tutor"
                  className="inline-flex items-center justify-center rounded-xl h-11 px-6 bg-primary text-white font-semibold shadow-sm hover:shadow transition active:translate-y-[1px]"
                >
                  Find a Tutor
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* ⭐ Featured Tutors */}
          <motion.section
            className="mt-10"
            variants={sectionStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            <motion.div className="flex items-center justify-between px-1" variants={fadeUp}>
              <h3 className="text-[22px] font-bold tracking-tight">Featured Tutors</h3>
              <Link to="/find-tutor" className="text-primary hover:underline">See All Tutors</Link>
            </motion.div>

            {/* Mobile: horizontal snap */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {featuredTutors.length === 0 && (
                  <p className="text-darkTextSecondary px-1">No featured tutors yet.</p>
                )}
                {featuredTutors.map((t, idx) => (
                  <motion.div
                    key={`${t.id}-${t.subject}`}
                    className="snap-start shrink-0 w-40"
                    variants={fadeInScale}
                    transition={{ delay: 0.02 * idx }}
                    whileHover={{ y: -3 }}
                  >
                    <Link to={`/profile/${t.id}`} className="block">
                      <div
                        className="bg-center bg-cover rounded-full aspect-square w-28 mx-auto ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                        style={{ backgroundImage: `url("${t.image}")` }}
                      />
                      <div className="mt-2 text-center">
                        <p className="font-medium truncate">{t.name}</p>
                        <p className="text-darkTextSecondary">{t.subject}</p>
                        <div className="mt-1 flex items-center justify-center gap-2">
                          <StarRow avg={t.ratingAvg} />
                          {t.ratingCount > 0 && (
                            <span className="text-xs text-darkTextSecondary">({t.ratingCount})</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {featuredTutors.length === 0 && (
                <p className="text-darkTextSecondary px-1 col-span-full">No featured tutors yet.</p>
              )}
              {featuredTutors.map((t, idx) => (
                <motion.div
                  key={`${t.id}-${t.subject}`}
                  variants={fadeInScale}
                  transition={{ delay: 0.02 * idx }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    to={`/profile/${t.id}`}
                    className="group rounded-2xl ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition p-4 bg-white dark:bg-[#0f1821] block"
                  >
                    <div
                      className="bg-center bg-cover rounded-full aspect-square w-24 mx-auto ring-1 ring-gray-200 dark:ring-darkCard group-hover:ring-primary transition"
                      style={{ backgroundImage: `url("${t.image}")` }}
                    />
                    <div className="mt-3 text-center">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-darkTextSecondary">{t.subject}</p>
                      <div className="mt-1 flex items-center justify-center gap-2">
                        <StarRow avg={t.ratingAvg} />
                        {t.ratingCount > 0 && (
                          <span className="text-xs text-darkTextSecondary">({t.ratingCount})</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ⭐ Featured Courses */}
          <motion.section
            className="mt-12"
            variants={sectionStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            <motion.div className="flex items-center justify-between px-1" variants={fadeUp}>
              <h3 className="text-[22px] font-bold tracking-tight">Featured Courses</h3>
              <Link to="/courses" className="text-primary hover:underline">Browse All</Link>
            </motion.div>

            {/* Mobile: horizontal */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {featuredCourses.length === 0 && (
                  <p className="text-darkTextSecondary px-1">No featured courses yet.</p>
                )}
                {featuredCourses.map((c, idx) => {
                  const cid = String(c.id);
                  const base = extractRating(c);
                  const r = courseRatings[cid] ?? base;
                  return (
                    <motion.div
                      key={cid}
                      className="snap-start shrink-0 w-64"
                      variants={fadeInScale}
                      transition={{ delay: 0.02 * idx }}
                      whileHover={{ y: -3 }}
                    >
                      <Link
                        to={`/courses/${cid}`}
                        className="block bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                        onMouseEnter={() => prefetchCourseOnHover(cid)}
                      >
                        <CourseHero course={c} backendUrl={backendUrl} />
                        <div className="p-4">
                          <h4 className="font-semibold truncate">{c.title}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <StarRow avg={r.avg} />
                            {r.count > 0 && (
                              <span className="text-xs text-darkTextSecondary">({r.count})</span>
                            )}
                          </div>
                          <p className="text-sm text-darkTextSecondary line-clamp-2 mt-1">
                            {c.description || 'Learn with a top-rated course.'}
                          </p>
                          <div className="mt-3 text-sm text-darkTextSecondary">
                            <span className="inline-flex items-center rounded bg-[#e7edf4] dark:bg-[#172534] px-2 h-7 mr-2">
                              Level: {c.level ?? '—'}
                            </span>
                            {c.price != null && (
                              <span className="inline-flex items-center rounded bg-[#e7edf4] dark:bg-[#172534] px-2 h-7">
                                {coursePrice(c)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredCourses.length === 0 && (
                <p className="text-darkTextSecondary px-1 col-span-full">No featured courses yet.</p>
              )}
              {featuredCourses.map((c, idx) => {
                const cid = String(c.id);
                const base = extractRating(c);
                const r = courseRatings[cid] ?? base;
                return (
                  <motion.div
                    key={cid}
                    variants={fadeInScale}
                    transition={{ delay: 0.02 * idx }}
                    whileHover={{ y: -4 }}
                  >
                    <Link
                      to={`/courses/${cid}`}
                      className="block bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                      onMouseEnter={() => prefetchCourseOnHover(cid)}
                    >
                      <CourseHero course={c} backendUrl={backendUrl} />
                      <div className="p-4">
                        <h4 className="font-semibold truncate">{c.title}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRow avg={r.avg} />
                          {r.count > 0 && (
                            <span className="text-xs text-darkTextSecondary">({r.count})</span>
                          )}
                        </div>
                        <p className="text-sm text-darkTextSecondary line-clamp-2 mt-1">
                          {c.description || 'Learn with a top-rated course.'}
                        </p>
                        <div className="mt-3 text-sm text-darkTextSecondary">
                          <span className="inline-flex items-center rounded bg-[#e7edf4] dark:bg-[#172534] px-2 h-7 mr-2">
                            Level: {c.level ?? '—'}
                          </span>
                          {c.price != null && (
                            <span className="inline-flex items-center rounded bg-[#e7edf4] dark:bg-[#172534] px-2 h-7">
                              {coursePrice(c)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ⭐ Featured Videos (autoplay preview + ratings) */}
          <motion.section
            className="mt-12"
            variants={sectionStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            <motion.div className="flex items-center justify-between px-1" variants={fadeUp}>
              <h3 className="text-[22px] font-bold tracking-tight">Featured Videos</h3>
              <Link to="/videos" className="text-primary hover:underline">See All</Link>
            </motion.div>

            {/* Mobile: horizontal (size matches Featured Courses) */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {featuredVideos.length === 0 && (
                  <p className="text-darkTextSecondary px-1">No videos to show yet.</p>
                )}
                {featuredVideos.map((v: any, idx: number) => {
                  const subject = v?.subject ?? v?.category ?? v?.topic ?? v?.title ?? 'Video';
                  const grade = v?.grade_level ?? v?.grade ?? v?.level ?? '—';
                  const priceRaw = v?.price ?? v?.priceTokens ?? v?.tokenPrice ?? v?.tokens ?? 0;
                  const priceTokens = Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : 0;

                  const base = extractRating(v);
                  const r = videoRatings[v.id] ?? base;

                  const thumb = v?.thumbnail_url || v?.thumb || v?.thumbnail || v?.previewImage || '';
                  const previewSrc = v?.preview_url || v?.previewUrl || v?.preview || v?.sample || '';
                  const isControls = openPreviewId === v.id;

                  return (
                    <motion.div
                      key={v.id}
                      className="snap-start shrink-0 w-64"
                      variants={fadeInScale}
                      transition={{ delay: 0.02 * idx }}
                      whileHover={{ y: -3 }}
                      onMouseEnter={() => prefetchVideoOnHover(v.id)}
                    >
                      <div className="bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition">
                        <div className="relative">
                          {previewSrc ? (
                            <>
                              <video
                                key={String(v.id) + String(isControls)}
                                src={previewSrc}
                                poster={thumb || undefined}
                                className="w-full aspect-video object-cover"
                                muted
                                playsInline
                                loop
                                autoPlay
                                controls={isControls}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenPreviewId((prev) => (prev === v.id ? null : v.id))
                                }
                                className="absolute inset-0"
                                aria-label={isControls ? 'Hide controls' : 'Show controls'}
                                title={isControls ? 'Hide controls' : 'Show controls'}
                              />
                            </>
                          ) : (
                            <div
                              className="w-full aspect-video bg-center bg-cover flex items-center justify-center text-white text-5xl"
                              style={{ backgroundImage: `url("${thumb}")` }}
                              aria-label={`${subject} preview not available`}
                            >
                              <FontAwesomeIcon icon={faPlayCircle as IconProp} className="drop-shadow" />
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h4 className="font-semibold truncate">{v.title ?? subject}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <StarRow avg={r.avg} />
                            {r.count > 0 && (
                              <span className="text-xs text-darkTextSecondary">({r.count})</span>
                            )}
                          </div>
                          <p className="text-sm text-darkTextSecondary mt-1">
                            {subject} • Grade {grade}
                          </p>
                          <p className="text-sm mt-3">
                            <span className="font-medium">Price:</span> {priceTokens.toFixed(2)} tokens
                          </p>
                          <div className="mt-3">
                            <Link
                              to={`/class-vault/${v.id}`}
                              className="inline-flex items-center justify-center rounded-xl h-9 px-4 bg-primary text-white text-sm font-semibold hover:brightness-110"
                            >
                              Purchase
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredVideos.length === 0 && (
                <p className="text-darkTextSecondary px-1 col-span-full">No videos to show yet.</p>
              )}
              {featuredVideos.map((v: any, idx: number) => {
                const subject = v?.subject ?? v?.category ?? v?.topic ?? v?.title ?? 'Video';
                const grade = v?.grade_level ?? v?.grade ?? v?.level ?? '—';
                const priceRaw = v?.price ?? v?.priceTokens ?? v?.tokenPrice ?? v?.tokens ?? 0;
                const priceTokens = Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : 0;

                const base = extractRating(v);
                const r = videoRatings[v.id] ?? base;

                const thumb = v?.thumbnail_url || v?.thumb || v?.thumbnail || v?.previewImage || '';
                const previewSrc = v?.preview_url || v?.previewUrl || v?.preview || v?.sample || '';
                const isControls = openPreviewId === v.id;

                return (
                  <motion.div
                    key={v.id}
                    variants={fadeInScale}
                    transition={{ delay: 0.02 * idx }}
                    whileHover={{ y: -4 }}
                    onMouseEnter={() => prefetchVideoOnHover(v.id)}
                  >
                    <div className="bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition">
                      <div className="relative">
                        {previewSrc ? (
                          <>
                            <video
                              key={String(v.id) + String(isControls)}
                              src={previewSrc}
                              poster={thumb || undefined}
                              className="w-full aspect-video object-cover"
                              muted
                              playsInline
                              loop
                              autoPlay
                              controls={isControls}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setOpenPreviewId((prev) => (prev === v.id ? null : v.id))
                              }
                              className="absolute inset-0"
                              aria-label={isControls ? 'Hide controls' : 'Show controls'}
                              title={isControls ? 'Hide controls' : 'Show controls'}
                            />
                          </>
                        ) : (
                          <div
                            className="w-full aspect-video bg-center bg-cover flex items-center justify-center text-white text-5xl"
                            style={{ backgroundImage: `url("${thumb}")` }}
                            aria-label={`${subject} preview not available`}
                          >
                            <FontAwesomeIcon icon={faPlayCircle as IconProp} className="drop-shadow" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h4 className="font-semibold truncate">{v.title ?? subject}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRow avg={r.avg} />
                          {r.count > 0 && (
                            <span className="text-xs text-darkTextSecondary">({r.count})</span>
                          )}
                        </div>
                        <p className="text-sm text-darkTextSecondary mt-1">
                          {subject} • Grade {grade}
                        </p>
                        <p className="text-sm mt-3">
                          <span className="font-medium">Price:</span> {priceTokens.toFixed(2)} tokens
                        </p>
                        <div className="mt-3">
                          <Link
                            to={`/class-vault/${v.id}`}
                            className="inline-flex items-center justify-center rounded-xl h-9 px-4 bg-primary text-white text-sm font-semibold hover:brightness-110"
                          >
                            Purchase
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ⭐ Recommended Courses */}
          <motion.section
            className="mt-12"
            variants={sectionStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
          >
            <motion.div className="flex items-center justify-between px-1" variants={fadeUp}>
              <h3 className="text-[22px] font-bold tracking-tight">Recommended Courses</h3>
              <Link to="/courses" className="text-primary hover:underline">Browse all</Link>
            </motion.div>

            {/* Mobile: horizontal */}
            <div className="mt-4 md:hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
                {recommendedCourses.length === 0 && (
                  <p className="text-darkTextSecondary px-1">No recommendations yet.</p>
                )}
                {recommendedCourses.map((c, idx) => {
                  const cid = String(c.id);
                  const base = extractRating(c);
                  const r = courseRatings[cid] ?? base;
                  return (
                    <motion.div
                      key={cid}
                      className="snap-start shrink-0 w-64"
                      variants={fadeInScale}
                      transition={{ delay: 0.02 * idx }}
                      whileHover={{ y: -3 }}
                    >
                      <Link
                        to={`/courses/${cid}`}
                        className="block bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                        onMouseEnter={() => prefetchCourseOnHover(cid)}
                      >
                        <CourseHero course={c} backendUrl={backendUrl} />
                        <div className="p-4">
                          <h4 className="font-semibold truncate">{c.title}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <StarRow avg={r.avg} />
                            {r.count > 0 && (
                              <span className="text-xs text-darkTextSecondary">({r.count})</span>
                            )}
                          </div>
                          <p className="text-sm text-darkTextSecondary line-clamp-2 mt-1">
                            {c.description || 'Top picks based on quality and popularity.'}
                          </p>
                          <div className="mt-3">
                            <span className="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-medium hover:brightness-110">
                              View Course
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Desktop grid */}
            <div className="mt-4 hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendedCourses.length === 0 && (
                <p className="text-darkTextSecondary px-1 col-span-full">No recommendations yet.</p>
              )}
              {recommendedCourses.map((c, idx) => {
                const cid = String(c.id);
                const base = extractRating(c);
                const r = courseRatings[cid] ?? base;
                return (
                  <motion.div
                    key={cid}
                    variants={fadeInScale}
                    transition={{ delay: 0.02 * idx }}
                    whileHover={{ y: -4 }}
                  >
                    <Link
                      to={`/courses/${cid}`}
                      className="block bg-white dark:bg-[#0f1821] rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                      onMouseEnter={() => prefetchCourseOnHover(cid)}
                    >
                      <CourseHero course={c} backendUrl={backendUrl} />
                      <div className="p-4">
                        <h4 className="font-semibold truncate">{c.title}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRow avg={r.avg} />
                          {r.count > 0 && (
                            <span className="text-xs text-darkTextSecondary">({r.count})</span>
                          )}
                        </div>
                        <p className="text-sm text-darkTextSecondary line-clamp-2 mt-1">
                          {c.description || 'Top picks based on quality and popularity.'}
                        </p>
                        <div className="mt-3">
                          <span className="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-medium hover:brightness-110">
                            View Course
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
