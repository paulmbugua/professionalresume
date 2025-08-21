import axios from 'axios';
import type {
  Course,
  CoursePayload,
  Achievement,
} from '@mytutorapp/shared/types';

// Create Course
export const createCourse = async (
  backendUrl: string,
  payload: CoursePayload,
  token: string
): Promise<Course> => {
  const response = await axios.post<Course>(
    `${backendUrl}/api/courses`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

// Get All Courses
export const getCourses = async (
  backendUrl: string,
  token?: string
): Promise<Course[]> => {
  const response = await axios.get<Course[]>(
    `${backendUrl}/api/courses`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
};

// Get Single Course
export const getCourseById = async (
  backendUrl: string,
  id: string,
  token?: string
): Promise<Course> => {
  const response = await axios.get<Course>(
    `${backendUrl}/api/courses/${id}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
};

// Fetch Achievements
export const getAchievements = async (
  backendUrl: string,
  studentId: number,
  token: string
): Promise<Achievement[]> => {
  const response = await axios.get<Achievement[]>(
    `${backendUrl}/api/achievements/${studentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};
