// packages/shared/api/reviewsApi.ts
import axios from 'axios';

type ReviewRow = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  studentId: string;
  studentName?: string | null;
};

export type CourseReviewsResponse = {
  message?: string;
  avgRating: number;
  totalReviews: number;
  reviews: ReviewRow[];
};

export async function getCourseReviews(
  backendUrl: string,
  courseId: string
): Promise<CourseReviewsResponse> {
  const { data } = await axios.get<CourseReviewsResponse>(
    `${backendUrl}/api/reviews/courses/${courseId}`
  );
  // Normalize types just in case the backend returns strings:
  return {
    message: data.message,
    avgRating: Number(data.avgRating ?? 0),
    totalReviews: Number(data.totalReviews ?? 0),
    reviews: Array.isArray(data.reviews)
      ? data.reviews.map((r) => ({
          ...r,
          rating: Number(r.rating),
          id: String(r.id),
          studentId: String(r.studentId),
        }))
      : [],
  };
}

export async function postCourseReview(
  backendUrl: string,
  courseId: string,
  token: string,
  payload: { rating: number; comment?: string }
): Promise<void> {
  await axios.post(
    `${backendUrl}/api/reviews/courses/${courseId}`,
    payload,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}
