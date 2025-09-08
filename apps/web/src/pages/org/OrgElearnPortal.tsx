import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import { uploadAsset } from '@mytutorapp/shared/api';


/** ─────────────────────────────────────────────────────────
 *  Plans & features
 *  ───────────────────────────────────────────────────────── */
export const ORG_TIERS = {
  starter:     { seats: 50,  features: ['Branding', 'Assignments', 'Monthly analytics'] },
  pro:         { seats: 500, features: ['Custom pass marks & timers', 'Monthly/Termly/Yearly analytics', 'Email reports'] },
  enterprise:  { seats: 5000, features: ['SSO / domain restrict', 'CSV export', 'Webhooks', 'Priority support'] },
} as const;

type OrgTier = keyof typeof ORG_TIERS;
type TabKey = 'branding' | 'assign' | 'analytics';

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

export default function OrgElearnPortal() {
  const { backendUrl, token } = useShopContext();
  const [tab, setTab] = useState<TabKey>('branding');

  // org & plan
  const [org, setOrg] = useState<any | null>(null);
  const tier: OrgTier = (org?.tier as OrgTier) || 'starter';
  const tierMeta = ORG_TIERS[tier];
  const seatsMax = tierMeta.seats;
  const [seatsUsed, setSeatsUsed] = useState<number>(0);

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
  });

  // assign
  const [courseId, setCourseId] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [passMark, setPassMark] = useState<number | ''>('');
  const [timer, setTimer] = useState<number | ''>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');

  // analytics
  const [period, setPeriod] = useState<'month'|'term'|'year'>('month');
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // ⬇️ refs for hidden file inputs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef  = useRef<HTMLInputElement>(null);

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

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const hasFeature = useCallback((needle: string) => {
    const list = ORG_TIERS[tier]?.features || [];
    return list.some(f => f.toLowerCase().includes(needle.toLowerCase()));
  }, [tier]);

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
      try {
        const r = await fetch(`${backendUrl}/api/orgs/mine`, { headers: authHeaders as any });
        if (r.ok) {
          const o = await r.json();
          setOrg(o);
          setForm((f: any) => ({ ...f, ...o }));
        }
      } catch {}
    })();
  }, [backendUrl, authHeaders]);

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      try {
        // Optional: backend can expose seats used for the org
        const r = await fetch(`${backendUrl}/api/orgs/${org.id}/usage`, { headers: authHeaders as any });
        if (r.ok) {
          const j = await r.json();
          setSeatsUsed(Number(j?.seats_used ?? 0));
        } else {
          setSeatsUsed(Number(org?.seats_used ?? 0));
        }
      } catch {
        setSeatsUsed(Number(org?.seats_used ?? 0));
      }
    })();
  }, [org?.id, backendUrl, authHeaders, org?.seats_used]);

  // 1) In saveBranding
const saveBranding = async () => {
  if (!org?.id) {
    alert('No organization found. Please create your Institution account first (For Institutions → Login/Sign up).');
    return;
  }
  const r = await fetch(`${backendUrl}/api/orgs/${org.id}/branding`, {
    method: 'PUT',
    headers: authHeaders as any,
    body: JSON.stringify(form),
  });
  if (r.status === 403) {
    alert('Branding not available on your current plan.');
    return;
  }
  if (r.ok) {
    const o = await r.json();
    setOrg(o);
    alert('Branding saved.');
  } else {
    alert('Failed to save. Please try again.');
  }
};


  const createAssignment = async () => {
    if (!org?.id || !courseId) return;
    const r = await fetch(`${backendUrl}/api/orgs/${org.id}/assignments`, {
      method: 'POST',
      headers: authHeaders as any,
      body: JSON.stringify({
        courseId,
        title_override: titleOverride || null,
        pass_mark: canCustomPassTimers ? (passMark || null) : null,
        timer_s: canCustomPassTimers ? (timer || null) : null,
        due_at: dueAt || null,
      }),
    });
    if (!r.ok) return alert('Failed to create assignment');
    const a = await r.json();
    const link = `${window.location.origin}/org/join/${a.invite_code}`;
    setInviteLink(link);
  };

  const loadAnalytics = useCallback(async () => {
    if (!org?.id) return;
    setLoadingAnalytics(true);
    try {
      const p = canMultiPeriodAnalytics ? period : 'month';
      const r = await fetch(`${backendUrl}/api/orgs/${org.id}/analytics?period=${p}`, { headers: authHeaders as any });
      const j = r.ok ? await r.json() : { data: [] };
      setAnalytics(j.data || []);
    } catch {
      setAnalytics([]);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [org?.id, backendUrl, authHeaders, period, canMultiPeriodAnalytics]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  /** Plan controls */
  const upgradeTier = async (next: OrgTier) => {
    if (!org?.id) return;
    try {
      const r = await fetch(`${backendUrl}/api/orgs/${org.id}/upgrade`, {
        method: 'POST',
        headers: authHeaders as any,
        body: JSON.stringify({ tier: next }),
      });
      if (!r.ok) return alert('Upgrade failed. Contact support.');
      const j = await r.json();
      setOrg((prev: any) => ({ ...(prev||{}), ...j }));
      alert(`Upgraded to ${next.toUpperCase()}. 🎉`);
    } catch {
      alert('Upgrade failed. Please try again.');
    }
  };

  /** Helpers */
  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / seatsMax) * 100));
  const nearLimit = seatPct >= 90;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(inviteLink); alert('Invite link copied!'); } catch {}
  };

  const downloadCSV = () => {
    const rows = [['Bucket','Attempts','Passes','Avg Score']];
    analytics.forEach((r) => rows.push([
      new Date(r.bucket).toISOString(),
      String(r.attempts ?? 0),
      String(r.passes ?? 0),
      `${Math.round(r.avg_score || 0)}%`
    ]));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-5">
      <div className="max-w-screen-xl mx-auto space-y-4">
        {/* Header & Tabs */}
        <header className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Institution E-Learning</h1>
              <div className="text-white/70 text-xs sm:text-sm">Branding • Assignments • Analytics</div>
            </div>

            {/* Scrollable tabs on mobile */}
            <div className="-mx-1 px-1 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {(['branding','assign','analytics'] as TabKey[]).map(t => (
                  <button
                    key={t}
                    className={`px-3 py-1.5 rounded-xl text-sm ring-1 whitespace-nowrap
                      ${tab===t ? 'bg-white/10 ring-white/20' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}
                    onClick={() => setTab(t)}
                  >
                    {t[0].toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plan bar */}
          <div className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>Plan: <span className="ml-1 font-semibold">{tier.toUpperCase()}</span></Pill>
                <Pill>Seats: {seatsUsed}/{seatsMax}</Pill>
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
                  {(['starter','pro','enterprise'] as OrgTier[]).filter(t => t!==tier).map(next => (
                    <button
                      key={next}
                      onClick={() => upgradeTier(next)}
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
                <span key={f} className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white/90">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* BRANDING */}
        {tab==='branding' && (
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
                value={form.name||''}
                onChange={e=>setForm({...form, name:e.target.value})}
                placeholder="Acme College"
                disabled={!canBranding}
              />
            </div>

            <div>
              <Label>Certificate Title (optional)</Label>
              <input
                className="input mt-1 w-full"
                value={form.certificate_title||''}
                onChange={e=>setForm({...form, certificate_title:e.target.value})}
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
                    <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-white/60 px-1 text-center">No logo</span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="input w-full"
                    value={form.logo_url || ''}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://..."
                    disabled={!canBranding}
                  />
                  {/* hidden input + button trigger (no label wrapping) */}
                  <input
  ref={logoInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  disabled={!canBranding || uploadingLogo || !token}
  onChange={async (e) => {
    const inputEl = e.currentTarget;             // 👈 capture before await
    const file = inputEl.files?.[0] ?? null;
    if (!file) return;
    await handleUpload(file, 'logo_url');
    inputEl.value = '';                           // 👈 safe: not null
  }}
/>

                  <button
                    type="button"
                    disabled={!canBranding || uploadingLogo || !token}
                    className={`btn w-full sm:w-auto ${uploadingLogo ? 'opacity-60 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'}`}
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
              <Label>Signature</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded bg-white/10 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                  {form.signature_url ? (
                    <img src={form.signature_url} alt="Signature preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-white/60 px-1 text-center">No signature</span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="input w-full"
                    value={form.signature_url || ''}
                    onChange={(e) => setForm({ ...form, signature_url: e.target.value })}
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
    const inputEl = e.currentTarget;              // 👈 capture before await
    const file = inputEl.files?.[0] ?? null;
    if (!file) return;
    await handleUpload(file, 'signature_url');
    inputEl.value = '';                            // 👈 safe: not null
  }}
/>

                  <button
                    type="button"
                    disabled={!canBranding || uploadingSignature || !token}
                    className={`btn w-full sm:w-auto ${uploadingSignature ? 'opacity-60 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'}`}
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
                type="number" min={1} max={100}
                className="input mt-1 w-full"
                value={form.default_pass_mark||70}
                onChange={e=>setForm({...form, default_pass_mark:Number(e.target.value)||70})}
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
                type="number" min={60} step={30}
                className="input mt-1 w-full"
                value={form.quiz_time_limit_s||900}
                onChange={e=>setForm({...form, quiz_time_limit_s:Number(e.target.value)||900})}
                disabled={!canCustomPassTimers}
                title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="allow_retry"
                type="checkbox"
                checked={!!form.allow_retry}
                onChange={e=>setForm({...form, allow_retry:e.target.checked})}
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
                value={form.email_domain||''}
                onChange={e=>setForm({...form, email_domain:e.target.value})}
                placeholder="example.edu"
                disabled={!canSSO}
                title={!canSSO ? 'Available on Enterprise' : ''}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label>Webhook URL (on pass/submit)</Label>
                {!canWebhooks && <Pill>Enterprise</Pill>}
              </div>
              <input
                className="input mt-1 w-full"
                value={form.webhook_url||''}
                onChange={e=>setForm({...form, webhook_url:e.target.value})}
                placeholder="https://your.system/hooks/elearn"
                disabled={!canWebhooks}
                title={!canWebhooks ? 'Available on Enterprise' : ''}
              />
            </div>

            {canEmailReports && (
              <div className="sm:col-span-2 rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium">Email reports</div>
                    <div className="text-xs text-white/70">Send periodic analytics to admins</div>
                  </div>
                  <div className="flex items-center">
                    <button
                      className="btn bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto"
                      onClick={async () => {
                        if (!org?.id) return;
                        try {
                          const r = await fetch(`${backendUrl}/api/orgs/${org.id}/reports:test-send`, {
                            method: 'POST',
                            headers: authHeaders as any,
                            body: JSON.stringify({ to: org?.owner_email || undefined })
                          });
                          if (r.ok) alert('Sent a test report to your admin email.');
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
  disabled={!org?.id}
  className="btn bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
>
  Save Branding
</button>

            </div>
          </section>
        )}

        {/* ASSIGN */}
        {tab==='assign' && (
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
                  onChange={e=>setCourseId(e.target.value)}
                  placeholder="course uuid"
                  disabled={!canAssignments}
                />
              </div>
              <div>
                <Label>Title Override (optional)</Label>
                <input
                  className="input mt-1 w-full"
                  value={titleOverride}
                  onChange={e=>setTitleOverride(e.target.value)}
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
                  type="number" min={1} max={100}
                  className="input mt-1 w-full"
                  value={passMark}
                  onChange={e=>setPassMark(e.target.value?Number(e.target.value):'')}
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
                  type="number" min={60} step={30}
                  className="input mt-1 w-full"
                  value={timer}
                  onChange={e=>setTimer(e.target.value?Number(e.target.value):'')}
                  disabled={!canAssignments || !canCustomPassTimers}
                  title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
                />
              </div>
              <div>
                <Label>Due at (optional, ISO)</Label>
                <input
                  className="input mt-1 w-full"
                  value={dueAt}
                  onChange={e=>setDueAt(e.target.value)}
                  placeholder="2025-09-30T23:59:59Z"
                  disabled={!canAssignments}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={createAssignment}
                className={`btn ${canAssignments ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-white/10 cursor-not-allowed'} w-full sm:w-auto`}
                disabled={!canAssignments}
              >
                Create assignment
              </button>
              {inviteLink && (
                <div className="flex-1 flex items-center gap-2">
                  <input className="input w-full" readOnly value={inviteLink} onFocus={e=>e.currentTarget.select()} />
                  <button onClick={copyLink} className="chip chip-active">Copy</button>
                </div>
              )}
            </div>

            <p className="text-xs text-white/70">
              Share the link. Learners join → timer starts → one attempt → auto email → results on this dashboard.
            </p>
          </section>
        )}

        {/* ANALYTICS */}
        {tab==='analytics' && (
          <section className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={()=>setPeriod('month')}
                className={`chip ${period==='month'?'chip-active':''}`}
              >
                Month
              </button>
              <button
                onClick={()=> canMultiPeriodAnalytics && setPeriod('term')}
                className={`chip ${period==='term'?'chip-active':''} ${!canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!canMultiPeriodAnalytics ? 'Termly analytics is Pro+' : ''}
              >
                Term
              </button>
              <button
                onClick={()=> canMultiPeriodAnalytics && setPeriod('year')}
                className={`chip ${period==='year'?'chip-active':''} ${!canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!canMultiPeriodAnalytics ? 'Yearly analytics is Pro+' : ''}
              >
                Year
              </button>

              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                {canCSV && (
                  <button onClick={downloadCSV} className="chip chip-active w-full sm:w-auto" title="Export CSV (Enterprise)">
                    Export CSV
                  </button>
                )}
                {loadingAnalytics && <span className="text-xs text-white/70">Loading…</span>}
                <button onClick={loadAnalytics} className="chip w-full sm:w-auto">Refresh</button>
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
                      <td className="py-2 pr-4">{new Date(r.bucket).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{r.attempts}</td>
                      <td className="py-2 pr-4">{r.passes}</td>
                      <td className="py-2 pr-4">{Math.round(r.avg_score || 0)}%</td>
                      {canEmailReports && (
                        <td className="py-2 pr-4">
                          <button
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                            onClick={async () => {
                              if (!org?.id) return;
                              try {
                                const r2 = await fetch(`${backendUrl}/api/orgs/${org.id}/reports:send`, {
                                  method: 'POST',
                                  headers: authHeaders as any,
                                  body: JSON.stringify({ bucket: r.bucket, period })
                                });
                                if (r2.ok) alert('Report queued.');
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
                      <td className="py-6 pr-4 text-white/60" colSpan={canEmailReports ? 5 : 4}>
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
    </div>
  );
}
