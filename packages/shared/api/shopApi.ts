import axios from 'axios';

export const fetchUserDetails = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchProfile = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchConversations = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/profileActions/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchMessages = async (
  backendUrl: string,
  token: string,
  recipientId: string,
  limit: number = 20,
  offset: number = 0
) => {
  const response = await axios.get(
    `${backendUrl}/api/profileActions/conversations/${recipientId}/messages`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset },
    }
  );
  return response.data;
};

export const markAsRead = async (backendUrl: string, token: string, recipientId: string) => {
  await axios.post(`${backendUrl}/api/profileActions/conversations/${recipientId}/markAsRead`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// You can export more API functions as needed (e.g., for sending messages, session actions, etc.)
