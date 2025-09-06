// apps/admin/src/pages/Receipts.tsx
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FileDown, Loader2 } from 'lucide-react';

type ProofMode = 'paypal_capture' | 'paypal_order' | 'mpesa_ref' | 'mpesa_txref';

function pickBackend(): string {
  const v =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) ||
    (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) ||
    'http://localhost:4000';
  return String(v).replace(/\/+$/, '');
}

export default function Receipts() {
  const BACKEND = useMemo(() => pickBackend(), []);
  const [mode, setMode] = useState<ProofMode>('paypal_capture');
  const [refValue, setRefValue] = useState('');
  const [email, setEmail] = useState('');
  const [downloading, setDownloading] = useState(false);

  const placeholder = useMemo(() => {
    switch (mode) {
      case 'paypal_capture':
        return '0LD80058AX440524F';
      case 'paypal_order':
        return '7A2469264D687852V';
      case 'mpesa_ref':
        return 'MKR7W... (M-Pesa Receipt Code)';
      case 'mpesa_txref':
        return 'ws_CO_xxxxx... (CheckoutRequestID)';
    }
  }, [mode]);

  const labelText = useMemo(() => {
    switch (mode) {
      case 'paypal_capture':
        return 'PayPal Capture ID';
      case 'paypal_order':
        return 'PayPal Order / Transaction ID';
      case 'mpesa_ref':
        return 'M-Pesa Receipt (e.g., QDT3xxxxx)';
      case 'mpesa_txref':
        return 'M-Pesa CheckoutRequestID';
    }
  }, [mode]);

  const downloadReceipt = async () => {
    const ref = refValue.trim();
    if (!ref) {
      toast.error('Please enter a reference value');
      return;
    }

    try {
      setDownloading(true);
      const token = localStorage.getItem('authToken') || '';

      const params: Record<string, string> = { format: 'pdf' };
      if (email.trim()) params.email = email.trim();

      // Map mode → query param
      if (mode === 'paypal_capture') params.captureId = ref;
      if (mode === 'paypal_order') params.orderId = ref;
      if (mode === 'mpesa_ref') params.mpesaRef = ref;
      if (mode === 'mpesa_txref') params.txRef = ref;

      const res = await axios.get(`${BACKEND}/api/admin/proof`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
        responseType: 'blob',
        validateStatus: () => true,
      });

      const status = res.status;
      const ct = String(res.headers['content-type'] || '');

      if (status === 401) {
        throw new Error('Unauthorized. Please sign in as admin.');
      }

      if (ct.includes('application/pdf')) {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const refName = params.captureId || params.orderId || params.mpesaRef || params.txRef || 'receipt';
        a.href = url;
        a.download = `DayBreak_Receipt_${refName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      // Likely JSON error
      let text = '';
      try {
        // axios blob → use Blob.text()
        text = await (res.data as Blob).text();
      } catch {
        // best-effort
        text = String(res.data || '');
      }

      let msg = `Failed to generate receipt (HTTP ${status})`;
      try {
        const j = JSON.parse(text);
        msg = j?.message || j?.error || msg;
      } catch {
        if (text) msg = `${msg}: ${text.slice(0, 300)}`;
      }
      throw new Error(msg);
    } catch (err: any) {
      toast.error(err?.message || 'Could not download receipt');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="app-heading">Proof of Fulfillment</h3>

      {/* Mode selector */}
      <div className="panel p-3 flex flex-wrap gap-2">
        {[
          { k: 'paypal_capture', label: 'PayPal: Capture ID' },
          { k: 'paypal_order', label: 'PayPal: Order ID' },
          { k: 'mpesa_ref', label: 'M-Pesa: Receipt Code' },
          { k: 'mpesa_txref', label: 'M-Pesa: Checkout ID' },
        ].map((opt) => (
          <button
            key={opt.k}
            type="button"
            onClick={() => setMode(opt.k as ProofMode)}
            className={`chip ${mode === opt.k ? 'chip-active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="panel p-4 grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">{labelText}</span>
          <input
            className="input mt-1"
            value={refValue}
            onChange={(e) => setRefValue(e.target.value)}
            placeholder={placeholder}
          />
        </label>

        <label className="block">
          <span className="text-sm">Buyer Email (App or PayPal)</span>
          <input
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            className="btn w-full sm:w-auto"
            onClick={downloadReceipt}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Generate Receipt (PDF)
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-mutedGray dark:text-darkTextSecondary">
        Tip: You can supply either the app email or PayPal payer email. For M-Pesa, use the receipt
        code or the CheckoutRequestID.
      </p>
    </div>
  );
}
