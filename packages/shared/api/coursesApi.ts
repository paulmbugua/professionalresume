// packages/shared/api/src/index.ts (or wherever your API barrel lives)
import axios from 'axios';
import type {
  Course,
  CoursePayload,
  Achievement,
  RecordedVideo, // ← make sure this exists in your shared types
} from '@mytutorapp/shared/types';

/* Helpers */
const auth = (token?: string) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/* -------------------------
   Create / Read
------------------------- */

// Create Course
export const createCourse = async (
  backendUrl: string,
  payload: CoursePayload,
  token: string
): Promise<Course> => {
  const { data } = await axios.post<Course>(
    `${backendUrl}/api/courses`,
    payload,
    auth(token)
  );
  return data;
};

// Get All Courses (public-ish)
export const getCourses = async (
  backendUrl: string,
  token?: string
): Promise<Course[]> => {
  const { data } = await axios.get<Course[]>(
    `${backendUrl}/api/courses`,
    auth(token)
  );
  return data;
};

// Get Single Course
export const getCourseById = async (
  backendUrl: string,
  id: string,
  token?: string
): Promise<Course> => {
  const { data } = await axios.get<Course>(
    `${backendUrl}/api/courses/${id}`,
    auth(token)
  );
  return data;
};

// Get my courses (requires auth)
export const getMyCourses = async (
  backendUrl: string,
  token: string
): Promise<Course[]> => {
  const { data } = await axios.get<Course[]>(
    `${backendUrl}/api/courses/mine`,
    auth(token)
  );
  return data;
};

// Get courses for a specific tutor id (public/semi-public)
export const getTutorCourses = async (
  backendUrl: string,
  tutorId: number
): Promise<Course[]> => {
  const { data } = await axios.get<Course[]>(
    `${backendUrl}/api/courses/tutor/${tutorId}`
  );
  return data;
};

/* -------------------------
   Update / Delete
------------------------- */

// Partial update (PATCH)
export const updateCourse = async (
  backendUrl: string,
  id: string,
  patch: Partial<Omit<CoursePayload, 'tutorId'> & { prerequisites?: string }>,
  token: string
): Promise<Course> => {
  const { data } = await axios.patch<Course>(
    `${backendUrl}/api/courses/${id}`,
    patch,
    auth(token)
  );
  return data;
};

// Delete
export const deleteCourse = async (
  backendUrl: string,
  id: string,
  token: string
): Promise<void> => {
  await axios.delete(`${backendUrl}/api/courses/${id}`, auth(token));
};

/* -------------------------
   Achievements
------------------------- */

export const getAchievements = async (
  backendUrl: string,
  studentId: number,
  token: string
): Promise<Achievement[]> => {
  const { data } = await axios.get<Achievement[]>(
    `${backendUrl}/api/achievements/${studentId}`,
    auth(token)
  );
  return data;
};

/* -------------------------
   Recommendations
------------------------- */

type RecQuery = {
  limit?: number;
  minCount?: number;
  subject?: string;
};

// Featured courses (top-rated) — GET /api/courses/recommendations/featured
// Featured Courses (highest-rated courses)
export const getFeaturedCourses = async (
  backendUrl: string,
  params?: { limit?: number; minCount?: number }
) => {
  const { data } = await axios.get(
    `${backendUrl}/api/courses/featured/courses`,
    { params }          // e.g. { limit: 8, minCount: 2 }
  );
  return data;
};

// Featured Videos (highest-rated recorded_videos)
export const getFeaturedVideos = async (
  backendUrl: string,
  params?: { limit?: number; minCount?: number }
) => {
  const { data } = await axios.get(
    `${backendUrl}/api/courses/featured/videos`,
    { params }          // e.g. { limit: 6, minCount: 1 }
  );
  return data;
};

// Recommended Courses (generic recommendations)
export const getRecommendedCourses = async (
  backendUrl: string,
  params?: { limit?: number; minCount?: number }
) => {
  const { data } = await axios.get(
    `${backendUrl}/api/courses/recommendations`,
    { params }          // e.g. { limit: 6, minCount: 1 }
  );
  return data;
};
