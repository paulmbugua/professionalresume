import axios from 'axios';

export type ParsedCvResponse = {
  ok: boolean;
  mode?: 'merge' | 'replace';
  extracted: any;
  diagnostics?: {
    parser?: 'pdf' | 'docx';
    pages?: number;
    warnings?: string[];
    confidence?: number;
    usedAiRefinement?: boolean;
  };
};

const normalizeToken = (token?: string): string | undefined => {
  const next = String(token || '').trim();
  if (!next) return undefined;
  const lowered = next.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return undefined;
  return next;
};

export async function parseUploadedCv(args: {
  backendUrl: string;
  token?: string;
  file: File;
  mode?: 'merge' | 'replace';
}): Promise<ParsedCvResponse> {
  const safeToken = normalizeToken(args.token);
  const form = new FormData();
  form.append('file', args.file);
  form.append('mode', args.mode || 'merge');

  const api = axios.create({
    baseURL: args.backendUrl,
    withCredentials: true,
    headers: safeToken
      ? {
          Authorization: `Bearer ${safeToken}`,
        }
      : undefined,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info('[cv-parse] upload-start', {
      backendUrl: args.backendUrl,
      hasToken: Boolean(safeToken),
      mode: args.mode || 'merge',
      fileName: args.file?.name,
      fileType: args.file?.type,
      fileSize: args.file?.size,
    });
  }

  try {
    const res = await api.post<ParsedCvResponse>('/api/cv/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[cv-parse] upload-failed', {
        backendUrl: args.backendUrl,
        status: err?.response?.status,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Request failed',
      });
    }
    throw err;
  }
}
