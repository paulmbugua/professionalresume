// accountApi.ts
import axios from 'axios';

export const fetchUserDetails = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchProfileDetails = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchTransactions = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/payment/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
};

export const fetchDataByType = async (backendUrl: string, token: string, type: string) => {
  const response = await axios.get(`${backendUrl}/api/tutor-session/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
};

export const createSession = async (backendUrl: string, token: string, sessionData: any) => {
  const response = await axios.post(`${backendUrl}/api/tutor-session/session/create`, sessionData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const acceptSession = async (backendUrl: string, token: string, sessionId: string) => {
  const response = await axios.put(`${backendUrl}/api/tutor-session/${sessionId}/accept`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const cancelSession = async (backendUrl: string, token: string, sessionId: string, reason: string) => {
  const response = await axios.put(`${backendUrl}/api/tutor-session/${sessionId}/cancel`, { reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const completePendingSession = async (backendUrl: string, token: string, sessionId: string) => {
  const response = await axios.put(`${backendUrl}/api/tutor-session/session/complete-pending`, { sessionId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const confirmSessionCompletion = async (backendUrl: string, token: string, sessionId: string) => {
  const response = await axios.put(`${backendUrl}/api/tutor-session/session/confirm-completion`, { sessionId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const submitReview = async (backendUrl: string, token: string, payload: any) => {
  const response = await axios.post(`${backendUrl}/api/reviews`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createZoomLink = async (backendUrl: string, token: string, data: any) => {
  const response = await axios.post(`${backendUrl}/api/tutor-session/create-zoom-link`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
