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
  const url = `${backendUrl}/api/profile`
  const response = await axios.get<{ profiles: Profile[] }>(url)
  return response.data.profiles.filter(p => p.role === 'tutor')
}

/**
 * Fetch the current user's full profile
 */
export const fetchUserProfile = async (
  backendUrl: string,
  token: string
): Promise<UserProfileResponse> => {
  const url = `${backendUrl}/api/profile/me`
  const response = await axios.get<UserProfileResponse>(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
