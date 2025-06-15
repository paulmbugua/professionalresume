// packages/shared/api/classVaultApi.ts

import axios from 'axios'
import type { RecordedVideo, VideoReview } from '@mytutorapp/shared/types'
import type { CreateRecordedVideoPayload } from '@mytutorapp/shared/hooks/useUploadClassVault'

const BASE_PATH = '/api/classvault'

export const fetchAllVideos = async (
  backendUrl: string
): Promise<RecordedVideo[]> => {
  const res = await axios.get<RecordedVideo[]>(`${backendUrl}${BASE_PATH}`)
  return res.data
}

export const fetchVideoById = async (
  backendUrl: string,
  id: number
): Promise<RecordedVideo> => {
  const res = await axios.get<RecordedVideo>(
    `${backendUrl}${BASE_PATH}/${id}`
  )
  return res.data
}

export const fetchVideoReviews = async (
  backendUrl: string,
  videoId: number
): Promise<VideoReview[]> => {
  const res = await axios.get<VideoReview[]>(
    `${backendUrl}${BASE_PATH}/${videoId}/reviews`
  )
  return res.data
}

export const deleteVideoById = async (
  backendUrl: string,
  id: number,
  token: string
): Promise<void> => {
  await axios.delete(
    `${backendUrl}${BASE_PATH}/${id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
}

export const fetchDownloadResources = async (
  backendUrl: string,
  videoId: number,
  token: string
): Promise<{ video_url: string; pdf_url: string }> => {
  const res = await axios.get<{ video_url: string; pdf_url: string }>(
    `${backendUrl}${BASE_PATH}/download/${videoId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

// Two-step metadata submission: JSON-only endpoint
export const createVideoJson = async (
  backendUrl: string,
  token: string,
  data: CreateRecordedVideoPayload
): Promise<RecordedVideo> => {
  const res = await axios.post<RecordedVideo>(
    `${backendUrl}${BASE_PATH}`,     // ← no `/json` suffix
    data,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

export const purchaseClassVault = async (
  backendUrl: string,
  videoId: number,
  token: string
): Promise<{ video_url: string; pdf_url: string }> => {
  const res = await axios.post<{ video_url: string; pdf_url: string }>(
    `${backendUrl}${BASE_PATH}/${videoId}/purchase`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export const fetchPurchasedVideoIds = async (
  backendUrl: string,
  token: string
): Promise<number[]> => {
  const res = await axios.get<{ purchases: { class_id: number }[] }>(
    `${backendUrl}/api/classvault/purchases`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  // Map down to just the class IDs
  return res.data.purchases.map(p => p.class_id)
}