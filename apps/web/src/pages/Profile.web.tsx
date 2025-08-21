// apps/web/src/pages/Profile.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses } from '@mytutorapp/shared/hooks';
import { useEnrollments } from '@mytutorapp/shared/hooks/useEnrollments';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import type { Course, Enrollment, CourseProgress } from '@mytutorapp/shared/types';
import PaymentWidget from '../components/PaymentWidget.web';
import ThemeToggle from '../components/ThemeToggle.web';

/* ---------- utils ---------- */
const FALLBACK_AVATAR = (n = 'You') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=223649&color=ffffff`;

const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK_AVATAR(fallbackName ?? 'You');
  if (raw.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  return raw;
};

const toNum = (v: unknown, fb = 0): number =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string'
    ? Number(v) || fb
    : fb;

/** Return a string courseId if present in either shape, never "undefined". */
const getCourseId = (row: unknown): string | null => {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  const v = ((): unknown => {
    if (typeof o.courseId === 'string' || typeof o.courseId === 'number') return o.courseId;
    if (typeof o['course_id'] === 'string' || typeof o['course_id'] === 'number') return o['course_id'];
    return null;
  })();
  if (v === null || v === undefined) return null;
  return String(v);
};

/** Basic UUID check (accepts v1-v5-style strings of length 36). */
const isUuid = (s: string | null | undefined): s is string =>
  !!s && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);

/* ---------- shapes ---------- */
type ProfileLike = {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  role?: string;
  avatar?: string;
  photoUrl?: string;
  avatar_url?: string;
  gallery?: string[];
};

type EarningsSummary = { total: number; pending: number; available: number };

/* ---------- Student progress row ---------- */
const StudentProgressRow: React.FC<{
  courseId: string | null;
  title: string;
  backendUrl: string;
  token: string;
  fallbackPct?: number;
}> = ({ courseId, title, backendUrl, token, fallbackPct = 0 }) => {
  const validId = isUuid(courseId ?? '');

  // Only load hook data if we have a valid UUID; otherwise the hook bails early too,
  // but we also avoid fetching the course syllabus for denominator.
  const { progress, loading } = useCourseProgress(backendUrl, validId ? courseId! : '', token);

  const { fetchCourseById } = useCourses({ backendUrl, token });
  const [totalWeeks, setTotalWeeks] = useState<number>(0);

  useEffect(() => {
    if (!validId) {
      setTotalWeeks(0);
      return;
    }
    let ignore = false;
    fetchCourseById(courseId!)
      .then((c: Course) => {
        if (!ignore) setTotalWeeks(Array.isArray(c?.syllabus) ? c.syllabus.length : 0);
      })
      .catch(() => setTotalWeeks(0));
    return () => {
      ignore = true;
    };
  }, [fetchCourseById, courseId, validId]);

  const pct = useMemo(() => {
    if (!validId) return Math.max(0, Math.min(100, Math.round(fallbackPct)));
    if (loading) return 0;
    const items: CourseProgress[] = Array.isArray(progress) ? progress : [];
    const completed = items.filter((p) => p.status === 'Completed').length;
    if (totalWeeks > 0) return Math.round((completed / totalWeeks) * 100);
    return Math.max(0, Math.min(100, Math.round(fallbackPct)));
  }, [progress, loading, totalWeeks, fallbackPct, validId]);

  const toHref = validId ? `/courses/${courseId}/progress` : '#';

  return (
    <div className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-medium line-clamp-1">{title}</p>
        <span className="text-sm font-semibold">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#cedbe8] dark:bg-darkCard">
        <div className="h-full bg-[#3d99f5]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2">
        <Link
          to={toHref}
          className={`inline-flex h-8 px-3 rounded-lg ${
            validId ? 'bg-[#e7edf4] dark:bg-[#172534]' : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
          } text-sm font-semibold`}
          onClick={(e) => {
            if (!validId) e.preventDefault();
          }}
          title={validId ? 'Open progress' : 'Missing/invalid course id'}
        >
          Open progress
        </Link>
      </div>
    </div>
  );
};

/* ---------------------------------- Page ---------------------------------- */
const ProfilePage: React.FC = () => {
  const nav = useNavigate();
  const { profile, backendUrl, userEmail, logout, language, tokens = 0, token } = useShopContext();

  const p = (profile ?? {}) as ProfileLike;
  const role = String(p.role ?? '').toLowerCase();
  const isStudent = role === 'student' || role === 'learner' || role === 'pupil';
  const isTutor = role === 'tutor';

  const avatar = useMemo(
    () => resolveAsset(p.avatar ?? p.photoUrl ?? p.avatar_url ?? p.gallery?.[0], backendUrl, p.name || 'You'),
    [p.avatar, p.photoUrl, p.avatar_url, p.gallery, backendUrl, p.name]
  );

  /* identity form */
  const [name, setName] = useState<string>(p.name || '');
  const [email, setEmail] = useState<string>(userEmail || '');
  const [phone, setPhone] = useState<string>('');
  const [tz, setTz] = useState<string>('');
  const [notif, setNotif] = useState<boolean>(true);
  const [openPayment, setOpenPayment] = useState(false);

  useEffect(() => setName(p.name || ''), [p.name]);
  useEffect(() => setEmail(userEmail || ''), [userEmail]);

  const onEditProfile = () => nav('/settings/manage');
  const onLogout = async () => {
    try {
      await logout();
    } finally {
      nav('/', { replace: true });
    }
  };

  /* tutor earnings */
  const [earn, setEarn] = useState<EarningsSummary>({ total: 0, pending: 0, available: 0 });
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnErr, setEarnErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const run = async () => {
      if (!isTutor || !backendUrl || !token) return;
      setEarnLoading(true);
      setEarnErr(null);
      try {
        const r = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/earnings/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as Record<string, unknown>;
        if (!stop) {
          setEarn({
            total: toNum(j.total),
            pending: toNum(j.pending),
            available: toNum(j.available),
          });
        }
      } catch (e) {
        if (!stop) setEarnErr(e instanceof Error ? e.message : 'Failed to load earnings');
      } finally {
        if (!stop) setEarnLoading(false);
      }
    };
    run();
    return () => {
      stop = true;
    };
  }, [isTutor, backendUrl, token]);

  const fmtMoney = useCallback(
    (n: number) =>
      new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n),
    []
  );

  /* student enrollments → Progress list */
  const meId = (p.user_id ?? p.id) as string | number | undefined;
  const { enrollments, loading: enrLoading, error: enrError, fetchMine } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: (meId ?? 'me') as string | number,
  });

  useEffect(() => {
    if (isStudent) fetchMine().catch(() => {});
  }, [isStudent, fetchMine]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary" style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}>
      <div className="flex justify-center py-5 px-4 sm:px-6 lg:px-10">
        <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-[20rem_1fr] gap-4">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 md:sticky md:top-24 self-start">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-cover bg-center ring-1 ring-gray-200 dark:ring-darkCard" style={{ backgroundImage: `url("${avatar}")` }} />
              <div>
                <div className="font-semibold">{p.name || 'You'}</div>
                <div className="text-sm text-[#49739c] dark:text-darkTextSecondary">{p.role ?? 'Member'}</div>
              </div>
            </div>
            <nav className="grid gap-2">
              <Link to="/" className="px-3 py-2 rounded-xl hover:bg-[#e7edf4] dark:hover:bg-[#172534]">Home</Link>
              <Link to="/account?tab=sessions" className="px-3 py-2 rounded-xl hover:bg-[#e7edf4] dark:hover:bg-[#172534]">My lessons</Link>
              <Link to={isStudent ? '/tutors' : '/students'} className="px-3 py-2 rounded-xl hover:bg-[#e7edf4] dark:hover:bg-[#172534]">
                {isStudent ? 'My tutors' : 'My students'}
              </Link>
              <Link to="/profile/me" className="px-3 py-2 rounded-xl bg-[#e7edf4] dark:bg-[#172534]">My profile</Link>
              <Link to="/messages" className="px-3 py-2 rounded-xl hover:bg-[#e7edf4] dark:hover:bg-[#172534]">Messages</Link>
              <Link to="/notifications" className="px-3 py-2 rounded-xl hover:bg-[#e7edf4] dark:hover:bg-[#172534]">Notifications</Link>
            </nav>
          </aside>

          {/* Main */}
          <section>
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h1 className="text-[28px] sm:text-[32px] font-bold">My profile</h1>
              <button onClick={onEditProfile} className="md:hidden rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] font-bold">Edit profile</button>
            </div>

            {/* Identity */}
            <div className="px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-full bg-cover bg-center ring-1 ring-[#cedbe8] dark:ring-darkCard" style={{ backgroundImage: `url("${avatar}")` }} />
                  <div>
                    <div className="text-[20px] sm:text-[22px] font-bold">{p.name || 'You'}</div>
                    <div className="text-sm text-[#49739c] dark:text-darkTextSecondary">{p.role ?? 'Member'}</div>
                  </div>
                </div>
                <button onClick={onEditProfile} className="hidden md:inline-flex rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] font-bold">Edit profile</button>
              </div>
            </div>

            {/* Personal info */}
            <h2 className="px-4 pt-4 pb-2 text-[20px] sm:text-[22px] font-bold">Personal information</h2>
            <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="pb-2 font-medium">Full name</span>
                <input className="h-12 sm:h-14 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] px-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
              <label className="flex flex-col">
                <span className="pb-2 font-medium">Email</span>
                <input className="h-12 sm:h-14 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] px-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="flex flex-col">
                <span className="pb-2 font-medium">Phone number</span>
                <input className="h-12 sm:h-14 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] px-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000000" />
              </label>
              <label className="flex flex-col">
                <span className="pb-2 font-medium">Time zone</span>
                <input className="h-12 sm:h-14 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] px-3" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Africa/Nairobi" />
              </label>
            </div>

            {/* Payments / Earnings */}
            <h2 className="px-4 pt-6 pb-2 text-[20px] sm:text-[22px] font-bold">{isTutor ? 'Tutor earnings' : 'Payment management'}</h2>
            <div className="mx-4">
              {isTutor ? (
                <div className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="font-medium">Earnings summary</div>
                    {earnLoading ? (
                      <div className="text-sm text-[#49739c]">Loading…</div>
                    ) : earnErr ? (
                      <div className="text-sm text-red-600">{earnErr}</div>
                    ) : (
                      <div className="text-sm">
                        <div>Total earned: <span className="font-semibold">{fmtMoney(earn.total)}</span></div>
                        <div>Pending: <span className="font-semibold">{fmtMoney(earn.pending)}</span></div>
                        <div>Available: <span className="font-semibold">{fmtMoney(earn.available)}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to="/account?tab=earnings" className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] font-semibold flex items-center">View details</Link>
                    <Link to="/payouts" className="rounded-xl h-10 px-4 bg-[#3d99f5] text-white font-semibold flex items-center">Withdraw</Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-[#e7edf4] dark:bg-[#172534]" />
                    <div>
                      <div className="font-medium">Session tokens</div>
                      <div className="text-sm text-[#49739c]">Balance: <span className="font-semibold">{tokens}</span></div>
                    </div>
                  </div>
                  <button onClick={() => setOpenPayment(true)} className="rounded-xl h-10 px-4 bg-[#3d99f5] text-white font-semibold">Buy tokens</button>
                </div>
              )}
            </div>
            {!isTutor && (
              <PaymentWidget isOpen={openPayment} onClose={() => setOpenPayment(false)} title="Top up your tokens" showTutorPreview={false} />
            )}

            {/* Progress Management (students) */}
            {isStudent && (
              <div className="px-4 pt-6">
                <h2 className="text-[20px] sm:text-[22px] font-bold mb-3">Learning progress</h2>

                {enrLoading && <div className="text-sm text-[#49739c]">Loading your courses…</div>}
                {!enrLoading && enrError && <div className="text-sm text-red-600">{String(enrError)}</div>}

                {!enrLoading && !enrError && (
                  <div className="grid grid-cols-1 gap-3">
                    {enrollments.slice(0, 8).map((e: Enrollment) => {
                      const courseId = getCourseId(e); // SAFE extract
                      const maybeTitle = (e as unknown as Record<string, unknown>)['title'];
                      const title =
                        typeof maybeTitle === 'string' && maybeTitle.trim().length > 0
                          ? maybeTitle
                          : courseId
                          ? `Course #${courseId}`
                          : 'Course';
                      const fallbackPct = toNum(e.progress, 0);

                      return (
                        <StudentProgressRow
                          key={String(e.id)}
                          courseId={courseId}
                          title={title}
                          backendUrl={backendUrl}
                          token={token ?? ''}
                          fallbackPct={fallbackPct}
                        />
                      );
                    })}
                    {enrollments.length === 0 && (
                      <div className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-6">
                        <div className="text-base">You have no enrollments yet.</div>
                        <div className="text-sm text-[#49739c] mt-1">Browse the catalog to get started.</div>
                        <div className="mt-3">
                          <Link to="/courses" className="inline-flex h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold">
                            Go to Catalog
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Courses section (after progress) */}
            <h2 className="px-4 pt-6 pb-2 text-[20px] sm:text-[22px] font-bold">Courses</h2>
            {isTutor ? (
              <div className="mx-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  to="/create-course"
                  className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 hover:bg-[#f6f9fc]/60"
                >
                  <p className="text-base font-semibold">Create Course</p>
                  <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Wizard-style builder</p>
                </Link>
                <Link
                  to="/tutor/courses"
                  className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 hover:bg-[#f6f9fc]/60"
                >
                  <p className="text-base font-semibold">My Courses</p>
                  <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">View, edit, update & delete</p>
                </Link>
                <Link
                  to="/achievements"
                  className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 hover:bg-[#f6f9fc]/60"
                >
                  <p className="text-base font-semibold">Badges</p>
                  <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">Your milestones</p>
                </Link>
              </div>
            ) : (
              <div className="mx-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/my-courses"
                  className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 hover:bg-[#f6f9fc]/60"
                >
                  <p className="text-base font-semibold">My Enrollments</p>
                  <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">View & unenroll</p>
                </Link>
                <Link
                  to="/achievements"
                  className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4 hover:bg-[#f6f9fc]/60"
                >
                  <p className="text-base font-semibold">Badges</p>
                  <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">View your achievements</p>
                </Link>
              </div>
            )}

            {/* App settings */}
            <h2 className="px-4 pt-6 pb-2 text-[20px] sm:text-[22px] font-bold">App settings</h2>
            <div className="mx-4 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3">
                <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]" /><span>Notifications</span></div>
                <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full p-0.5 ${notif ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'}`}>
                  <div className="h-full w-[27px] rounded-full bg-white transition-transform" style={{ transform: notif ? 'translateX(20px)' : 'translateX(0)' }} />
                  <input type="checkbox" className="invisible absolute" checked={notif} onChange={() => setNotif((v) => !v)} />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3">
                <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]" /><span>Dark mode</span></div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3">
                <div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]" /><span>Language</span></div>
                <span>{language === 'FR' ? 'French' : 'English'}</span>
              </div>
            </div>

            {/* Logout */}
            <div className="px-4 py-4">
              <button onClick={onLogout} className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] font-bold">Log out</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
