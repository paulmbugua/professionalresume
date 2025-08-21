// packages/shared/hooks/useCourses.ts
import { useState, useCallback } from 'react';
import {
  createCourse,
  getCourses,
  getCourseById,
  getAchievements,
} from '@mytutorapp/shared/api';
import type {
  Course,
  CoursePayload,
  Enrollment,
  Achievement,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          ? err.response?.data?.message ??
            err.message ??
            'Failed to fetch courses'
          : 'Failed to fetch courses';
      setError(msg);

      // Debug log
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
            ? err.response?.data?.message ??
              err.message ??
              'Failed to fetch course'
            : 'Failed to fetch course';
        setError(msg);

        // Debug log
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

  const addCourse = useCallback(
    async (payload: CoursePayload) => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error('Unauthorized');

        // ---------- DEBUG LOG: payload being sent ----------
        const url = `${backendUrl}/api/courses`;
        // eslint-disable-next-line no-console
        console.groupCollapsed(
          `%c[useCourses] POST ${url}`,
          'color:#2563eb;font-weight:bold;'
        );
        // eslint-disable-next-line no-console
        console.log('tokenPreview', token ? `${token.slice(0, 6)}…` : '(none)');
        // eslint-disable-next-line no-console
        console.log('payload', payload);
        // Also provide copy-paste JSON
        // eslint-disable-next-line no-console
        console.log('payload (JSON)', JSON.stringify(payload, null, 2));
        // eslint-disable-next-line no-console
        console.groupEnd();
        // ---------------------------------------------------

        const created = await createCourse(backendUrl, payload, token);
        setCourses((prev) => [...prev, created]);
        return created;
      } catch (err: unknown) {
        let msg = 'Failed to create course';
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            msg =
              'Create-course endpoint not found (404). Verify your server route (POST /api/courses) and that backendUrl points to the correct host/port.';
          } else {
            msg = err.response?.data?.message ?? err.message ?? msg;
          }

          // ---------- DEBUG LOG: server response ----------
          // eslint-disable-next-line no-console
          console.error('[useCourses] addCourse error', {
            url: `${backendUrl}/api/courses`,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
          // ------------------------------------------------
        }
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, token]
  );

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
            ? err.response?.data?.message ??
              err.message ??
              'Failed to fetch achievements'
            : 'Failed to fetch achievements';
        setError(msg);

        // Debug log
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
    courses,
    selectedCourse,
    achievements,
    loading,
    error,
    fetchCourses,
    fetchCourseById,
    addCourse,
    fetchAchievements,
  };
}
