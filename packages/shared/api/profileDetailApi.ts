// /packages/shared/api/profileDetailApi.ts
import axios from 'axios';

export const getTutorProfile = async (backendUrl: string, token: string, tutorId: string) => {
  const response = await axios.get(`${backendUrl}/api/profile/${tutorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data; // Expect the tutor profile object
};
