// apps/admin/src/pages/Receipts.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FileDown, Loader2 } from 'lucide-react';
import { backendUrl as APP_BACKEND_URL } from '../App';

const BACKEND =
  (APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000')
    .toString()
    .replace(/\/$/, '');

export default function Receipts() {
  const [captureId, setCaptureId] = useState('');
  const [email, setEmail] = useState('');
  const [downloading, setDownloading] = useState(false);

  const downloadReceipt = async () => {
    if (!captureId.trim()) {
      toast.error('Please enter a PayPal Capture ID');
      return;
    }
    try {
      setDownloading(true);
      const token = localStorage.getItem('authToken') || '';

      const res = await axios.get(`${BACKEND}/api/admin/proof`, {
        params: { captureId: captureId.trim(), email: email.trim(), format: 'pdf' },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
        responseType: 'blob',
        validateStatus: () => true,
      });

      const ct = String(res.headers['content-type'] || '');
      if (!ct.includes('application/pdf')) {
        // Server likely returned JSON error; try to parse
        const text = await res.data.text?.();
        let msg = 'Failed to generate receipt';
        try {
          const j = JSON.parse(text);
          msg = j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DayBreak_Receipt_${captureId.trim()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || 'Could not download receipt');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="app-heading">Proof of Fulfillment</h3>

      <div className="panel p-4 grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">PayPal Capture ID</span>
          <input
            className="input mt-1"
            value={captureId}
            onChange={(e) => setCaptureId(e.target.value)}
            placeholder="0LD80058AX440524F"
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
        Tip: You can enter either the buyer’s app email or the PayPal payer email. We’ll match
        either one for the specified capture ID.
      </p>
    </div>
  );
}
