'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@cvpro/shared/context';
import { useCvDraft, useSaveCvDraft, useExportCv } from '@cvpro/shared/hooks';
import type { CvDraft } from '@cvpro/shared/types';
import { normalizeDraft } from '../utils/cvDefaults';
import CvEditorShell from '../components/cv/CvEditorShell';
import { getReturnToFromQuery } from '../lib/returnTo';

const EMPTY_DRAFT: CvDraft = normalizeDraft({
  id: '',
  userId: '',
  title: '',
  templateId: 'ats-minimal',
  updatedAt: new Date(0).toISOString(),
  basics: { name: '', headline: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  extras: { languages: [], interests: [] },
  sectionOrder: [],
  sectionVisibility: {} as any,
} as CvDraft);

const validateDraft = (draft: CvDraft) => {
  const errors: string[] = [];
  if (!draft.title?.trim()) errors.push('Add a CV title.');
  if (!draft.basics?.name?.trim()) errors.push('Add your full name.');
  const hasExperience = draft.experience?.some((exp) => exp.company?.trim() || exp.role?.trim());
  const hasEducation = draft.education?.some((edu) => edu.school?.trim() || edu.program?.trim());
  if (!hasExperience && !hasEducation)
    errors.push('Include at least one experience or education entry.');
  return errors;
};

function pickParam(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

const CvBuilderPageInner: React.FC<{
  id: string;
  backendUrl: string;
  token: string;
  forcedTemplateId?: string;
}> = ({ id, backendUrl, token, forcedTemplateId }) => {
  const { data, isLoading, error } = useCvDraft({ backendUrl, token, id } as any);
  const updateDraft = useSaveCvDraft({ backendUrl, token });
  const exportCv = useExportCv({ backendUrl, token });

  const [exportUrl, setExportUrl] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();

  const initRef = useRef(true);
  const hydratedDraftIdRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string>('');

  const methods = useForm<CvDraft>({ defaultValues: EMPTY_DRAFT, mode: 'onChange' });
  const { reset, getValues, control, setValue } = methods;
  const formValues = useWatch({ control });
  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (!isDev || !formValues) return;
    const watched = formValues as CvDraft;
    console.log('[builder] formValues changed', {
      name: watched?.basics?.name,
      title: watched?.title,
      templateId: watched?.templateId,
    });
  }, [formValues, isDev]);

  // hydrate once per id
  useEffect(() => {
    if (!data) return;
    if (hydratedDraftIdRef.current === id) return;

    hydratedDraftIdRef.current = id;

    const initial = normalizeDraft(data);
    initRef.current = true;
    reset(initial);

    lastSavedSigRef.current = JSON.stringify(initial);
    setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
  }, [data, id, reset]);

  useEffect(() => {
    if (!forcedTemplateId) return;
    const current = getValues('templateId');
    if (current === forcedTemplateId) return;
    setValue('templateId', forcedTemplateId as any, { shouldDirty: true, shouldTouch: false });
  }, [forcedTemplateId, getValues, setValue]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CvDraft) => {
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

    debouncedSave(formValues as CvDraft);
    return () => debouncedSave.cancel();
  }, [formValues, debouncedSave]);

  const handleManualSave = async () => {
    const values = getValues();
    const updated = await updateDraft.mutateAsync({ id, payload: values });
    lastSavedSigRef.current = JSON.stringify(values);
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
  };

  const handleExport = async () => {
    debouncedSave.cancel();
    const values = getValues();
    const updated = await updateDraft.mutateAsync({ id, payload: values });
    lastSavedSigRef.current = JSON.stringify(values);
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);

    const exported = await exportCv.mutateAsync({ draftId: id });
    setExportUrl(exported.signedUrl || exported.url || undefined);
  };

  const copyExportLink = async () => {
    if (!exportUrl) return;
    await navigator.clipboard?.writeText(exportUrl);
  };

  const draft = useMemo(() => {
    const base = ((formValues as CvDraft) || data || EMPTY_DRAFT) as CvDraft;
    return normalizeDraft(base);
  }, [formValues, data]);

  const validationErrors = validateDraft(draft);

  const content = isLoading ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500">Loading your draft...</p>
    </div>
  ) : error || !data ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-rose-500">{(error as any)?.message || 'Draft not found.'}</p>
    </div>
  ) : (
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
  );

  return <FormProvider {...methods}>{content}</FormProvider>;
};

const CvBuilderPage: React.FC = () => {
  const params = useParams();
  const id = pickParam((params as any)?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const forcedTemplateId = searchParams?.get('templateId') ?? undefined;

  // If route param missing → go to /builder (notFound-safe)
  useEffect(() => {
    if (!id) router.replace('/builder');
  }, [id, router]);

  // Redirect guests to login
  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(
        new URLSearchParams({ returnTo: id ? `/builder/${id}` : '/builder' }),
        '/builder'
      );
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [id, router, token]);

  if (!id) return null;
  if (!token || !backendUrl) return null;

  // ✅ only mount the part that calls useCvDraft when we actually can fetch
  return (
    <CvBuilderPageInner
      id={id}
      backendUrl={backendUrl}
      token={token}
      forcedTemplateId={forcedTemplateId}
    />
  );
};

export default CvBuilderPage;
