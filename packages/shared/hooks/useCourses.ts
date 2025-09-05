import { useState, useCallback } from 'react';
import {
  createCourse,
  getCourses,
  getCourseById,
  getAchievements,
  getMyCourses,
  getTutorCourses,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
  getRecommendedCourses,
  getFeaturedVideos,
} from '@mytutorapp/shared/api';
import type {
  Course,
  CoursePayload,
  Achievement,
  RecordedVideo, // ensure available
} from '@mytutorapp/shared/types';
import axios from 'axios';

interface UseCoursesProps {
  backendUrl: string;
  token?: string;
}

export function useCourses({ backendUrl, token }: UseCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<RecordedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------
     Lists / Read
  --------------------------- */
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourses(backendUrl, token);
      setCourses(data);
      return data;
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? err.message ?? 'Failed to fetch courses'
          : 'Failed to fetch courses';
      setError(msg);
      if (axios.isAxiosError(err)) {
        // eslint-disable-next-line no-console
        console.error('[useCourses] fetchCourses error', {
          url: `${backendUrl}/api/courses`,
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  const fetchMyCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error('Unauthorized');
      const data = await getMyCourses(backendUrl, token);
      setCourses(data);
      return data;
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? err.message ?? 'Failed to fetch my courses'
          : 'Failed to fetch my courses';
      setError(msg);
      if (axios.isAxiosError(err)) {
        // eslint-disable-next-line no-console
        console.error('[useCourses] fetchMyCourses error', {
          url: `${backendUrl}/api/courses/mine`,
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  const fetchTutorCourses = useCallback(
    async (tutorId: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTutorCourses(backendUrl, tutorId);
        setCourses(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch tutor courses'
            : 'Failed to fetch tutor courses';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchTutorCourses error', {
            url: `${backendUrl}/api/courses/tutor/${tutorId}`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
  );

  const fetchCourseById = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCourseById(backendUrl, id, token);
        setSelectedCourse(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch course'
            : 'Failed to fetch course';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchCourseById error', {
            url: `${backendUrl}/api/courses/${id}`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token]
  );

  /* ---------------------------
     Recommendations (do NOT throw)
     These are decorative — return [] on failure to avoid
     "Uncaught (in promise) AxiosError" in HomePage.
  --------------------------- */

  const fetchFeaturedCourses = useCallback(
    async (opts?: { limit?: number; minCount?: number; subject?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFeaturedCourses(backendUrl, opts);
        setFeaturedCourses(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch featured courses'
            : 'Failed to fetch featured courses';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchFeaturedCourses error', {
            url: `${backendUrl}/api/courses/featured/courses`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        setFeaturedCourses([]); // quiet fallback
        return [];
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
  );

  const fetchRecommendedCourses = useCallback(
    async (opts?: { limit?: number; minCount?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRecommendedCourses(backendUrl, opts);
        setRecommendedCourses(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch recommended courses'
            : 'Failed to fetch recommended courses';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchRecommendedCourses error', {
            url: `${backendUrl}/api/courses/recommendations`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        setRecommendedCourses([]); // quiet fallback
        return [];
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
  );

  const fetchFeaturedVideos = useCallback(
    async (opts?: { limit?: number; minCount?: number; subject?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getFeaturedVideos(backendUrl, opts);
        setFeaturedVideos(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch featured videos'
            : 'Failed to fetch featured videos';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchFeaturedVideos error', {
            url: `${backendUrl}/api/courses/featured/videos`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        setFeaturedVideos([]); // quiet fallback
        return [];
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
  );

  /* ---------------------------
     Create / Update / Delete
  --------------------------- */
  const addCourse = useCallback(
    async (payload: CoursePayload) => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error('Unauthorized');

        // Debug
        // eslint-disable-next-line no-console
        console.groupCollapsed(
          `%c[useCourses] POST ${backendUrl}/api/courses`,
          'color:#2563eb;font-weight:bold;'
        );
        // eslint-disable-next-line no-console
        console.log('tokenPreview', token ? `${token.slice(0, 6)}…` : '(none)');
        // eslint-disable-next-line no-console
        console.log('payload', payload);
        // eslint-disable-next-line no-console
        console.log('payload (JSON)', JSON.stringify(payload, null, 2));
        // eslint-disable-next-line no-console
        console.groupEnd();

        const created = await createCourse(backendUrl, payload, token);
        setCourses((prev) => [...prev, created]);
        return created;
      } catch (err: unknown) {
        let msg = 'Failed to create course';
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            msg =
              'Create-course endpoint not found (404). Verify POST /api/courses and backendUrl.';
          } else {
            msg = err.response?.data?.message ?? err.message ?? msg;
          }
          // eslint-disable-next-line no-console
          console.error('[useCourses] addCourse error', {
            url: `${backendUrl}/api/courses`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token]
  );

  const editCourse = useCallback(
    async (
      id: string,
      patch: Partial<Omit<CoursePayload, 'tutorId'> & { prerequisites?: string }>
    ) => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error('Unauthorized');
        const updated = await updateCourse(backendUrl, id, patch, token);
        setCourses((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );
        setSelectedCourse((prev) =>
          prev && prev.id === updated.id ? { ...prev, ...updated } : prev
        );
        return updated;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to update course'
            : 'Failed to update course';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] editCourse error', {
            url: `${backendUrl}/api/courses/${id}`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token]
  );

  const removeCourse = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      // optimistic remove
      const prev = courses;
      setCourses((cur) => cur.filter((c) => c.id !== id));
      try {
        if (!token) throw new Error('Unauthorized');
        await deleteCourse(backendUrl, id, token);
      } catch (err: unknown) {
        // revert on failure
        setCourses(prev);
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to delete course'
            : 'Failed to delete course';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] removeCourse error', {
            url: `${backendUrl}/api/courses/${id}`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token, courses]
  );

  /* ---------------------------
     Achievements
  --------------------------- */
  const fetchAchievements = useCallback(
    async (studentId: number) => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error('Unauthorized');
        const data = await getAchievements(backendUrl, studentId, token);
        setAchievements(data);
        return data;
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message ?? 'Failed to fetch achievements'
            : 'Failed to fetch achievements';
        setError(msg);
        if (axios.isAxiosError(err)) {
          // eslint-disable-next-line no-console
          console.error('[useCourses] fetchAchievements error', {
            url: `${backendUrl}/api/achievements/${studentId}`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token]
  );

  return {
    // state
    courses,
    selectedCourse,
    achievements,
    featuredCourses,
    recommendedCourses,
    featuredVideos,
    loading,
    error,

    // read
    fetchCourses,
    fetchMyCourses,
    fetchTutorCourses,
    fetchCourseById,

    // recommendations
    fetchFeaturedCourses,
    fetchRecommendedCourses,
    fetchFeaturedVideos,

    // write
    addCourse,
    editCourse,
    removeCourse,

    // other
    fetchAchievements,
  };
}
