export type CoverLetterContact = {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type CoverLetterTemplateTheme = {
  primary?: string;
  secondary?: string;
  accent?: string;
  textColor?: string;
  mutedTextColor?: string;
};

export type CoverLetterRichTextMap = Record<string, string>;

export type CoverLetterDraft = {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  updatedAt: string;
  createdAt?: string;
  recipient?: CoverLetterContact;
  sender?: CoverLetterContact;
  subject?: string;
  opening?: string;
  body?: string;
  closing?: string;
  signature?: string;
  highlights?: string[];
  tone?: string;
  richText?: CoverLetterRichTextMap;
  templateTheme?: CoverLetterTemplateTheme;
};

export type CoverLetterTemplate = {
  id: string;
  name: string;
  category: string;
  previewImage?: string;
  componentKey: string;
  description?: string;
};

export type CoverLetterTemplateResponse = {
  templates: CoverLetterTemplate[];
  source?: 'db' | 'local';
  fallback?: boolean;
};

export type CoverLetterExportResponse = {
  url: string | null;
  fileKey: string;
  signedUrl?: string;
  bytes?: number;
  mimeType?: string;
};

export type CoverLetterGeneratePayload = {
  draft: CoverLetterDraft;
  jobDescription?: string;
};

export type CoverLetterRewritePayload = {
  text: string;
  instruction?: string;
  tone?: string;
};
