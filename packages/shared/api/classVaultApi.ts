import axios from 'axios';
import type { RecordedVideo, VideoReview } from '@mytutorapp/shared/types';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api/classvault';

export const fetchAllVideos = async (): Promise<RecordedVideo[]> => {
  const res = await axios.get(BASE_URL);
  return res.data;
};

export const fetchVideoById = async (id: number): Promise<RecordedVideo> => {
  const res = await axios.get(`${BASE_URL}/${id}`);
  return res.data;
};

export const fetchVideoReviews = async (videoId: number): Promise<VideoReview[]> => {
  const res = await axios.get(`${BASE_URL}/${videoId}/reviews`);
  return res.data;
};

export const deleteVideoById = async (id: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${id}`);
};


export const fetchDownloadResources = async (
  videoId: number,
  token: string
): Promise<{ video_url: string; pdf_url: string }> => {
  const res = await axios.get(`${BASE_URL}/download/${videoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

 // Two-step metadata submission
 export const createVideoJson = async (
  data: Record<string, any>
): Promise<RecordedVideo> => {
  const res = await axios.post<RecordedVideo>(
    `${BASE_URL}/json`,
    data
  );
  return res.data;
};