// /packages/shared/api/profileActionsApi.ts
import axios from 'axios';

export const addToFavorites = async (backendUrl: string, token: string, recipientId: string) => {
  const response = await axios.post(
    `${backendUrl}/api/profileActions/favorites`,
    { profileId: recipientId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};
