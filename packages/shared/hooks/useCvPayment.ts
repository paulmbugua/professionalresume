import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmCvMpesaPayment,
  createCvPaystackOrder,
  getCvExportEntitlement,
  initCvMpesaPayment,
  verifyCvPaystackPayment,
} from '@cvpro/shared/api';

type Args = { backendUrl: string; token?: string };
type Action = 'resume_export' | 'resume_print' | 'cover_letter_export' | 'cover_letter_print';

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

  const initMpesaMutation = useMutation({
    mutationFn: (phone: string) => {
      if (!token) throw new Error('Unauthorized');
      return initCvMpesaPayment(backendUrl, token, { phone });
    },
    onSuccess: (data) => {
      setMpesaTransactionId(data.transactionId);
      setMpesaCheckoutRequestId(data.checkoutRequestId);
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
        await qc.invalidateQueries({ queryKey: ['cv-export-entitlement'] });
        setModalOpen(false);
        if (pendingCallback.current) await pendingCallback.current();
        pendingResolver.current?.(true);
        pendingResolver.current = null;
        pendingCallback.current = null;
      }
    },
  });

  const startPaystackCheckout = useMutation({
    mutationFn: async (nextPath: string) => {
      if (!token) throw new Error('Unauthorized');
      const callbackUrl = `${window.location.origin}/paystack/callback?next=${encodeURIComponent(nextPath)}`;
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

  const ensurePaid = async (action: Action, onPaid: () => Promise<void> | void): Promise<boolean> => {
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
    setModalOpen(false);
    pendingResolver.current?.(false);
    pendingResolver.current = null;
    pendingCallback.current = null;
  };

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
      startPaystackCheckout,
      verifyPaystack,
      cancelPayment,
    }),
    [entitlement, modalOpen, pendingAction, initMpesaMutation, confirmMpesaMutation, startPaystackCheckout, verifyPaystack],
  );
}
