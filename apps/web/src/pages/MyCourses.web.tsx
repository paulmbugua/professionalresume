// apps/web/src/pages/MyCourses.web.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';
import ClassVaultList from '../components/ClassVaultList';

type TabKey = 'library' | 'courses';

const CaretDown = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256">
    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

// Compact star text (mobile-safe; no extra deps)
function StarRow({ avg, count }: { avg?: number; count?: number }) {
  const a = Math.round((avg ?? 0) * 2) / 2;
  const stars = [1, 2, 3, 4, 5]
    .map(i => (a >= i ? '★' : a + 0.5 === i ? '☆' : '☆'))
    .join('');
  return (
    <span className="whitespace-nowrap" title={`${avg?.toFixed?.(1) ?? '0.0'} (${count ?? 0})`}>
      {stars} {avg ? avg.toFixed(1) : '—'} ({count ?? 0})
    </span>
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

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
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

  // Lightweight client-side filters
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string>(''); // free-form
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

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

  // ------- Reviews wiring --------

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
        // silent; keep UI smooth
      }
    },
    [backendUrl, myId]
  );

  const debouncedFetchCourseRatings = useRef(
    debounce((courseId: string, cb?: () => void) => {
      void fetchCourseRatings(courseId).finally(() => cb?.());
    }, 200)
  );

  useEffect(() => {
    const d = debouncedFetchCourseRatings.current;
    return () => d.cancel();
  }, []);

  // IntersectionObserver to prefetch ratings when a row/card scrolls into view (mobile/tablet + desktop)
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.courseId;
            if (id && !ratings[id]) {
              debouncedFetchCourseRatings.current(id);
            }
          }
        });
      },
      { rootMargin: '120px' }
    );

    // Observe currently rendered items
    filteredRows.forEach((c) => {
      const id = String(c.id);
      const el = itemRefs.current[id];
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [filteredRows, ratings]);

  // Hover prefetch (desktop). Mobile won’t trigger mouse events; that’s okay.
  const prefetchOnHover = useCallback((cid: string) => {
    if (!ratings[cid]) debouncedFetchCourseRatings.current(cid);
  }, [ratings]);

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
      alert(e?.message || 'Failed to submit review');
    } finally {
      setPosting(false);
    }
  }, [backendUrl, token, openReview, reviewRating, reviewComment, fetchCourseRatings]);

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="flex-1 flex justify-center py-6 px-3 sm:px-4 lg:px-10">
        <div className="flex flex-col w-full max-w-[1200px]">
          {/* Header + tabs */}
          <section className="px-1 sm:px-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-60 sm:min-w-72 flex-col gap-1">
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold leading-tight">My Courses</h1>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-xs sm:text-sm">
                  Access your learning library or discover structured courses to level up.
                </p>
              </div>

              <div className="inline-flex rounded-xl p-1 bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard">
                <button
                  onClick={() => setTab('library')}
                  className={`h-9 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition
                    ${tab === 'library'
                      ? 'bg-white dark:bg-[#0f1821] shadow text-[#0d141c] dark:text-darkTextPrimary'
                      : 'text-[#0d141c]/80 dark:text-darkTextSecondary hover:text-[#0d141c] dark:hover:text-darkTextPrimary'}`}
                >
                  Explore Videos & Notes
                </button>
                <button
                  onClick={() => setTab('courses')}
                  className={`h-9 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition
                    ${tab === 'courses'
                      ? 'bg-white dark:bg-[#0f1821] shadow text-[#0d141c] dark:text-darkTextPrimary'
                      : 'text-[#0d141c]/80 dark:text-darkTextSecondary hover:text-[#0d141c] dark:hover:text-darkTextPrimary'}`}
                >
                  Explore Courses
                </button>
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="mt-4 sm:mt-6">
            {tab === 'library' ? (
              <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] overflow-hidden">
                <ClassVaultList />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Section header */}
                <div className="flex flex-wrap justify-between gap-3 p-3 sm:p-4">
                  <div className="flex min-w-60 sm:min-w-72 flex-col gap-1">
                    <p className="text-[22px] sm:text-[28px] md:text-[32px] font-bold leading-tight">Explore Courses</p>
                    <p className="text-[#49739c] dark:text-darkTextSecondary text-xs sm:text-sm">
                      Find the perfect course to enhance your skills and knowledge.
                    </p>
                  </div>
                </div>

                {/* Filters (simple prompt-based; responsive buttons) */}
                <div className="flex gap-2 sm:gap-3 p-2 sm:p-3 flex-wrap pr-3 sm:pr-4">
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setSubject(prompt('Filter by subject (temporary):') || '')}
                  >
                    <span className="font-medium">Subject</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => {
                      const v = (prompt('Level (e.g., Beginner, Intermediate, Advanced, All Levels):') || '');
                      setLevel(v);
                    }}
                  >
                    <span className="font-medium">Level</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setDuration(prompt('Filter by duration (e.g., "10 weeks")') || '')}
                  >
                    <span className="font-medium">Duration</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>
                  <button
                    className="flex h-9 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-3 pr-2 text-xs sm:text-sm"
                    onClick={() => setPrice(prompt('Filter by price (e.g., "$299")') || '')}
                  >
                    <span className="font-medium">Price</span>
                    <span className="text-current"><CaretDown size={16} /></span>
                  </button>

                  {(subject || level || duration || price) && (
                    <button
                      className="h-9 px-3 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-xs sm:text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#0f1821]"
                      onClick={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* ===================== */}
                {/* Mobile Cards ( < md ) */}
                {/* ===================== */}
                <div className="md:hidden space-y-3 px-3">
                  {loading && <div className="text-sm py-4">Loading courses…</div>}
                  {error && !loading && <div className="text-sm py-4 text-red-600">Failed to load courses.</div>}

                  {!loading && !error && filteredRows.map((c) => {
                    const cid = String(c.id);
                    const { name: tutorName } = getTutorInfo(c);

                    const priceDisplay =
                      typeof c.price === 'number' ? `$${c.price}` :
                      typeof c.price === 'string' ? c.price : '—';

                    const isEnrolled = enrolledCourseIds.has(cid);
                    const r = ratings[cid];

                    return (
                      <div
                        key={cid}
                        data-course-id={cid}
                        ref={(el) => (itemRefs.current[cid] = el)}
                        className="rounded-xl ring-1 ring-[#cedbe8] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 flex flex-col gap-2"
                        onTouchStart={() => prefetchOnHover(cid)}
                        onMouseEnter={() => prefetchOnHover(cid)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm">{c.title}</h3>
                          <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                            {c.level ?? '—'}
                          </div>
                        </div>

                        {/* Tutor name (mobile) */}
                        <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                          {tutorName}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#49739c] dark:text-darkTextSecondary">
                            {c.duration ?? '—'}
                          </span>
                          <span className="text-[#49739c] dark:text-darkTextSecondary">
                            {priceDisplay}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                            {r ? <StarRow avg={r.avg} count={r.count} /> : '—'}
                          </div>

                          {isEnrolled ? (
                            r?.my ? (
                              <button
                                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                onClick={() => navigate(`/progress/${cid}`)}
                                aria-label={`Go to ${c.title} progress`}
                              >
                                Enrolled
                              </button>
                            ) : (
                              <button
                                className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                onClick={() => openReviewFor(cid, c.title)}
                                aria-label={`Review ${c.title}`}
                              >
                                Review
                              </button>
                            )
                          ) : (
                            <button
                              className="h-9 px-3 rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                              onClick={() => navigate(`/courses/${cid}`)}
                              aria-label={`View ${c.title}`}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!loading && !error && filteredRows.length === 0 && (
                    <div className="py-6 text-center text-sm text-[#49739c] dark:text-darkTextSecondary">
                      No courses match your filters.
                    </div>
                  )}
                </div>

                {/* ===================== */}
                {/* Desktop Table ( >= md ) */}
                {/* ===================== */}
                <div className="hidden md:block px-4 py-3 @container">
                  {/* Horizontal scroll for narrow viewports */}
                  <div className="overflow-x-auto rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821]">
                    <table className="min-w-[900px] w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 dark:bg-[#0f1821]">
                          <th className="table-col-120 px-4 py-3 text-left text-sm font-medium w-[400px]">Course</th>
                          <th className="table-col-240 px-4 py-3 text-left text-sm font-medium w-[300px]">Tutor</th>
                          <th className="table-col-360 px-4 py-3 text-left text-sm font-medium w-60">Level</th>
                          <th className="table-col-480 px-4 py-3 text-left text-sm font-medium w-[220px]">Duration</th>
                          <th className="table-col-600 px-4 py-3 text-left text-sm font-medium w-[180px]">Price</th>
                          <th className="table-col-720 px-4 py-3 text-left text-sm font-medium w-[280px]">Rating / Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading && (
                          <tr><td colSpan={6} className="px-4 py-6 text-sm">Loading courses…</td></tr>
                        )}
                        {error && !loading && (
                          <tr><td colSpan={6} className="px-4 py-6 text-sm text-red-600">Failed to load courses.</td></tr>
                        )}
                        {!loading && !error && filteredRows.map((c) => {
                          const { name: tutorName } = getTutorInfo(c);

                          const priceDisplay =
                            typeof c.price === 'number' ? `$${c.price}` :
                            typeof c.price === 'string' ? c.price : '—';

                          const cid = String(c.id);
                          const isEnrolled = enrolledCourseIds.has(cid);
                          const r = ratings[cid];

                          return (
                            <tr
                              key={cid}
                              className="border-t border-t-[#cedbe8] dark:border-darkCard"
                              onMouseEnter={() => prefetchOnHover(cid)}
                              data-course-id={cid}
                              ref={(el) => (itemRefs.current[cid] = el)}
                            >
                              <td className="table-col-120 h-[72px] px-4 py-2 w-[400px] text-sm">{c.title}</td>
                              <td className="table-col-240 h-[72px] px-4 py-2 w-[300px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {tutorName}
                              </td>
                              <td className="table-col-360 h-[72px] px-4 py-2 w-60 text-sm">
                                <button
                                  className="flex min-w-[84px] items-center justify-center rounded-xl h-8 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-medium w-full"
                                  onClick={() => setLevel(String(c.level ?? ''))}
                                  title={`Filter by ${c.level ?? 'level'}`}
                                >
                                  <span className="truncate">{c.level ?? '—'}</span>
                                </button>
                              </td>
                              <td className="table-col-480 h-[72px] px-4 py-2 w-[220px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {c.duration ?? '—'}
                              </td>
                              <td className="table-col-600 h-[72px] px-4 py-2 w-[180px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {priceDisplay}
                              </td>

                              <td className="table-col-720 h-[72px] px-4 py-2 w-[280px] text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[#49739c] dark:text-darkTextSecondary">
                                    {r ? <StarRow avg={r.avg} count={r.count} /> : <span className="opacity-70">—</span>}
                                  </div>

                                  {isEnrolled ? (
                                    r?.my ? (
                                      <button
                                        className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                        onClick={() => navigate(`/progress/${cid}`)}
                                        aria-label={`Go to ${c.title} progress`}
                                      >
                                        Enrolled
                                      </button>
                                    ) : (
                                      <button
                                        className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                        onClick={() => openReviewFor(cid, c.title)}
                                        aria-label={`Review ${c.title}`}
                                      >
                                        Review
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                                      onClick={() => navigate(`/courses/${cid}`)}
                                      aria-label={`View ${c.title}`}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!loading && !error && filteredRows.length === 0 && (
                          <tr className="border-t border-t-[#cedbe8] dark:border-darkCard">
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#49739c] dark:text-darkTextSecondary">
                              No courses match your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Container query helpers (keep your existing behavior) */}
                  <style>{`
                    @container(max-width:120px){.table-col-120{display:none;}}
                    @container(max-width:240px){.table-col-240{display:none;}}
                    @container(max-width:360px){.table-col-360{display:none;}}
                    @container(max-width:480px){.table-col-480{display:none;}}
                    @container(max-width:600px){.table-col-600{display:none;}}
                    @container(max-width:720px){.table-col-720{display:none;}}
                  `}</style>
                </div>

                {/* Pagination placeholder */}
                <div className="flex items-center justify-center gap-1 p-3 sm:p-4">
                  <button className="flex size-9 sm:size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Previous page">‹</button>
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={`flex size-9 sm:size-10 items-center justify-center rounded-full text-xs sm:text-sm ${n === 1 ? 'font-bold bg-[#e7edf4] dark:bg-[#172534]' : ''}`}>
                      {n}
                    </button>
                  ))}
                  <button className="flex size-9 sm:size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Next page">›</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ---------- Simple Review Modal (responsive) ---------- */}
      {openReview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f1821] p-3 sm:p-4 ring-1 ring-[#cedbe8] dark:ring-darkCard">
            <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2">Rate this course</h3>
            <p className="text-xs sm:text-sm text-[#49739c] dark:text-darkTextSecondary mb-2 sm:mb-3">{openReview.title}</p>

            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewRating(n)}
                  className={n <= reviewRating ? 'text-yellow-500 text-2xl' : 'text-[#49739c] text-2xl'}
                  aria-label={`${n} star`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment (max 500 chars)"
              maxLength={500}
              className="w-full text-sm rounded-lg p-2 bg-[#e7edf4] dark:bg-[#172534] min-h-[90px]"
            />

            <div className="mt-3 sm:mt-4 flex items-center gap-2">
              <button
                disabled={posting || reviewRating < 1}
                onClick={submitCourseReview}
                className="px-4 h-10 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold disabled:opacity-60"
              >
                {posting ? 'Saving…' : 'Submit'}
              </button>
              <button
                onClick={() => setOpenReview(null)}
                className="px-4 h-10 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
