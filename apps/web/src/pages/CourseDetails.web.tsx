// apps/web/src/pages/CourseDetails.web.tsx
import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useEnrollments } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';

interface MaybeInstructor {
  tutorName?: string;
  instructor?: { name?: string; bio?: string };
}

const CourseDetails: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { backendUrl, token, profile } = useShopContext();
  const role = String(profile?.role ?? '').toLowerCase();

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

  // --- Enrollments (use "me" to avoid 403 from id mismatch) ---
  const {
    enroll,
    cancel,
    enrollments,
    loading: enrollmentsLoading,
    error: enrollError,
    fetchMine,
  } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me' as unknown as string | number,
  });

  // Load my enrollments once (for Continue/Unenroll state)
  useEffect(() => {
    if (token) void fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // find my enrollment for this course (tolerate snake_case/ camelCase)
  const myEnrollment = useMemo(() => {
    if (!courseId) return undefined;
    return enrollments.find((e: any) => {
      const cid = e?.course_id ?? e?.courseId;
      return String(cid) === String(courseId);
    });
  }, [enrollments, courseId]);

  const priceDisplay = useMemo(() => {
    if (!c) return '';
    return typeof c.price === 'number' ? `$${c.price.toLocaleString()}` : (c.price ?? '');
  }, [c]);

  // Tutor block
  const mi = (c ?? {}) as Course & MaybeInstructor;
  const tutorName = mi.tutorName || mi.instructor?.name || 'Your tutor';
  const tutorBio = mi.instructor?.bio || 'Experienced educator';

  const onEnroll = async () => {
    if (!courseId) return;
    try {
      await enroll(courseId);            // POST /api/enrollments { course_id }
      navigate(`/progress/${courseId}`); // Start/continue course immediately
    } catch {
      /* error surfaced below */
    }
  };

  const onContinue = () => {
    if (!courseId) return;
    navigate(`/progress/${courseId}`);
  };

  const onUnenroll = async () => {
    if (!myEnrollment?.id) return;
    try {
      await cancel(String(myEnrollment.id)); // DELETE /api/enrollments/:id
    } catch {
      /* keep UI simple; optional toast/snackbar */
    }
  };

  if (!courseId) {
    return <div className="max-w-4xl mx-auto p-6 text-red-600">Missing course id.</div>;
  }
  if (loadingCourse && !c) {
    return <div className="max-w-4xl mx-auto p-6">Loading course…</div>;
  }
  if (courseError && !c) {
    return <div className="max-w-4xl mx-auto p-6 text-red-600">Failed to load course.</div>;
  }
  if (!c) {
    return <div className="max-w-4xl mx-auto p-6">Course not found.</div>;
  }

  const isEnrolled = Boolean(myEnrollment);
  const disablePrimary = !token || enrollmentsLoading;

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.02em]">
              {c.title}
            </h1>
            {c.description && (
              <p className="mt-2 text-[#49739c] dark:text-darkTextSecondary">{c.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {c.level && (
                <span className="inline-flex items-center rounded-lg bg-[#e7edf4] dark:bg-[#172534] px-3 h-8">
                  Level: {c.level}
                </span>
              )}
              {c.duration && (
                <span className="inline-flex items-center rounded-lg bg-[#e7edf4] dark:bg-[#172534] px-3 h-8">
                  Duration: {c.duration}
                </span>
              )}
              {priceDisplay && (
                <span className="inline-flex items-center rounded-lg bg-[#e7edf4] dark:bg-[#172534] px-3 h-8">
                  Price: {priceDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {/* Primary CTA varies by role and enrollment */}
            {role === 'tutor' ? (
              <Link
                to="/my-courses"
                className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold flex items-center justify-center"
                title="Go to your course list"
              >
                Manage / Share
              </Link>
            ) : isEnrolled ? (
              <>
                <button
                  onClick={onContinue}
                  className="rounded-xl h-10 px-5 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110"
                >
                  Continue Course
                </button>
                <button
                  onClick={onUnenroll}
                  className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
                >
                  Unenroll
                </button>
              </>
            ) : (
              <button
                onClick={onEnroll}
                disabled={disablePrimary}
                className="rounded-xl h-10 px-5 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {enrollmentsLoading ? 'Checking…' : 'Enroll Now'}
              </button>
            )}

            {/* Achievements quick link */}
            <Link
              to="/achievements"
              className="rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold flex items-center justify-center"
              title="See achievements"
            >
              Achievements
            </Link>

            {/* Back */}
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl h-10 px-4 bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-sm font-semibold"
            >
              Back
            </button>

            {/* surface enrollment error if any */}
            {enrollError && (
              <p className="text-xs text-red-600 mt-1">{String(enrollError)}</p>
            )}
          </div>
        </div>

        {/* Tutor card */}
        <section className="mt-6 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4">
          <h2 className="text-lg font-bold mb-3">About the tutor</h2>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-[#e7edf4] dark:bg-[#172534]" />
            <div className="flex flex-col">
              <p className="font-semibold">{tutorName}</p>
              <p className="text-sm text-[#49739c] dark:text-darkTextSecondary">{tutorBio}</p>
            </div>
          </div>
        </section>

        {/* Syllabus preview */}
        <section className="mt-6 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4">
          <h2 className="text-lg font-bold mb-3">Syllabus</h2>
          {Array.isArray(c.syllabus) && c.syllabus.length > 0 ? (
            <ol className="space-y-2 list-decimal pl-5">
              {c.syllabus.slice(0, 12).map((w) => (
                <li key={w.week} className="break-words">
                  <span className="font-medium">Week {w.week}:</span> {w.topic || 'TBA'}
                  {w.assignment && (
                    <span className="block text-sm text-[#49739c] dark:text-darkTextSecondary">
                      Assignment: {w.assignment}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[#49739c] dark:text-darkTextSecondary">No syllabus yet.</p>
          )}
        </section>

        {/* Requirements / Prerequisites */}
        {!!(c.prerequisites && String(c.prerequisites).trim().length > 0) && (
          <section className="mt-6 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-4">
            <h2 className="text-lg font-bold mb-3">Prerequisites</h2>
            <p className="whitespace-pre-wrap">{c.prerequisites}</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default CourseDetails;
