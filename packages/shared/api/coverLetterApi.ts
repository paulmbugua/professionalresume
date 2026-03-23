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
        applicantTitle: string;
        applicantEmail: string;
        applicantPhone: string;
        applicantLocation: string;
        recipientName: string;
        recipientTitle: string;
        companyName: string;
        companyAddress: string;
        roleTitle: string;
        dateText: string;
        subjectLine: string;
        greeting: string;
        letterBody: string;
        closingParagraph: string;
        closingLine: string;
        signatureName: string;
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
        applicantName: typeof payload.data.applicantName === 'string' ? payload.data.applicantName : '',
        applicantTitle: typeof payload.data.applicantTitle === 'string' ? payload.data.applicantTitle : '',
        applicantEmail: typeof payload.data.applicantEmail === 'string' ? payload.data.applicantEmail : '',
        applicantPhone: typeof payload.data.applicantPhone === 'string' ? payload.data.applicantPhone : '',
        applicantLocation: typeof payload.data.applicantLocation === 'string' ? payload.data.applicantLocation : '',
        recipientName: typeof payload.data.recipientName === 'string' ? payload.data.recipientName : '',
        recipientTitle: typeof payload.data.recipientTitle === 'string' ? payload.data.recipientTitle : '',
        companyName: typeof payload.data.companyName === 'string' ? payload.data.companyName : '',
        companyAddress: typeof payload.data.companyAddress === 'string' ? payload.data.companyAddress : '',
        roleTitle: typeof payload.data.roleTitle === 'string' ? payload.data.roleTitle : '',
        dateText: typeof payload.data.dateText === 'string' ? payload.data.dateText : '',
        subjectLine: typeof payload.data.subjectLine === 'string' ? payload.data.subjectLine : '',
        greeting: typeof payload.data.greeting === 'string' ? payload.data.greeting : '',
        letterBody: typeof payload.data.letterBody === 'string' ? payload.data.letterBody : '',
        closingParagraph: typeof payload.data.closingParagraph === 'string' ? payload.data.closingParagraph : '',
        closingLine: typeof payload.data.closingLine === 'string' ? payload.data.closingLine : '',
        signatureName: typeof payload.data.signatureName === 'string' ? payload.data.signatureName : '',
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
        applicantTitle?: string;
        applicantEmail?: string;
        applicantPhone?: string;
        applicantLocation?: string;
        recipientName?: string;
        recipientTitle?: string;
        companyName?: string;
        companyAddress?: string;
        roleTitle?: string;
        dateText?: string;
        subjectLine?: string;
        greeting?: string;
        letterBody?: string;
        closingParagraph?: string;
        closingLine?: string;
        signatureName?: string;
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
            applicantTitle: (payload as any)?.sender?.title,
            applicantEmail: (payload as any)?.sender?.email,
            applicantPhone: (payload as any)?.sender?.phone,
            applicantLocation: (payload as any)?.sender?.location,
            recipientName: (payload as any)?.recipient?.name,
            recipientTitle: (payload as any)?.recipient?.title,
            companyName: (payload as any)?.recipient?.company,
            companyAddress: (payload as any)?.recipient?.address,
            roleTitle: (payload as any)?.letter?.role,
            dateText: (payload as any)?.letter?.date,
            subjectLine: (payload as any)?.letter?.subject,
            greeting: (payload as any)?.letter?.greeting,
            letterBody: [
              (payload as any)?.body?.opening,
              ...(((payload as any)?.body?.middleParagraphs as string[] | undefined) || []),
            ]
              .filter((part) => typeof part === 'string' && part.trim().length > 0)
              .join('\n\n'),
            closingParagraph: (payload as any)?.body?.closing,
            closingLine: (payload as any)?.letter?.signoff,
            signatureName: (payload as any)?.sender?.fullName,
          };

    const sanitizedData = {
      applicantName: typeof dataCandidate.applicantName === 'string' ? dataCandidate.applicantName : undefined,
      applicantTitle: typeof dataCandidate.applicantTitle === 'string' ? dataCandidate.applicantTitle : undefined,
      applicantEmail: typeof dataCandidate.applicantEmail === 'string' ? dataCandidate.applicantEmail : undefined,
      applicantPhone: typeof dataCandidate.applicantPhone === 'string' ? dataCandidate.applicantPhone : undefined,
      applicantLocation: typeof dataCandidate.applicantLocation === 'string' ? dataCandidate.applicantLocation : undefined,
      recipientName: typeof dataCandidate.recipientName === 'string' ? dataCandidate.recipientName : undefined,
      recipientTitle: typeof dataCandidate.recipientTitle === 'string' ? dataCandidate.recipientTitle : undefined,
      companyName: typeof dataCandidate.companyName === 'string' ? dataCandidate.companyName : undefined,
      companyAddress: typeof dataCandidate.companyAddress === 'string' ? dataCandidate.companyAddress : undefined,
      roleTitle: typeof dataCandidate.roleTitle === 'string' ? dataCandidate.roleTitle : undefined,
      dateText: typeof dataCandidate.dateText === 'string' ? dataCandidate.dateText : undefined,
      subjectLine: typeof dataCandidate.subjectLine === 'string' ? dataCandidate.subjectLine : undefined,
      greeting: typeof dataCandidate.greeting === 'string' ? dataCandidate.greeting : undefined,
      letterBody: typeof dataCandidate.letterBody === 'string' ? dataCandidate.letterBody : undefined,
      closingParagraph: typeof dataCandidate.closingParagraph === 'string' ? dataCandidate.closingParagraph : undefined,
      closingLine: typeof dataCandidate.closingLine === 'string' ? dataCandidate.closingLine : undefined,
      signatureName: typeof dataCandidate.signatureName === 'string' ? dataCandidate.signatureName : undefined,
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

export const importCoverLetterFile = async (
  backendUrl: string,
  token: string,
  payload: {
    file: File;
    sourceType: 'cover_letter' | 'resume';
  }
): Promise<{
  ok: boolean;
  sourceType: 'cover_letter' | 'resume';
  data: {
    applicantName?: string;
    applicantTitle?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    applicantLocation?: string;
    recipientName?: string;
    recipientTitle?: string;
    companyName?: string;
    companyAddress?: string;
    roleTitle?: string;
    subjectLine?: string;
    greeting?: string;
    letterBody?: string;
    closingParagraph?: string;
    closingLine?: string;
    signatureName?: string;
    dateText?: string;
  };
  diagnostics?: Record<string, unknown>;
}> => {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('sourceType', payload.sourceType);

  const api = axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  try {
    const res = await api.post('/api/cover-letters/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
