// apps/web/src/pages/CourseEnrollment.web.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useEnrollments } from '@mytutorapp/shared/hooks/useEnrollments';
import { useCourses } from '@mytutorapp/shared/hooks';
import type { Course } from '@mytutorapp/shared/types';

interface Props {
  /** Optional: preloaded course; if not provided we fetch by id */
  course?: Course;
}

const CourseEnrollment: React.FC<Props> = ({ course }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { backendUrl, token, role } = useShopContext();

  // 🔒 Gate: must be logged in + student role
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'student') return <Navigate to="/" replace />;

  // Use "me" so backend resolves req.user.id from JWT
  const { enroll, loading, error } = useEnrollments({
    backendUrl,
    token,
    studentId: 'me' as unknown as string | number,
  });

  const {
    selectedCourse,
    loading: loadingCourse,
    error: courseError,
    fetchCourseById,
  } = useCourses({ backendUrl, token });

  useEffect(() => {
    if (!course && courseId) {
      void fetchCourseById(courseId);
    }
  }, [course, courseId, fetchCourseById]);

  const c: Course | undefined = course ?? selectedCourse ?? undefined;

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      await enroll(courseId);
      navigate(`/progress/${courseId}`);
    } catch {
      // error state already exposed by hook
    }
  };

  if (!courseId) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-red-600 dark:text-red-400">
        Missing course id.
      </div>
    );
  }
  if (loadingCourse && !c) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-gray-700 dark:text-gray-300">
        Loading course…
      </div>
    );
  }
  if (courseError && !c) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-red-600 dark:text-red-400">
        Failed to load course.
      </div>
    );
  }
  if (!c) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-gray-700 dark:text-gray-300">
        Course not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] p-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{c.title}</h1>

        {c.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-4">{c.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {c.level && <span>Level: {c.level}</span>}
          {c.duration && <span>Duration: {c.duration}</span>}
        </div>

        <p className="mb-6 font-semibold text-gray-900 dark:text-gray-100">
          Price:{' '}
          {typeof c.price === 'number' ? `$${c.price}` : (c.price ?? '—')}
        </p>

        <button
          onClick={handleEnroll}
          disabled={loading}
          className="rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Enrolling…' : 'Enroll Now'}
        </button>

        {error && <p className="text-red-600 dark:text-red-400 mt-4 text-sm">{String(error)}</p>}

        {/* Syllabus preview */}
        {Array.isArray(c.syllabus) && c.syllabus.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Syllabus</h2>
            <ul className="list-disc list-inside text-gray-800 dark:text-gray-200">
              {c.syllabus.map((s) => (
                <li key={s.week} className="mb-1">
                  <strong>Week {s.week}:</strong> {s.topic}{' '}
                  {s.assignment && <span>- {s.assignment}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEnrollment;
