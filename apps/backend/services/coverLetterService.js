import { normalizeCoverLetterTemplateId } from '../../../packages/shared/cover-letter/renderers/index.js';
import {
  createOwnedDraft,
  listOwnedDrafts,
  getOwnedDraft,
  updateOwnedDraft,
  softDeleteOwnedDraft,
} from './userOwnedDraftsService.js';

export function buildDefaultCoverLetter({ userId, templateId, title }) {
  return {
    userId: String(userId),
    title: title?.trim() || 'Untitled Cover Letter',
    templateId: normalizeCoverLetterTemplateId(templateId || 'classic-letter'),
    basics: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      companyName: '',
      hiringManager: '',
      jobTitle: '',
      date: '',
    },
    content: {
      opening: '',
      body: [],
      closing: '',
      signature: '',
      highlights: [],
    },
    design: {
      tone: 'professional',
      fontFamily: 'Inter, system-ui, Arial',
      fontSize: 12,
      lineHeight: 1.5,
      textColor: '#0f172a',
      accentColor: '#0f766e',
      paragraphSpacing: 12,
      margins: { top: 32, right: 32, bottom: 32, left: 32 },
    },
    sectionVisibility: {
      header: true,
      opening: true,
      body: true,
      closing: true,
      signature: true,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function createCoverLetterForUser(userId, payload) {
  const normalizedTemplateId = normalizeCoverLetterTemplateId(payload.templateId || 'classic-letter');

  const normalized = payload.data
    ? { ...payload.data, templateId: normalizeCoverLetterTemplateId(payload.data.templateId || normalizedTemplateId) }
    : buildDefaultCoverLetter({
        userId,
        templateId: normalizedTemplateId,
        title: payload.title,
      });

  return createOwnedDraft({
    table: 'cover_letter_drafts',
    userId,
    title: payload.title?.trim() || 'Untitled Cover Letter',
    templateId: normalizedTemplateId,
    data: normalized,
  });
}

export async function listCoverLettersForUser(userId) {
  return listOwnedDrafts({ table: 'cover_letter_drafts', userId });
}

export async function getCoverLetterForUser(userId, draftId) {
  return getOwnedDraft({ table: 'cover_letter_drafts', userId, draftId });
}

export async function updateCoverLetterForUser(userId, draftId, patch) {
  const safePatch = {
    ...patch,
    ...(patch.templateId ? { templateId: normalizeCoverLetterTemplateId(patch.templateId) } : {}),
  };

  return updateOwnedDraft({
    table: 'cover_letter_drafts',
    userId,
    draftId,
    patch: safePatch,
    titleFallback: 'Untitled Cover Letter',
    nestedKeys: ['basics', 'content', 'design', 'sectionVisibility'],
    loadDraft: getCoverLetterForUser,
  });
}

export async function deleteCoverLetterForUser(userId, draftId) {
  return softDeleteOwnedDraft({ table: 'cover_letter_drafts', userId, draftId });
}
