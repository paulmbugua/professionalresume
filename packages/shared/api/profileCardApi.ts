// /packages/shared/api/profileCardApi.ts
import axios from 'axios';

export const fetchTutorReviews = async (backendUrl: string, tutorId: string) => {
  const response = await axios.get(`${backendUrl}/api/reviews?tutorId=${tutorId}`);
  return response.data; // Expected to contain { avgRating, totalReviews }
};

export const fetchTutorCertification = async (
  backendUrl: string,
  token: string,
  tutorId: string
) => {
  const response = await axios.get(`${backendUrl}/api/profiles/${tutorId}/certification/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data; // Expected to include a certification object if available
};
