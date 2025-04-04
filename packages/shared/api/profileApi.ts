// packages/shared/api/profileApi.ts
import axios from 'axios';
import type { Profile, UserProfileResponse } from '@shared/types';

export const createProfile = async (
  backendUrl: string,
  token: string,
  formData: FormData
) => {
  const response = await axios.post(`${backendUrl}/api/profile`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
};

export const fetchUserRole = async (backendUrl: string, token: string): Promise<string> => {
  const response = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.data.success) {
    return response.data.role;
  }
  throw new Error("Failed to fetch user role");
};

export const fetchTutorProfiles = async (backendUrl: string): Promise<Profile[]> => {
  const response = await axios.get(`${backendUrl}/api/profile/`);
  const tutorProfiles = response.data.profiles.filter(
    (profile: Profile) => profile.role === 'tutor'
  );
  return tutorProfiles;
};

export const fetchUserProfile = async (
  backendUrl: string,
  token: string
): Promise<UserProfileResponse> => {
  const response = await axios.get(`${backendUrl}/api/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
