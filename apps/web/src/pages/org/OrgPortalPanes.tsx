/* apps/web/src/pages/org/OrgPortalPanes.tsx */
import React from 'react';
import type { OrgResp as Org, OrgAnalyticsRow } from '@mytutorapp/shared/api/orgApi';

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs text-gray-300">{children}</div>
);
const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white/10">
    {children}
  </span>
);

/** ─────────────────────────────────────────────────────────
 * BRANDING + ASSIGN pane
 * ───────────────────────────────────────────────────────── */
type BrandingAssignProps = {
  tab: TabKey;
  setTab: (t: TabKey) => void;

  // capabilities
  canBranding: boolean;
  canAssignments: boolean;
  canCustomPassTimers: boolean;
  canSSO: boolean;
  canWebhooks: boolean;
  canEmailReports: boolean;

  // org/session
  org: Org | null;
  token?: string | null;
  backendUrl: string;

  // branding
  form: any;
  setForm: (f: any) => void;
  uploadingLogo: boolean;
  uploadingSignature: boolean;
  onUpload: (file: File | null, target: 'logo_url' | 'signature_url') => Promise<void>;
  onSaveBranding: () => void;
  onSendTestReport: () => Promise<void>;

  // assignment
  courseId: string;
  setCourseId: (v: string) => void;
  titleOverride: string;
  setTitleOverride: (v: string) => void;
  passMark: number | '';
  setPassMark: (v: number | '') => void;
  timer: number | '';
  setTimer: (v: number | '') => void;
  dueAt: string;
  setDueAt: (v: string) => void;
  onCreateAssignment: () => void;
  inviteLink: string;
  copyLink: () => Promise<void> | void;
};

export function BrandingAssignPane(props: BrandingAssignProps) {
  const {
    tab, setTab,
    canBranding, canAssignments, canCustomPassTimers, canSSO, canWebhooks, canEmailReports,
    org, token, backendUrl,
    form, setForm,
    uploadingLogo, uploadingSignature, onUpload, onSaveBranding, onSendTestReport,
    courseId, setCourseId, titleOverride, setTitleOverride,
    passMark, setPassMark, timer, setTimer, dueAt, setDueAt,
    onCreateAssignment, inviteLink, copyLink,
  } = props;

  // Generate stable ids for file inputs (works on SSR + iOS Safari)
  const logoInputId = React.useId();
  const sigInputId = React.useId();

  // Webhook test enablement logic
  const rawUrl = String(form.webhook_url ?? '').trim();
  const urlOk  = /^https:\/\/.+/i.test(rawUrl);
  const canSendTest = Boolean(org?.id && token && form.webhook_enabled && urlOk);
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    console.debug('send-test state', {
      enabled: !!form.webhook_enabled,
      rawUrl,
      urlOk,
      canSendTest,
      orgId: org?.id,
      hasToken: !!token,
    });
  }, [form.webhook_enabled, rawUrl, urlOk, canSendTest, org?.id, token]);

  const handlePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo_url' | 'signature_url'
  ) => {
    const file = e.currentTarget.files?.[0] ?? null;
    if (file) {
      await onUpload(file, target);
    }
    // allow selecting the same file again later
    e.currentTarget.value = '';
  };

  return (
    <section className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 sm:p-4">
      {/* Tabs local header (mobile-friendly quick switch) */}
      <div className="mb-3 flex items-center gap-2">
        <button
          className={`chip ${tab === 'branding' ? 'chip-active' : ''}`}
          onClick={() => setTab('branding')}
        >
          Branding
        </button>
        <button
          className={`chip ${tab === 'assign' ? 'chip-active' : ''}`}
          onClick={() => setTab('assign')}
        >
          Assign
        </button>
      </div>

      {tab === 'branding' && (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
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
              onChange={(e) => setForm({ ...form, certificate_title: e.target.value })}
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

                {/* File input (visually hidden) */}
                <input
                  id={logoInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  // IMPORTANT: do not disable the input itself; iOS Safari can block programmatic dialogs
                  onChange={(e) => handlePick(e, 'logo_url')}
                />
                {/* Label styled as button opens picker */}
                <label
                  htmlFor={logoInputId}
                  className={[
                    'btn w-full sm:w-auto text-center',
                    uploadingLogo || !canBranding || !token
                      ? 'opacity-60 cursor-not-allowed bg-white/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                  ].join(' ')}
                  aria-disabled={uploadingLogo || !canBranding || !token || undefined}
                  title={!token ? 'Login required' : undefined}
                >
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                </label>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-2">
            <Label>Registrar Signature</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded bg-white/10 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                {form.signature_url ? (
                  <img src={form.signature_url} alt="Registrar Signature" className="w-full h-full object-contain" />
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

                {/* File input (visually hidden) */}
                <input
                  id={sigInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handlePick(e, 'signature_url')}
                />
                {/* Label styled as button */}
                <label
                  htmlFor={sigInputId}
                  className={[
                    'btn w-full sm:w-auto text-center',
                    uploadingSignature || !canBranding || !token
                      ? 'opacity-60 cursor-not-allowed bg-white/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                  ].join(' ')}
                  aria-disabled={uploadingSignature || !canBranding || !token || undefined}
                  title={!token ? 'Login required' : undefined}
                >
                  {uploadingSignature ? 'Uploading…' : 'Upload Signature'}
                </label>
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
              onChange={(e) => setForm({ ...form, default_pass_mark: Number(e.target.value) || 70 })}
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
              onChange={(e) => setForm({ ...form, quiz_time_limit_s: Number(e.target.value) || 900 })}
              disabled={!canCustomPassTimers}
              title={!canCustomPassTimers ? 'Available on Pro and Enterprise' : ''}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allow_retry"
              type="checkbox"
              checked={!!form.allow_retry}
              onChange={(e) => setForm({ ...form, allow_retry: e.target.checked })}
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

          <div className="sm:col-span-2">
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
              <label htmlFor="webhook_enabled" className="text-sm">Enable webhooks</label>
            </div>

            <input
              className="input mt-1 w-full"
              value={form.webhook_url || ''}
              onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
              placeholder="https://your.system/hooks/elearn"
              disabled={!canWebhooks}
              title={!canWebhooks ? 'Available on Enterprise' : ''}
            />

            {/* Webhook controls */}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="chip"
                disabled={!org?.id || !token}
                title="Show masked info"
                onClick={async () => {
                  if (!org?.id || !token) return;
                  const r = await fetch(`${backendUrl}/api/orgs/${org!.id}/webhooks/secret`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const j = await r.json();
                  if (!j.ok && j.message) return alert(j.message);
                  alert(j.present
                    ? `Secret exists (last4: ${j.last4 || '—'}). Rotated: ${j.rotatedAt || '—'}`
                    : 'No secret yet. Generate one.');
                }}
              >
                View secret status
              </button>

              <button
                className="chip chip-active"
                disabled={!org?.id || !token}
                title="Generate or rotate the secret (you’ll see it once)"
                onClick={async () => {
                  if (!org?.id || !token) return;
                  if (!confirm('Generate/rotate the secret now? This invalidates the previous one.')) return;
                  const r = await fetch(`${backendUrl}/api/orgs/${org!.id}/webhooks/secret`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const j = await r.json();
                  if (!j.ok) return alert(j.message || 'Failed to generate secret.');
                  window.prompt('Copy your webhook secret now (store in your system):', j.secret);
                }}
              >
                Generate / Rotate secret
              </button>

              <button
                className="chip chip-active"
                disabled={!canWebhooks || !canSendTest || isSending}
                title={
                  !org?.id ? 'No organization loaded' :
                  !token ? 'Not authenticated' :
                  !form.webhook_enabled ? 'Toggle “Enable webhooks” first' :
                  !urlOk ? 'Enter a valid HTTPS Webhook URL' :
                  'Send a signed test event'
                }
                onClick={async () => {
                  if (!canWebhooks || !canSendTest || isSending) return;
                  setIsSending(true);
                  try {
                    const r = await fetch(`${backendUrl}/api/orgs/${org!.id}/webhooks/test`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        overrideUrl: String(form.webhook_url || '').trim(),
                      }),
                    });

                    let j: any = null;
                    if (r.status !== 204) { try { j = await r.json(); } catch {} }
                    if (!r.ok || j?.ok === false) {
                      alert(j?.message || `Failed (HTTP ${r.status})`);
                      return;
                    }
                    alert(`Test webhook queued${j?.status ? ` and fired (HTTP ${j.status})` : ''}. Delivery id: ${j?.id || 'n/a'}`);
                  } catch (e: any) {
                    console.error('[UI] queue error', e);
                    alert(`Network error: ${e?.message || e}`);
                  } finally {
                    setIsSending(false);
                  }
                }}
              >
                {isSending ? 'Sending…' : 'Send test webhook'}
              </button>
            </div>

            {canEmailReports && (
              <div className="mt-3 rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
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
                      onClick={onSendTestReport}
                    >
                      Send test report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onSaveBranding}
              disabled={!org?.id || !token}
              className="btn bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Save Branding
            </button>
          </div>
        </div>
      )}

      {tab === 'assign' && (
        <div className="space-y-3">
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
                onChange={(e) => setPassMark(e.target.value ? Number(e.target.value) : '')}
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
                onChange={(e) => setTimer(e.target.value ? Number(e.target.value) : '')}
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
              onClick={onCreateAssignment}
              className={`btn ${canAssignments ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-white/10 cursor-not-allowed'} w-full sm:w-auto`}
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
        </div>
      )}
    </section>
  );
}

/** ─────────────────────────────────────────────────────────
 * ANALYTICS pane
 * ───────────────────────────────────────────────────────── */
type AnalyticsProps = {
  period: Period;
  setPeriod: (p: Period) => void;
  canMultiPeriodAnalytics: boolean;
  canEmailReports: boolean;
  canCSV: boolean;
  canMonthly: boolean;

  loadingAnalytics: boolean;
  analytics: OrgAnalyticsRow[];

  onRefresh: () => void;
  onExportCSV: () => void;
  onSendReportRow: (bucketISO: string, period: Period) => Promise<void>;
};

export function AnalyticsPane({
  period,
  setPeriod,
  canMultiPeriodAnalytics,
  canEmailReports,
  canCSV,
  canMonthly,
  loadingAnalytics,
  analytics,
  onRefresh,
  onExportCSV,
  onSendReportRow,
}: AnalyticsProps) {
  return (
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
          className={`chip ${period === 'term' ? 'chip-active' : ''} ${!canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!canMultiPeriodAnalytics ? 'Termly analytics is Pro+' : ''}
        >
          Term
        </button>
        <button
          onClick={() => canMultiPeriodAnalytics && setPeriod('year')}
          className={`chip ${period === 'year' ? 'chip-active' : ''} ${!canMultiPeriodAnalytics ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!canMultiPeriodAnalytics ? 'Yearly analytics is Pro+' : ''}
        >
          Year
        </button>

        <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
          {canCSV && (
            <button
              onClick={onExportCSV}
              className="chip chip-active w-full sm:w-auto"
              title="Export CSV (Enterprise)"
            >
              Export CSV
            </button>
          )}
          {loadingAnalytics && <span className="text-xs text-white/70">Loading…</span>}
          <button onClick={onRefresh} className="chip w-full sm:w-auto">
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
                <td className="py-2 pr-4">{new Date(r.bucket).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{r.attempts}</td>
                <td className="py-2 pr-4">{r.passes}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_score || 0)}%</td>
                {canEmailReports && (
                  <td className="py-2 pr-4">
                    <button
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-xs"
                      onClick={() => onSendReportRow(new Date(r.bucket).toISOString(), period)}
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
  );
}
