// /packages/shared/api/tutorReviewsApi.ts
import axios from 'axios';

export const fetchTutorReviews = async (backendUrl: string, tutorId: string) => {
  const response = await axios.get(`${backendUrl}/api/reviews?tutorId=${tutorId}`);
  return response.data; // Expected to contain { avgRating, totalReviews, reviews }
};
