// packages/shared/api/profileApi.ts
import axios from 'axios';
import type {
  Profile,
  UserProfileResponse,
  ProfilePayload,
} from '@mytutorapp/shared/types';

const dev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false;

/** Create a profile from a pure JSON payload. */
export const createProfileJson = async (
  backendUrl: string,
  token: string,
  payload: ProfilePayload
) => {
  const url = `${backendUrl}/api/profile/json`;
  return axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

/** Fetch the logged‐in user’s role */
export const fetchUserRole = async (
  backendUrl: string,
  token: string
): Promise<string> => {
  if (!token) throw new Error('fetchUserRole: missing token');
  const url = `${backendUrl}/api/user/me`;
  const response = await axios.get<{ success: boolean; role: string }>(url, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 401,
  });
  if (response.status === 401) throw new Error('Unauthorized');
  if (response.data.success) return response.data.role;
  throw new Error(`Failed to fetch user role: ${JSON.stringify(response.data)}`);
};

/** Fetch all tutor profiles (404 → []) */
export const fetchTutorProfiles = async (
  backendUrl: string
): Promise<Profile[]> => {
  const url = `${backendUrl}/api/profile`;
  try {
    const response = await axios.get<{ profiles: Profile[] }>(url, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });

    if (response.status === 404) {
      if (dev) console.debug('[profiles] 404 → returning []');
      return [];
    }

    const tutors = (response.data?.profiles ?? []).filter((p) => p.role === 'tutor');
    if (dev) console.debug('🎓 Filtered tutor profiles:', tutors);
    return tutors;
  } catch (err) {
    // Only throw for non-404 failures
    throw err;
  }
};

/** Fetch the current user's full profile (404 → null, not an error) */
export const fetchUserProfile = async (
  backendUrl: string,
  token: string
): Promise<UserProfileResponse['profile'] | null> => {
  if (!token) return null;
  const url = `${backendUrl}/api/profile/me`;
  try {
    const response = await axios.get<UserProfileResponse>(url, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 401,
    });

    if (response.status === 404) {
      if (dev) console.debug('[profile/me] 404 → null profile');
      return null;
    }
    if (response.status === 401) {
      if (dev) console.debug('[profile/me] 401 → null profile');
      return null;
    }

    if (dev) {
      console.debug('fetchUserProfile full data:', response.data);
      console.debug('fetchUserProfile.profile:', response.data.profile);
    }
    return response.data.profile ?? null;
  } catch (err) {
    throw err;
  }
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
