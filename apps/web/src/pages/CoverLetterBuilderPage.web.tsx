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

function mapEditorDraftToUpdatePayload(values: CoverLetterDraft): {
  title?: string;
  templateKey?: string;
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
} {
  const normalized = normalizeCoverLetterDraft(values);
  return {
    title: normalized.title,
    templateKey: normalized.templateId,
    data: {
      applicantName: normalized.sender.fullName,
      applicantEmail: normalized.sender.email,
      applicantPhone: normalized.sender.phone,
      applicantLocation: normalized.sender.location,
      recipientName: normalized.recipient.name,
      companyName: normalized.recipient.company,
      roleTitle: normalized.letter.role,
      letterBody: [
        normalized.letter.greeting,
        normalized.body.opening,
        ...normalized.body.middleParagraphs,
        normalized.body.closing,
      ]
        .filter(Boolean)
        .join('\n\n'),
      closingLine: normalized.letter.signoff,
    },
  };
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
  const lastValidationFailedSigRef = useRef<string>('');

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
    lastValidationFailedSigRef.current = '';
    setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
  }, [data, id, reset]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CoverLetterDraft) => {
        const payload = mapEditorDraftToUpdatePayload(values);
        const payloadSig = JSON.stringify(payload);

        if (payloadSig === lastValidationFailedSigRef.current) return;

        try {
          const updated = await updateDraft.mutateAsync({ id, payload });
          lastSavedSigRef.current = payloadSig;
          lastValidationFailedSigRef.current = '';
          setLastSavedAt(
            updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
          );
        } catch (err: any) {
          if (String(err?.message || '').includes('not allowed')) {
            lastValidationFailedSigRef.current = payloadSig;
          }
          throw err;
        }
      }, 900),
    [id, updateDraft]
  );

  useEffect(() => {
    if (!formValues) return;

    if (initRef.current) {
      initRef.current = false;
      return;
    }

    const sig = JSON.stringify(mapEditorDraftToUpdatePayload(formValues as CoverLetterDraft));
    if (sig === lastSavedSigRef.current) return;

    debouncedSave(formValues as CoverLetterDraft);
    return () => debouncedSave.cancel();
  }, [formValues, debouncedSave]);

  const handleManualSave = async () => {
    const values = getValues();
    const payload = mapEditorDraftToUpdatePayload(values);
    const updated = await updateDraft.mutateAsync({ id, payload });
    lastSavedSigRef.current = JSON.stringify(payload);
    lastValidationFailedSigRef.current = '';
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
  };

  const handleExport = async () => {
    const values = normalizeCoverLetterDraft(getValues());
    const exported = await exportDraft.mutateAsync({
      draftId: id,
      coverLetterJson: {
        applicantName: values.sender.fullName,
        applicantEmail: values.sender.email,
        applicantPhone: values.sender.phone,
        applicantLocation: values.sender.location,
        recipientName: values.recipient.name,
        companyName: values.recipient.company,
        roleTitle: values.letter.role,
        letterBody: [
          values.letter.greeting,
          values.body.opening,
          ...values.body.middleParagraphs,
          values.body.closing,
        ]
          .filter(Boolean)
          .join('\n\n'),
        closingLine: values.letter.signoff,
      },
    });
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
    if (!id) router.replace('/cover-letters');
  }, [id, router]);

  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(
        new URLSearchParams({ returnTo: id ? `/cover-letters/editor/${id}` : '/cover-letters' }),
        '/cover-letters'
      );
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [id, router, token]);

  if (!id) return null;
  if (!token || !backendUrl) return null;

  return <CoverLetterBuilderPageInner id={id} backendUrl={backendUrl} token={token} />;
};

export default CoverLetterBuilderPage;
