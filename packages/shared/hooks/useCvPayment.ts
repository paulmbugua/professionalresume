import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmCvMpesaPayment,
  createCvPaystackOrder,
  getCvExportEntitlement,
  getCvMpesaPaymentStatus,
  initCvMpesaPayment,
  verifyCvPaystackPayment,
} from '@cvpro/shared/api';

type Args = { backendUrl: string; token?: string };
type Action = 'resume_export' | 'resume_print' | 'cover_letter_export' | 'cover_letter_print';
const CVPRO_CANONICAL_ORIGIN = 'https://www.onedollarcvpro.com';
const PENDING_MPESA_KEY = 'cv:pendingMpesaPayment';

function normalizeKenyanPhoneInput(rawPhone: string): string | null {
  const digits = String(rawPhone || '')
    .replace(/[^\d+]/g, '')
    .trim();
  if (!digits) return null;
  if (digits.startsWith('+254')) {
    const compact = `254${digits.slice(4)}`.replace(/[^\d]/g, '');
    return /^254[71]\d{8}$/.test(compact) ? compact : null;
  }
  const numeric = digits.replace(/[^\d]/g, '');
  if (/^(07|01)\d{8}$/.test(numeric)) return `254${numeric.slice(1)}`;
  if (/^254[71]\d{8}$/.test(numeric)) return numeric;
  return null;
}

export function useCvExportEntitlement({ backendUrl, token }: Args) {
  return useQuery({
    queryKey: ['cv-export-entitlement', backendUrl, token],
    queryFn: () => {
      if (!token) throw new Error('Unauthorized');
      return getCvExportEntitlement(backendUrl, token);
    },
    enabled: Boolean(backendUrl && token),
  });
}

export function useCvPayment({ backendUrl, token }: Args) {
  const qc = useQueryClient();
  const entitlement = useCvExportEntitlement({ backendUrl, token });
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action>('resume_export');
  const pendingResolver = useRef<((ok: boolean) => void) | null>(null);
  const pendingCallback = useRef<(() => Promise<void> | void) | null>(null);

  const [mpesaTransactionId, setMpesaTransactionId] = useState<string | null>(null);
  const [mpesaCheckoutRequestId, setMpesaCheckoutRequestId] = useState<string | null>(null);
  const [mpesaFlowState, setMpesaFlowState] = useState<
    'idle' | 'initiating' | 'stk_sent' | 'waiting_for_payment' | 'confirmed' | 'failed' | 'expired' | 'cancelled'
  >('idle');
  const [mpesaStatusMessage, setMpesaStatusMessage] = useState<string>('');
  const pollingStartedAtRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingInFlightRef = useRef(false);

  const stopPolling = (reason: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.info('[cv/mpesa/poll] stopped', { reason });
    }
  };

  const persistPendingMpesa = (payload: { transactionId: string; checkoutRequestId: string }) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      PENDING_MPESA_KEY,
      JSON.stringify({ ...payload, createdAt: new Date().toISOString() }),
    );
  };

  const clearPendingMpesa = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(PENDING_MPESA_KEY);
  };

  const finalizeSuccessfulMpesaPayment = async () => {
    clearPendingMpesa();
    await qc.invalidateQueries({ queryKey: ['cv-export-entitlement'] });
    setMpesaFlowState('confirmed');
    setMpesaStatusMessage('Payment confirmed. Unlocking your export…');
    setModalOpen(false);
    if (pendingCallback.current) await pendingCallback.current();
    pendingResolver.current?.(true);
    pendingResolver.current = null;
    pendingCallback.current = null;
  };

  const pollMpesaStatusOnce = async (identifiers?: {
    transactionId?: string | null;
    checkoutRequestId?: string | null;
  }) => {
    if (!token) throw new Error('Unauthorized');
    const transactionId = identifiers?.transactionId ?? mpesaTransactionId;
    const checkoutRequestId = identifiers?.checkoutRequestId ?? mpesaCheckoutRequestId;
    if (!transactionId && !checkoutRequestId) return;
    if (pollingInFlightRef.current) return;
    pollingInFlightRef.current = true;
    try {
      const result = await getCvMpesaPaymentStatus(backendUrl, token, {
        transactionId: transactionId || undefined,
        checkoutRequestId: checkoutRequestId || undefined,
      });

      if (result.status === 'pending') {
        setMpesaFlowState('waiting_for_payment');
        setMpesaStatusMessage(result.message || 'Waiting for M-Pesa confirmation…');
        return;
      }

      if (result.status === 'success') {
        stopPolling('success');
        await finalizeSuccessfulMpesaPayment();
        return;
      }

      stopPolling(result.status);
      clearPendingMpesa();
      if (result.status === 'cancelled') {
        setMpesaFlowState('cancelled');
        setMpesaStatusMessage(result.message || 'The payment was cancelled on your phone.');
        return;
      }

      if (result.status === 'expired') {
        setMpesaFlowState('expired');
        setMpesaStatusMessage(result.message || 'Payment request expired. Please try again.');
        return;
      }

      setMpesaFlowState('failed');
      setMpesaStatusMessage(result.message || 'Payment failed. Please try again.');
    } finally {
      pollingInFlightRef.current = false;
    }
  };

  const startPollingMpesaStatus = (
    reason: 'init_success' | 'restore',
    identifiers?: { transactionId?: string | null; checkoutRequestId?: string | null }
  ) => {
    if (!token) return;
    stopPolling('restart');
    pollingStartedAtRef.current = Date.now();
    setMpesaFlowState('waiting_for_payment');
    setMpesaStatusMessage('Check your phone and enter your M-Pesa PIN.');
    console.info('[cv/mpesa/poll] started', {
      reason,
      transactionId: identifiers?.transactionId ?? mpesaTransactionId,
      checkoutRequestId: identifiers?.checkoutRequestId ?? mpesaCheckoutRequestId,
    });
    void pollMpesaStatusOnce(identifiers);
    pollingIntervalRef.current = setInterval(() => {
      const startedAt = pollingStartedAtRef.current || Date.now();
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs > 120_000) {
        stopPolling('timeout');
        clearPendingMpesa();
        setMpesaFlowState('expired');
        setMpesaStatusMessage('Timed out waiting for M-Pesa confirmation. Tap retry to send another STK push.');
        return;
      }
      void pollMpesaStatusOnce(identifiers);
    }, 3000);
  };

  const initMpesaMutation = useMutation({
    mutationFn: (phone: string) => {
      if (!token) throw new Error('Unauthorized');
      setMpesaFlowState('initiating');
      setMpesaStatusMessage('Sending M-Pesa prompt…');
      const normalizedPhone = normalizeKenyanPhoneInput(phone);
      if (!normalizedPhone) {
        throw new Error('Use a valid Safaricom number in format 2547XXXXXXXX.');
      }
      return initCvMpesaPayment(backendUrl, token, { phone: normalizedPhone });
    },
    onSuccess: (data) => {
      setMpesaTransactionId(data.transactionId);
      setMpesaCheckoutRequestId(data.checkoutRequestId);
      persistPendingMpesa({
        transactionId: data.transactionId,
        checkoutRequestId: data.checkoutRequestId,
      });
      setMpesaFlowState('stk_sent');
      setMpesaStatusMessage(data.message || 'STK push sent. Check your phone to continue.');
      console.info('[cv/mpesa/init] success', {
        paymentId: data.paymentId,
        transactionId: data.transactionId,
        checkoutRequestId: data.checkoutRequestId,
      });
      setTimeout(
        () =>
          startPollingMpesaStatus('init_success', {
            transactionId: data.transactionId,
            checkoutRequestId: data.checkoutRequestId,
          }),
        0
      );
    },
  });

  const confirmMpesaMutation = useMutation({
    mutationFn: (payload?: { mpesaReceipt?: string }) => {
      if (!token) throw new Error('Unauthorized');
      return confirmCvMpesaPayment(backendUrl, token, {
        transactionId: mpesaTransactionId || undefined,
        checkoutRequestId: mpesaCheckoutRequestId || undefined,
        mpesaReceipt: payload?.mpesaReceipt,
      });
    },
    onSuccess: async (result) => {
      if (result.status === 'Completed') {
        stopPolling('manual_confirm_success');
        await finalizeSuccessfulMpesaPayment();
      }
    },
  });

  const startPaystackCheckout = useMutation({
    mutationFn: async (nextPath: string) => {
      if (!token) throw new Error('Unauthorized');
      const host = String(window.location.hostname || '').toLowerCase();
      const callbackBase =
        host === 'onedollarcvpro.com' || host === 'www.onedollarcvpro.com'
          ? CVPRO_CANONICAL_ORIGIN
          : window.location.origin;
      const callbackUrl = `${callbackBase}/paystack/callback?next=${encodeURIComponent(nextPath)}`;
      return createCvPaystackOrder(backendUrl, token, { callbackUrl });
    },
  });

  const verifyPaystack = useMutation({
    mutationFn: async (reference: string) => {
      if (!token) throw new Error('Unauthorized');
      return verifyCvPaystackPayment(backendUrl, token, reference);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cv-export-entitlement'] });
    },
  });

  const ensurePaid = async (
    action: Action,
    onPaid: () => Promise<void> | void
  ): Promise<boolean> => {
    if (entitlement.data?.eligible) {
      await onPaid();
      return true;
    }

    setPendingAction(action);
    pendingCallback.current = onPaid;
    setModalOpen(true);
    return new Promise<boolean>((resolve) => {
      pendingResolver.current = resolve;
    });
  };

  const cancelPayment = () => {
    stopPolling('user_cancelled_modal');
    clearPendingMpesa();
    setMpesaFlowState('cancelled');
    setModalOpen(false);
    pendingResolver.current?.(false);
    pendingResolver.current = null;
    pendingCallback.current = null;
  };

  const retryMpesaPolling = async () => {
    await pollMpesaStatusOnce();
  };

  useEffect(() => () => stopPolling('hook_unmount'), []);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem(PENDING_MPESA_KEY);
    if (!raw || mpesaTransactionId || mpesaCheckoutRequestId) return;
    try {
      const pending = JSON.parse(raw);
      if (!pending?.transactionId && !pending?.checkoutRequestId) return;
      setMpesaTransactionId(pending.transactionId || null);
      setMpesaCheckoutRequestId(pending.checkoutRequestId || null);
      startPollingMpesaStatus('restore', {
        transactionId: pending.transactionId || null,
        checkoutRequestId: pending.checkoutRequestId || null,
      });
      setModalOpen(true);
    } catch {
      clearPendingMpesa();
    }
  }, [token, mpesaTransactionId, mpesaCheckoutRequestId]);

  return useMemo(
    () => ({
      entitlement,
      modalOpen,
      pendingAction,
      setModalOpen,
      ensurePaidBeforeResumeExport: (onPaid: () => Promise<void> | void) =>
        ensurePaid('resume_export', onPaid),
      ensurePaidBeforeResumePrint: (onPaid: () => Promise<void> | void) =>
        ensurePaid('resume_print', onPaid),
      ensurePaidBeforeCoverLetterExport: (onPaid: () => Promise<void> | void) =>
        ensurePaid('cover_letter_export', onPaid),
      ensurePaidBeforeCoverLetterPrint: (onPaid: () => Promise<void> | void) =>
        ensurePaid('cover_letter_print', onPaid),
      initMpesaMutation,
      confirmMpesaMutation,
      mpesaFlowState,
      mpesaStatusMessage,
      retryMpesaPolling,
      startPaystackCheckout,
      verifyPaystack,
      cancelPayment,
    }),
    [
      entitlement,
      modalOpen,
      pendingAction,
      initMpesaMutation,
      confirmMpesaMutation,
      mpesaFlowState,
      mpesaStatusMessage,
      startPaystackCheckout,
      verifyPaystack,
    ]
  );
}
