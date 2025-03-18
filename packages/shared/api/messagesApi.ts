// /packages/shared/api/messagesApi.ts
import axios from 'axios';

export const fetchConversations = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.conversations; // adjust based on your API
};

export const fetchMessages = async (
  backendUrl: string,
  recipientId: string,
  limit: number,
  offset: number,
  token: string
) => {
  const response = await axios.get(
    `${backendUrl}/api/messages/${recipientId}?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.messages;
};

export const sendMessage = async (
  backendUrl: string,
  recipientId: string,
  content: string,
  token: string
) => {
  const response = await axios.post(
    `${backendUrl}/api/messages`,
    { recipientId, content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const markAsRead = async (backendUrl: string, recipientId: string, token: string) => {
  const response = await axios.post(
    `${backendUrl}/api/messages/mark-read`,
    { recipientId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
