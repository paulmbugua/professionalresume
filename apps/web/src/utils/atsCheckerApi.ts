import axios from 'axios';

export type AtsPriority = 'high' | 'medium' | 'low';

export type AtsCategory = {
  id: string;
  label: string;
  score: number;
  max: number;
  notes: string[];
};

export type AtsReport = {
  score: number;
  verdict: string;
  summary: string;
  categories: AtsCategory[];
  sections: Record<string, boolean>;
  contact: Record<string, boolean>;
  keywordMatch: {
    compared: boolean;
    matchRate: number | null;
    matched: string[];
    missing: string[];
    keywords: string[];
  };
  recommendations: Array<{
    priority: AtsPriority;
    title: string;
    detail: string;
  }>;
  document: {
    wordCount: number;
    characterCount: number;
    parser?: string;
    extractionUsed?: string;
    warnings?: string[];
  };
  nextActions: string[];
};

export type AtsCheckResponse = {
  ok: boolean;
  report: AtsReport;
};

const normalizeToken = (token?: string | null): string | undefined => {
  const next = String(token || '').trim();
  if (!next) return undefined;
  const lowered = next.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return undefined;
  return next;
};

export async function analyzeAtsResume(args: {
  backendUrl: string;
  token?: string | null;
  file?: File | null;
  resumeText?: string;
  jobDescription?: string;
  targetRole?: string;
}): Promise<AtsReport> {
  const safeToken = normalizeToken(args.token);
  const form = new FormData();

  if (args.file) form.append('file', args.file);
  form.append('resumeText', args.resumeText || '');
  form.append('jobDescription', args.jobDescription || '');
  form.append('targetRole', args.targetRole || '');

  const api = axios.create({
    baseURL: args.backendUrl,
    withCredentials: true,
    headers: safeToken ? { Authorization: `Bearer ${safeToken}` } : undefined,
  });

  const res = await api.post<AtsCheckResponse>('/api/ats/check', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.report;
}
