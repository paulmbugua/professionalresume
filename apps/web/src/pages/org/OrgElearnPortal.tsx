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

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';
type BillingCycle = 'monthly' | 'annual';
type PayMethod = 'PayPal' | 'M-Pesa';

/** ─────────────────────────────────────────────────────────
 *  Plans & features
 *  ───────────────────────────────────────────────────────── */
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

function PlanPurchaseModal({
  open,
  onClose,
  tier,
  orgName,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  tier: 'pro' | 'enterprise';
  orgName?: string | null;
  onCheckout: (opts: {
    method: PayMethod;
    cycle: BillingCycle;
    plan: 'pro' | 'enterprise';
    phone?: string;
    reference?: string;
  }) => void;
}) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<PayMethod>('M-Pesa'); // default to KES flow
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');

  /** ─────────────────────────────────────────────────────────
   *  Pricing (mirrors backend services/orgPricing.js)
   *  ───────────────────────────────────────────────────────── */
  const ORG_PRICING_CENTS = {
    USD: {
      pro:        { monthly: 99_00,    yearly: 990_00 },
      enterprise: { monthly: 399_00,   yearly: 3990_00 },
    },
    KES: {
      pro:        { monthly: 13_500_00, yearly: 135_000_00 },
      enterprise: { monthly: 55_000_00, yearly: 550_000_00 },
    },
  } as const;

  const billCycleKey: 'monthly' | 'yearly' = cycle === 'annual' ? 'yearly' : 'monthly';
  const currency: 'USD' | 'KES' = method === 'M-Pesa' ? 'KES' : 'USD';
  const priceCents = ORG_PRICING_CENTS[currency][tier][billCycleKey];

  function formatPrice(cur: 'USD' | 'KES', cents: number, key: 'monthly' | 'yearly') {
    const suffix = key === 'monthly' ? '/ mo' : '/ yr';
    if (cur === 'USD') return `$ ${(cents / 100).toFixed(2)} ${suffix}`;
    // KES shown without decimals
    return `KSh ${Math.round(cents / 100).toLocaleString('en-KE')} ${suffix}`;
  }

  const priceLabel = formatPrice(currency, priceCents, billCycleKey);

  // Treat plan+cycle like a product for PayPal hook
  const planId = `sub-${tier}-${cycle}`;
  const amountLabel = `${tier.toUpperCase()} • ${cycle === 'monthly' ? 'Monthly' : 'Annual'} • ${priceLabel}`;

  // Mount PayPal buttons when PayPal is selected
  const { containerRef, ready, error } = usePayPalCheckout({
    packageId: planId,          // your backend can interpret this as a subscription plan
    amountLabel,                // visible label beneath PayPal buttons
    onApproved: () => {
      onCheckout({ method: 'PayPal', cycle, plan: tier });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl bg-[#0f1821] text-white ring-1 ring-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-xs text-white/60">Upgrade for {orgName || 'your organization'}</div>
            <h3 className="text-lg font-semibold">
              {tier === 'pro' ? 'Upgrade to PRO' : 'Upgrade to ENTERPRISE'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm bg-white/10 hover:bg-white/15"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-5">
          {/* Billing cycle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/70">Billing:</span>
            <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-white/10">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-3 py-1.5 text-sm ${
                  cycle === 'monthly' ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle('annual')}
                className={`px-3 py-1.5 text-sm ${
                  cycle === 'annual' ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                }`}
              >
                Annual (save more)
              </button>
            </div>
          </div>

          {/* Payment method chooser */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/70">Pay with:</span>
            <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-white/10">
              <button
                onClick={() => setMethod('PayPal')}
                className={`px-3 py-1.5 text-sm ${
                  method === 'PayPal' ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                }`}
                title="Charges in USD"
              >
                PayPal (USD)
              </button>
              <button
                onClick={() => setMethod('M-Pesa')}
                className={`px-3 py-1.5 text-sm ${
                  method === 'M-Pesa' ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                }`}
                title="Charges in KES"
              >
                M-Pesa (KES)
              </button>
            </div>
          </div>

          {/* Info note */}
          <div className="text-[11px] text-white/60">
            <span className="font-medium">Note:</span> Paying with M-Pesa charges in <b>KES</b>. Paying with PayPal charges in <b>USD</b>.
          </div>

          {/* Plan features preview + price */}
          <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h4 className="text-base font-semibold">{tier.toUpperCase()} plan</h4>
              <div className="text-right">
                <div className="text-lg font-semibold">{priceLabel}</div>
                <div className="text-[11px] text-white/60">
                  {billCycleKey === 'monthly' ? 'per month' : 'per year'} • {currency}
                </div>
              </div>
            </div>

            <ul className="text-sm list-disc pl-5 space-y-1 text-white/90">
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
          </div>

          {/* Payment panels */}
          {method === 'M-Pesa' && (
            <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-sm font-semibold">M-Pesa details (KES)</h4>

              <label className="block">
                <span className="text-sm">Safaricom Phone Number</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  className="w-full mt-1 p-2 rounded bg-[#0f1821] ring-1 ring-white/10 outline-none focus:ring-white/20 text-sm"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone ,  reference})
                  }
                  className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
                  title="Send STK push"
                >
                  Initiate STK Push
                </button>
                <button
                  onClick={() =>
                    onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone })
                  }
                  className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
                  title="Mark payment complete after confirming on device"
                >
                  Complete Payment
                </button>
              </div>

              <div className="pt-3 border-t border-white/10">
                <label className="block">
                  <span className="text-sm">M-Pesa Reference (if STK failed)</span>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Enter reference"
                    className="w-full mt-1 p-2 rounded bg-[#0f1821] ring-1 ring-white/10 outline-none focus:ring-white/20 text-sm"
                  />
                </label>
                <button
                  onClick={() =>
                    onCheckout({ method: 'M-Pesa', cycle, plan: tier, phone, reference })
                  }
                  className="w-full mt-2 px-3 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm"
                >
                  Update Reference
                </button>
              </div>
            </div>
          )}

          {method === 'PayPal' && (
            <div className="rounded-xl ring-1 ring-white/10 bg-white/5 p-4">
              <h4 className="text-sm font-semibold">PayPal (USD)</h4>
              <p className="text-xs text-white/70">
                Click to pay securely with PayPal for <b>{amountLabel}</b>.
              </p>

              <div ref={containerRef} className="mt-3" />
              {!ready && !error && (
                <div className="mt-2 text-xs text-white/60">Loading PayPal…</div>
              )}
              {error && (
                <div className="mt-2 text-xs text-red-400">{String(error)}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop close on click (stays underneath the panel due to z-index) */}
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

  // NEW: plan modals
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
    webhook_url: '', // (enterprise) optional
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

  // celebration + next-step modal
  const [showCongrats, setShowCongrats] = useState(false);

  // ⬇️ refs for hidden file inputs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // 🔔 Subtle periodic pulse for the CTA (every 8s, 1.2s pulse)
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

  const hasFeature = useCallback(
    (needle: string) => {
      const list = ORG_TIERS[tier]?.features || [];
      return list.some((f) => f.toLowerCase().includes(needle.toLowerCase()));
    },
    [tier]
  );

  const canBranding = true; // 'Branding' is Starter+
  const canAssignments = true; // 'Assignments' is Starter+
  const canMonthly = true; // monthly is Starter+
  const canCustomPassTimers = hasFeature('Custom pass marks & timers'); // Pro+
  const canMultiPeriodAnalytics = hasFeature('Monthly/Termly/Yearly'); // Pro+
  const canEmailReports = hasFeature('Email reports'); // Pro+
  const canSSO = hasFeature('SSO'); // Enterprise
  const canCSV = hasFeature('CSV export'); // Enterprise
  const canWebhooks = hasFeature('Webhooks'); // Enterprise
  const hasPrioritySupport = hasFeature('Priority support'); // Enterprise

  /** Load org + seats usage */
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

  const saveBranding = async () => {
    if (!org?.id || !token) {
      alert(
        'No organization found or not authenticated. Please create your Institution account first (For Institutions → Login/Sign up).'
      );
      return;
    }

     // ── Input validation (client-side, quick feedback) ─────────────────────
   const domStr = String(form.email_domain || '').trim();
   if (domStr) {
     const domains = domStr
       .split(',')
       .map((d: string) => d.trim().toLowerCase())
       .filter(Boolean);
     const bad = domains.filter((d: string) => {
       if (d.includes('://')) return true;
       if (d.includes('@')) return true;
       // allow "*.sub.example" or "example.edu"
       const cleaned = d.startsWith('*.') ? d.slice(2) : d;
       // very loose FQDN-ish check
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
      setOrg(updated);

      // 🎉 Confetti + “what next?” modal
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
      } catch {
        // If canvas-confetti missing, just skip the effect.
      }
    } catch (e: any) {
      if (e?.response?.status === 403) {
        alert('Branding not available on your current plan.');
        return;
      }
      alert('Failed to save. Please try again.');
    }
  };

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

  // Export analytics table to CSV (Excel-friendly via BOM)
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

      // BOM helps Excel open UTF-8 correctly
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


  const handleCheckout = useCallback(
  async (
    target: 'pro' | 'enterprise',
    opts: { method: PayMethod; cycle: BillingCycle; phone?: string; reference?: string }
  ) => {
    if (!org?.id || !token) {
      alert('Please sign in and open your organization first.');
      return;
    }

    // Map UI cycle -> API cycle
    const apiCycle: 'monthly' | 'yearly' = opts.cycle === 'annual' ? 'yearly' : 'monthly';
    const apiMethod: 'MPESA' | 'PAYPAL' = opts.method === 'M-Pesa' ? 'MPESA' : 'PAYPAL';

    try {
      if (apiMethod === 'MPESA') {
        if (!opts.phone) {
          alert('Enter your Safaricom phone (e.g. 2547XXXXXXXX)');
          return;
        }

        // 1) INIT => creates payment row + triggers STK
        const init = await initOrgSubscription(backendUrl, token, org.id, {
          tier: target,
          cycle: apiCycle,
          method: 'MPESA',
          phone: opts.phone,
        });

        // 2) Ask user to enter M-Pesa receipt, then CONFIRM
        if (opts.reference && init?.paymentId) {
          await confirmOrgSubscription(backendUrl, token, init.paymentId, opts.reference);
          alert('Payment confirmed. Subscription activated ✅');

          // Close modal & refresh org to show new tier/seats
          if (target === 'pro') setShowProModal(false);
          if (target === 'enterprise') setShowEnterpriseModal(false);

          const updated = await getMyOrgOrBootstrap(backendUrl, token);
          setOrg(updated);
        } else {
          alert('STK Push sent. After approving on your phone, enter the M-Pesa reference then tap “Update Reference / Complete”.');
        }
      } else {
        // PAYPAL: init creates a provider_order_id; confirm() captures it server-side
        const init = await initOrgSubscription(backendUrl, token, org.id, {
          tier: target,
          cycle: apiCycle,
          method: 'PAYPAL',
        });

        if (!init?.paymentId) {
          alert('Failed to start PayPal checkout.');
          return;
        }

        // In your stub backend, confirm() captures immediately.
        await confirmOrgSubscription(backendUrl, token, init.paymentId);
        alert('PayPal payment captured. Subscription activated ✅');

        if (target === 'pro') setShowProModal(false);
        if (target === 'enterprise') setShowEnterpriseModal(false);

        const updated = await getMyOrgOrBootstrap(backendUrl, token);
        setOrg(updated);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Payment failed — please try again.';
      alert(msg);
    }
  },
  [backendUrl, org?.id, token, setShowProModal, setShowEnterpriseModal]
);



  /** Helpers */
  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / seatsMax) * 100));
  const nearLimit = seatPct >= 90;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied!');
    } catch {
      /* noop */
    }
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

            {/* Scrollable tabs on mobile + CTA */}
            <div className="-mx-1 px-1 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex gap-2">
                  {(['branding', 'assign', 'analytics'] as TabKey[]).map((t) => (
                    <button
                      key={t}
                      className={`px-3 py-1.5 rounded-xl text-sm ring-1 whitespace-nowrap
                        ${
                          tab === t
                            ? 'bg-white/10 ring-white/20'
                            : 'bg-white/5 ring-white/10 hover:bg-white/10'
                        }`}
                      onClick={() => setTab(t)}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Primary CTA: Create with AI (desktop/tablet) */}
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
                  {/* tiny ping dot */}
                  <span className="relative ml-1 h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-60 motion-safe:animate-ping motion-reduce:hidden"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>

                  {/* subtle glow on hover */}
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

                {/* Divider (hide on very small) */}
                <div className="hidden sm:block w-px h-5 bg-white/10 mx-1" />

                {/* Upgrade buttons wrap if needed */}
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

            {/* Feature chips */}
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

        {/* BRANDING */}
        {tab === 'branding' && (
          <section className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4 grid sm:grid-cols-2 gap-3 sm:gap-4">
            {!canBranding && (
              <div className="sm:col-span-2 text-sm text-amber-300">
                Branding is not included on your plan. Upgrade to enable.
              </div>
            )}

            <div>
              <Label>Institution Name</Label>
              <input
                className="input mt-1 w-full"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme College"
                disabled={!canBranding}
              />
            </div>

            <div>
              <Label>Certificate Title (optional)</Label>
              <input
                className="input mt-1 w-full"
                value={form.certificate_title || ''}
                onChange={(e) =>
                  setForm({ ...form, certificate_title: e.target.value })
                }
                placeholder="Certificate of Completion"
                disabled={!canBranding}
              />
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded bg-white/10 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-white/60 px-1 text-center">
                      No logo
                    </span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="input w-full"
                    value={form.logo_url || ''}
                    onChange={(e) =>
                      setForm({ ...form, logo_url: e.target.value })
                    }
                    placeholder="https://..."
                    disabled={!canBranding}
                  />
                  {/* hidden input + button trigger */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canBranding || uploadingLogo || !token}
                    onChange={async (e) => {
                      const inputEl = e.currentTarget;
                      const file = inputEl.files?.[0] ?? null;
                      if (!file) return;
                      await handleUpload(file, 'logo_url');
                      inputEl.value = '';
                    }}
                  />

                  <button
                    type="button"
                    disabled={!canBranding || uploadingLogo || !token}
                    className={`btn w-full sm:w-auto ${
                      uploadingLogo
                        ? 'opacity-60 cursor-wait'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                    title={!token ? 'Login required' : undefined}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label>Registrar Signature</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded bg-white/10 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                  {form.signature_url ? (
                    <img
                      src={form.signature_url}
                      alt="Registrar Signature"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-white/60 px-1 text-center">
                      No signature
                    </span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="input w-full"
                    value={form.signature_url || ''}
                    onChange={(e) =>
                      setForm({ ...form, signature_url: e.target.value })
                    }
                    placeholder="https://..."
                    disabled={!canBranding}
                  />
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canBranding || uploadingSignature || !token}
                    onChange={async (e) => {
                      const inputEl = e.currentTarget;
                      const file = inputEl.files?.[0] ?? null;
                      if (!file) return;
                      await handleUpload(file, 'signature_url');
                      inputEl.value = '';
                    }}
                  />

                  <button
                    type="button"
                    disabled={!canBranding || uploadingSignature || !token}
                    className={`btn w-full sm:w-auto ${
                      uploadingSignature
                        ? 'opacity-60 cursor-wait'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                    title={!token ? 'Login required' : undefined}
                    onClick={() => sigInputRef.current?.click()}
                  >
                    {uploadingSignature ? 'Uploading…' : 'Upload Signature'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label>Default Pass Mark</Label>
                {!canCustomPassTimers && <Pill>Pro+</Pill>}
              </div>
              <input
                type="number"
                min={1}
                max={100}
                className="input mt-1 w-full"
                value={form.default_pass_mark || 70}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_pass_mark: Number(e.target.value) || 70,
                  })
                }
                disabled={!canCustomPassTimers}
                title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label>Quiz Time Limit (seconds)</Label>
                {!canCustomPassTimers && <Pill>Pro+</Pill>}
              </div>
              <input
                type="number"
                min={60}
                step={30}
                className="input mt-1 w-full"
                value={form.quiz_time_limit_s || 900}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quiz_time_limit_s: Number(e.target.value) || 900,
                  })
                }
                disabled={!canCustomPassTimers}
                title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="allow_retry"
                type="checkbox"
                checked={!!form.allow_retry}
                onChange={(e) =>
                  setForm({ ...form, allow_retry: e.target.checked })
                }
                disabled={!canCustomPassTimers}
                title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
              />
              <label htmlFor="allow_retry" className="text-sm">
                Allow retry? <span className="text-white/50">(default off)</span>
              </label>
              {!canCustomPassTimers && <Pill>Pro+</Pill>}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label>Restrict invites by email domain</Label>
                {!canSSO && <Pill>Enterprise</Pill>}
              </div>
              <input
                className="input mt-1 w-full"
                value={form.email_domain || ''}
                onChange={(e) => setForm({ ...form, email_domain: e.target.value })}
                placeholder="example.edu"
                disabled={!canSSO}
                title={!canSSO ? 'Available on Enterprise' : ''}
              />
              <div className="mt-1 text-[11px] text-white/60">
               Comma-separated. Supports wildcards like <code>*.example.edu</code>.
               Learners with other domains cannot accept invites.
             </div>


            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label>Webhook (on submit / pass)</Label>
                {!canWebhooks && <Pill>Enterprise</Pill>}
              </div>
              <div className="flex items-center gap-2 mt-1">
               <input
                 id="webhook_enabled"
                 type="checkbox"
                 checked={!!form.webhook_enabled}
                 onChange={(e) => setForm({ ...form, webhook_enabled: e.target.checked })}
                 disabled={!canWebhooks}
                 title={!canWebhooks ? 'Available on Enterprise' : ''}
               />
               <label htmlFor="webhook_enabled" className="text-sm">
                 Enable webhooks
               </label>
             </div>
              <input
                className="input mt-1 w-full"
                value={form.webhook_url || ''}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                placeholder="https://your.system/hooks/elearn"
                disabled={!canWebhooks}
                title={!canWebhooks ? 'Available on Enterprise' : ''}
              />

               <div className="mt-1 text-[11px] text-white/60">
               We POST JSON to this URL with headers:
               <code className="ml-1">X-DayBreak-Event</code>,
               <code className="ml-1">X-DayBreak-Timestamp</code>,
               <code className="ml-1">X-DayBreak-Signature</code> (HMAC-SHA256 of <code>ts.payload</code>).
               Events: <code>quiz_submitted</code>, <code>quiz_passed</code>. Delivery retries run every minute.
             </div>
             {/* 👇 Add the test button right here */}
  <button
    className="chip chip-active mt-2"
    disabled={
      !canWebhooks ||
      !org?.id ||
      !token ||
      !form.webhook_enabled ||
      !form.webhook_url
    }
    onClick={async () => {
      try {
        const resp = await fetch(`${backendUrl}/api/orgs/${org!.id}/webhooks/test`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (!resp.ok) {
          const j = await resp.json().catch(() => null);
          throw new Error(j?.message || `HTTP ${resp.status}`);
        }
        alert('Test webhook queued. Check your receiver logs.');
      } catch (e: any) {
        alert(e?.message || 'Failed to queue test webhook.');
      }
    }}
  >
    Send test webhook
  </button>
            </div>

            {canEmailReports && (
              <div className="sm:col-span-2 rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium">Email reports</div>
                    <div className="text-xs text-white/70">
                      Send periodic analytics to admins
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      className="btn bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto"
                      onClick={async () => {
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
                    >
                      Send test report
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                onClick={saveBranding}
                disabled={!org?.id || !token}
                className="btn bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save Branding
              </button>
            </div>
          </section>
        )}

        {/* ASSIGN */}
        {tab === 'assign' && (
          <section className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4 space-y-3">
            {!canAssignments && (
              <div className="text-sm text-amber-300">
                Assignments are not available on your plan. Upgrade to enable.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Course ID</Label>
                <input
                  className="input mt-1 w-full"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="course uuid"
                  disabled={!canAssignments}
                />
              </div>
              <div>
                <Label>Title Override (optional)</Label>
                <input
                  className="input mt-1 w-full"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  placeholder="Intro to Cybersecurity — Cohort A"
                  disabled={!canAssignments}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label>Pass Mark (optional)</Label>
                  {!canCustomPassTimers && <Pill>Pro+</Pill>}
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="input mt-1 w-full"
                  value={passMark}
                  onChange={(e) =>
                    setPassMark(e.target.value ? Number(e.target.value) : '')
                  }
                  disabled={!canAssignments || !canCustomPassTimers}
                  title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label>Timer seconds (optional)</Label>
                  {!canCustomPassTimers && <Pill>Pro+</Pill>}
                </div>
                <input
                  type="number"
                  min={60}
                  step={30}
                  className="input mt-1 w-full"
                  value={timer}
                  onChange={(e) =>
                    setTimer(e.target.value ? Number(e.target.value) : '')
                  }
                  disabled={!canAssignments || !canCustomPassTimers}
                  title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
                />
              </div>
              <div>
                <Label>Due at (optional, ISO)</Label>
                <input
                  className="input mt-1 w-full"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  placeholder="2025-09-30T23:59:59Z"
                  disabled={!canAssignments}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={createAssignment}
                className={`btn ${
                  canAssignments
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-white/10 cursor-not-allowed'
                } w-full sm:w-auto`}
                disabled={!canAssignments}
              >
                Create assignment
              </button>
              {inviteLink && (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    className="input w-full"
                    readOnly
                    value={inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button onClick={copyLink} className="chip chip-active">
                    Copy
                  </button>
                </div>
              )}

              {inviteLink && (org?.email_domain || form.email_domain) && (
               <div className="text-[11px] text-amber-300">
                 This invite is restricted to: <b>{(form.email_domain || org?.email_domain || '').trim()}</b>
               </div>
             )}
            </div>

            <p className="text-xs text-white/70">
              Share the link. Learners join → timer starts → one attempt → auto email → results on
              this dashboard.
            </p>
          </section>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <section className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={() => setPeriod('month')}
                className={`chip ${period === 'month' ? 'chip-active' : ''}`}
              >
                Month
              </button>
              <button
                onClick={() => canMultiPeriodAnalytics && setPeriod('term')}
                className={`chip ${period === 'term' ? 'chip-active' : ''} ${
                  !canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={!canMultiPeriodAnalytics ? 'Termly analytics is Pro+' : ''}
              >
                Term
              </button>
              <button
                onClick={() => canMultiPeriodAnalytics && setPeriod('year')}
                className={`chip ${period === 'year' ? 'chip-active' : ''} ${
                  !canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={!canMultiPeriodAnalytics ? 'Yearly analytics is Pro+' : ''}
              >
                Year
              </button>

              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                {canCSV && (
                  <button
                    onClick={downloadCSV}
                    className="chip chip-active w-full sm:w-auto"
                    title="Export CSV (Enterprise)"
                  >
                    Export CSV
                  </button>
                )}
                {loadingAnalytics && (
                  <span className="text-xs text-white/70">Loading…</span>
                )}
                <button onClick={loadAnalytics} className="chip w-full sm:w-auto">
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="text-left text-white/70">
                  <tr>
                    <th className="py-2 pr-4">Bucket</th>
                    <th className="py-2 pr-4">Attempts</th>
                    <th className="py-2 pr-4">Passes</th>
                    <th className="py-2 pr-4">Avg Score</th>
                    {canEmailReports && <th className="py-2 pr-4">Send</th>}
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((r, i) => (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-2 pr-4">
                        {new Date(r.bucket).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">{r.attempts}</td>
                      <td className="py-2 pr-4">{r.passes}</td>
                      <td className="py-2 pr-4">
                        {Math.round(r.avg_score || 0)}%
                      </td>
                      {canEmailReports && (
                        <td className="py-2 pr-4">
                          <button
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                            onClick={async () => {
                              if (!org?.id || !token) return;
                              try {
                                const ok = await sendOrgReportRow(
                                  backendUrl,
                                  token,
                                  org.id,
                                  r.bucket,
                                  period
                                );
                                if (ok?.ok) alert('Report queued.');
                                else alert('Failed to queue report.');
                              } catch {
                                alert('Failed to queue report.');
                              }
                            }}
                          >
                            Email row
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!analytics.length && (
                    <tr className="border-t border-white/10">
                      <td
                        className="py-6 pr-4 text-white/60"
                        colSpan={canEmailReports ? 5 : 4}
                      >
                        No data for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!canMonthly && (
              <div className="mt-3 text-xs text-amber-300">
                Monthly analytics are not included. Upgrade to view analytics.
              </div>
            )}
          </section>
        )}
      </div>

      {/* 🎉 Congrats & Next-step modal */}
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

      {/* 📱 Sticky mobile CTA: always-visible on small screens */}
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

          {/* soft glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl blur-lg opacity-50 bg-emerald-400/30"
          />

          {/* gentle corner ping */}
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-60 motion-safe:animate-ping motion-reduce:hidden"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </button>
      </div>

      {/* 🔓 PRO modal */}
      <PlanPurchaseModal
        open={showProModal}
        onClose={() => setShowProModal(false)}
        tier="pro"
        orgName={org?.name}
        onCheckout={(opts) => handleCheckout('pro', opts)}
      />

      {/* 🛡 ENTERPRISE modal */}
      <PlanPurchaseModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        tier="enterprise"
        orgName={org?.name}
        onCheckout={(opts) => handleCheckout('enterprise', opts)}
      />
    </div>
  );
}
