'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvDraft, useSaveCvDraft, useExportCv } from '@mytutorapp/shared/hooks';
import type { CvDraft } from '@mytutorapp/shared/types';
import { normalizeDraft } from '../utils/cvDefaults';
import CvEditorShell from '../components/cv/CvEditorShell';
import { getReturnToFromQuery } from '../lib/returnTo';

const validateDraft = (draft: CvDraft) => {
  const errors: string[] = [];
  if (!draft.title?.trim()) errors.push('Add a CV title.');
  if (!draft.basics?.name?.trim()) errors.push('Add your full name.');
  const hasExperience = draft.experience?.some((exp) => exp.company?.trim() || exp.role?.trim());
  const hasEducation = draft.education?.some((edu) => edu.school?.trim() || edu.program?.trim());
  if (!hasExperience && !hasEducation) errors.push('Include at least one experience or education entry.');
  return errors;
};

const CvBuilderPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as any;

  React.useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(new URLSearchParams({ returnTo: `/builder/${id}` }), '/builder');
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [id, router, token]);

  const { data, isLoading, error } = useCvDraft({ backendUrl, token, id });
  const updateDraft = useSaveCvDraft({ backendUrl, token });
  const exportCv = useExportCv({ backendUrl, token });
  const [exportUrl, setExportUrl] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const initRef = useRef(true);

  const methods = useForm<CvDraft>({ defaultValues: data ? normalizeDraft(data) : undefined, mode: 'onChange' });
  const { reset, getValues, control } = methods;
  const formValues = useWatch({ control });

  useEffect(() => {
    if (data) {
      reset(normalizeDraft(data));
      setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
    }
  }, [data, reset]);

  const debouncedSave = useMemo(
    () => debounce(async (values: CvDraft) => {
      if (!id) return;
      const updated = await updateDraft.mutateAsync({ id, payload: values });
      setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
    }, 900),
    [id, updateDraft],
  );

  useEffect(() => {
    if (!formValues || !id) return;
    if (initRef.current) {
      initRef.current = false;
      return;
    }
    debouncedSave(formValues as CvDraft);
    return () => debouncedSave.cancel();
  }, [formValues, id, debouncedSave]);

  const handleManualSave = async () => {
    if (!id) return;
    const updated = await updateDraft.mutateAsync({ id, payload: getValues() });
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
  };

  const handleExport = async () => {
    if (!id) return;
    const exported = await exportCv.mutateAsync({ draftId: id, cvJson: getValues() });
    setExportUrl(exported.signedUrl || exported.url || undefined);
  };

  const copyExportLink = async () => {
    if (!exportUrl) return;
    await navigator.clipboard?.writeText(exportUrl);
  };

  if (isLoading) return <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center"><p className="text-sm text-gray-500">Loading your draft...</p></div>;
  if (error || !data) return <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center"><p className="text-sm text-rose-500">{error?.message || 'Draft not found.'}</p></div>;

  const draft = formValues ? normalizeDraft(formValues as CvDraft) : normalizeDraft(data);
  const validationErrors = validateDraft(draft);

  return (
    <FormProvider {...methods}>
      <CvEditorShell
        draft={draft}
        validationErrors={validationErrors}
        onSave={handleManualSave}
        onExport={handleExport}
        onCopyExportLink={copyExportLink}
        exportUrl={exportUrl}
        isSaving={updateDraft.isPending}
        isExporting={exportCv.isPending}
        lastSavedAt={lastSavedAt}
      />
    </FormProvider>
  );
};

export default CvBuilderPage;
