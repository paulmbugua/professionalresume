// /packages/shared/api/authApi.ts
import axios from 'axios';

export const googleLogin = async (backendUrl: string, credential: string) => {
  return await axios.post(`${backendUrl}/api/user/google-login`, { token: credential });
};

export const fetchUser = async (backendUrl: string, token: string) => {
  return await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const requestOTP = async (backendUrl: string, email: string, token: string) => {
  return await axios.post(
    `${backendUrl}/api/user/reset-password`,
    { email },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const verifyOTP = async (
  backendUrl: string,
  email: string,
  otp: string,
  newPassword: string,
  token: string
) => {
  return await axios.post(
    `${backendUrl}/api/user/verify-otp`,
    { email, otp, newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const auth = async (
  backendUrl: string,
  endpoint: string,
  payload: object,
  token: string
) => {
  return await axios.post(`${backendUrl}${endpoint}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateRole = async (
  backendUrl: string,
  payload: object,
  token: string
) => {
  return await axios.put(`${backendUrl}/api/user/update-role`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
