// packages/shared/api/profileApi.ts

import axios from 'axios'
import type {
  Profile,
  TutorCard,          // <-- make sure this lives in @mytutorapp/shared/types
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
  throw new Error(`Failed to fetch user role: ${JSON.stringify(response.data)}`)
}

/**
 * Fetch all tutor profiles and map them to TutorCard[]
 */
export const fetchTutorProfiles = async (
  backendUrl: string
): Promise<Profile[]> => {
  const url = `${backendUrl}/api/profile`
  console.log('[fetchTutorProfiles] GET', url)

  const response = await axios.get<{ success: boolean; profiles: Profile[] }>(url)
  const raw = response.data.profiles
  console.log('[fetchTutorProfiles] raw profiles:', raw)

  // Filter client‐side by role
  const tutors = raw.filter(p => p.role === 'tutor')
  console.log('[fetchTutorProfiles] filtered tutors:', tutors)

  return tutors
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

/**
 * Fetch a single tutor's full profile by their userId
 */
export const fetchTutorProfile = async (
  backendUrl: string,
  userId: number
): Promise<Profile> => {
  console.log('[fetchTutorProfile] userId =', userId)
  const url = `${backendUrl}/api/profile/user/${userId}`
  console.log('[fetchTutorProfile] fetching URL =', url)
  const response = await axios.get<Profile>(url)
  console.log('[fetchTutorProfile] response status =', response.status)
  console.log('[fetchTutorProfile] response data =', response.data)
  return response.data
}

/**
 * Fetch a tutor's reviews summary by their userId
 */
export const fetchTutorReviews = async (
  backendUrl: string,
  userId: number
) => {
  const url = `${backendUrl}/api/reviews/tutor/${userId}`
  console.log('[fetchTutorReviews] GET', url)
  return axios.get(url).then(r => r.data)
}

/**
 * Fetch a tutor's certification by their userId
 */
export const fetchTutorCertification = async (
  backendUrl: string,
  token: string,
  userId: number
) => {
  const url = `${backendUrl}/api/certification/${userId}`
  console.log('[fetchTutorCertification] GET', url)
  return axios
    .get(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.data)
}
