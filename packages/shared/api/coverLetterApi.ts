import axios from 'axios';
import type {
  CoverLetterDraft,
  CoverLetterTemplate,
  CoverLetterTemplateResponse,
  CoverLetterExportResponse,
  CoverLetterGeneratePayload,
  CoverLetterRewritePayload,
} from '@cvpro/shared/types';

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

export const listCoverLetterTemplates = async (
  backendUrl: string,
): Promise<CoverLetterTemplateResponse> => {
  try {
    const api = client(backendUrl);
    const res = await api.get<
      CoverLetterTemplate[] | CoverLetterTemplateResponse | { templates?: CoverLetterTemplate[] }
    >('/api/cover-letter/templates');

    if (Array.isArray(res.data)) return { templates: res.data, source: 'db', fallback: false };
    if (Array.isArray(res.data?.templates)) {
      return {
        templates: res.data.templates,
        source: (res.data as CoverLetterTemplateResponse).source ?? 'db',
        fallback: Boolean((res.data as CoverLetterTemplateResponse).fallback),
      };
    }
    return { templates: [], source: 'db', fallback: false };
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const listMyCoverLetterDrafts = async (
  backendUrl: string,
  token: string,
): Promise<CoverLetterDraft[]> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CoverLetterDraft[]>('/api/cover-letter/drafts');
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string,
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CoverLetterDraft>(`/api/cover-letter/drafts/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const createCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  payload: {
    templateId: string;
    title?: string;
    data?: Partial<CoverLetterDraft>;
  },
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);

    const safePayload: {
      templateId: string;
      title?: string;
      data?: Partial<CoverLetterDraft>;
    } = {
      templateId: payload.templateId,
    };

    if (typeof payload.title === 'string') safePayload.title = payload.title;
    if (payload.data && typeof payload.data === 'object') safePayload.data = payload.data;

    const res = await api.post<CoverLetterDraft>('/api/cover-letter/drafts', safePayload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const updateCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string,
  payload: Partial<CoverLetterDraft>,
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);

    // whitelist exactly what backend patch validators should allow
    const safe: Partial<CoverLetterDraft> = {};

    if (typeof payload.title === 'string') safe.title = payload.title;
    if (typeof payload.templateId === 'string') safe.templateId = payload.templateId;

    if (payload.recipient && typeof payload.recipient === 'object') safe.recipient = payload.recipient;
    if (payload.sender && typeof payload.sender === 'object') safe.sender = payload.sender;

    if (typeof payload.subject === 'string') safe.subject = payload.subject;
    if (typeof payload.opening === 'string') safe.opening = payload.opening;
    if (typeof payload.body === 'string') safe.body = payload.body;
    if (typeof payload.closing === 'string') safe.closing = payload.closing;
    if (typeof payload.signature === 'string') safe.signature = payload.signature;
    if (typeof payload.tone === 'string') safe.tone = payload.tone;

    if (Array.isArray(payload.highlights)) safe.highlights = payload.highlights;
    if (payload.richText && typeof payload.richText === 'object') safe.richText = payload.richText;
    if (payload.templateTheme && typeof payload.templateTheme === 'object') {
      safe.templateTheme = payload.templateTheme;
    }

    if (Object.keys(safe).length === 0) {
      const res = await api.get<CoverLetterDraft>(`/api/cover-letter/drafts/${id}`);
      return res.data;
    }

    const res = await api.patch<CoverLetterDraft>(`/api/cover-letter/drafts/${id}`, safe);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const deleteCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string,
): Promise<void> => {
  try {
    const api = client(backendUrl, token);
    await api.delete(`/api/cover-letter/drafts/${id}`);
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCoverLetterPrintHtml = async (
  backendUrl: string,
  token: string,
  id: string,
): Promise<{ html: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<{ html: string }>(`/api/cover-letter/drafts/${id}/print-html`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const exportCoverLetterPdf = async (
  backendUrl: string,
  token: string,
  payload: { draftId?: string; coverLetterJson?: Partial<CoverLetterDraft> },
): Promise<CoverLetterExportResponse> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<CoverLetterExportResponse>('/api/cover-letter/export', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const signCoverLetterFile = async (
  backendUrl: string,
  token: string,
  fileKey: string,
): Promise<{ key: string; url: string; signedUrl: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<{ key: string; url: string; signedUrl: string }>(
      '/api/cover-letter/files/sign',
      {
        params: { key: fileKey },
      },
    );
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const aiGenerateCoverLetter = async (
  backendUrl: string,
  token: string,
  payload: CoverLetterGeneratePayload,
): Promise<{ suggestion: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestion: string }>('/api/ai/cover-letter/generate', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const aiRewriteCoverLetter = async (
  backendUrl: string,
  token: string,
  payload: CoverLetterRewritePayload,
): Promise<{ suggestion: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestion: string }>('/api/ai/cover-letter/rewrite', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
