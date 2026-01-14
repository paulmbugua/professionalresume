import axios from 'axios';
import type { CvDraft } from '@mytutorapp/shared/types';

function client(backendUrl: string, token?: string) {
  return axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const toMessage = (err: any) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  (typeof err?.response?.data === 'string' ? err.response.data : '') ||
  err?.message ||
  'Request failed';

export const aiGenerateSummary = async (
  backendUrl: string,
  token: string,
  payload: { draft: CvDraft }
): Promise<{ suggestion: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestion: string }>('/api/ai/cv/summary', payload);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [aiGenerateSummary] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const aiRewriteBullet = async (
  backendUrl: string,
  token: string,
  payload: { context: string; bullet: string }
): Promise<{ suggestion: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestion: string }>('/api/ai/cv/rewrite-bullet', payload);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [aiRewriteBullet] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const aiSuggestSkills = async (
  backendUrl: string,
  token: string,
  payload: { draft: CvDraft }
): Promise<{ suggestions: string[] }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestions: string[] }>(
      '/api/ai/cv/suggest-skills',
      payload
    );
    return res.data;
  } catch (err: any) {
    console.error('🔴 [aiSuggestSkills] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};
