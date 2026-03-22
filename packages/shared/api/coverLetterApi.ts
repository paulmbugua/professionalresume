import axios from 'axios';
import type { CoverLetterDraft, CoverLetterExportResponse } from '@cvpro/shared/types';

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

export const getCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CoverLetterDraft>(`/api/cover-letter/drafts/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const updateCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string,
  payload: Partial<CoverLetterDraft>
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.patch<CoverLetterDraft>(`/api/cover-letter/drafts/${id}`, payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const exportCoverLetterPdf = async (
  backendUrl: string,
  token: string,
  payload: { draftId?: string; coverLetterJson?: Partial<CoverLetterDraft> }
): Promise<CoverLetterExportResponse> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<CoverLetterExportResponse>('/api/cover-letter/export', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
