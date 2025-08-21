// packages/shared/api/enrollmentsApi.ts
import axios from 'axios';
import type { Enrollment } from '@mytutorapp/shared/types';

function baseUrl(u: string) {
  return u.replace(/\/+$/, '');
}

/** POST /api/enrollments — create a student enrollment (body: { course_id }) */
export async function createEnrollment(
  backendUrl: string,
  courseId: string,
  token: string
): Promise<Enrollment> {
  const url = `${baseUrl(backendUrl)}/api/enrollments`;
  const payload = { course_id: courseId }; // ✅ server expects snake_case

  // Helpful debug log to verify exactly what’s being sent
  // eslint-disable-next-line no-console
  console.log('[enrollmentsApi] POST', url, 'payload =>', payload);

  const res = await axios.post<Enrollment>(
    url,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/** GET /api/enrollments/student/:studentId — list a student’s enrollments */
export async function getEnrollmentsByStudent(
  backendUrl: string,
  studentId: string | number,
  token: string
): Promise<Enrollment[]> {
  const url = `${baseUrl(backendUrl)}/api/enrollments/student/${studentId}`;
  const res = await axios.get<Enrollment[]>(
    url,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/** GET /api/enrollments/course/:courseId — list enrollments for a course (tutors) */
export async function getEnrollmentsByCourse(
  backendUrl: string,
  courseId: string,
  token: string
): Promise<Enrollment[]> {
  const url = `${baseUrl(backendUrl)}/api/enrollments/course/${courseId}`;
  const res = await axios.get<Enrollment[]>(
    url,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

/** DELETE /api/enrollments/:id — cancel an enrollment */
export async function deleteEnrollment(
  backendUrl: string,
  enrollmentId: string,
  token: string
): Promise<{ success: boolean } | Enrollment> {
  const url = `${baseUrl(backendUrl)}/api/enrollments/${enrollmentId}`;
  const res = await axios.delete<{ success: boolean } | Enrollment>(
    url,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}
