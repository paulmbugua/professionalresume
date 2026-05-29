import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import {
  listCvTemplates,
  listMyCvDrafts,
  getCvDraft,
  createCvDraft,
  updateCvDraft,
  deleteCvDraft,
  exportCvPdf,
  getCoverLetterEntitlement,
  aiGenerateSummary,
  aiJobRequirementAssist,
  aiRewriteBullet,
  aiSuggestSkills,
  aiGenerateLegacyCoverLetter,
  aiRewriteCoverLetterStyle,
  aiImproveCoverLetterParagraph,
  aiSuggestCoverLetterSubjectLines,
  aiSuggestCoverLetterGreetingClosing,
} from '@cvpro/shared/api';
import type {
  CvDraft,
  CvTemplateResponse,
  CvExportResponse,
  CoverLetterEntitlement,
} from '@cvpro/shared/types';

type BaseArgs = {
  backendUrl: string;
  token?: string;
};

export function useCvTemplates({ backendUrl }: Pick<BaseArgs, 'backendUrl'>) {
  return useAppQuery<CvTemplateResponse, Error>(
    ['cv-templates', backendUrl],
    () => listCvTemplates(backendUrl),
    { enabled: Boolean(backendUrl) }
  );
}

export function useCvDrafts({ backendUrl, token }: BaseArgs) {
  return useAppQuery<CvDraft[], Error>(
    ['cv-drafts', backendUrl, token],
    () => {
      if (!token) throw new Error('Unauthorized');
      return listMyCvDrafts(backendUrl, token);
    },
    { enabled: Boolean(backendUrl && token) }
  );
}

export const useMyCvDrafts = useCvDrafts;

export function useCvDraft({ backendUrl, token, id }: BaseArgs & { id?: string }) {
  return useAppQuery<CvDraft, Error>(
    ['cv-draft', backendUrl, token, id],
    () => {
      if (!token || !id) throw new Error('Unauthorized');
      return getCvDraft(backendUrl, token, id);
    },
    { enabled: Boolean(backendUrl && token && id) }
  );
}

export function useCreateCvDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { templateId: string; title?: string; data?: Partial<CvDraft>; clientDraftId?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return createCvDraft(backendUrl, token, payload);
    },
    onSuccess: (draft) => {
      qc.setQueryData(['cv-draft', backendUrl, token, draft.id], draft);
      qc.invalidateQueries({ queryKey: ['cv-drafts', backendUrl, token] });
    },
  });
}

export function useSaveCvDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CvDraft> }) => {
      if (!token) throw new Error('Unauthorized');
      return updateCvDraft(backendUrl, token, id, payload);
    },
    onSuccess: (draft) => {
      qc.setQueryData(['cv-draft', backendUrl, token, draft.id], draft);
      qc.invalidateQueries({ queryKey: ['cv-drafts', backendUrl, token] });
    },
  });
}

export const useUpdateCvDraft = useSaveCvDraft;

export function useDeleteCvDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Unauthorized');
      await deleteCvDraft(backendUrl, token, id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cv-drafts', backendUrl, token] });
    },
  });
}

export function useExportCv({ backendUrl, token }: BaseArgs) {
  return useMutation<CvExportResponse, Error, { draftId?: string; cvJson?: Partial<CvDraft> }>({
    mutationFn: (payload) => {
      if (!token) throw new Error('Unauthorized');
      return exportCvPdf(backendUrl, token, payload);
    },
  });
}

export function useAiCvAssist({ backendUrl, token }: BaseArgs) {
  const summaryMutation = useMutation({
    mutationFn: (payload: { draft: CvDraft }) => {
      return aiGenerateSummary(backendUrl, token, payload);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (payload: { context: string; bullet: string }) => {
      return aiRewriteBullet(backendUrl, token, payload);
    },
  });

  const skillsMutation = useMutation({
    mutationFn: (payload: { draft: CvDraft }) => {
      return aiSuggestSkills(backendUrl, token, payload);
    },
  });

  const jobRequirementAssistMutation = useMutation({
    mutationFn: (payload: { draft: CvDraft; jobAdvertText: string; regenerate?: boolean }) => {
      return aiJobRequirementAssist(backendUrl, token, payload);
    },
  });

  const generateCoverLetterMutation = useMutation({
    mutationFn: (payload: {
      jobTitle: string;
      company: string;
      experience: string;
      tone: string;
      seniority: string;
    }) => {
      if (!token) throw new Error('Unauthorized');
      return aiGenerateLegacyCoverLetter(backendUrl, token, payload);
    },
  });

  const rewriteCoverLetterStyleMutation = useMutation({
    mutationFn: (payload: {
      body: string;
      style: 'professional' | 'concise' | 'confident' | 'ats-friendly';
    }) => {
      if (!token) throw new Error('Unauthorized');
      return aiRewriteCoverLetterStyle(backendUrl, token, payload);
    },
  });

  const improveCoverLetterParagraphMutation = useMutation({
    mutationFn: (payload: { paragraph: string; context?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return aiImproveCoverLetterParagraph(backendUrl, token, payload);
    },
  });

  const suggestCoverLetterSubjectLinesMutation = useMutation({
    mutationFn: (payload: { body: string; jobTitle?: string; company?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return aiSuggestCoverLetterSubjectLines(backendUrl, token, payload);
    },
  });

  const suggestCoverLetterGreetingClosingMutation = useMutation({
    mutationFn: (payload: { body: string; jobTitle?: string; company?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return aiSuggestCoverLetterGreetingClosing(backendUrl, token, payload);
    },
  });

  return useMemo(
    () => ({
      generateSummary: summaryMutation,
      rewriteBullet: rewriteMutation,
      suggestSkills: skillsMutation,
      jobRequirementAssist: jobRequirementAssistMutation,
      generateCoverLetter: generateCoverLetterMutation,
      rewriteCoverLetterStyle: rewriteCoverLetterStyleMutation,
      improveCoverLetterParagraph: improveCoverLetterParagraphMutation,
      suggestCoverLetterSubjectLines: suggestCoverLetterSubjectLinesMutation,
      suggestCoverLetterGreetingClosing: suggestCoverLetterGreetingClosingMutation,
    }),
    [
      summaryMutation,
      rewriteMutation,
      skillsMutation,
      jobRequirementAssistMutation,
      generateCoverLetterMutation,
      rewriteCoverLetterStyleMutation,
      improveCoverLetterParagraphMutation,
      suggestCoverLetterSubjectLinesMutation,
      suggestCoverLetterGreetingClosingMutation,
    ]
  );
}

export function useCoverLetterEntitlement({ backendUrl, token }: BaseArgs) {
  return useAppQuery<CoverLetterEntitlement, Error>(
    ['cover-letter-entitlement', backendUrl, token],
    () => {
      if (!token) throw new Error('Unauthorized');
      return getCoverLetterEntitlement(backendUrl, token);
    },
    { enabled: Boolean(backendUrl && token) }
  );
}
