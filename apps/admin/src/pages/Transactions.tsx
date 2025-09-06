import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { CreditCard, Receipt, RefreshCw } from 'lucide-react';
import { useShopContext } from '@mytutorapp/shared/context';

type Tx = {
  id: string;
  userEmail: string;
  method: 'PayPal' | 'M-Pesa' | 'Wise';
  amount: number;
  currency: 'USD' | 'KES';
  status: 'Pending' | 'Completed' | 'Failed';
  date: string; // ISO
  captureId?: string;   // PayPal
  orderId?: string;     // PayPal
  mpesaRef?: string;    // M-Pesa purchase or withdrawal
  source?: 'payment' | 'withdrawal';
};

type Props = {
  token?: string;        // optional override; defaults to context token
  backendUrl?: string;   // optional override; defaults to context backendUrl
};

function normalizeStatus(s: string | undefined | null): Tx['status'] {
  const v = String(s ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded', 'captured', 'approved'].includes(v)) return 'Completed';
  if (['pending', 'processing', 'in_progress', 'authorized', 'queued'].includes(v)) return 'Pending';
  return 'Failed';
}

function guessMethod(raw: any): Tx['method'] {
  const m = String(
    raw?.method ?? raw?.paymentMethod ?? raw?.payment_method ?? raw?.payout_method ?? ''
  ).toLowerCase();
  if (m.includes('wise')) return 'Wise';
  if (m.includes('mpesa') || m.includes('m-pesa') || raw?.mpesaReceiptNumber || raw?.mpesa_reference) return 'M-Pesa';
  return 'PayPal';
}

function coerceTx(raw: any): Tx {
  const method = guessMethod(raw);
  const currency =
    (String(raw?.currency ?? raw?.currencyCode ?? '').toUpperCase() as 'USD' | 'KES') ||
    (raw?.amountKES ? 'KES' : 'USD');

  const amountNum = Number(
    raw?.amount ?? raw?.amountUsd ?? raw?.amountUSD ?? raw?.amountKES ?? raw?.total ?? raw?.value ?? 0
  );

  const status = normalizeStatus(raw?.status ?? raw?.state ?? raw?.payment_status);

  const date =
    raw?.date ??
    raw?.createdAt ?? raw?.created_at ??
    raw?.timestamp ??
    raw?.updatedAt ?? raw?.updated_at ??
    new Date().toISOString();

  const id = String(
    raw?.id ?? raw?.txId ??
    raw?.transactionId ?? raw?.transaction_id ??
    raw?.captureId ?? raw?.capture_id ??
    raw?.orderId ?? raw?.order_id ??
    raw?.mpesaReceiptNumber ?? raw?.mpesa_reference ??
    `${method}-${date}`
  );

  return {
    id,
    userEmail:
      raw?.userEmail ?? raw?.email ?? raw?.user_email ?? raw?.payer?.email_address ?? raw?.customerEmail ?? '—',
    method,
    amount: Number.isFinite(amountNum) ? amountNum : 0,
    currency: currency === 'KES' ? 'KES' : 'USD',
    status,
    date: new Date(date).toISOString(),
    captureId: raw?.captureId ?? raw?.capture_id ?? undefined,
    orderId: raw?.orderId ?? raw?.order_id ?? raw?.transaction_id ?? undefined,
    mpesaRef: raw?.mpesa_reference ?? raw?.mpesaReceiptNumber ?? undefined,
    source: (raw?.source === 'withdrawal' || raw?.source === 'payment') ? raw.source : undefined,
  };
}

function fmtAmount(t: Tx) {
  return t.currency === 'USD' ? `$ ${t.amount.toFixed(2)}` : `KSh ${t.amount.toLocaleString()}`;
}

export default function Transactions({ token, backendUrl: backendUrlOverride }: Props) {
  const { backendUrl: ctxBackend, token: ctxToken } = useShopContext();
  const base = useMemo(() => (backendUrlOverride || ctxBackend || '').replace(/\/+$/, ''), [backendUrlOverride, ctxBackend]);
  const authToken = token || ctxToken;

  const [tx, setTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchTx = useCallback(async () => {
    if (!base) return;
    if (!authToken) {
      setErr('Not signed in. Please log in as an admin.');
      return;
    }

    setLoading(true);
    setErr(null);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const tryUrls = [
      `${base}/api/admin/financials?kind=all&limit=100`, // unified feed
      `${base}/api/admin/transactions?limit=100`,       // payments-only fallback
    ];

    let lastError: any = null;
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { headers, credentials: 'include' }); // send cookies too if backend uses them
        if (res.status === 404) continue;

        if (res.status === 401) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || 'Unauthorized. Please log in as an admin.');
        }
        if (res.status === 403) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || 'Forbidden. Your account lacks admin access.');
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
        }

        const data = await res.json();
        const list = Array.isArray(data?.transactions) ? data.transactions : Array.isArray(data) ? data : [];
        const mapped: Tx[] = list.map(coerceTx);
        mapped.sort((a: Tx, b: Tx) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTx(mapped);
        setLoading(false);
        return;
      } catch (e) {
        lastError = e;
        const msg = String((e as any).message || '').toLowerCase();
        if (msg.includes('unauthorized') || msg.includes('forbidden')) break; // no point trying more
      }
    }

    setLoading(false);
    setErr(`Failed to load transactions${lastError ? `: ${String((lastError as any).message || lastError)}` : ''}`);
  }, [base, authToken]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  const openReceipt = (t: Tx) => {
    if (!base) return;

    // PayPal: prefer captureId, else orderId
    if (t.method === 'PayPal' && (t.captureId || t.orderId)) {
      const qs = t.captureId
        ? `captureId=${encodeURIComponent(t.captureId)}`
        : `orderId=${encodeURIComponent(t.orderId!)}`;
      const url = `${base}/api/admin/proof?${qs}&email=${encodeURIComponent(t.userEmail || '')}&format=pdf`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // M-Pesa: receipt code
    if (t.method === 'M-Pesa' && t.mpesaRef) {
      const url = `${base}/api/admin/proof?mpesaRef=${encodeURIComponent(t.mpesaRef)}&email=${encodeURIComponent(
        t.userEmail || ''
      )}&format=pdf`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Wise: no PDF proof currently
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="app-heading">Transactions</h3>
        <button
          onClick={fetchTx}
          className="chip flex items-center gap-2"
          disabled={loading || !base || !authToken}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {err && <div className="panel p-3 text-sm text-red-500">{err}</div>}

      {loading && (
        <div className="panel p-4 text-sm text-mutedGray dark:text-darkTextSecondary">Loading transactions…</div>
      )}

      {!loading && tx.length === 0 && !err && (
        <div className="panel p-4 text-sm text-mutedGray dark:text-darkTextSecondary">No transactions yet.</div>
      )}

      <div className="grid gap-3">
        {tx.map((t) => (
          <div
            key={t.id}
            className="panel p-4 grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-center"
          >
            <div className="text-sm">
              <p className="font-medium">{t.userEmail || '—'}</p>
              <p className="text-xs text-mutedGray dark:text-darkTextSecondary">
                {t.orderId ? `Order: ${t.orderId}` : '—'}
                {t.captureId ? ` · Capture: ${t.captureId}` : ''}
                {t.mpesaRef ? ` · M-Pesa: ${t.mpesaRef}` : ''}
              </p>
              <p className="text-[11px] text-mutedGray dark:text-darkTextSecondary">
                {new Date(t.date).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">{t.method}</span>
              {t.source === 'withdrawal' && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-darkCard">
                  Withdrawal
                </span>
              )}
            </div>

            <div className="text-sm">{fmtAmount(t)}</div>

            <div>
              <span className={`chip ${t.status === 'Completed' ? 'chip-active' : ''}`}>{t.status}</span>
            </div>

            <div className="flex justify-end">
              <button
                className="chip flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                title={
                  t.method === 'PayPal'
                    ? t.captureId || t.orderId
                      ? 'Open PayPal receipt'
                      : 'No PayPal reference'
                    : t.method === 'M-Pesa'
                    ? t.mpesaRef
                      ? 'Open M-Pesa receipt'
                      : 'No M-Pesa reference'
                    : 'Receipt unavailable'
                }
                onClick={() => openReceipt(t)}
                disabled={
                  (t.method === 'PayPal' && !(t.captureId || t.orderId)) ||
                  (t.method === 'M-Pesa' && !t.mpesaRef) ||
                  t.method === 'Wise'
                }
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
