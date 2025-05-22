// packages/shared/api/profileApi.ts

import axios from 'axios';
import type { Profile, UserProfileResponse } from '@mytutorapp/shared/types';

export const createProfile = async (
  backendUrl: string,
  token: string,
  formData: FormData
) => {
  const url = `${backendUrl}/api/profile`;     // ← build the full endpoint here
  return axios.post(url, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',  // ← must be exactly this
    },
  });
};



/**
 * Fetch the logged‐in user’s role from /api/user/me
 */
export const fetchUserRole = async (
  backendUrl: string,
  token: string
): Promise<string> => {
  const url = `${backendUrl}/api/user/me`;
  console.log('▶️ [profileApi] fetchUserRole → GET', url);

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('✅ [profileApi] fetchUserRole response data:', response.data);

  if (response.data.success) {
    return response.data.role as string;
  } else {
    throw new Error(`Failed to fetch user role: ${response.data.message}`);
  }
};

/**
 * Fetch all tutor profiles (for listing on web)
 */
export const fetchTutorProfiles = async (
  backendUrl: string
): Promise<Profile[]> => {
  const url = `${backendUrl}/api/profile/`;
  console.log('▶️ [profileApi] fetchTutorProfiles → GET', url);

  const response = await axios.get(url);
  console.log('✅ [profileApi] fetchTutorProfiles response data:', response.data);

  const tutorProfiles = (response.data.profiles as Profile[]).filter(
    (p) => p.role === 'tutor'
  );
  console.log('  └─ filtered tutors:', tutorProfiles.length);
  return tutorProfiles;
};

/**
 * Fetch the current user's full profile
 */
export const fetchUserProfile = async (
  backendUrl: string,
  token: string
): Promise<UserProfileResponse> => {
  const url = `${backendUrl}/api/profile/me`;
  console.log('▶️ [profileApi] fetchUserProfile → GET', url);

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ [profileApi] fetchUserProfile response data:', response.data);

  return response.data as UserProfileResponse;
};
