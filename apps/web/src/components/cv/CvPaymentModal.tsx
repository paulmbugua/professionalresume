import React, { useMemo, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { MPESA_KES_AMOUNT } from '../../lib/cvPaymentPricing';

type Props = {
  isOpen: boolean;
  pendingAction: string;
  onClose: () => void;
  onPayWithMpesa: (phone: string) => Promise<void>;
  onRetryStatusCheck: () => Promise<void>;
  isLoadingMpesaInit?: boolean;
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
  isLoadingMpesaInit = false,
  mpesaFlowState = 'idle',
  message,
  error,
}) => {
  const [phone, setPhone] = useState('');

  const isWaitingForPayment =
    mpesaFlowState === 'stk_sent' || mpesaFlowState === 'waiting_for_payment';

  const canRetryStatus =
    mpesaFlowState === 'expired' ||
    mpesaFlowState === 'failed' ||
    mpesaFlowState === 'cancelled';

  const showSpinner = isLoadingMpesaInit || isWaitingForPayment;

  const actionDetails = useMemo(() => {
    const isCoverLetter = pendingAction?.startsWith('cover_letter');
    const isPrint = pendingAction?.endsWith('_print');
    return {
      product: isCoverLetter ? 'Cover Letter Builder' : 'Resume Builder',
      document: isCoverLetter ? 'cover letter' : 'resume',
      action: isPrint ? 'print' : 'export',
    };
  }, [pendingAction]);

  const handleMpesaPay = async () => {
    const trimmedPhone = phone.trim();
    await onPayWithMpesa(trimmedPhone);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-3 sm:px-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              M-Pesa checkout
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
              Pay Ksh {MPESA_KES_AMOUNT} to {actionDetails.action} your {actionDetails.document}
            </h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-white/80">
          {actionDetails.product} access is billed monthly and paid with M-Pesa only.
          Complete the STK prompt to unlock {actionDetails.document} export and print for this billing cycle.
        </p>

        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Monthly access
              </p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950 dark:text-white">
                Ksh {MPESA_KES_AMOUNT}
              </p>
            </div>
            <p className="pb-1 text-right text-xs font-bold text-slate-600 dark:text-slate-300">
              {actionDetails.product}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">M-Pesa phone number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-emerald-600 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-white/35"
            />
          </label>

          <button
            type="button"
            onClick={handleMpesaPay}
            disabled={isLoadingMpesaInit}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {isLoadingMpesaInit ? 'Sending STK push...' : 'Send M-Pesa STK Push'}
          </button>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-slate-900/80">
            {showSpinner ? (
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-700 dark:text-white/80">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500/40 border-t-emerald-600" />
                <span>Waiting for payment confirmation...</span>
              </div>
            ) : null}

            <p className="text-xs text-gray-600 dark:text-white/75">
              {isWaitingForPayment
                ? 'Check your phone and enter your M-Pesa PIN. We will confirm automatically.'
                : 'After sending the STK push, we keep checking payment status automatically.'}
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

        {message ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
        ) : null}

        {error ? (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : null}

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
