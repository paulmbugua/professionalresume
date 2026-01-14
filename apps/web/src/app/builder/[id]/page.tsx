"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvDraft, useUpdateCvDraft } from '@mytutorapp/shared/hooks';
import type { CvDraft } from '@mytutorapp/shared/types';
import { normalizeDraft } from '../../../utils/cvDefaults';
import CvEditorShell from '../../../components/cv/CvEditorShell';

const validateDraft = (draft: CvDraft) => {
  const errors: string[] = [];
  if (!draft.title?.trim()) errors.push('Add a CV title.');
  if (!draft.basics?.name?.trim()) errors.push('Add your full name.');
  const hasExperience = draft.experience?.some((exp) => exp.company?.trim() || exp.role?.trim());
  const hasEducation = draft.education?.some((edu) => edu.school?.trim() || edu.program?.trim());
  if (!hasExperience && !hasEducation) {
    errors.push('Include at least one experience or education entry.');
  }
  return errors;
};

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { backendUrl, token } = useShopContext() as any;
  const { data, isLoading, error } = useCvDraft({ backendUrl, token, id });
  const updateDraft = useUpdateCvDraft({ backendUrl, token });
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const initRef = useRef(true);

  const methods = useForm<CvDraft>({
    defaultValues: data ? normalizeDraft(data) : undefined,
    mode: 'onChange',
  });

  const { reset, getValues, control } = methods;
  const formValues = useWatch({ control });

  useEffect(() => {
    if (data) {
      reset(normalizeDraft(data));
      setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
    }
  }, [data, reset]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CvDraft) => {
        if (!id) return;
        try {
          const updated = await updateDraft.mutateAsync({ id, payload: values });
          setLastSavedAt(
            updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
          );
        } catch (err) {
          console.error('[CvBuilder] autosave failed', err);
        }
      }, 900),
    [id, updateDraft]
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
    try {
      const payload = getValues();
      const updated = await updateDraft.mutateAsync({ id, payload });
      setLastSavedAt(
        updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
      );
    } catch (err) {
      console.error('[CvBuilder] manual save failed', err);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading your draft...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
        <p className="text-sm text-rose-500">{error?.message || 'Draft not found.'}</p>
      </div>
    );
  }

  const draft = formValues ? normalizeDraft(formValues as CvDraft) : normalizeDraft(data);
  const validationErrors = validateDraft(draft);

  return (
    <FormProvider {...methods}>
      <CvEditorShell
        draft={draft}
        validationErrors={validationErrors}
        onSave={handleManualSave}
        isSaving={updateDraft.isPending}
        lastSavedAt={lastSavedAt}
      />
    </FormProvider>
  );
}
