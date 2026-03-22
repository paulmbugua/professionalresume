'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@cvpro/shared/context';
import {
  useCoverLetterDraft,
  useSaveCoverLetterDraft,
  useExportCoverLetter,
} from '@cvpro/shared/hooks';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import CoverLetterEditorShell from '../components/cover-letter/CoverLetterEditorShell';
import { EMPTY_COVER_LETTER_DRAFT, normalizeCoverLetterDraft } from '../utils/coverLetterDefaults';
import { getReturnToFromQuery } from '../lib/returnTo';

function pickParam(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

const CoverLetterBuilderPageInner: React.FC<{ id: string; backendUrl: string; token: string }> = ({
  id,
  backendUrl,
  token,
}) => {
  const { data, isLoading, error } = useCoverLetterDraft({ backendUrl, token, id } as any);
  const updateDraft = useSaveCoverLetterDraft({ backendUrl, token });
  const exportDraft = useExportCoverLetter({ backendUrl, token });

  const [exportUrl, setExportUrl] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();

  const initRef = useRef(true);
  const hydratedDraftIdRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string>('');

  const methods = useForm<CoverLetterDraft>({
    defaultValues: EMPTY_COVER_LETTER_DRAFT,
    mode: 'onChange',
  });
  const { reset, getValues, control } = methods;
  const formValues = useWatch({ control });

  useEffect(() => {
    if (!data) return;
    if (hydratedDraftIdRef.current === id) return;

    hydratedDraftIdRef.current = id;
    const initial = normalizeCoverLetterDraft(data);
    initRef.current = true;
    reset(initial);

    lastSavedSigRef.current = JSON.stringify(initial);
    setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
  }, [data, id, reset]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CoverLetterDraft) => {
        const updated = await updateDraft.mutateAsync({ id, payload: values });
        lastSavedSigRef.current = JSON.stringify(values);
        setLastSavedAt(
          updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
        );
      }, 900),
    [id, updateDraft]
  );

  useEffect(() => {
    if (!formValues) return;

    if (initRef.current) {
      initRef.current = false;
      return;
    }

    const sig = JSON.stringify(formValues);
    if (sig === lastSavedSigRef.current) return;

    debouncedSave(formValues as CoverLetterDraft);
    return () => debouncedSave.cancel();
  }, [formValues, debouncedSave]);

  const handleManualSave = async () => {
    const values = getValues();
    const updated = await updateDraft.mutateAsync({ id, payload: values });
    lastSavedSigRef.current = JSON.stringify(values);
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
  };

  const handleExport = async () => {
    const exported = await exportDraft.mutateAsync({ draftId: id, coverLetterJson: getValues() });
    setExportUrl(exported.signedUrl || exported.url || undefined);
  };

  const copyExportLink = async () => {
    if (!exportUrl) return;
    await navigator.clipboard?.writeText(exportUrl);
  };

  const draft = useMemo(() => {
    const base = ((formValues as CoverLetterDraft) ||
      data ||
      EMPTY_COVER_LETTER_DRAFT) as CoverLetterDraft;
    return normalizeCoverLetterDraft(base);
  }, [formValues, data]);

  const content = isLoading ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500">Loading your draft...</p>
    </div>
  ) : error || !data ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-rose-500">{(error as any)?.message || 'Draft not found.'}</p>
    </div>
  ) : (
    <CoverLetterEditorShell
      draft={draft}
      onSave={handleManualSave}
      onExport={handleExport}
      onCopyExportLink={copyExportLink}
      exportUrl={exportUrl}
      isSaving={updateDraft.isPending}
      isExporting={exportDraft.isPending}
      lastSavedAt={lastSavedAt}
    />
  );

  return <FormProvider {...methods}>{content}</FormProvider>;
};

const CoverLetterBuilderPage: React.FC = () => {
  const params = useParams();
  const id = pickParam((params as any)?.id);
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as any;

  useEffect(() => {
    if (!id) router.replace('/builder');
  }, [id, router]);

  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(
        new URLSearchParams({ returnTo: id ? `/cover-letter/${id}` : '/cover-letter' }),
        '/cover-letter'
      );
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [id, router, token]);

  if (!id) return null;
  if (!token || !backendUrl) return null;

  return <CoverLetterBuilderPageInner id={id} backendUrl={backendUrl} token={token} />;
};

export default CoverLetterBuilderPage;
