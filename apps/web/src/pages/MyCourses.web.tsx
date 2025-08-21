// apps/web/src/pages/MyCourses.web.tsx 
import React, { useEffect, useMemo, useState } from 'react';
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

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { backendUrl, token, profile } = useShopContext();
  const role = String(profile?.role ?? '').toLowerCase();

  // Courses catalog
  const { courses = [], loading, error, fetchCourses } = useCourses({ backendUrl, token });

  // ✅ Load my enrollments (use "me" so the server reads student from JWT)
  const {
    enrollments,
    fetchMine,
    loading: enrollmentsLoading,
  } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  const [tab, setTab] = useState<TabKey>('library');

  // Lightweight client-side filters
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<string>('');       // free-form
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');

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
      const title     = String(c.title ?? '').toLowerCase();
      const cLevel    = String(c.level ?? '');
      const cDuration = String(c.duration ?? '').toLowerCase();
      const cPrice    = typeof c.price === 'number' ? `$${c.price}` : String(c.price ?? '');

      const okLevel    = level ? cLevel === level : true;
      const okSubject  = subject ? title.includes(subject.toLowerCase()) : true;
      const okDuration = duration ? cDuration.includes(duration.toLowerCase()) : true;
      const okPrice    = price ? cPrice.toLowerCase().includes(price.toLowerCase()) : true;

      return okLevel && okSubject && okDuration && okPrice;
    });
  }, [courses, subject, level, duration, price]);

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="flex-1 flex justify-center py-6 px-4 lg:px-10">
        <div className="flex flex-col w-full max-w-[1100px]">
          {/* Header + tabs */}
          <section className="px-2 sm:px-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-72 flex-col gap-1">
                <h1 className="text-[28px] sm:text-[32px] font-bold leading-tight">My Courses</h1>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">
                  Access your learning library or discover structured courses to level up.
                </p>
              </div>

              <div className="inline-flex rounded-xl p-1 bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard">
                <button
                  onClick={() => setTab('library')}
                  className={`h-9 px-4 rounded-lg text-sm font-semibold transition
                    ${tab === 'library'
                      ? 'bg-white dark:bg-[#0f1821] shadow text-[#0d141c] dark:text-darkTextPrimary'
                      : 'text-[#0d141c]/80 dark:text-darkTextSecondary hover:text-[#0d141c] dark:hover:text-darkTextPrimary'}`}
                >
                  Explore Videos & Notes
                </button>
                <button
                  onClick={() => setTab('courses')}
                  className={`h-9 px-4 rounded-lg text-sm font-semibold transition
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
          <section className="mt-6">
            {tab === 'library' ? (
              <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] overflow-hidden">
                <ClassVaultList />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Section header */}
                <div className="flex flex-wrap justify-between gap-3 p-4">
                  <div className="flex min-w-72 flex-col gap-1">
                    <p className="text-[28px] sm:text-[32px] font-bold leading-tight">Explore Courses</p>
                    <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">
                      Find the perfect course to enhance your skills and knowledge.
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-3 p-3 flex-wrap pr-4">
                  <button
                    className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-4 pr-2"
                    onClick={() => setSubject(prompt('Filter by subject (temporary):') || '')}
                  >
                    <span className="text-sm font-medium">Subject</span>
                    <span className="text-current"><CaretDown /></span>
                  </button>
                  <button
                    className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-4 pr-2"
                    onClick={() => {
                      const v = (prompt('Level (e.g., Beginner, Intermediate, Advanced, All Levels):') || '');
                      setLevel(v);
                    }}
                  >
                    <span className="text-sm font-medium">Level</span>
                    <span className="text-current"><CaretDown /></span>
                  </button>
                  <button
                    className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-4 pr-2"
                    onClick={() => setDuration(prompt('Filter by duration (e.g., "10 weeks")') || '')}
                  >
                    <span className="text-sm font-medium">Duration</span>
                    <span className="text-current"><CaretDown /></span>
                  </button>
                  <button
                    className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534] pl-4 pr-2"
                    onClick={() => setPrice(prompt('Filter by price (e.g., "$299")') || '')}
                  >
                    <span className="text-sm font-medium">Price</span>
                    <span className="text-current"><CaretDown /></span>
                  </button>

                  {(subject || level || duration || price) && (
                    <button
                      className="h-8 px-3 rounded-xl bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#0f1821]"
                      onClick={() => { setSubject(''); setLevel(''); setDuration(''); setPrice(''); }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="px-4 py-3 @container">
                  <div className="flex overflow-hidden rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821]">
                    <table className="flex-1 w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#0f1821]">
                          <th className="table-col-120 px-4 py-3 text-left text-sm font-medium w-[400px]">Course</th>
                          <th className="table-col-240 px-4 py-3 text-left text-sm font-medium w-[400px]">Tutor</th>
                          <th className="table-col-360 px-4 py-3 text-left text-sm font-medium w-60">Level</th>
                          <th className="table-col-480 px-4 py-3 text-left text-sm font-medium w-[400px]">Duration</th>
                          <th className="table-col-600 px-4 py-3 text-left text-sm font-medium w-[400px]">Price</th>
                          <th className="table-col-720 px-4 py-3 text-left text-sm font-medium w-60 text-[#49739c] dark:text-darkTextSecondary">Actions</th>
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
                          const tutorName =
                            (typeof (c as any).tutor === 'string' && (c as any).tutor) ||
                            (typeof (c as any).tutorName === 'string' && (c as any).tutorName) ||
                            (c as any).instructor?.name ||
                            '—';

                          const priceDisplay =
                            typeof c.price === 'number' ? `$${c.price}` :
                            typeof c.price === 'string' ? c.price : '—';

                          const isEnrolled = enrolledCourseIds.has(String(c.id));

                          return (
                            <tr key={String(c.id)} className="border-t border-t-[#cedbe8] dark:border-darkCard">
                              <td className="table-col-120 h-[72px] px-4 py-2 w-[400px] text-sm">{c.title}</td>
                              <td className="table-col-240 h-[72px] px-4 py-2 w-[400px] text-sm text-[#49739c] dark:text-darkTextSecondary">
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
                              <td className="table-col-480 h-[72px] px-4 py-2 w-[400px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {c.duration ?? '—'}
                              </td>
                              <td className="table-col-600 h-[72px] px-4 py-2 w-[400px] text-sm text-[#49739c] dark:text-darkTextSecondary">
                                {priceDisplay}
                              </td>
                              <td className="table-col-720 h-[72px] px-4 py-2 w-60 text-sm font-bold tracking-[0.015em] text-[#49739c] dark:text-darkTextSecondary">
                                {/* 👇 Enrolled is now clickable and opens progress */}
                                {isEnrolled ? (
                                  <button
                                    className="hover:underline"
                                    onClick={() => navigate(`/progress/${c.id}`)}
                                    aria-label={`Go to ${c.title} progress`}
                                  >
                                    Enrolled
                                  </button>
                                ) : (
                                  <button
                                    className="hover:underline"
                                    onClick={() => navigate(`/courses/${c.id}`)}
                                    aria-label={`View ${c.title}`}
                                  >
                                    View
                                  </button>
                                )}
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
                <div className="flex items-center justify-center gap-1 p-4">
                  <button className="flex size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Previous page">‹</button>
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={`flex size-10 items-center justify-center rounded-full text-sm ${n === 1 ? 'font-bold bg-[#e7edf4] dark:bg-[#172534]' : ''}`}>
                      {n}
                    </button>
                  ))}
                  <button className="flex size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]" aria-label="Next page">›</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MyCourses;
