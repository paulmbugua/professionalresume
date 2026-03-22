export type CoverLetterStatus = 'draft' | 'ready' | 'archived';

export type CoverLetterBasics = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
};

export type CoverLetterRecipient = {
  name: string;
  title: string;
  company: string;
  addressLine1?: string;
  addressLine2?: string;
};

export type CoverLetterContent = {
  subject: string;
  greeting: string;
  opening: string;
  paragraphs: string[];
  closing: string;
  signature: string;
};

export type CoverLetterDesign = {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  paragraphSpacing?: number;
  textColor?: string;
  mutedTextColor?: string;
  accentColor?: string;
  pageMarginMm?: number;
};

export type CoverLetterMeta = {
  isDemoSeeded?: boolean;
  generatedByAi?: boolean;
  aiModel?: string;
  lastExportedAt?: string;
  tags?: string[];
};

export type CoverLetterDraft = {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  status: CoverLetterStatus;
  updatedAt: string;
  createdAt?: string;
  version?: number;
  basics: CoverLetterBasics;
  recipient: CoverLetterRecipient;
  content: CoverLetterContent;
  design?: CoverLetterDesign;
  meta?: CoverLetterMeta;
};

export type CoverLetterTemplate = {
  id: string;
  name: string;
  category: string;
  componentKey: string;
  description?: string;
  previewImage?: string;
  isAtsFriendly?: boolean;
};

export type CoverLetterExportResponse = {
  url: string | null;
  fileKey: string;
  signedUrl?: string;
  bytes?: number;
  mimeType?: string;
};

export const DEFAULT_COVER_LETTER_BASICS: CoverLetterBasics = {
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  portfolioUrl: '',
  linkedinUrl: '',
};

export const DEFAULT_COVER_LETTER_RECIPIENT: CoverLetterRecipient = {
  name: '',
  title: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
};

export const DEFAULT_COVER_LETTER_CONTENT: CoverLetterContent = {
  subject: '',
  greeting: '',
  opening: '',
  paragraphs: [],
  closing: '',
  signature: '',
};

export const DEFAULT_COVER_LETTER_DESIGN: CoverLetterDesign = {
  fontFamily: 'Inter, system-ui, Arial',
  fontSize: 12,
  lineHeight: 1.5,
  paragraphSpacing: 10,
  textColor: '#0f172a',
  mutedTextColor: '#475569',
  accentColor: '#0f766e',
  pageMarginMm: 14,
};

export const DEFAULT_COVER_LETTER_META: CoverLetterMeta = {
  tags: [],
};

export function normalizeCoverLetterDraft(
  draft: Partial<CoverLetterDraft> = {},
): CoverLetterDraft {
  return {
    id: draft.id ?? '',
    userId: draft.userId ?? '',
    title: draft.title ?? '',
    templateId: draft.templateId ?? '',
    status: draft.status ?? 'draft',
    updatedAt: draft.updatedAt ?? '',
    createdAt: draft.createdAt,
    version: draft.version,
    basics: {
      ...DEFAULT_COVER_LETTER_BASICS,
      ...(draft.basics ?? {}),
    },
    recipient: {
      ...DEFAULT_COVER_LETTER_RECIPIENT,
      ...(draft.recipient ?? {}),
    },
    content: {
      ...DEFAULT_COVER_LETTER_CONTENT,
      ...(draft.content ?? {}),
      paragraphs: draft.content?.paragraphs ?? [],
    },
    design: {
      ...DEFAULT_COVER_LETTER_DESIGN,
      ...(draft.design ?? {}),
    },
    meta: {
      ...DEFAULT_COVER_LETTER_META,
      ...(draft.meta ?? {}),
      tags: draft.meta?.tags ?? [],
    },
  };
}
