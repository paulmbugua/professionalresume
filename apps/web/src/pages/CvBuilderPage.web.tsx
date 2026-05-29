'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import debounce from 'lodash.debounce';
import { useShopContext } from '@cvpro/shared/context';
import {
  useCvDraft,
  useSaveCvDraft,
  useExportCv,
  useCvPayment,
  useCreateCvDraft,
} from '@cvpro/shared/hooks';
import type { CvDraft } from '@cvpro/shared/types';
import { normalizeDraft } from '../utils/cvDefaults';
import CvEditorShell from '../components/cv/CvEditorShell';
import CvPaymentModal from '../components/cv/CvPaymentModal';
import { MPESA_KES_AMOUNT, PAYSTACK_KES_AMOUNT } from '../lib/cvPaymentPricing';
import { demoResume, hasAnyUserData } from '../templates/demoResume';
import {
  clearPendingPaymentReturnState,
  peekPendingPaymentAction,
  persistPendingCvBuilderState,
  persistPendingPaymentReturn,
  restoreGuestCvState,
  restorePendingCvBuilderState,
  clearPendingBuilderAction,
  consumeBuilderAuthReason,
  consumePendingBuilderAction,
  persistGuestCvState,
  setBuilderAuthReason,
  type PendingCvAction,
} from '../lib/cvGuestSession';
import {
  clearGuestCvDraft,
  loadGuestCvDraft,
  markGuestDraftPendingActionConsumed,
  markGuestDraftSynced,
  saveGuestCvDraft,
  type GuestCvBuilderTab,
} from '../lib/cv/guestDraftStorage';
import { consumePendingCvAction } from '../lib/cv/guestDraftSession';
import { redirectToAuthWithCvReturn } from '../lib/cv/guestDraftAuth';
import { trackBeginCheckout, trackResumeDownload } from '../lib/analytics/events';
import {
  trackTikTokInitiateCheckout,
  trackTikTokPurchase,
  trackTikTokViewContent,
} from '../lib/tiktokPixel';

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
  coverLetter: { subject: '', greeting: '', body: '', closing: '' },
  aiMeta: {},
  generationMeta: {},
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

const actionToResumeActionQuery: Record<PendingCvAction, string> = {
  save: 'resume_save',
  export: 'resume_export',
  print: 'resume_print',
};


const CvBuilderPageInner: React.FC<{
  id: string;
  backendUrl?: string;
  token?: string;
  forcedTemplateId?: string;
  autoFocusAi?: boolean;
  actionFromQuery?: string;
  paymentSuccessFromQuery?: boolean;
  clearPaymentQuery: () => void;
  isGuest: boolean;
}> = ({
  id,
  backendUrl,
  token,
  forcedTemplateId,
  autoFocusAi,
  actionFromQuery,
  paymentSuccessFromQuery,
  clearPaymentQuery,
  isGuest,
}) => {
  const router = useRouter();
  const resolvedBackendUrl = backendUrl || '';
  const guestDraft = useMemo(() => {
    const restored = restoreGuestCvState();
    if (restored) return normalizeDraft(restored);

    return normalizeDraft({
      ...demoResume,
      id: 'guest',
      userId: 'guest',
      templateId: forcedTemplateId || demoResume.templateId,
    } as CvDraft);
  }, [forcedTemplateId]);

  const serverDraftId = isGuest ? undefined : id;
  const { data, isLoading, error } = useCvDraft({
    backendUrl: resolvedBackendUrl,
    token,
    id: serverDraftId,
  } as any);

  const updateDraft = useSaveCvDraft({ backendUrl: resolvedBackendUrl, token } as any);
  const exportCv = useExportCv({ backendUrl: resolvedBackendUrl, token } as any);
  const createDraft = useCreateCvDraft({ backendUrl: resolvedBackendUrl, token } as any);

  const cvPayment = useCvPayment({
    backendUrl: resolvedBackendUrl,
    token,
    onPaymentConfirmed: trackTikTokPurchase,
  } as any);

  const [exportUrl, setExportUrl] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [authHint, setAuthHint] = useState<string>('');
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [restoredMessage, setRestoredMessage] = useState('');

  const initRef = useRef(true);
  const hydratedDraftIdRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string>('');
  const restoredPaymentStateRef = useRef(false);
  const builderUiRef = useRef<{ activeTab: GuestCvBuilderTab; activeSection?: string }>({
    activeTab: 'edit',
  });
  const restoredGuestMetaRef = useRef(loadGuestCvDraft());
  const migratedGuestDraftRef = useRef(false);
  const consumedActionRef = useRef(false);

  const methods = useForm<CvDraft>({ defaultValues: EMPTY_DRAFT, mode: 'onChange' });
  const { reset, getValues, control, setValue } = methods;
  const formValues = useWatch({ control });

  useEffect(() => {
    if (!id) return;
    trackTikTokViewContent(`resume_builder:${id}`);
  }, [id]);

  const paymentRestoreSnapshot = useMemo(() => {
    if (isGuest) return null;
    const pending = restorePendingCvBuilderState();
    if (!pending) return null;
    if (pending.draftId !== id) return null;
    return normalizeDraft(pending.snapshot);
  }, [id, isGuest]);

  useEffect(() => {
    const reason = consumeBuilderAuthReason();
    if (reason) setAuthHint(reason);
  }, []);

  useEffect(() => {
    if (!isGuest || token) return;
    const payload = loadGuestCvDraft();
    if (!payload || payload.synced || !hasAnyUserData(payload.draft)) return;
    if (payload.draft.id === 'guest') setShowRecoveryPrompt(true);
  }, [isGuest, token]);

  useEffect(() => {
    if (!isGuest || !restoredGuestMetaRef.current?.scrollY) return;
    const y = restoredGuestMetaRef.current.scrollY;
    const timer = window.setTimeout(() => window.scrollTo({ top: y, behavior: 'smooth' }), 250);
    return () => window.clearTimeout(timer);
  }, [isGuest]);

  useEffect(() => {
    if (isGuest || !paymentRestoreSnapshot || restoredPaymentStateRef.current) return;

    restoredPaymentStateRef.current = true;
    hydratedDraftIdRef.current = id;
    initRef.current = true;
    reset(paymentRestoreSnapshot);
    lastSavedSigRef.current = JSON.stringify(paymentRestoreSnapshot);
    setLastSavedAt('Restored after payment');
    console.info('[cv-payment-return] restored builder snapshot', {
      draftId: id,
      templateId: paymentRestoreSnapshot.templateId,
    });
  }, [id, isGuest, paymentRestoreSnapshot, reset]);

  useEffect(() => {
    if (!isGuest || data) return;
    if (hydratedDraftIdRef.current === 'guest') return;

    hydratedDraftIdRef.current = 'guest';
    initRef.current = true;
    reset(guestDraft);
    lastSavedSigRef.current = JSON.stringify(guestDraft);
    setLastSavedAt('Draft saved on this device');
    if (restoredGuestMetaRef.current) setRestoredMessage('Welcome back — your resume draft has been restored.');
  }, [isGuest, data, guestDraft, reset]);

  useEffect(() => {
    if (!data || isGuest) return;
    if (hydratedDraftIdRef.current === id) return;

    hydratedDraftIdRef.current = id;

    const initial = normalizeDraft(data);
    initRef.current = true;
    reset(initial);

    lastSavedSigRef.current = JSON.stringify(initial);
    setLastSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : undefined);
  }, [data, id, isGuest, reset]);

  useEffect(() => {
    if (!forcedTemplateId) return;
    const current = getValues('templateId');
    if (current === forcedTemplateId) return;
    setValue('templateId', forcedTemplateId as any, { shouldDirty: true, shouldTouch: false });
  }, [forcedTemplateId, getValues, setValue]);

  const debouncedSave = useMemo(
    () =>
      debounce(async (values: CvDraft) => {
        if (isGuest || !token || !resolvedBackendUrl) {
          const normalized = normalizeDraft(values);
          persistGuestCvState(normalized);
          saveGuestCvDraft({
            draft: normalized,
            selectedTemplateId: normalized.templateId,
            activeTab: builderUiRef.current.activeTab,
            activeSection: builderUiRef.current.activeSection,
            scrollY: typeof window !== 'undefined' ? window.scrollY : undefined,
            returnTo: '/builder/guest?resumeDraft=guest',
          });
          lastSavedSigRef.current = JSON.stringify(values);
          setLastSavedAt('Draft saved on this device');
          return;
        }

        const updated = await updateDraft.mutateAsync({ id, payload: values });
        lastSavedSigRef.current = JSON.stringify(values);
        setLastSavedAt(
          updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined
        );
      }, 900),
    [id, isGuest, resolvedBackendUrl, token, updateDraft]
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

  const ensureAuthForBuilderAction = async (action: PendingCvAction): Promise<boolean> => {
    if (token && resolvedBackendUrl) return true;

    const draftSnapshot = normalizeDraft(getValues());
    persistGuestCvState(draftSnapshot);
    setBuilderAuthReason('Create an account to save and export your resume. Your progress is safe.');
    redirectToAuthWithCvReturn({
      action: action === 'print' ? 'download' : action,
      draft: draftSnapshot,
      activeTab: builderUiRef.current.activeTab,
      activeSection: builderUiRef.current.activeSection,
      router,
    });
    return false;
  };

  const migrateGuestDraftToServer = async (action: PendingCvAction): Promise<void> => {
    if (!token || !resolvedBackendUrl || migratedGuestDraftRef.current) return;

    migratedGuestDraftRef.current = true;
    const stored = loadGuestCvDraft();
    const values = normalizeDraft(stored?.draft || getValues());
    const created = await createDraft.mutateAsync({
      templateId: values.templateId || forcedTemplateId || 'ats-minimal',
      title: values.title || 'Untitled CV',
      data: values,
      clientDraftId: stored?.clientDraftId,
    } as any);

    markGuestDraftSynced(created.id);
    clearPendingBuilderAction();
    markGuestDraftPendingActionConsumed();
    const queryAction = actionToResumeActionQuery[action];
    router.replace(`/builder/${created.id}?resume_action=${queryAction}`);
  };

  const handleManualSave = async () => {
    if (isGuest) {
      const canContinue = await ensureAuthForBuilderAction('save');
      if (!canContinue) return;
    }

    const values = getValues();
    if (!token || !resolvedBackendUrl) {
      persistGuestCvState(values);
      setLastSavedAt('Draft saved on this device');
      return;
    }

    const updated = await updateDraft.mutateAsync({ id, payload: values });
    lastSavedSigRef.current = JSON.stringify(values);
    setLastSavedAt(updated.updatedAt ? new Date(updated.updatedAt).toLocaleString() : undefined);
  };

  const doExport = async () => {
    if (!token || !resolvedBackendUrl) return;
    const exported = await exportCv.mutateAsync({ draftId: id, cvJson: getValues() });
    setExportUrl(exported.signedUrl || exported.url || undefined);
    trackResumeDownload({ source_page: 'cv_builder', template_id: draft.templateId });
  };

  const doPrint = async () => {
    window.open(`/print/${id}`, '_blank', 'noopener,noreferrer');
  };

  const persistPaymentReturnState = (resumeAction: 'resume_export' | 'resume_print') => {
    const snapshot = normalizeDraft(getValues());
    const returnTo = `${window.location.pathname}?cv_action=${resumeAction}`;
    persistPendingPaymentReturn({
      returnTo,
      source: 'cv_builder',
      createdAt: new Date().toISOString(),
    });
    persistPendingCvBuilderState({
      draftId: id,
      templateId: snapshot.templateId || forcedTemplateId || 'ats-minimal',
      pendingAction: resumeAction,
      snapshot,
      source: 'cv_builder',
      createdAt: new Date().toISOString(),
    });
  };

  const handleExport = async () => {
    if (isGuest) {
      const canContinue = await ensureAuthForBuilderAction('export');
      if (!canContinue) return;
    }

    if (!cvPayment.entitlement.data?.eligible) {
      persistPaymentReturnState('resume_export');
    }
    await cvPayment.ensurePaidBeforeResumeExport(doExport);
  };

  const handlePrint = async () => {
    if (isGuest) {
      const canContinue = await ensureAuthForBuilderAction('print');
      if (!canContinue) return;
    }

    if (!cvPayment.entitlement.data?.eligible) {
      persistPaymentReturnState('resume_print');
    }
    await cvPayment.ensurePaidBeforeResumePrint(doPrint);
  };

  const copyExportLink = async () => {
    if (!exportUrl) return;
    await navigator.clipboard?.writeText(exportUrl);
  };

  const draft = useMemo(() => {
    const base = ((formValues as CvDraft) || data || guestDraft || EMPTY_DRAFT) as CvDraft;
    return normalizeDraft(base);
  }, [formValues, data, guestDraft]);

  useEffect(() => {
    if (!token || !resolvedBackendUrl || !isGuest) return;
    if (consumedActionRef.current) return;
    const sessionAction = consumePendingCvAction();
    const legacyAction = consumePendingBuilderAction();
    const storedDraft = loadGuestCvDraft();
    const storedAction = storedDraft?.pendingAction;
    const normalizedStoredAction: PendingCvAction | null =
      storedAction === 'download' ? 'print' : storedAction === 'checkout' ? 'export' : storedAction || null;
    const pending =
      (sessionAction === 'download' ? 'print' : sessionAction) ||
      legacyAction ||
      normalizedStoredAction ||
      (storedDraft && !storedDraft.synced ? 'save' : null);
    if (!pending) return;

    consumedActionRef.current = true;
    void migrateGuestDraftToServer(pending as PendingCvAction);
  }, [isGuest, resolvedBackendUrl, token]);

  useEffect(() => {
    if (isGuest || !actionFromQuery) return;

    const run = async () => {
      if (actionFromQuery === 'resume_save') {
        await handleManualSave();
        router.replace(`/builder/${id}`);
        return;
      }
      if (actionFromQuery === 'resume_export') {
        await handleExport();
        router.replace(`/builder/${id}`);
        return;
      }
      if (actionFromQuery === 'resume_print') {
        await handlePrint();
        router.replace(`/builder/${id}`);
      }
    };

    void run();
  }, [actionFromQuery, id, isGuest]);

  useEffect(() => {
    if (!paymentSuccessFromQuery || !actionFromQuery || isGuest) return;
    const run = async () => {
      console.info('[cv-payment-return] consuming pending action', {
        actionFromQuery,
        pendingStoredAction: peekPendingPaymentAction(),
      });
      if (actionFromQuery === 'resume_export') {
        await doExport();
      }
      if (actionFromQuery === 'resume_print') await doPrint();
      clearPendingPaymentReturnState();
      clearPaymentQuery();
    };
    void run();
  }, [paymentSuccessFromQuery, actionFromQuery, clearPaymentQuery, isGuest]);

  const validationErrors = validateDraft(draft);

  const showLoading = !isGuest && isLoading;
  const showError = !isGuest && (error || !data);

  const content = showLoading ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500">Loading your draft...</p>
    </div>
  ) : showError ? (
    <div className="mx-auto flex min-h-[60vh] w-full items-center justify-center">
      <p className="text-sm text-rose-500">{(error as any)?.message || 'Draft not found.'}</p>
    </div>
  ) : (
    <>
      {authHint && (
        <div className="mx-auto mb-4 w-full max-w-screen-2xl rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {authHint}
        </div>
      )}
      {restoredMessage && (
        <div className="mx-auto mb-4 w-full max-w-screen-2xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {restoredMessage}
        </div>
      )}
      {showRecoveryPrompt && (
        <div className="mx-auto mb-4 flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Resume draft found. Continue where you left off?</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRecoveryPrompt(false)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Continue draft
            </button>
            <button
              type="button"
              onClick={() => {
                clearGuestCvDraft();
                setShowRecoveryPrompt(false);
                const fresh = normalizeDraft({
                  ...demoResume,
                  id: 'guest',
                  userId: 'guest',
                  templateId: forcedTemplateId || demoResume.templateId,
                } as CvDraft);
                reset(fresh);
                lastSavedSigRef.current = JSON.stringify(fresh);
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
            >
              Start fresh
            </button>
          </span>
        </div>
      )}
      <CvEditorShell
        draft={draft}
        validationErrors={validationErrors}
        onSave={handleManualSave}
        onExport={handleExport}
        onCopyExportLink={copyExportLink}
        onPrint={handlePrint}
        exportUrl={exportUrl}
        isSaving={isGuest ? false : updateDraft.isPending}
        isExporting={isGuest ? false : exportCv.isPending}
        lastSavedAt={lastSavedAt}
        autoFocusAi={autoFocusAi}
        isGuest={isGuest}
        restoredActiveTab={restoredGuestMetaRef.current?.activeTab}
        restoredActiveSection={restoredGuestMetaRef.current?.activeSection}
        onBuilderUiChange={(state) => {
          builderUiRef.current = state;
        }}
      />
    </>
  );

  return (
    <FormProvider {...methods}>
      {content}
      {!isGuest && token && resolvedBackendUrl && (
        <CvPaymentModal
          isOpen={cvPayment.modalOpen}
          pendingAction={cvPayment.pendingAction}
          onClose={cvPayment.cancelPayment}
          onPayWithMpesa={async (phone) => {
            trackTikTokInitiateCheckout();
            trackBeginCheckout({
              currency: 'KES',
              value: MPESA_KES_AMOUNT,
              purchase_type: 'export_unlock',
              product_type: 'resume',
              source_page: 'cv_builder',
            });
            await cvPayment.initMpesaMutation.mutateAsync(phone);
          }}
          onRetryStatusCheck={cvPayment.retryMpesaPolling}
          onPayWithPaystack={async () => {
            const nextPath = `${window.location.pathname}?cv_action=${cvPayment.pendingAction}`;
            trackTikTokInitiateCheckout();
            trackBeginCheckout({
              currency: 'KES',
              value: PAYSTACK_KES_AMOUNT,
              purchase_type: 'export_unlock',
              product_type: 'resume',
              source_page: 'cv_builder',
              items: [
                {
                  item_id: 'cvpro-export-unlock',
                  item_name: 'CVPro Export Unlock',
                  price: PAYSTACK_KES_AMOUNT,
                  quantity: 1,
                },
              ],
            });
            persistPaymentReturnState(cvPayment.pendingAction as 'resume_export' | 'resume_print');
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
      )}
    </FormProvider>
  );
};

const CvBuilderPage: React.FC = () => {
  const params = useParams();
  const id = pickParam((params as any)?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const forcedTemplateId = searchParams?.get('templateId') ?? undefined;
  const autoFocusAi = searchParams?.get('aiStart') === '1';
  const actionFromQuery =
    searchParams?.get('resume_action') || searchParams?.get('cv_action') || undefined;
  const paymentSuccessFromQuery = searchParams?.get('cvpay') === 'success';
  const isGuest = id === 'guest';

  useEffect(() => {
    if (!id) router.replace('/builder/new?templateId=ats-minimal');
  }, [id, router]);

  if (!id) return null;

  return (
    <CvBuilderPageInner
      id={id}
      backendUrl={backendUrl}
      token={token}
      forcedTemplateId={forcedTemplateId}
      autoFocusAi={autoFocusAi}
      actionFromQuery={actionFromQuery}
      paymentSuccessFromQuery={paymentSuccessFromQuery}
      clearPaymentQuery={() => router.replace(`/builder/${id}`)}
      isGuest={isGuest}
    />
  );
};

export default CvBuilderPage;
