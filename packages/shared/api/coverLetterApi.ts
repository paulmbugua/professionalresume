import axios from 'axios';
import { toCoverLetterRendererJson } from '@cvpro/shared/cover-letter/renderers';
import type {
  CoverLetterDraft,
  CoverLetterTemplate,
  CoverLetterTemplateResponse,
  CoverLetterExportResponse,
  CoverLetterGeneratePayload,
  CoverLetterRewritePayload,
} from '@cvpro/shared/types';

type CoverLetterExportJson = ReturnType<typeof toCoverLetterRendererJson>;

export function toCoverLetterExportJson(
  draft: Partial<CoverLetterDraft> | CoverLetterDraft | Record<string, any> | null | undefined,
): CoverLetterExportJson {
  return toCoverLetterRendererJson((draft || {}) as Record<string, any>);
}

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
  backendUrl: string
): Promise<CoverLetterTemplateResponse> => {
  try {
    const api = client(backendUrl);
    const res = await api.get<
      CoverLetterTemplate[] | CoverLetterTemplateResponse | { templates?: CoverLetterTemplate[] }
    >('/api/cover-letters/templates');

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
  token: string
): Promise<CoverLetterDraft[]> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CoverLetterDraft[]>('/api/cover-letters/drafts');
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<CoverLetterDraft>(`/api/cover-letters/drafts/${id}`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const createCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  payload: {
    templateKey: string;
    title?: string;
    data?: {
      applicantName?: string;
      applicantEmail?: string;
      applicantPhone?: string;
      applicantLocation?: string;
      recipientName?: string;
      companyName?: string;
      roleTitle?: string;
      letterBody?: string;
      closingLine?: string;
    };
    style?: {
      fontFamily?: string;
      fontSize?: number;
      lineHeight?: number;
      accentColor?: string;
      pageTheme?: string;
    };
  }
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);

    const safePayload: {
      templateKey: string;
      title?: string;
      data?: {
        applicantName: string;
        applicantEmail: string;
        applicantPhone: string;
        applicantLocation: string;
        recipientName: string;
        companyName: string;
        roleTitle: string;
        letterBody: string;
        closingLine: string;
      };
      style?: {
        fontFamily?: string;
        fontSize?: number;
        lineHeight?: number;
        accentColor?: string;
        pageTheme?: string;
      };
    } = {
      templateKey: payload.templateKey,
    };

    if (typeof payload.title === 'string') safePayload.title = payload.title;
    if (payload.data && typeof payload.data === 'object') {
      safePayload.data = {
        applicantName:
          typeof payload.data.applicantName === 'string' ? payload.data.applicantName : '',
        applicantEmail:
          typeof payload.data.applicantEmail === 'string' ? payload.data.applicantEmail : '',
        applicantPhone:
          typeof payload.data.applicantPhone === 'string' ? payload.data.applicantPhone : '',
        applicantLocation:
          typeof payload.data.applicantLocation === 'string' ? payload.data.applicantLocation : '',
        recipientName:
          typeof payload.data.recipientName === 'string' ? payload.data.recipientName : '',
        companyName: typeof payload.data.companyName === 'string' ? payload.data.companyName : '',
        roleTitle: typeof payload.data.roleTitle === 'string' ? payload.data.roleTitle : '',
        letterBody: typeof payload.data.letterBody === 'string' ? payload.data.letterBody : '',
        closingLine: typeof payload.data.closingLine === 'string' ? payload.data.closingLine : '',
      };
    }
    if (payload.style && typeof payload.style === 'object') safePayload.style = payload.style;

    const res = await api.post<CoverLetterDraft>('/api/cover-letters/drafts', safePayload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const updateCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string,
  payload: Partial<CoverLetterDraft> & {
    templateKey?: string;
    data?: {
      applicantName?: string;
      applicantEmail?: string;
      applicantPhone?: string;
      applicantLocation?: string;
      recipientName?: string;
      companyName?: string;
      roleTitle?: string;
      letterBody?: string;
      closingLine?: string;
    };
    style?: {
      fontFamily?: string;
      fontSize?: number;
      lineHeight?: number;
      accentColor?: string;
      pageTheme?: string;
    };
  }
): Promise<CoverLetterDraft> => {
  try {
    const api = client(backendUrl, token);

    const safe: {
      title?: string;
      templateKey?: string;
      data?: {
        applicantName?: string;
        applicantEmail?: string;
        applicantPhone?: string;
        applicantLocation?: string;
        recipientName?: string;
        companyName?: string;
        roleTitle?: string;
        letterBody?: string;
        closingLine?: string;
      };
      style?: {
        fontFamily?: string;
        fontSize?: number;
        lineHeight?: number;
        accentColor?: string;
        pageTheme?: string;
      };
    } = {};

    if (typeof payload.title === 'string') safe.title = payload.title;
    if (typeof payload.templateKey === 'string') safe.templateKey = payload.templateKey;
    else if (typeof payload.templateId === 'string') safe.templateKey = payload.templateId;

    const dataCandidate =
      payload.data && typeof payload.data === 'object'
        ? payload.data
        : {
            applicantName: (payload as any)?.sender?.fullName,
            applicantEmail: (payload as any)?.sender?.email,
            applicantPhone: (payload as any)?.sender?.phone,
            applicantLocation: (payload as any)?.sender?.location,
            recipientName: (payload as any)?.recipient?.name,
            companyName: (payload as any)?.recipient?.company,
            roleTitle: (payload as any)?.letter?.role,
            letterBody: [
              (payload as any)?.letter?.greeting,
              (payload as any)?.body?.opening,
              ...(((payload as any)?.body?.middleParagraphs as string[] | undefined) || []),
              (payload as any)?.body?.closing,
            ]
              .filter((part) => typeof part === 'string' && part.trim().length > 0)
              .join('\n\n'),
            closingLine: (payload as any)?.letter?.signoff,
          };

    const sanitizedData = {
      applicantName:
        typeof dataCandidate.applicantName === 'string' ? dataCandidate.applicantName : undefined,
      applicantEmail:
        typeof dataCandidate.applicantEmail === 'string' ? dataCandidate.applicantEmail : undefined,
      applicantPhone:
        typeof dataCandidate.applicantPhone === 'string' ? dataCandidate.applicantPhone : undefined,
      applicantLocation:
        typeof dataCandidate.applicantLocation === 'string'
          ? dataCandidate.applicantLocation
          : undefined,
      recipientName:
        typeof dataCandidate.recipientName === 'string' ? dataCandidate.recipientName : undefined,
      companyName:
        typeof dataCandidate.companyName === 'string' ? dataCandidate.companyName : undefined,
      roleTitle: typeof dataCandidate.roleTitle === 'string' ? dataCandidate.roleTitle : undefined,
      letterBody:
        typeof dataCandidate.letterBody === 'string' ? dataCandidate.letterBody : undefined,
      closingLine:
        typeof dataCandidate.closingLine === 'string' ? dataCandidate.closingLine : undefined,
    };

    if (Object.values(sanitizedData).some((value) => value !== undefined))
      safe.data = sanitizedData;
    if (payload.style && typeof payload.style === 'object') safe.style = payload.style;

    if (Object.keys(safe).length === 0) {
      const res = await api.get<CoverLetterDraft>(`/api/cover-letters/drafts/${id}`);
      return res.data;
    }

    const res = await api.patch<CoverLetterDraft>(`/api/cover-letters/drafts/${id}`, safe);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const deleteCoverLetterDraft = async (
  backendUrl: string,
  token: string,
  id: string
): Promise<void> => {
  try {
    const api = client(backendUrl, token);
    await api.delete(`/api/cover-letters/drafts/${id}`);
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCoverLetterPrintHtml = async (
  backendUrl: string,
  token: string,
  payload: { draftId?: string; coverLetterJson?: Partial<CoverLetterDraft> | Record<string, any> }
): Promise<{ html: string }> => {
  try {
    const api = client(backendUrl, token);
    const safePayload = {
      ...(payload?.draftId ? { draftId: payload.draftId } : {}),
      ...(payload?.coverLetterJson
        ? { coverLetterJson: toCoverLetterExportJson(payload.coverLetterJson) }
        : {}),
    };
    const res = await api.post<{ html: string }>('/api/cover-letters/print-html', safePayload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const exportCoverLetterPdf = async (
  backendUrl: string,
  token: string,
  payload: { draftId?: string; coverLetterJson?: Partial<CoverLetterDraft> | Record<string, any> }
): Promise<CoverLetterExportResponse> => {
  try {
    const api = client(backendUrl, token);
    const safePayload = {
      ...(payload?.draftId ? { draftId: payload.draftId } : {}),
      ...(payload?.coverLetterJson
        ? { coverLetterJson: toCoverLetterExportJson(payload.coverLetterJson) }
        : {}),
    };
    const res = await api.post<CoverLetterExportResponse>('/api/cover-letters/export', safePayload);
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403) {
      throw new Error(
        err?.response?.data?.error ||
          'Cover-letter export is available after your paid resume/CV purchase.'
      );
    }
    if (status === 404) {
      throw new Error(err?.response?.data?.error || 'Cover-letter draft not found');
    }
    throw new Error(toMessage(err));
  }
};

export const signCoverLetterFile = async (
  backendUrl: string,
  token: string,
  fileKey: string
): Promise<{ key: string; url: string; signedUrl: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get<{ key: string; url: string; signedUrl: string }>(
      '/api/cover-letters/files/sign',
      {
        params: { key: fileKey },
      }
    );
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const aiGenerateCoverLetter = async (
  backendUrl: string,
  token: string,
  payload: CoverLetterGeneratePayload
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
  payload: CoverLetterRewritePayload
): Promise<{ suggestion: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post<{ suggestion: string }>('/api/ai/cover-letter/rewrite', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
