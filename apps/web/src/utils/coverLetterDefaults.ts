import type { CoverLetterDraft } from '@cvpro/shared/types';
import { normalizeCoverLetterTemplateId } from '@cvpro/shared/cover-letter/renderers/index.js';

export const EMPTY_COVER_LETTER_DRAFT: CoverLetterDraft = {
  id: '',
  userId: '',
  title: '',
  templateId: 'classic-letter',
  updatedAt: new Date(0).toISOString(),
  sender: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
  },
  recipient: {
    name: '',
    title: '',
    company: '',
    address: '',
  },
  letter: {
    role: '',
    date: '',
    subject: '',
    greeting: 'Dear Hiring Manager,',
    signoff: 'Sincerely,',
  },
  body: {
    opening: '',
    middleParagraphs: [''],
    closing: '',
  },
  style: {
    fontFamily: 'Inter, ui-sans-serif, system-ui',
    fontSize: 15,
    lineHeight: 1.55,
    accentColor: '#2563eb',
    pageTheme: 'light',
  },
};

export const normalizeCoverLetterDraft = (
  raw?: Partial<CoverLetterDraft> | null
): CoverLetterDraft => ({
  ...EMPTY_COVER_LETTER_DRAFT,
  ...(raw || {}),
  templateId: normalizeCoverLetterTemplateId((raw?.templateId as any) || 'classic-letter') as CoverLetterDraft['templateId'],
  sender: {
    ...EMPTY_COVER_LETTER_DRAFT.sender,
    ...(raw?.sender || {}),
  },
  recipient: {
    ...EMPTY_COVER_LETTER_DRAFT.recipient,
    ...(raw?.recipient || {}),
  },
  letter: {
    ...EMPTY_COVER_LETTER_DRAFT.letter,
    ...(raw?.letter || {}),
  },
  body: {
    ...EMPTY_COVER_LETTER_DRAFT.body,
    ...(raw?.body || {}),
    middleParagraphs:
      raw?.body?.middleParagraphs && raw.body.middleParagraphs.length > 0
        ? raw.body.middleParagraphs
        : [''],
  },
  style: {
    ...EMPTY_COVER_LETTER_DRAFT.style,
    ...(raw?.style || {}),
  },
});
