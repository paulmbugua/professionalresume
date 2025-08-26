// packages/shared/api/profileApi.ts

import axios from 'axios'
import type {
  Profile,
  UserProfileResponse,
  ProfilePayload
} from '@mytutorapp/shared/types'

/**
 * Create a profile from a pure‐JSON payload.
 * Expects a POST /api/profile/json route on your server.
 */
export const createProfileJson = async (
  backendUrl: string,
  token: string,
  payload: ProfilePayload
) => {
  const url = `${backendUrl}/api/profile/json`
  return axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Fetch the logged‐in user’s role
 */
export const fetchUserRole = async (
  backendUrl: string,
  token: string
): Promise<string> => {
  const url = `${backendUrl}/api/user/me`
  const response = await axios.get<{ success: boolean; role: string }>(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.data.success) {
    return response.data.role
  }
  throw new Error(`Failed to fetch user role: ${response.data}`)
}

/**
 * Fetch all tutor profiles
 */
export const fetchTutorProfiles = async (
  backendUrl: string
): Promise<Profile[]> => {
  const url = `${backendUrl}/api/profile`;
  const response = await axios.get<{ profiles: Profile[] }>(url);

  // 👉 Log raw data from the API
  console.log('✅ Raw profiles from API:', response.data.profiles);

  const tutors = response.data.profiles.filter(p => p.role === 'tutor');

  // 👉 Log what you’ll actually hand back to the hook
  console.log('🎓 Filtered tutor profiles:', tutors);

  return tutors;
}
/**
 * Fetch the current user's full profile
 */
export const fetchUserProfile = async (
  backendUrl: string,
  token: string
): Promise<UserProfileResponse['profile']> => {
  const url = `${backendUrl}/api/profile/me`;
  const response = await axios.get<UserProfileResponse>(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Log the raw payload so you can inspect all fields:
  console.log('fetchUserProfile full data:', response.data);
  // Log just the nested profile object:
  console.log('fetchUserProfile.profile:', response.data.profile);

  // Return only the inner `profile` object:
  return response.data.profile;
};


export const updateProfileVideoJson = async (
  backendUrl: string,
  token: string,
  body: { video: string }
) => {
  const url = `${backendUrl}/api/profile/video`;
  return axios.patch(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};
