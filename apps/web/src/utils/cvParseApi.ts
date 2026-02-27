import axios from 'axios';

export type ParsedCvResponse = {
  ok: boolean;
  mode?: 'merge' | 'replace';
  extracted: any;
  diagnostics?: { parser?: 'pdf' | 'docx'; pages?: number; warnings?: string[] };
};

export async function parseUploadedCv(args: {
  backendUrl: string;
  token: string;
  file: File;
  mode?: 'merge' | 'replace';
}): Promise<ParsedCvResponse> {
  const form = new FormData();
  form.append('file', args.file);
  form.append('mode', args.mode || 'merge');

  const api = axios.create({
    baseURL: args.backendUrl,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${args.token}`,
    },
  });

  const res = await api.post<ParsedCvResponse>('/api/cv/parse', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}
