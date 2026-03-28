import type { CoverLetterDraft } from '@cvpro/shared/types';
import {
  normalizeCoverLetterTemplateId,
  normalizeCoverLetterRenderModel,
} from '@cvpro/shared/cover-letter/renderers/index.js';

export const EMPTY_COVER_LETTER_DRAFT: CoverLetterDraft = {
  id: '',
  userId: '',
  title: '',
  templateId: 'classic-letter',
  updatedAt: new Date(0).toISOString(),
  sender: {
    fullName: '',
    title: '',
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
): CoverLetterDraft => {
  const legacyDesign =
    (raw as { design?: Partial<CoverLetterDraft['style']> } | null | undefined)?.design || {};
  const normalized = normalizeCoverLetterRenderModel((raw || {}) as Record<string, unknown>);
  const styleCandidate = {
    ...EMPTY_COVER_LETTER_DRAFT.style,
    ...(raw?.style || {}),
    ...legacyDesign,
    ...normalized.style,
  };

  const normalizedStyle: CoverLetterDraft['style'] = {
    fontFamily: styleCandidate.fontFamily,
    fontSize:
      typeof styleCandidate.fontSize === 'number'
        ? styleCandidate.fontSize
        : EMPTY_COVER_LETTER_DRAFT.style.fontSize,
    lineHeight:
      typeof styleCandidate.lineHeight === 'number'
        ? styleCandidate.lineHeight
        : EMPTY_COVER_LETTER_DRAFT.style.lineHeight,
    accentColor: styleCandidate.accentColor,
    pageTheme: styleCandidate.pageTheme === 'warm' ? 'warm' : 'light',
  };

  return {
    ...EMPTY_COVER_LETTER_DRAFT,
    ...(raw || {}),
    templateId: normalizeCoverLetterTemplateId((raw?.templateId as any) || normalized.templateId) as CoverLetterDraft['templateId'],
    sender: {
      ...EMPTY_COVER_LETTER_DRAFT.sender,
      ...(raw?.sender || {}),
      fullName: normalized.content.applicantName,
      title: (normalized.content as any).applicantTitle || '',
      email: normalized.content.applicantEmail,
      phone: normalized.content.applicantPhone,
      location: normalized.content.applicantLocation,
    },
    recipient: {
      ...EMPTY_COVER_LETTER_DRAFT.recipient,
      ...(raw?.recipient || {}),
      name: normalized.content.recipientName,
      title: normalized.content.recipientTitle,
      company: normalized.content.companyName,
      address: normalized.content.companyAddress,
    },
    letter: {
      ...EMPTY_COVER_LETTER_DRAFT.letter,
      ...(raw?.letter || {}),
      role: normalized.content.roleTitle,
      date: normalized.content.dateText || normalized.content.date,
      subject: normalized.content.subjectLine || normalized.content.subject,
      greeting: normalized.content.greeting,
      signoff: normalized.content.closingLine,
    },
    body: {
      ...EMPTY_COVER_LETTER_DRAFT.body,
      ...(raw?.body || {}),
      opening: normalized.content.opening,
      middleParagraphs: normalized.content.paragraphs.length ? normalized.content.paragraphs : [''],
      closing: normalized.content.closingParagraph,
    },
    style: {
      ...normalizedStyle,
    },
  };
};
