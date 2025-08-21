// packages/shared/hooks/useEnrollments.ts
import { useCallback, useState } from 'react';
import axios from 'axios';
import {
  createEnrollment,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  deleteEnrollment,
} from '@mytutorapp/shared/api';
import type { Enrollment } from '@mytutorapp/shared/types';

export interface UseEnrollmentsProps {
  backendUrl: string;
  token: string;
  /** Optional, only required if you call fetchMine() */
  studentId?: string | number;
}

/** Safely read a possible snake_case field without using `any` */
function readSnakeCourseId(obj: unknown): string | undefined {
  if (obj && typeof obj === 'object' && 'course_id' in obj) {
    const v = (obj as { course_id?: unknown }).course_id;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
  }
  return undefined;
}

/** Normalize Enrollment → courseId as string for comparisons */
function courseIdOf(e: Enrollment): string {
  return readSnakeCourseId(e) ?? String(e.courseId);
}

export function useEnrollments({ backendUrl, token, studentId }: UseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  /** Create a new enrollment for a course */
  const enroll = useCallback(async (courseId: string): Promise<Enrollment> => {
  setLoading(true);
  setError(null);
  try {
    const created = await createEnrollment(backendUrl, courseId, token);


    setEnrollments(prev => {
      const exists = prev.some(e => String(e.courseId) === String(courseId));
      return exists ? prev : [created, ...prev];
    });
    return created;
  } catch (e: unknown) {
    const msg = axios.isAxiosError(e)
      ? e.response?.data?.message ?? e.message ?? 'Failed to enroll'
      : 'Failed to enroll';
    setError(msg);

    // extra console info to pinpoint 400s
    if (axios.isAxiosError(e)) {
      // eslint-disable-next-line no-console
      console.error('[useEnrollments] enroll error', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
      });
    }
    throw e;
  } finally {
    setLoading(false);
  }
}, [backendUrl, token, studentId]);


  /** Fetch the current student’s enrollments */
  const fetchMine = useCallback(async (): Promise<Enrollment[]> => {
    if (studentId === undefined || studentId === null) {
      setError('Missing studentId for fetchMine()');
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getEnrollmentsByStudent(backendUrl, studentId, token);
      setEnrollments(data);
      return data;
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.message ?? e.message ?? 'Failed to fetch enrollments'
        : 'Failed to fetch enrollments';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, studentId]);

  /** Fetch enrollments for a specific course (tutor view) */
  const fetchByCourse = useCallback(async (courseId: string): Promise<Enrollment[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEnrollmentsByCourse(backendUrl, courseId, token);
      setEnrollments(data);
      return data;
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.message ?? e.message ?? 'Failed to fetch course enrollments'
        : 'Failed to fetch course enrollments';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  /** Cancel an enrollment by id */
  const cancel = useCallback(async (enrollmentId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteEnrollment(backendUrl, enrollmentId, token);
      setEnrollments(prev => prev.filter(e => String(e.id) !== String(enrollmentId)));
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.message ?? e.message ?? 'Failed to cancel enrollment'
        : 'Failed to cancel enrollment';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  return {
    enrollments,
    loading,
    error,
    setError,        // optional for UI
    setEnrollments,  // optional manual cache updates
    enroll,          // POST /api/enrollments
    fetchMine,       // GET  /api/enrollments/student/:studentId
    fetchByCourse,   // GET  /api/enrollments/course/:courseId
    cancel,          // DELETE /api/enrollments/:id
  };
}
