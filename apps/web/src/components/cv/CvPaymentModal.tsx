import React, { useMemo, useState } from 'react';
import {
  CVPRO_EXPORT_PRICE_USD,
  CV_PAYMENT_METHOD_LABELS,
  MPESA_KES_AMOUNT,
  PAYSTACK_KES_AMOUNT,
} from '../../lib/cvPaymentPricing';

type Props = {
  isOpen: boolean;
  pendingAction: string;
  onClose: () => void;
  onPayWithMpesa: (phone: string) => Promise<void>;
  onRetryStatusCheck: () => Promise<void>;
  onPayWithPaystack: () => Promise<void>;
  isLoadingMpesaInit?: boolean;
  isLoadingPaystack?: boolean;
  mpesaFlowState?:
    | 'idle'
    | 'initiating'
    | 'stk_sent'
    | 'waiting_for_payment'
    | 'confirmed'
    | 'failed'
    | 'expired'
    | 'cancelled';
  message?: string;
  error?: string | null;
};

const CvPaymentModal: React.FC<Props> = ({
  isOpen,
  pendingAction,
  onClose,
  onPayWithMpesa,
  onRetryStatusCheck,
  onPayWithPaystack,
  isLoadingMpesaInit,
  isLoadingPaystack,
  mpesaFlowState = 'idle',
  message,
  error,
}) => {
  const [method, setMethod] = useState<'PAYSTACK' | 'MPESA'>('PAYSTACK');
  const [phone, setPhone] = useState('');
  const isWaitingForPayment = mpesaFlowState === 'stk_sent' || mpesaFlowState === 'waiting_for_payment';
  const canRetryStatus = mpesaFlowState === 'expired' || mpesaFlowState === 'failed' || mpesaFlowState === 'cancelled';

  const actionLabel = useMemo(() => pendingAction.replaceAll('_', ' '), [pendingAction]);

  if (!isOpen) return null;

  const inactiveMethodClass =
    'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800';

  const activeMethodClass =
    'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/15 dark:text-primary';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:px-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-slate-950">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Unlock exports (one-time)
        </h3>

        <p className="mt-2 text-sm text-gray-600 dark:text-white/80">
          Pay once to unlock Resume + Cover Letter export and print forever on your account.
          Paystack card checkout is KES {PAYSTACK_KES_AMOUNT} (≈ ${CVPRO_EXPORT_PRICE_USD}); M-Pesa STK checkout is KES {MPESA_KES_AMOUNT}.
        </p>

        <p className="mt-1 text-xs text-gray-500 dark:text-white/65">
          Current action: {actionLabel}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMethod('PAYSTACK')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              method === 'PAYSTACK' ? activeMethodClass : inactiveMethodClass
            }`}
          >
            {CV_PAYMENT_METHOD_LABELS.paystack}
          </button>

          <button
            type="button"
            onClick={() => setMethod('MPESA')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              method === 'MPESA' ? activeMethodClass : inactiveMethodClass
            }`}
          >
            {CV_PAYMENT_METHOD_LABELS.mpesa}
          </button>
        </div>

        {method === 'MPESA' ? (
          <div className="mt-4 space-y-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-primary dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-white/35"
            />

            <button
              type="button"
              onClick={() => onPayWithMpesa(phone)}
              disabled={Boolean(isLoadingMpesaInit)}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLoadingMpesaInit ? 'Initializing…' : 'Send STK Push'}
            </button>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-slate-900/80">
              {showSpinner ? (
                <div className="mb-2 flex items-center gap-2 text-xs text-gray-700 dark:text-white/80">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
                  <span>Waiting for payment confirmation…</span>
                </div>
              ) : null}
              <p className="text-xs text-gray-600 dark:text-white/75">
                {isWaitingForPayment
                  ? 'Check your phone and enter your M-Pesa PIN. We will confirm automatically.'
                  : 'After sending STK push, we keep checking payment status automatically.'}
              </p>
              {canRetryStatus ? (
                <button
                  type="button"
                  onClick={onRetryStatusCheck}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-800"
                >
                  Check status again
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPayWithPaystack}
            disabled={Boolean(isLoadingPaystack)}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoadingPaystack ? 'Redirecting…' : 'Continue to card checkout'}
          </button>
        )}

        {message ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
        ) : null}

        {error ? <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CvPaymentModal;
