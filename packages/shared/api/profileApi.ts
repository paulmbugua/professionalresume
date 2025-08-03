// packages/shared/api/profileApi.ts
import type { Profile, UserProfileResponse, ProfilePayload } from '@mytutorapp/shared/types'
import type { AxiosInstance } from 'axios'

export const createProfileJson = async (
  http: AxiosInstance,
  payload: ProfilePayload
) => {
  return http.post('/api/profile/json', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const fetchUserRole = async (
  http: AxiosInstance
): Promise<string> => {
  const { data } = await http.get<{ success: boolean; role: string }>('/api/user/me')
  if (data.success) return data.role
  throw new Error('Failed to fetch user role')
}

export const fetchTutorProfiles = async (
  http: AxiosInstance
): Promise<Profile[]> => {
  const { data } = await http.get<{ profiles: Profile[] }>('/api/profile')
  return data.profiles.filter(p => p.role === 'tutor')
}

export const fetchUserProfile = async (
  http: AxiosInstance
): Promise<UserProfileResponse['profile']> => {
  const { data } = await http.get<UserProfileResponse>('/api/profile/me')
  return data.profile
}
