import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import {
  listCvTemplates,
  listMyCvDrafts,
  getCvDraft,
  createCvDraft,
  updateCvDraft,
  aiGenerateSummary,
  aiRewriteBullet,
  aiSuggestSkills,
} from '@mytutorapp/shared/api';
import type { CvDraft, CvTemplateResponse } from '@mytutorapp/shared/types';

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

export function useMyCvDrafts({ backendUrl, token }: BaseArgs) {
  return useAppQuery<CvDraft[], Error>(
    ['cv-drafts', backendUrl, token],
    () => {
      if (!token) throw new Error('Unauthorized');
      return listMyCvDrafts(backendUrl, token);
    },
    { enabled: Boolean(backendUrl && token) }
  );
}

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
    mutationFn: (payload: { templateId: string; title?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return createCvDraft(backendUrl, token, payload);
    },
    onSuccess: (draft) => {
      qc.setQueryData(['cv-draft', backendUrl, token, draft.id], draft);
      qc.invalidateQueries({ queryKey: ['cv-drafts', backendUrl, token] });
    },
  });
}

export function useUpdateCvDraft({ backendUrl, token }: BaseArgs) {
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

export function useAiCvAssist({ backendUrl, token }: BaseArgs) {
  const summaryMutation = useMutation({
    mutationFn: (payload: { draft: CvDraft }) => {
      if (!token) throw new Error('Unauthorized');
      return aiGenerateSummary(backendUrl, token, payload);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (payload: { context: string; bullet: string }) => {
      if (!token) throw new Error('Unauthorized');
      return aiRewriteBullet(backendUrl, token, payload);
    },
  });

  const skillsMutation = useMutation({
    mutationFn: (payload: { draft: CvDraft }) => {
      if (!token) throw new Error('Unauthorized');
      return aiSuggestSkills(backendUrl, token, payload);
    },
  });

  return useMemo(
    () => ({
      generateSummary: summaryMutation,
      rewriteBullet: rewriteMutation,
      suggestSkills: skillsMutation,
    }),
    [summaryMutation, rewriteMutation, skillsMutation]
  );
}
