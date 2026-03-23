import axios from 'axios';
import type { CvDraft } from '@cvpro/shared/types';

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
  token: string | undefined,
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
  token: string | undefined,
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
  token: string | undefined,
  payload: { draft: CvDraft }
): Promise<{ suggestions: string[] }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestions: string[] }>('/api/ai/cv/suggest-skills', payload);
    return res.data;
  } catch (err: any) {
    console.error('🔴 [aiSuggestSkills] status/data:', err.response?.status, err.response?.data);
    throw new Error(toMessage(err));
  }
};

export const aiGenerateCoverLetter = async (
  backendUrl: string,
  token: string,
  payload: {
    jobTitle: string;
    company: string;
    experience: string;
    tone: string;
    seniority: string;
  }
): Promise<{
  suggestion: { subject: string; greeting: string; body: string; closing: string };
}> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/ai/cover-letter/generate', payload);
    return res.data;
  } catch (err: any) {
    console.error(
      '🔴 [aiGenerateCoverLetter] status/data:',
      err.response?.status,
      err.response?.data
    );
    throw new Error(toMessage(err));
  }
};

export const aiRewriteCoverLetterStyle = async (
  backendUrl: string,
  token: string,
  payload: { body: string; style: 'professional' | 'concise' | 'confident' | 'ats-friendly' }
): Promise<{ suggestion: { body: string } }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/ai/cover-letter/rewrite-style', payload);
    return res.data;
  } catch (err: any) {
    console.error(
      '🔴 [aiRewriteCoverLetterStyle] status/data:',
      err.response?.status,
      err.response?.data
    );
    throw new Error(toMessage(err));
  }
};

export const aiImproveCoverLetterParagraph = async (
  backendUrl: string,
  token: string,
  payload: { paragraph: string; context?: string }
): Promise<{ suggestion: { paragraph: string } }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/ai/cover-letter/improve-paragraph', payload);
    return res.data;
  } catch (err: any) {
    console.error(
      '🔴 [aiImproveCoverLetterParagraph] status/data:',
      err.response?.status,
      err.response?.data
    );
    throw new Error(toMessage(err));
  }
};

export const aiSuggestCoverLetterSubjectLines = async (
  backendUrl: string,
  token: string,
  payload: { body: string; jobTitle?: string; company?: string }
): Promise<{ suggestions: string[] }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/ai/cover-letter/subject-lines', payload);
    return res.data;
  } catch (err: any) {
    console.error(
      '🔴 [aiSuggestCoverLetterSubjectLines] status/data:',
      err.response?.status,
      err.response?.data
    );
    throw new Error(toMessage(err));
  }
};

export const aiSuggestCoverLetterGreetingClosing = async (
  backendUrl: string,
  token: string,
  payload: { body: string; jobTitle?: string; company?: string }
): Promise<{ suggestions: { greetings: string[]; closings: string[] } }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/ai/cover-letter/greeting-closing', payload);
    return res.data;
  } catch (err: any) {
    console.error(
      '🔴 [aiSuggestCoverLetterGreetingClosing] status/data:',
      err.response?.status,
      err.response?.data
    );
    throw new Error(toMessage(err));
  }
};
