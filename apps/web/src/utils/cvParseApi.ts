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

export async function parseUploadedCv(args: {
  backendUrl: string;
  token?: string;
  file: File;
  mode?: 'merge' | 'replace';
}): Promise<ParsedCvResponse> {
  const form = new FormData();
  form.append('file', args.file);
  form.append('mode', args.mode || 'merge');

  const api = axios.create({
    baseURL: args.backendUrl,
    withCredentials: true,
    headers: args.token
      ? {
          Authorization: `Bearer ${args.token}`,
        }
      : undefined,
  });

  const res = await api.post<ParsedCvResponse>('/api/cv/parse', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}
