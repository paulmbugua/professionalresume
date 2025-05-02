import axios from 'axios';
import type { FormData } from '@mytutorapp/shared/types';

// Fetch account (user and profile) details.
export const fetchAccountDetails = async (backendUrl: string, token: string) => {
  const userResponse = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profileResponse = await axios.get(`${backendUrl}/api/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { user: userResponse.data, profile: profileResponse.data };
};

// Fetch transactions.
export const fetchTransactions = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/payment/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
};

// Fetch updated token balance.
export const fetchUpdatedTokenBalance = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.tokens;
};

// Fetch session data by type
export const fetchSessionsByType = async (backendUrl: string, token: string, type: string) => {
  const response = await axios.get(`${backendUrl}/api/tutor-session/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data || [];
};

// Session actions
export const acceptSession = async (backendUrl: string, token: string, sessionId: string) => {
  return (
    await axios.put(
      `${backendUrl}/api/tutor-session/${sessionId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
  ).data;
};

export const cancelSession = async (
  backendUrl: string,
  token: string,
  sessionId: string,
  reason: string
) => {
  return (
    await axios.put(
      `${backendUrl}/api/tutor-session/${sessionId}/cancel`,
      { reason },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  ).data;
};

export const completePendingSession = async (
  backendUrl: string,
  token: string,
  sessionId: string
) => {
  return (
    await axios.put(
      `${backendUrl}/api/tutor-session/session/complete-pending`,
      { sessionId },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  ).data;
};

export const confirmSessionCompletion = async (
  backendUrl: string,
  token: string,
  sessionId: string
) => {
  return (
    await axios.put(
      `${backendUrl}/api/tutor-session/session/confirm-completion`,
      { sessionId },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  ).data;
};

export const submitReview = async (
  backendUrl: string,
  token: string,
  reviewData: { tutorId: string; comment: string; rating: number }
) => {
  return (
    await axios.post(`${backendUrl}/api/reviews`, reviewData, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).data;
};

export const createSession = async (backendUrl: string, token: string, formData: FormData) => {
  return (
    await axios.post(`${backendUrl}/api/tutor-session/session/create`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).data;
};

export const createZoomLink = async (
  backendUrl: string,
  token: string,
  sessionId: string,
  topic: string,
  startTime: string,
  duration: number,
  tutorName: string
) => {
  return (
    await axios.post(
      `${backendUrl}/api/tutor-session/create-zoom-link`,
      { sessionId, topic, startTime, duration, tutorName },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  ).data;
};
