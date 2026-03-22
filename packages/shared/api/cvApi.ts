import axios from 'axios';
import type {
  CvDraft,
  CvTemplate,
  CvTemplateResponse,
  CvExportResponse,
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

export const listCvTemplates = async (backendUrl: string): Promise<CvTemplateResponse> => {
  try {
    const api = client(backendUrl);
    const res = await api.get<CvTemplate[] | CvTemplateResponse | { templates?: CvTemplate[] }>(
      '/api/cv/templates',
    );
    if (Array.isArray(res.data)) return { templates: res.data, source: 'db', fallback: false };
    if (Array.isArray(res.data?.templates)) {
      return {
        templates: res.data.templates,
        source: (res.data as CvTemplateResponse).source ?? 'db',
        fallback: Boolean((res.data as CvTemplateResponse).fallback),
      };
    }
    return { templates: [], source: 'db', fallback: false };
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const listMyCvDrafts = async (backendUrl: string, token: string): Promise<CvDraft[]> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CvDraft[]>('/api/cv/drafts');
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCvDraft = async (
  backendUrl: string,
  token: string,
  id: string,
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CvDraft>(`/api/cv/drafts/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const createCvDraft = async (
  backendUrl: string,
  token: string,
  payload: { templateId: string; title?: string; data?: Partial<CvDraft> },
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<CvDraft>('/api/cv/drafts', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const updateCvDraft = async (
  backendUrl: string,
  token: string,
  id: string,
  payload: Partial<CvDraft>,
): Promise<CvDraft> => {
  try {
    const api = client(backendUrl, token);

    // ✅ whitelist exactly what the backend allows (draftPatchSchema)
    const safe: Record<string, any> = {};

    if (typeof (payload as any).title === 'string') safe.title = (payload as any).title;
    if (typeof (payload as any).templateId === 'string') safe.templateId = (payload as any).templateId;

    if ((payload as any).basics && typeof (payload as any).basics === 'object') safe.basics = (payload as any).basics;
    if (typeof (payload as any).summary === 'string') safe.summary = (payload as any).summary;
    if (Array.isArray((payload as any).skills)) safe.skills = (payload as any).skills;

    if (Array.isArray((payload as any).experience)) safe.experience = (payload as any).experience;
    if (Array.isArray((payload as any).education)) safe.education = (payload as any).education;
    if (Array.isArray((payload as any).projects)) safe.projects = (payload as any).projects;
    if (Array.isArray((payload as any).certifications)) safe.certifications = (payload as any).certifications;

    if ((payload as any).extras && typeof (payload as any).extras === 'object') safe.extras = (payload as any).extras;
    if ((payload as any).typography && typeof (payload as any).typography === 'object') safe.typography = (payload as any).typography;
    if ((payload as any).formatting && typeof (payload as any).formatting === 'object') safe.formatting = (payload as any).formatting;
    if ((payload as any).templateTheme && typeof (payload as any).templateTheme === 'object') safe.templateTheme = (payload as any).templateTheme;
    if ((payload as any).richText && typeof (payload as any).richText === 'object') safe.richText = (payload as any).richText;
    if ((payload as any).coverLetter && typeof (payload as any).coverLetter === 'object') safe.coverLetter = (payload as any).coverLetter;
    if ((payload as any).aiMeta && typeof (payload as any).aiMeta === 'object') safe.aiMeta = (payload as any).aiMeta;
    if ((payload as any).generationMeta && typeof (payload as any).generationMeta === 'object') {
      safe.generationMeta = (payload as any).generationMeta;
    }

    if (Array.isArray((payload as any).sectionOrder)) safe.sectionOrder = (payload as any).sectionOrder;
    if ((payload as any).sectionVisibility && typeof (payload as any).sectionVisibility === 'object') {
      safe.sectionVisibility = (payload as any).sectionVisibility;
    }

    // ✅ Don’t send an empty patch (backend requires min(1))
    if (Object.keys(safe).length === 0) {
      // return current server version to keep UI stable
      const res = await api.get<CvDraft>(`/api/cv/drafts/${id}`);
      return res.data;
    }

    const res = await api.patch<CvDraft>(`/api/cv/drafts/${id}`, safe); // PATCH makes more semantic sense
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};



export const deleteCvDraft = async (backendUrl: string, token: string, id: string): Promise<void> => {
  try {
    const api = client(backendUrl, token);
    await api.delete(`/api/cv/drafts/${id}`);
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const exportCvPdf = async (
  backendUrl: string,
  token: string,
  payload: { draftId?: string; cvJson?: Partial<CvDraft> },
): Promise<CvExportResponse> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<CvExportResponse>('/api/cv/export', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const signCvFile = async (
  backendUrl: string,
  token: string,
  fileKey: string,
): Promise<{ key: string; url: string; signedUrl: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<{ key: string; url: string; signedUrl: string }>('/api/cv/files/sign', {
      params: { key: fileKey },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCvPrintHtml = async (
  backendUrl: string,
  token: string,
  id: string,
): Promise<{ html: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<{ html: string }>(`/api/cv/drafts/${id}/print-html`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
