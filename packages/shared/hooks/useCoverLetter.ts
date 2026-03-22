import { useMutation, useQueryClient } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import {
  getCoverLetterDraft,
  updateCoverLetterDraft,
  exportCoverLetterPdf,
} from '@cvpro/shared/api';
import type { CoverLetterDraft, CoverLetterExportResponse } from '@cvpro/shared/types';

type BaseArgs = {
  backendUrl: string;
  token?: string;
};

export function useCoverLetterDraft({ backendUrl, token, id }: BaseArgs & { id?: string }) {
  return useAppQuery<CoverLetterDraft, Error>(
    ['cover-letter-draft', backendUrl, token, id],
    () => {
      if (!token || !id) throw new Error('Unauthorized');
      return getCoverLetterDraft(backendUrl, token, id);
    },
    { enabled: Boolean(backendUrl && token && id) }
  );
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
