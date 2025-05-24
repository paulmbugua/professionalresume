import axios from 'axios';
import type {
  AuthPayload,
  RegisterPayload,
  UpdateRolePayload,
  AuthResponse,
} from '@mytutorapp/shared/types';

export const googleLogin = async (
  backendUrl: string,
  credential: string
): Promise<AuthResponse> => {
  console.log('▶️ [api] POST', `${backendUrl}/api/user/google-login`, 'token:', credential);
  
  try {
    const response = await axios.post<AuthResponse>(
      `${backendUrl}/api/user/google-login`,
      { token: credential }, // Ensure this matches backend expectation
      {
        headers: {
          'Content-Type': 'application/json', // Explicit content type
        },
      }
    );
    
    console.log('🟢 [api] response.data:', response.data);
    return response.data;
    
  } catch (err: any) {
    console.error('🔴 [api] googleLogin error:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    
    // Throw a more descriptive error
    throw new Error(err.response?.data?.message || 'Google authentication failed');
  }
};


export const login = async (
  backendUrl: string,
  payload: AuthPayload,
  token?: string
): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${backendUrl}/api/user/login`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const register = async (
  backendUrl: string,
  payload: RegisterPayload,
  token?: string
): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${backendUrl}/api/user/register`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const requestOTP = async (
  backendUrl: string,
  email: string,
  token?: string
): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(
    `${backendUrl}/api/user/reset-password`,
    { email },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
};

export const verifyOTP = async (
  backendUrl: string,
  email: string,
  otp: string,
  newPassword: string,
  token?: string
): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(
    `${backendUrl}/api/user/verify-otp`,
    { email, otp, newPassword },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  return response.data;
};

export const updateRole = async (
  backendUrl: string,
  payload: UpdateRolePayload,
  token: string
): Promise<AuthResponse> => {
  const response = await axios.put<AuthResponse>(`${backendUrl}/api/user/update-role`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
