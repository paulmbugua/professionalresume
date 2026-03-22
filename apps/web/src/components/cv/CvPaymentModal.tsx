import React, { useMemo, useState } from 'react';

type Props = {
  isOpen: boolean;
  pendingAction: string;
  onClose: () => void;
  onPayWithMpesa: (phone: string) => Promise<void>;
  onConfirmMpesa: (payload?: { mpesaReceipt?: string }) => Promise<void>;
  onPayWithPaystack: () => Promise<void>;
  isLoadingMpesaInit?: boolean;
  isLoadingMpesaConfirm?: boolean;
  isLoadingPaystack?: boolean;
  message?: string;
  error?: string | null;
};

const CvPaymentModal: React.FC<Props> = ({
  isOpen,
  pendingAction,
  onClose,
  onPayWithMpesa,
  onConfirmMpesa,
  onPayWithPaystack,
  isLoadingMpesaInit,
  isLoadingMpesaConfirm,
  isLoadingPaystack,
  message,
  error,
}) => {
  const [method, setMethod] = useState<'PAYSTACK' | 'MPESA'>('PAYSTACK');
  const [phone, setPhone] = useState('');
  const [manualReceipt, setManualReceipt] = useState('');

  const actionLabel = useMemo(() => pendingAction.replaceAll('_', ' '), [pendingAction]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-gray-900">Unlock exports for $1 (one-time)</h3>
        <p className="mt-2 text-sm text-gray-600">
          Pay once to unlock Resume + Cover Letter export and print forever on your account.
        </p>
        <p className="mt-1 text-xs text-gray-500">Current action: {actionLabel}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod('PAYSTACK')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              method === 'PAYSTACK' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200'
            }`}
          >
            Paystack
          </button>
          <button
            type="button"
            onClick={() => setMethod('MPESA')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              method === 'MPESA' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200'
            }`}
          >
            M-Pesa (KES 100)
          </button>
        </div>

        {method === 'MPESA' ? (
          <div className="mt-4 space-y-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onPayWithMpesa(phone)}
              disabled={Boolean(isLoadingMpesaInit)}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLoadingMpesaInit ? 'Initializing…' : 'Send STK Push'}
            </button>
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs text-gray-600">If prompt/callback delays, confirm manually:</p>
              <input
                value={manualReceipt}
                onChange={(e) => setManualReceipt(e.target.value)}
                placeholder="Optional M-Pesa receipt"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => onConfirmMpesa({ mpesaReceipt: manualReceipt || undefined })}
                disabled={Boolean(isLoadingMpesaConfirm)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
              >
                {isLoadingMpesaConfirm ? 'Confirming…' : 'Confirm payment'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPayWithPaystack}
            disabled={Boolean(isLoadingPaystack)}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoadingPaystack ? 'Redirecting…' : 'Continue to Paystack checkout'}
          </button>
        )}

        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CvPaymentModal;
