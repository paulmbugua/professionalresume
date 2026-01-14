import axios from 'axios';
import type { CvDraft, CvTemplate } from '@mytutorapp/shared/types';

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

export const listCvTemplates = async (
  backendUrl: string
): Promise<CvTemplate[]> => {
  try {
    const api = client(backendUrl);
    const res = await api.get<CvTemplate[]>('/api/cv/templates');
    return res.data;
  } catch (err: any) {
    console.error('🔴 [listCvTemplates] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const listMyCvDrafts = async (
  backendUrl: string,
  token: string
): Promise<CvDraft[]> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CvDraft[]>('/api/cv/drafts');
    return res.data;
  } catch (err: any) {
    console.error('🔴 [listMyCvDrafts] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const getCvDraft = async (
  backendUrl: string,
  token: string,
  id: string
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CvDraft>(`/api/cv/drafts/${id}`);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [getCvDraft] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const createCvDraft = async (
  backendUrl: string,
  token: string,
  payload: { templateId: string; title?: string }
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<CvDraft>('/api/cv/drafts', payload);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [createCvDraft] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const updateCvDraft = async (
  backendUrl: string,
  token: string,
  id: string,
  payload: Partial<CvDraft>
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.patch<CvDraft>(`/api/cv/drafts/${id}`, payload);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [updateCvDraft] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};
