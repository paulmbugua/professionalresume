import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import {
  listCoverLetterTemplates,
  listMyCoverLetterDrafts,
  getCoverLetterDraft,
  createCoverLetterDraft,
  updateCoverLetterDraft,
  deleteCoverLetterDraft,
  exportCoverLetterPdf,
  aiGenerateCoverLetter,
  aiRewriteCoverLetter,
} from '@cvpro/shared/api';
import type {
  CoverLetterDraft,
  CoverLetterTemplateResponse,
  CoverLetterExportResponse,
  CoverLetterGeneratePayload,
  CoverLetterRewritePayload,
} from '@cvpro/shared/types';

type BaseArgs = {
  backendUrl: string;
  token?: string;
};

export function useCoverLetterTemplates({ backendUrl }: Pick<BaseArgs, 'backendUrl'>) {
  return useAppQuery<CoverLetterTemplateResponse, Error>(
    ['cover-letter-templates', backendUrl],
    () => listCoverLetterTemplates(backendUrl),
    { enabled: Boolean(backendUrl) },
  );
}

export function useCoverLetterDrafts({ backendUrl, token }: BaseArgs) {
  return useAppQuery<CoverLetterDraft[], Error>(
    ['cover-letter-drafts', backendUrl, token],
    () => {
      if (!token) throw new Error('Unauthorized');
      return listMyCoverLetterDrafts(backendUrl, token);
    },
    { enabled: Boolean(backendUrl && token) },
  );
}

export const useMyCoverLetterDrafts = useCoverLetterDrafts;

export function useCoverLetterDraft({ backendUrl, token, id }: BaseArgs & { id?: string }) {
  return useAppQuery<CoverLetterDraft, Error>(
    ['cover-letter-draft', backendUrl, token, id],
    () => {
      if (!token || !id) throw new Error('Unauthorized');
      return getCoverLetterDraft(backendUrl, token, id);
    },
    { enabled: Boolean(backendUrl && token && id) },
  );
}

export function useCreateCoverLetterDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      templateKey: string;
      title?: string;
      data?: {
        applicantName?: string;
        applicantEmail?: string;
        applicantPhone?: string;
        applicantLocation?: string;
        recipientName?: string;
        companyName?: string;
        roleTitle?: string;
        letterBody?: string;
        closingLine?: string;
      };
    }) => {
      if (!token) throw new Error('Unauthorized');
      return createCoverLetterDraft(backendUrl, token, payload);
    },
    onSuccess: (draft) => {
      qc.setQueryData(['cover-letter-draft', backendUrl, token, draft.id], draft);
      qc.invalidateQueries({ queryKey: ['cover-letter-drafts', backendUrl, token] });
    },
  });
}

export function useSaveCoverLetterDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CoverLetterDraft> }) => {
      if (!token) throw new Error('Unauthorized');
      return updateCoverLetterDraft(backendUrl, token, id, payload);
    },
    onSuccess: (draft) => {
      qc.setQueryData(['cover-letter-draft', backendUrl, token, draft.id], draft);
      qc.invalidateQueries({ queryKey: ['cover-letter-drafts', backendUrl, token] });
    },
  });
}

export const useUpdateCoverLetterDraft = useSaveCoverLetterDraft;

export function useDeleteCoverLetterDraft({ backendUrl, token }: BaseArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error('Unauthorized');
      await deleteCoverLetterDraft(backendUrl, token, id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cover-letter-drafts', backendUrl, token] });
    },
  });
}

export function useExportCoverLetter({ backendUrl, token }: BaseArgs) {
  return useMutation<
    CoverLetterExportResponse,
    Error,
    { draftId?: string; coverLetterJson?: Partial<CoverLetterDraft> }
  >({
    mutationFn: (payload) => {
      if (!token) throw new Error('Unauthorized');
      return exportCoverLetterPdf(backendUrl, token, payload);
    },
  });
}

export function useAiCoverLetterAssist({ backendUrl, token }: BaseArgs) {
  const generateMutation = useMutation({
    mutationFn: (payload: CoverLetterGeneratePayload) => {
      if (!token) throw new Error('Unauthorized');
      return aiGenerateCoverLetter(backendUrl, token, payload);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (payload: CoverLetterRewritePayload) => {
      if (!token) throw new Error('Unauthorized');
      return aiRewriteCoverLetter(backendUrl, token, payload);
    },
  });

  return useMemo(
    () => ({
      generateCoverLetter: generateMutation,
      rewriteCoverLetter: rewriteMutation,
    }),
    [generateMutation, rewriteMutation],
  );
}
