'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { GetServerSideProps } from 'next';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@cvpro/shared/context';
import { toCoverLetterExportJson } from '@cvpro/shared/api';
import {
  useCoverLetterDraft,
  useSaveCoverLetterDraft,
  useExportCoverLetter,
  useCvPayment,
  useImportCoverLetterFile,
} from '@cvpro/shared/hooks';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import CoverLetterEditorShell from '../components/cover-letter/CoverLetterEditorShell';
import CvPaymentModal from '../components/cv/CvPaymentModal';
import { MPESA_KES_AMOUNT, PAYSTACK_KES_AMOUNT } from '../lib/cvPaymentPricing';
import { EMPTY_COVER_LETTER_DRAFT, normalizeCoverLetterDraft } from '../utils/coverLetterDefaults';
import { getReturnToFromQuery } from '../lib/returnTo';
import {
  trackBeginCheckout,
  trackCoverLetterDownload,
  trackUploadCvCompleted,
  trackUploadCvStarted,
} from '../lib/analytics/events';
import { trackTikTokPurchase } from '../lib/tiktokPixel';

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
    applicantTitle?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    applicantLocation?: string;
    recipientName?: string;
    recipientTitle?: string;
    companyName?: string;
    companyAddress?: string;
    roleTitle?: string;
    dateText?: string;
    subjectLine?: string;
    greeting?: string;
    letterBody?: string;
    closingParagraph?: string;
    closingLine?: string;
    signatureName?: string;
  };
  style?: {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    accentColor?: string;
    pageTheme?: CoverLetterDraft['style']['pageTheme'];
  };
} {
  const normalized = normalizeCoverLetterDraft(values);
  return {
    title: normalized.title,
    templateKey: normalized.templateId,
    data: {
      applicantName: normalized.sender.fullName,
      applicantTitle: normalized.sender.title || '',
      applicantEmail: normalized.sender.email,
      applicantPhone: normalized.sender.phone,
      applicantLocation: normalized.sender.location,
      recipientName: normalized.recipient.name,
      recipientTitle: normalized.recipient.title,
      companyName: normalized.recipient.company,
      companyAddress: normalized.recipient.address,
      roleTitle: normalized.letter.role,
      dateText: normalized.letter.date,
      subjectLine: normalized.letter.subject,
      greeting: normalized.letter.greeting,
      letterBody: [normalized.body.opening, ...normalized.body.middleParagraphs]
        .filter(Boolean)
        .join('\n\n'),
      closingParagraph: normalized.body.closing,
      closingLine: normalized.letter.signoff,
      signatureName: normalized.sender.fullName,
    },
    style: {
      fontFamily: normalized.style.fontFamily,
      fontSize: normalized.style.fontSize,
      lineHeight: normalized.style.lineHeight,
      accentColor: normalized.style.accentColor,
      pageTheme: normalized.style.pageTheme,
    },
  };
}

const CoverLetterBuilderPageInner: React.FC<{
  id: string;
  backendUrl: string;
  token: string;
  actionFromQuery?: string;
  paymentSuccessFromQuery?: boolean;
  clearPaymentQuery: () => void;
}> = ({ id, backendUrl, token, actionFromQuery, paymentSuccessFromQuery, clearPaymentQuery }) => {
  const { data, isLoading, error } = useCoverLetterDraft({ backendUrl, token, id } as any);
  const updateDraft = useSaveCoverLetterDraft({ backendUrl, token });
  const exportDraft = useExportCoverLetter({ backendUrl, token });
  const importFile = useImportCoverLetterFile({ backendUrl, token });
  const cvPayment = useCvPayment({
    backendUrl,
    token,
    onPaymentConfirmed: trackTikTokPurchase,
  });

  const [exportUrl, setExportUrl] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [importNotice, setImportNotice] = useState<string>('');

  const initRef = useRef(true);
  const hydratedDraftIdRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string>('');
  const lastValidationFailedSigRef = useRef<string>('');
  const coverLetterImportRef = useRef<HTMLInputElement | null>(null);
  const resumeImportRef = useRef<HTMLInputElement | null>(null);

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
    setSaveState('saved');
  }, [data, id, reset]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CoverLetterDraft) => {
        const payload = mapEditorDraftToUpdatePayload(values);
        const payloadSig = JSON.stringify(payload);

        if (payloadSig === lastValidationFailedSigRef.current) return;

        try {
          setSaveState('saving');
          const updated = await updateDraft.mutateAsync({ id, payload });
          lastSavedSigRef.current = payloadSig;
          lastValidationFailedSigRef.current = '';
          setLastSavedAt(
            updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
          );
          setSaveState('saved');
        } catch (err: any) {
          setSaveState('error');
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

    setSaveState('idle');
    debouncedSave(formValues as CoverLetterDraft);
    return () => debouncedSave.cancel();
  }, [formValues, debouncedSave]);

  const handleManualSave = async () => {
    const values = getValues();
    const payload = mapEditorDraftToUpdatePayload(values);
    setSaveState('saving');
    const updated = await updateDraft.mutateAsync({ id, payload });
    lastSavedSigRef.current = JSON.stringify(payload);
    lastValidationFailedSigRef.current = '';
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
    setSaveState('saved');
  };

  const handleImport = async (file: File, sourceType: 'cover_letter' | 'resume') => {
    const proceed = window.confirm(
      'Apply imported content to this draft now? Your current text will be replaced in mapped fields.'
    );
    if (!proceed) return;

    try {
      setImportNotice(
        sourceType === 'resume' ? 'Extracting details from resume…' : 'Importing cover letter…'
      );
      const imported = await importFile.mutateAsync({ file, sourceType });
      const updated = await updateDraft.mutateAsync({
        id,
        payload: {
          data: imported.data,
        },
      });
      const normalized = normalizeCoverLetterDraft(updated);
      initRef.current = true;
      reset(normalized);
      lastSavedSigRef.current = JSON.stringify(mapEditorDraftToUpdatePayload(normalized));
      setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
      setSaveState('saved');
      setImportNotice(
        sourceType === 'resume'
          ? 'Resume details applied. Review and adjust before exporting.'
          : 'Imported cover letter sections applied to your draft.'
      );
    } catch (err: any) {
      setImportNotice(err?.message || 'Import failed. Please try another file.');
    }
  };

  const doExport = async () => {
    const values = normalizeCoverLetterDraft(getValues());
    const exportJson = toCoverLetterExportJson(values);
    const exported = await exportDraft.mutateAsync({
      draftId: id,
      coverLetterJson: exportJson,
    });
    setExportUrl(exported.signedUrl || exported.url || undefined);
    trackCoverLetterDownload({
      source_page: 'cover_letter_builder',
      template_id: draft.templateId,
    });
  };

  const doPrint = async () => {
    const values = normalizeCoverLetterDraft(getValues());
    const printJson = toCoverLetterExportJson(values);
    const payload = encodeURIComponent(
      btoa(unescape(encodeURIComponent(JSON.stringify(printJson))))
    );
    window.open(`/cover-letter/print?payload=${payload}`, '_blank', 'noopener,noreferrer');
  };

  const handleExport = async () => {
    await cvPayment.ensurePaidBeforeCoverLetterExport(doExport);
  };

  const handlePrint = async () => {
    await cvPayment.ensurePaidBeforeCoverLetterPrint(doPrint);
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

  useEffect(() => {
    if (!paymentSuccessFromQuery || !actionFromQuery) return;
    const run = async () => {
      if (actionFromQuery === 'cover_letter_export') {
        await doExport();
      }
      if (actionFromQuery === 'cover_letter_print') await doPrint();
      clearPaymentQuery();
    };
    void run();
  }, [paymentSuccessFromQuery, actionFromQuery]);

  const content = isLoading ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center bg-site">
      <p className="text-sm text-slate-600 dark:text-slate-300">Loading your draft...</p>
    </div>
  ) : error || !data ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center bg-site">
      <p className="text-sm text-rose-600 dark:text-rose-300">
        {(error as any)?.message || 'Draft not found.'}
      </p>
    </div>
  ) : (
    <CoverLetterEditorShell
      draft={draft}
      onSave={handleManualSave}
      onExport={handleExport}
      onCopyExportLink={copyExportLink}
      onPrint={handlePrint}
      onImportCoverLetter={() => coverLetterImportRef.current?.click()}
      onImportResume={() => resumeImportRef.current?.click()}
      isImporting={importFile.isPending}
      importNotice={importNotice}
      exportUrl={exportUrl}
      isSaving={updateDraft.isPending}
      isExporting={exportDraft.isPending}
      lastSavedAt={lastSavedAt}
      saveState={saveState}
    />
  );

  return (
    <FormProvider {...methods}>
      {content}
      <CvPaymentModal
        isOpen={cvPayment.modalOpen}
        pendingAction={cvPayment.pendingAction}
        onClose={cvPayment.cancelPayment}
        onPayWithMpesa={async (phone) => {
          trackBeginCheckout({
            currency: 'KES',
            value: MPESA_KES_AMOUNT,
            purchase_type: 'export_unlock',
            product_type: 'cover_letter',
            source_page: 'cover_letter_builder',
          });
          await cvPayment.initMpesaMutation.mutateAsync(phone);
        }}
        onRetryStatusCheck={cvPayment.retryMpesaPolling}
        onPayWithPaystack={async () => {
          const nextPath = `${window.location.pathname}?cv_action=${cvPayment.pendingAction}`;
          trackBeginCheckout({
            currency: 'KES',
            value: PAYSTACK_KES_AMOUNT,
            purchase_type: 'export_unlock',
            product_type: 'cover_letter',
            source_page: 'cover_letter_builder',
            items: [
              {
                item_id: 'cvpro-export-unlock',
                item_name: 'ProfessionalResume Export Unlock',
                price: PAYSTACK_KES_AMOUNT,
                quantity: 1,
              },
            ],
          });
          const order = await cvPayment.startPaystackCheckout.mutateAsync(nextPath);
          window.location.href = order.authorizationUrl;
        }}
        isLoadingMpesaInit={cvPayment.initMpesaMutation.isPending}
        isLoadingPaystack={cvPayment.startPaystackCheckout.isPending}
        mpesaFlowState={cvPayment.mpesaFlowState}
        message={cvPayment.mpesaStatusMessage}
        error={
          cvPayment.initMpesaMutation.error?.message ||
          cvPayment.startPaystackCheckout.error?.message ||
          null
        }
      />
      <input
        ref={coverLetterImportRef}
        type="file"
        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            trackUploadCvStarted({
              source_page: 'cover_letter_builder',
              upload_type: 'cover_letter',
            });
            void handleImport(file, 'cover_letter').finally(() =>
              trackUploadCvCompleted({
                source_page: 'cover_letter_builder',
                upload_type: 'cover_letter',
              })
            );
          }
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={resumeImportRef}
        type="file"
        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            trackUploadCvStarted({ source_page: 'cover_letter_builder', upload_type: 'resume' });
            void handleImport(file, 'resume').finally(() =>
              trackUploadCvCompleted({ source_page: 'cover_letter_builder', upload_type: 'resume' })
            );
          }
          e.currentTarget.value = '';
        }}
      />
    </FormProvider>
  );
};

const CoverLetterBuilderPage: React.FC = () => {
  const params = useParams();
  const id = pickParam((params as any)?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const actionFromQuery = searchParams?.get('cv_action') || undefined;
  const paymentSuccessFromQuery = searchParams?.get('cvpay') === 'success';

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

  return (
    <CoverLetterBuilderPageInner
      id={id}
      backendUrl={backendUrl}
      token={token}
      actionFromQuery={actionFromQuery}
      paymentSuccessFromQuery={paymentSuccessFromQuery}
      clearPaymentQuery={() => router.replace(`/cover-letters/editor/${id}`)}
    />
  );
};

export default CoverLetterBuilderPage;

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});
