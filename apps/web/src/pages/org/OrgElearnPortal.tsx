/* apps/web/src/pages/org/OrgElearnPortal.tsx */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { uploadAsset } from '@mytutorapp/shared/api';
import usePayPalCheckout from '@mytutorapp/shared/hooks/usePayPalCheckout';

import {
  getMyOrgOrBootstrap,
  getOrgUsage,
  updateOrgBranding,
  createOrgAssignment,
  getOrgAnalytics,
  upgradeOrgTier,
  sendOrgReportTest,
  sendOrgReportRow,
  initOrgSubscription,
  confirmOrgSubscription,
} from '@mytutorapp/shared/api';

import type { OrgTier } from '@mytutorapp/shared/types';
import type { OrgResp as Org, OrgAnalyticsRow } from '@mytutorapp/shared/api/orgApi';

import { BrandingAssignPane, AnalyticsPane } from './OrgPortalPanes';

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';
type BillingCycle = 'monthly' | 'annual';
type PayMethod = 'PayPal' | 'M-Pesa';

/** Plans & features */
export const ORG_TIERS: Record<
  OrgTier,
  { seats: number; features: string[] }
> = {
  starter: {
    seats: 50,
    features: ['Branding', 'Assignments', 'Monthly analytics'],
  },
  pro: {
    seats: 500,
    features: [
      'Custom pass marks & timers',
      'Monthly/Termly/Yearly analytics',
      'Email reports',
    ],
  },
  enterprise: {
    seats: 5000,
    features: ['SSO / domain restrict', 'CSV export', 'Webhooks', 'Priority support'],
  },
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs text-gray-300">{children}</div>
);

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white/10">
      {children}
    </span>
  );
}

/** ─────────────────────────────────────────────────────────
 * Plan purchase modal (kept here so PayPal hook stays put)
 * ───────────────────────────────────────────────────────── */
function PlanPurchaseModal({
  open,
  onClose,
  tier,
  orgName,
  orgId, backendUrl, token,
  onCheckout,
  onActivated,
}: {
  open: boolean;
  onClose: () => void;
  tier: 'pro' | 'enterprise';
  orgName?: string | null;
  orgId: string;
  backendUrl: string;
  token: string;
  onCheckout: (opts: {
    method: PayMethod;
    cycle: BillingCycle;
    plan: 'pro' | 'enterprise';
    phone?: string;
    reference?: string;
  }) => void;
  onActivated?: () => Promise<void> | void;
}) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<PayMethod>('M-Pesa'); // default to KES flow
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');

  const ORG_PRICING_CENTS = {
    USD: {
      pro:        { monthly: 99_00,    yearly: 990_00 },
      enterprise: { monthly: 399_00,   yearly: 3990_00 },
    },
    KES: {
      pro:        { monthly: 13_500_00, yearly: 13_00 },
      enterprise: { monthly: 55_000_00, yearly: 55_00 },
    },
  } as const;

  const billCycleKey: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
  const currency: 'USD' | 'KES' = method === 'M-Pesa' ? 'KES' : 'USD';
  const priceCents = ORG_PRICING_CENTS[currency][tier][billCycleKey];

  function formatPrice(cur: 'USD' | 'KES', cents: number, key: 'monthly' | 'yearly') {
    const suffix = key === 'monthly' ? '/ mo' : '/ yr';
    if (cur === 'USD') return `$ ${(cents / 100).toFixed(2)} ${suffix}`;
    return `KSh ${Math.round(cents / 100).toLocaleString('en-KE')} ${suffix}`;
  }

  const priceLabel = formatPrice(currency, priceCents, billCycleKey);
  const amountLabel = `${tier.toUpperCase()} • ${cycle === 'monthly' ? 'Monthly' : 'Annual'} • ${priceLabel}`;

  // PayPal: keep created paymentId so we can confirm after approval
  const payPaymentIdRef = useRef<string | null>(null);

  const { containerRef, ready, error } = usePayPalCheckout({
    // Called by the PayPal Buttons SDK to create the order
    createOrder: async () => {
      const init = await initOrgSubscription(backendUrl, token, orgId, {
        tier, cycle: billCycleKey, method: 'PAYPAL',
      });
      payPaymentIdRef.current = init.paymentId;
      return init.orderId!; // use the REAL order created by your backend
    },
    // Called after payer approves in PayPal
    onApproved: async () => {
      if (!payPaymentIdRef.current) throw new Error('Missing paymentId');
      await confirmOrgSubscription(backendUrl, token, payPaymentIdRef.current!);
      payPaymentIdRef.current = null;

      try { await onActivated?.(); } catch {}

      alert('PayPal payment captured. Subscription activated ✅');
      onClose();
    },
  });

  if (!open) return null;

  // COMPACT, RESPONSIVE MODAL
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="relative z-10 w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-2xl bg-[#0f1821] text-white ring-1 ring-white/10 overflow-hidden">
        {/* Header (compact) */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-white/60 truncate">
              Upgrade for {orgName || 'your organization'}
            </div>
            <h3 className="text-base sm:text-lg font-semibold truncate">
              {tier === 'pro' ? 'Upgrade to PRO' : 'Upgrade to ENTERPRISE'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs sm:text-sm bg-white/10 hover:bg-white/15"
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[85vh] overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Grid: controls (L) | plan (R) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* LEFT: Controls */}
            <div className="space-y-3">
              {/* Billing cycle */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm text-white/70">Billing:</span>
                <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-white/10 text-xs sm:text-sm">
                  <button
                    onClick={() => setCycle('monthly')}
                    className={`px-2.5 sm:px-3 py-1.5 ${cycle === 'monthly' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setCycle('annual')}
                    className={`px-2.5 sm:px-3 py-1.5 ${cycle === 'annual' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm text-white/70">Pay with:</span>
                <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-white/10 text-xs sm:text-sm">
                  <button
                    onClick={() => setMethod('PayPal')}
                    className={`px-2.5 sm:px-3 py-1.5 ${method === 'PayPal' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    title="Charges in USD"
                  >
                    PayPal
                  </button>
                  <button
                    onClick={() => setMethod('M-Pesa')}
                    className={`px-2.5 sm:px-3 py-1.5 ${method === 'M-Pesa' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    title="Charges in KES"
                  >
                    M-Pesa
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-white/60">
                <span className="font-medium">Note:</span> M-Pesa charges in <b>KES</b>. PayPal charges in <b>USD</b>.
              </p>

              {/* M-Pesa panel */}
              {method === 'M-Pesa' && (
                <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4 space-y-3">
                  <h4 className="text-sm font-semibold">M-Pesa (KES)</h4>

                  <label className="block">
                    <span className="text-xs sm:text-sm">Safaricom Phone Number</span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="2547XXXXXXXX"
                      className="w-full mt-1 p-2 rounded bg-[#0f1821] ring-1 ring-white/10 outline-none focus:ring-white/20 text-sm"
                    />
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone, reference })}
                      className="w-full sm:w-auto px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
                      title="Send STK push"
                    >
                      Initiate STK Push
                    </button>
                    <button
                      onClick={() => onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone })}
                      className="w-full sm:w-auto px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
                      title="Mark complete after confirming on device"
                    >
                      Complete Payment
                    </button>
                  </div>

                  {/* Collapsible “Reference” (saves space on phones) */}
                  <details className="group rounded-lg bg-white/5 ring-1 ring-white/10">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs sm:text-sm text-white/80 flex items-center justify-between">
                      Having issues? Enter M-Pesa reference
                      <span className="ml-2 text-white/60 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Receipt / reference number"
                        className="w-full p-2 rounded bg-[#0f1821] ring-1 ring-white/10 outline-none focus:ring-white/20 text-sm"
                      />
                      <button
                        onClick={() => onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone, reference })}
                        className="w-full px-3 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm"
                      >
                        Update Reference / Complete
                      </button>
                    </div>
                  </details>
                </div>
              )}

              {/* PayPal panel */}
              {method === 'PayPal' && (
                <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4">
                  <h4 className="text-sm font-semibold">PayPal (USD)</h4>
                  <p className="text-[11px] text-white/70">
                    Pay securely for <b>{amountLabel}</b>.
                  </p>

                  <div ref={containerRef} className="mt-2 sm:mt-3" />
                  {!ready && !error && (
                    <div className="mt-2 text-[11px] text-white/60">Loading PayPal…</div>
                  )}
                  {error && (
                    <div className="mt-2 text-xs text-red-400">{String(error)}</div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Plan summary */}
            <div className="space-y-3">
              <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm sm:text-base font-semibold truncate">{tier.toUpperCase()} plan</h4>
                  <div className="text-right shrink-0">
                    <div className="text-lg sm:text-xl font-semibold">{priceLabel}</div>
                    <div className="text-[11px] text-white/60">
                      {billCycleKey === 'monthly' ? 'per month' : 'per year'} • {currency}
                    </div>
                  </div>
                </div>

                {/* Collapsible features to keep compact on mobile */}
                <details className="group rounded-lg bg-white/5 ring-1 ring-white/10">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs sm:text-sm text-white/80 flex items-center justify-between">
                    Plan features
                    <span className="ml-2 text-white/60 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <ul className="px-4 pb-3 text-xs sm:text-sm list-disc space-y-1 text-white/90">
                    {tier === 'pro' ? (
                      <>
                        <li>Up to 500 seats</li>
                        <li>Custom pass marks & timers</li>
                        <li>Monthly / Termly / Yearly analytics</li>
                        <li>Email reports to admins</li>
                      </>
                    ) : (
                      <>
                        <li>Up to 5,000 seats</li>
                        <li>SSO / domain restrict</li>
                        <li>CSV export & Webhooks</li>
                        <li>Priority support</li>
                      </>
                    )}
                  </ul>
                </details>

                {/* Quick amount tag (always visible) */}
                <div className="text-[11px] sm:text-xs text-white/70">
                  Selected: <b>{amountLabel}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* backdrop click */}
      <button
        aria-hidden
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
}

export default function OrgElearnPortal() {
  const navigate = useNavigate();
  const { backendUrl, token } = useShopContext();
  const [tab, setTab] = useState<TabKey>('branding');

  // org & plan
  const [org, setOrg] = useState<Org | null>(null);
  const tier: OrgTier = (org?.tier as OrgTier) || 'starter';
  const tierMeta = ORG_TIERS[tier];
  const seatsMax = tierMeta.seats;
  const [seatsUsed, setSeatsUsed] = useState<number>(0);

  // plan modals
  const [showProModal, setShowProModal] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  // branding state
  const [form, setForm] = useState<any>({
    name: '',
    logo_url: '',
    signature_url: '',
    certificate_title: 'Certificate of Completion',
    default_pass_mark: 70,
    quiz_time_limit_s: 900,
    allow_retry: false,
    email_domain: '',
    webhook_url: '',
    webhook_enabled: true,
  });

  // assign
  const [courseId, setCourseId] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [passMark, setPassMark] = useState<number | ''>('');
  const [timer, setTimer] = useState<number | ''>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');

  // analytics
  const [period, setPeriod] = useState<Period>('month');
  const [analytics, setAnalytics] = useState<OrgAnalyticsRow[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // celebration modal
  const [showCongrats, setShowCongrats] = useState(false);

  // CTA pulse
  const [ctaPulse, setCtaPulse] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setCtaPulse(true);
      const t = setTimeout(() => setCtaPulse(false), 1200);
      return () => clearTimeout(t);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const goCreateAI = useCallback(() => {
    navigate('/robot-teach');
  }, [navigate]);

  /** Feature gates */
  const hasFeature = useCallback(
    (needle: string) => {
      const list = ORG_TIERS[tier]?.features || [];
      return list.some((f) => f.toLowerCase().includes(needle.toLowerCase()));
    },
    [tier]
  );
  const canBranding = true;
  const canAssignments = true;
  const canMonthly = true;
  const canCustomPassTimers = hasFeature('Custom pass marks & timers');
  const canMultiPeriodAnalytics = hasFeature('Monthly/Termly/Yearly');
  const canEmailReports = hasFeature('Email reports');
  const canSSO = hasFeature('SSO');
  const canCSV = hasFeature('CSV export');
  const canWebhooks = hasFeature('Webhooks');
  const hasPrioritySupport = hasFeature('Priority support');

  /** Load org + usage */
  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const real = await getMyOrgOrBootstrap(backendUrl, token);
        setOrg(real);
        setForm((f: any) => ({ ...f, ...real }));
      } catch (err) {
        console.warn('[OrgElearnPortal] org load failed', err);
      }
    })();
  }, [backendUrl, token]);

  // Clear M-Pesa paymentId if both modals are closed
  useEffect(() => {
    if (!showProModal && !showEnterpriseModal) {
      mpesaPaymentIdRef.current = null;
    }
  }, [showProModal, showEnterpriseModal]);

  useEffect(() => {
    if (!token || !org?.id) return;
    (async () => {
      try {
        const { seats_used } = await getOrgUsage(backendUrl, token, org.id);
        setSeatsUsed(Number(seats_used ?? 0));
      } catch {
        setSeatsUsed(Number(org?.seats_used ?? 0));
      }
    })();
  }, [org?.id, org?.seats_used, backendUrl, token]);

  /** Upload helper (passed down) */
  const handleUpload = async (
    file: File | null,
    target: 'logo_url' | 'signature_url'
  ) => {
    if (!file || !token) return;
    const setBusy = target === 'logo_url' ? setUploadingLogo : setUploadingSignature;
    setBusy(true);
    try {
      const url = await uploadAsset(backendUrl, token, file, 'image');
      setForm((f: any) => ({ ...f, [target]: url }));
    } catch (e: any) {
      alert(e?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  /** Save branding (kept here for validation & confetti) */
  const saveBranding = async () => {
    if (!org?.id || !token) {
      alert('No organization found or not authenticated. Please create your Institution account first (For Institutions → Login/Sign up).');
      return;
    }

    // Validate email domains
    const domStr = String(form.email_domain || '').trim();
    if (domStr) {
      const domains = domStr
        .split(',')
        .map((d: string) => d.trim().toLowerCase())
        .filter(Boolean);
      const bad = domains.filter((d: string) => {
        if (d.includes('://')) return true;
        if (d.includes('@')) return true;
        const cleaned = d.startsWith('*.') ? d.slice(2) : d;
        return !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cleaned);
      });
      if (bad.length) {
        alert(`Invalid domain(s): ${bad.join(', ')}`);
        return;
      }
    }
    if (form.webhook_enabled) {
      const u = String(form.webhook_url || '').trim();
      if (!/^https:\/\/.+/i.test(u)) {
        alert('Webhook URL must be a valid HTTPS URL when webhooks are enabled.');
        return;
      }
    }

    try {
      const updated = await updateOrgBranding(backendUrl, token, org.id, form);
      setOrg((prev) => ({ ...(prev ?? {}), ...(updated ?? {}) } as Org));
      setForm((f: any) => ({ ...f, ...(updated ?? {}) }));

      setShowCongrats(true);
      try {
        const { default: confetti } = await import('canvas-confetti');
        const burst = (count: number) =>
          confetti({
            particleCount: count,
            spread: 72,
            startVelocity: 45,
            origin: { y: 0.7 },
            ticks: 180,
            scalar: 1.2,
          });
        burst(140);
        setTimeout(() => burst(100), 300);
        setTimeout(() => burst(80), 650);
      } catch {}
    } catch (e: any) {
      if (e?.response?.status === 403) {
        alert('Branding not available on your current plan.');
        return;
      }
      alert('Failed to save. Please try again.');
    }
  };

  /** Assignment create */
  const createAssignment = async () => {
    if (!org?.id || !token || !courseId) return;
    try {
      const payload = {
        courseId,
        title_override: titleOverride || null,
        pass_mark: canCustomPassTimers ? (passMark || null) : null,
        timer_s: canCustomPassTimers ? (timer || null) : null,
        due_at: dueAt || null,
      };
      const a = await createOrgAssignment(backendUrl, token, org.id, payload);
      const link = `${window.location.origin}/org/join/${a.invite_code}`;
      setInviteLink(link);
    } catch {
      alert('Failed to create assignment');
    }
  };

  /** Analytics */
  const loadAnalytics = useCallback(async () => {
    if (!org?.id || !token) return;
    setLoadingAnalytics(true);
    try {
      const p: Period = canMultiPeriodAnalytics ? period : 'month';
      const resp = await getOrgAnalytics(backendUrl, token, org.id, p);
      setAnalytics(resp?.data || []);
    } catch {
      setAnalytics([]);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [org?.id, backendUrl, token, period, canMultiPeriodAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /** Plan controls */
  const onUpgradeClick = (next: OrgTier) => {
    if (next === 'pro') {
      setShowProModal(true);
    } else if (next === 'enterprise') {
      setShowEnterpriseModal(true);
    } else {
      if (org?.id && token) {
        upgradeOrgTier(backendUrl, token, org.id, next)
          .then((j) => {
            setOrg((prev: Org | null) => ({ ...((prev ?? {}) as Org), ...j }));
            alert(`Changed plan to ${next.toUpperCase()}.`);
          })
          .catch(() => alert('Plan change failed. Please try again.'));
      }
    }
  };

  const refreshOrgAfterPayment = useCallback(async () => {
    if (!token) return;
    const updated = await getMyOrgOrBootstrap(backendUrl, token);
    setOrg(updated);
  }, [backendUrl, token]);

  /** CSV export */
  const downloadCSV = useCallback(() => {
    try {
      const rows: (string | number)[][] = [
        ['Bucket', 'Attempts', 'Passes', 'Avg Score'],
      ];
      analytics.forEach((r) => {
        const bucketISO = new Date(r.bucket).toISOString();
        const attempts = Number(r.attempts ?? 0);
        const passes = Number(r.passes ?? 0);
        const avg = `${Math.round(r.avg_score ?? 0)}%`;
        rows.push([bucketISO, attempts, passes, avg]);
      });
      const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `org-analytics-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV.');
    }
  }, [analytics, period]);

  // Persistent M-Pesa paymentId ref
  const mpesaPaymentIdRef = useRef<string | null>(null);

  /** Checkout handler (M-Pesa / PayPal) */
  const handleCheckout = useCallback(
    async (
      target: 'pro' | 'enterprise',
      opts: { method: PayMethod; cycle: BillingCycle; phone?: string; reference?: string }
    ) => {
      if (!org?.id || !token) {
        alert('Please sign in and open your organization first.');
        return;
      }
      const apiCycle: 'monthly' | 'yearly' = opts.cycle === 'annual' ? 'yearly' : 'monthly';
      const apiMethod: 'MPESA' | 'PAYPAL' = opts.method === 'M-Pesa' ? 'MPESA' : 'PAYPAL';

      try {
        // M-Pesa flow
        if (apiMethod === 'MPESA') {
          if (!opts.phone) { alert('Enter your Safaricom phone'); return; }

          // OPTIONAL: simple phone sanity check (Kenyan format)
          if (!/^2547\d{8}$/.test(String(opts.phone))) {
            alert('Phone must be like 2547XXXXXXXX');
            return;
          }

          // 1) Not initialized yet → init STK, keep paymentId, stop here
          if (!mpesaPaymentIdRef.current) {
            const init = await initOrgSubscription(backendUrl, token, org.id, {
              tier: target, cycle: apiCycle, method: 'MPESA', phone: opts.phone,
            });
            mpesaPaymentIdRef.current = init.paymentId;

            // New copy: user can just hit Complete Payment after approving on phone
            alert('STK Push sent. After approving on your phone, tap “Complete Payment”. If confirmation lags, you may paste the M-Pesa receipt below and press “Update Reference / Complete”.');
            return;
          }

          // 2) Manual path: reference entered → confirm with reference
          if (opts.reference) {
            await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!, opts.reference);
            mpesaPaymentIdRef.current = null;
            alert('Payment confirmed. Subscription activated ✅');
            if (target === 'pro') setShowProModal(false);
            if (target === 'enterprise') setShowEnterpriseModal(false);
            const updated = await getMyOrgOrBootstrap(backendUrl, token);
            setOrg(updated);
            return;
          }

          // 3) Preferred path: try to confirm WITHOUT a reference
          try {
            await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!);
            mpesaPaymentIdRef.current = null;
            alert('Payment confirmed. Subscription activated ✅');
            if (target === 'pro') setShowProModal(false);
            if (target === 'enterprise') setShowEnterpriseModal(false);
            const updated = await getMyOrgOrBootstrap(backendUrl, token);
            setOrg(updated);
            return;
          } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || '';
            if (/reference missing/i.test(msg)) {
              // Callback lag → wait 5s and try once more
              await new Promise(r => setTimeout(r, 5000));
              try {
                await confirmOrgSubscription(backendUrl, token, mpesaPaymentIdRef.current!);
                mpesaPaymentIdRef.current = null;
                alert('Payment confirmed. Subscription activated ✅');
                if (target === 'pro') setShowProModal(false);
                if (target === 'enterprise') setShowEnterpriseModal(false);
                const updated = await getMyOrgOrBootstrap(backendUrl, token);
                setOrg(updated);
                return;
              } catch (err2: any) {
                const msg2 = err2?.response?.data?.message || err2?.message || '';
                if (/reference missing/i.test(msg2)) {
                  alert('We’re still waiting for M-Pesa to confirm. If you have the receipt on your phone, enter it below and press “Update Reference / Complete”.');
                  return;
                }
                alert(msg2 || 'Payment confirmation failed. Please try again.');
                return;
              }
            }
            alert(msg || 'Payment confirmation failed. Please try again.');
            return;
          }
        }
        // PAYPAL handled via the PayPal Buttons in the modal
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Payment failed — please try again.';
        alert(msg);
      }
    },
    [backendUrl, org?.id, token]
  );

  /** Helpers */
  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / seatsMax) * 100));
  const nearLimit = seatPct >= 90;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied!');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 pt-5 pb-24 sm:pb-32">
      <div className="max-w-screen-xl mx-auto space-y-4">
        {/* Header & Tabs */}
        <header className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Institution E-Learning</h1>
              <div className="text-white/70 text-xs sm:text-sm">
                Branding • Assignments • Analytics
              </div>
            </div>

            {/* Tabs + CTA */}
            <div className="-mx-1 px-1 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex gap-2">
                  {(['branding', 'assign', 'analytics'] as TabKey[]).map((t) => (
                    <button
                      key={t}
                      className={`px-3 py-1.5 rounded-xl text-sm ring-1 whitespace-nowrap ${
                        tab === t ? 'bg-white/10 ring-white/20' : 'bg-white/5 ring-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => setTab(t)}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Primary CTA */}
                <button
                  onClick={goCreateAI}
                  title="Type any topic — AI builds your course"
                  className={[
                    'relative group hidden sm:inline-flex items-center gap-1.5',
                    'ml-1 px-4 py-2 rounded-2xl text-sm font-semibold',
                    'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500',
                    'text-white ring-1 ring-emerald-300/30 shadow-lg shadow-emerald-500/20',
                    'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
                    ctaPulse ? 'motion-safe:animate-pulse' : '',
                    'motion-reduce:transition-none motion-reduce:animate-none',
                  ].join(' ')}
                >
                  <span className="text-base leading-none">🤖</span>
                  <span>Create with AI</span>
                  <span className="relative ml-1 h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-60 motion-safe:animate-ping motion-reduce:hidden"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-60 transition duration-300 blur-lg bg-emerald-400/30"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Plan bar */}
          <div className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  Plan: <span className="ml-1 font-semibold">{tier.toUpperCase()}</span>
                </Pill>
                <Pill>
                  Seats: {seatsUsed}/{seatsMax}
                </Pill>
                {hasPrioritySupport && <Pill>Priority support</Pill>}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none sm:w-40 h-2 rounded bg-white/10 overflow-hidden ring-1 ring-white/10">
                  <div
                    className={`h-full ${nearLimit ? 'bg-red-400' : 'bg-emerald-400'}`}
                    style={{ width: `${seatPct}%` }}
                  />
                </div>
                {nearLimit && <span className="text-xs text-red-300">Near seat limit</span>}

                <div className="hidden sm:block w-px h-5 bg-white/10 mx-1" />

                <div className="flex flex-wrap gap-1">
                  {(['starter', 'pro', 'enterprise'] as OrgTier[])
                    .filter((t) => t !== tier)
                    .map((next) => (
                      <button
                        key={next}
                        onClick={() => onUpgradeClick(next)}
                        className="px-2 py-1 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500"
                        title={`Upgrade to ${next.toUpperCase()}`}
                      >
                        Upgrade → {next.toUpperCase()}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {ORG_TIERS[tier].features.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white/90"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* PANES (split) */}
        {(tab === 'branding' || tab === 'assign') && (
          <BrandingAssignPane
            tab={tab}
            setTab={setTab}
            // capabilities
            canBranding={canBranding}
            canAssignments={canAssignments}
            canCustomPassTimers={canCustomPassTimers}
            canSSO={canSSO}
            canWebhooks={canWebhooks}
            canEmailReports={canEmailReports}
            // org/session
            org={org}
            token={token}
            backendUrl={backendUrl}
            // branding form
            form={form}
            setForm={setForm}
            uploadingLogo={uploadingLogo}
            uploadingSignature={uploadingSignature}
            onUpload={handleUpload}
            onSaveBranding={saveBranding}
            // email reports (test)
            onSendTestReport={async () => {
              if (!org?.id || !token) return;
              try {
                const resp = await sendOrgReportTest(
                  backendUrl,
                  token,
                  org.id,
                  org?.owner_email || undefined
                );
                if (resp?.ok) alert('Sent a test report to your admin email.');
                else alert('Failed to send report.');
              } catch {
                alert('Failed to send report.');
              }
            }}
            // assignment
            courseId={courseId}
            setCourseId={setCourseId}
            titleOverride={titleOverride}
            setTitleOverride={setTitleOverride}
            passMark={passMark}
            setPassMark={setPassMark}
            timer={timer}
            setTimer={setTimer}
            dueAt={dueAt}
            setDueAt={setDueAt}
            onCreateAssignment={createAssignment}
            inviteLink={inviteLink}
            copyLink={copyLink}
          />
        )}

        {tab === 'analytics' && (
          <AnalyticsPane
            period={period}
            setPeriod={setPeriod}
            canMultiPeriodAnalytics={canMultiPeriodAnalytics}
            canEmailReports={canEmailReports}
            canCSV={canCSV}
            loadingAnalytics={loadingAnalytics}
            analytics={analytics}
            onRefresh={loadAnalytics}
            onExportCSV={downloadCSV}
            onSendReportRow={async (bucketISO, p) => {
              if (!org?.id || !token) return;
              try {
                const ok = await sendOrgReportRow(
                  backendUrl,
                  token,
                  org.id,
                  bucketISO,
                  p as Period
                );
                if (ok?.ok) alert('Report queued.');
                else alert('Failed to queue report.');
              } catch {
                alert('Failed to queue report.');
              }
            }}
            canMonthly={canMonthly}
          />
        )}
      </div>

      {/* Congrats modal */}
      {showCongrats && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1821] ring-1 ring-white/10 p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <span className="text-xl">🎉</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Brand saved!</h3>
                <p className="mt-1 text-sm text-white/80">
                  Your institution profile is ready. Want to create your first course with AI now?
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setShowCongrats(false); goCreateAI(); }}
                className="btn bg-emerald-600 hover:bg-emerald-500"
              >
                Create with AI
              </button>
              <button
                onClick={() => { setShowCongrats(false); setTab('assign'); }}
                className="chip chip-active"
                title="Go to Assignments"
              >
                Set up an assignment
              </button>
              <button
                onClick={() => setShowCongrats(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky CTA */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-[95]">
        <button
          onClick={goCreateAI}
          aria-label="Create with AI"
          className={[
            'relative w-full inline-flex items-center justify-center gap-2',
            'px-5 py-3 rounded-2xl text-base font-semibold',
            'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500',
            'text-white ring-1 ring-emerald-300/30 shadow-xl shadow-emerald-500/25',
            'transition-all duration-300 active:scale-[0.98]',
            ctaPulse ? 'motion-safe:animate-pulse' : '',
            'motion-reduce:transition-none motion-reduce:animate-none',
          ].join(' ')}
        >
          <span className="text-xl leading-none">🤖</span>
          <span>Create with AI</span>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl blur-lg opacity-50 bg-emerald-400/30"
          />
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-60 motion-safe:animate-ping motion-reduce:hidden"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </button>
      </div>

      {/* Modals */}
      <PlanPurchaseModal
        open={showProModal}
        onClose={() => setShowProModal(false)}
        tier="pro"
        orgName={org?.name}
        orgId={org?.id!}
        backendUrl={backendUrl}
        token={token!}
        onCheckout={(opts) => handleCheckout('pro', opts)}
        onActivated={refreshOrgAfterPayment}
      />
      <PlanPurchaseModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        tier="enterprise"
        orgName={org?.name}
        orgId={org?.id!}
        backendUrl={backendUrl}
        token={token!}
        onCheckout={(opts) => handleCheckout('enterprise', opts)}
        onActivated={refreshOrgAfterPayment}
      />
    </div>
  );
}
