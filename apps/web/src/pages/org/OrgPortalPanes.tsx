/* apps/web/src/pages/org/OrgPortalPanes.tsx */
import React from 'react';
import type { OrgResp as Org, OrgAnalyticsRow } from '@mytutorapp/shared/api/orgApi';
import { useCourses } from '@mytutorapp/shared/hooks';

type TabKey = 'branding' | 'assign' | 'analytics';
type Period = 'month' | 'term' | 'year';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-medium uppercase tracking-wide text-[#49739c] dark:text-darkTextSecondary">
    {children}
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-[#e7edf4] text-[#0d141c] dark:bg-[#172534] dark:text-darkTextPrimary">
    {children}
  </span>
);

/** ─────────────────────────────────────────────────────────
 * BRANDING + ASSIGN pane
 * ───────────────────────────────────────────────────────── */
type BrandingAssignProps = {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  instructors: { id: string | number; name?: string; email?: string }[];

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
  uploadingInstructorSignature: boolean;
  onUpload: (file: File | null, target: 'logo_url' | 'signature_url' | 'instructor_signature_url') => Promise<void>;

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
  setCourseIdAndUrl?: (next: string) => void;
  tutorToken?: string | null;
};

export function BrandingAssignPane(props: BrandingAssignProps) {
  const {
    tab, setTab,
    canBranding, canAssignments, canCustomPassTimers, canSSO, canWebhooks, canEmailReports,
    org, token, backendUrl,
    form, setForm,
    uploadingLogo, uploadingSignature, uploadingInstructorSignature, onUpload, onSaveBranding, onSendTestReport,
    courseId, setCourseId, titleOverride, setTitleOverride,
    passMark, setPassMark, timer, setTimer, dueAt, setDueAt,
    onCreateAssignment, inviteLink, copyLink, setCourseIdAndUrl,tutorToken,
  } = props;

  // Generate stable ids for file inputs (works on SSR + iOS Safari)
  const logoInputId = React.useId();
  const sigInputId = React.useId();
  const instructorSigInputId = React.useId();
  const coursesToken = tutorToken || token || null;

    const {
    courses = [],
    loading: coursesLoading,
    error: coursesError,
  } = useCourses({
    backendUrl,
    token: coursesToken || undefined,
    // if your hook supports these, you can pass org-specific filters too:
    // orgId: org?.id,
    // includeDrafts: true,
  } as any);


  // Webhook test enablement logic
  const rawUrl = String(form.webhook_url ?? '').trim();
  const urlOk = /^https:\/\/.+/i.test(rawUrl);
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

  // Group instructor emails into safe-size BCC chunks (mailto URI length guard)
  const { bccChunks, instructorEmails } = React.useMemo(() => {
    const instructorEmails = (props.instructors ?? [])
      .map(i => (i.email || '').trim())
      .filter(Boolean);

    const mkMailto = (emails: string[], link: string) => {
      const subject = encodeURIComponent('Course invite');
      const body = encodeURIComponent(link);
      const bcc = encodeURIComponent(emails.join(','));
      return `mailto:?subject=${subject}&bcc=${bcc}&body=${body}`;
    };

    const chunks: string[][] = [];
    if (inviteLink) {
      let cur: string[] = [];
      for (const e of instructorEmails) {
        const test = mkMailto([...cur, e], inviteLink);
        // keep some headroom under common 2k limits
        if (test.length > 1800 || cur.length >= 50) {
          if (cur.length) chunks.push(cur);
          cur = [e];
        } else {
          cur.push(e);
        }
      }
      if (cur.length) chunks.push(cur);
    }

    return { bccChunks: chunks, instructorEmails };
  }, [props.instructors, inviteLink]);

  // File picker handler
  const handlePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo_url' | 'signature_url' | 'instructor_signature_url'
  ) => {
    const inputEl = e.currentTarget; // cache before await
    const file = inputEl.files?.[0] ?? null;

    if (!file) {
      try { inputEl.value = ''; } catch {}
      return;
    }

    if (!token) {
      alert('Please sign in to upload images.');
      try { inputEl.value = ''; } catch {}
      return;
    }
    if (!canBranding && target !== 'instructor_signature_url') {
      // instructor signature is handled separately by instructor home,
      // but from here we keep general branding changes locked if needed.
      alert('Branding settings can only be changed by your institution owner/admin.');
      try { inputEl.value = ''; } catch {}
      return;
    }

    try {
      await onUpload(file, target);
    } finally {
      try {
        if (document.body.contains(inputEl)) inputEl.value = '';
      } catch {}
    }
  };

  return (
    <section className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4">
      {/* Tabs local header (mobile-friendly quick switch) */}
      <div className="mb-3 flex items-center gap-2">
        {canBranding && (
          <button
            className={`chip ${tab === 'branding' ? 'chip-active' : ''}`}
            onClick={() => setTab('branding')}
          >
            Branding
          </button>
        )}
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
            <div className="sm:col-span-2 text-sm text-amber-700 dark:text-amber-300">
              Branding settings aren’t editable from this account. Please ask your institution
              owner or admin to update logos, signatures, and contact details.
            </div>
          )}

          <div>
            <Label>Institution Name</Label>
            <input
              className="input mt-1 w-full"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Example Academy"
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
              <div className="w-16 h-16 rounded bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard overflow-hidden flex items-center justify-center">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-[#49739c] dark:text-white/60 px-1 text-center">
                    No logo
                  </span>
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
              <div className="w-16 h-16 rounded bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard overflow-hidden flex items-center justify-center">
                {form.signature_url ? (
                  <img
                    src={form.signature_url}
                    alt="Registrar Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-[#49739c] dark:text-white/60 px-1 text-center">
                    No signature
                  </span>
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

          {/* Course Instructor Signature */}
          <div className="space-y-2">
            <Label>Course Instructor Signature</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard overflow-hidden flex items-center justify-center">
                {form.instructor_signature_url ? (
                  <img
                    src={form.instructor_signature_url}
                    alt="Course Instructor Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-[#49739c] dark:text-white/60 px-1 text-center">
                    No signature
                  </span>
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="input w-full"
                  value={form.instructor_signature_url || ''}
                  onChange={(e) =>
                    setForm({ ...form, instructor_signature_url: e.target.value })
                  }
                  placeholder="https://..."
                  disabled={!canBranding}
                />

                {/* File input (visually hidden) */}
                <input
                  id={instructorSigInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handlePick(e, 'instructor_signature_url')}
                />
                {/* Label styled as button */}
                <label
                  htmlFor={instructorSigInputId}
                  className={[
                    'btn w-full sm:w-auto text-center',
                    uploadingInstructorSignature || !canBranding || !token
                      ? 'opacity-60 cursor-not-allowed bg-white/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                  ].join(' ')}
                  aria-disabled={
                    uploadingInstructorSignature || !canBranding || !token || undefined
                  }
                  title={!token ? 'Login required' : undefined}
                >
                  {uploadingInstructorSignature ? 'Uploading…' : 'Upload Signature'}
                </label>
              </div>
            </div>
          </div>

          {/* Institution contact details – universal */}
          <div className="sm:col-span-2 mt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <Label>Institution contact details</Label>
              <span className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                Optional – appears on report cards.
              </span>
            </div>

            <div className="grid sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary mb-0.5">
                  Address line 1
                </div>
                <input
                  className="input w-full"
                  value={form.address_line1 || ''}
                  onChange={(e) =>
                    setForm({ ...form, address_line1: e.target.value })
                  }
                  placeholder="123 Main Street"
                  disabled={!canBranding}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary mb-0.5">
                  Address line 2
                </div>
                <input
                  className="input w-full"
                  value={form.address_line2 || ''}
                  onChange={(e) =>
                    setForm({ ...form, address_line2: e.target.value })
                  }
                  placeholder="City / State / Country"
                  disabled={!canBranding}
                />
              </div>

              <div>
                <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary mb-0.5">
                  Phone
                </div>
                <input
                  className="input w-full"
                  value={form.phone_number || ''}
                  onChange={(e) =>
                    setForm({ ...form, phone_number: e.target.value })
                  }
                  placeholder="+00 123 456 789"
                  disabled={!canBranding}
                />
              </div>

              <div>
                <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary mb-0.5">
                  Contact email
                </div>
                <input
                  type="email"
                  className="input w-full"
                  value={form.contact_email || ''}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                  placeholder="info@school.example"
                  disabled={!canBranding}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary mb-0.5">
                  Website
                </div>
                <input
                  className="input w-full"
                  value={form.website_url || ''}
                  onChange={(e) =>
                    setForm({ ...form, website_url: e.target.value })
                  }
                  placeholder="https://school.example"
                  disabled={!canBranding}
                />
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
              onChange={(e) => setForm({
                ...form,
                default_pass_mark: Number(e.target.value) || 70,
              })}
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
              onChange={(e) => setForm({
                ...form,
                quiz_time_limit_s: Number(e.target.value) || 900,
              })}
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
            <label htmlFor="allow_retry" className="text-sm text-[#0d141c] dark:text-darkTextPrimary">
              Allow retry? <span className="text-[#49739c] dark:text-darkTextSecondary">(default off)</span>
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
            <div className="mt-1 text-[11px] text-[#49739c] dark:text-darkTextSecondary">
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
              <label
                htmlFor="webhook_enabled"
                className="text-sm text-[#0d141c] dark:text-darkTextPrimary"
              >
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
                  alert(
                    j.present
                      ? `Secret exists (last4: ${j.last4 || '—'}). Rotated: ${j.rotatedAt || '—'}`

                      : 'No secret yet. Generate one.'
                  );
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
                  if (!confirm('Generate/rotate the secret now? This invalidates the previous one.')) {
                    return;
                  }
                  const r = await fetch(`${backendUrl}/api/orgs/${org!.id}/webhooks/secret`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const j = await r.json();
                  if (!j.ok) return alert(j.message || 'Failed to generate secret.');
                  window.prompt(
                    'Copy your webhook secret now (store in your system):',
                    j.secret
                  );
                }}
              >
                Generate / Rotate secret
              </button>

              <button
                className="chip chip-active"
                disabled={!canWebhooks || !canSendTest || isSending}
                title={
                  !org?.id
                    ? 'No organization loaded'
                    : !token
                    ? 'Not authenticated'
                    : !form.webhook_enabled
                    ? 'Toggle “Enable webhooks” first'
                    : !urlOk
                    ? 'Enter a valid HTTPS Webhook URL'
                    : 'Send a signed test event'
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
                    if (r.status !== 204) {
                      try {
                        j = await r.json();
                      } catch {}
                    }
                    if (!r.ok || j?.ok === false) {
                      alert(j?.message || `Failed (HTTP ${r.status})`);
                      return;
                    }
                    alert(
                      `Test webhook queued${
                        j?.status ? ` and fired (HTTP ${j.status})` : ''
                      }. Delivery id: ${j?.id || 'n/a'}`
                    );
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
              <div className="mt-3 rounded-xl bg-[#e7edf4]/60 dark:bg-white/5 ring-1 ring-[#cedbe8] dark:ring-white/10 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm text-[#0d141c] dark:text-darkTextPrimary">
                      Email reports
                    </div>
                    <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
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
              disabled={!org?.id || !token || !canBranding}
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
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Assignments are not available on your plan. Upgrade to enable.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Course ID</Label>
              <input
                className="input mt-1 w-full"
                value={courseId}
                onChange={(e) => {
                  const next = e.target.value;
                  setCourseId(next);
                  setCourseIdAndUrl?.(next);  // ⬅️ call optional helper if parent passed it
                }}
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

          {/* ⬇️ NEW: Instructor courses list for picking Course ID */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Your courses (click to use)</Label>

              <div className="mt-1 rounded-xl border border-[#e7edf4] dark:border-white/10 bg-slate-50/70 dark:bg-[#111b28] p-2 max-h-64 overflow-y-auto">
                {coursesLoading && (
                  <div className="text-xs text-slate-500 dark:text-white/60">
                    Loading your courses…
                  </div>
                )}

                {coursesError && !coursesLoading && (
                  <div className="text-xs text-red-500">
                    Failed to load courses. Try refreshing the page.
                  </div>
                )}

                {!coursesLoading && !coursesError && courses.length === 0 && (
                  <div className="text-xs text-slate-500 dark:text-white/60">
                    You haven&apos;t created any courses yet. Use the &ldquo;Create with
                    AI&rdquo; button on the main E-learning page, or go to
                    <code className="ml-1 px-1 rounded bg-white/40 dark:bg-white/10">
                      /create-course
                    </code>
                    .
                  </div>
                )}

                {!coursesLoading && courses.length > 0 && (
                  <ul className="space-y-1">
                    {courses.map((c: any) => {
                      const id = String(c.id);
                      const label = c.title || 'Untitled course';
                      const classLabel = c.org_class_label || c.orgClassLabel || '';
                      const subjectKey = c.org_subject_key || c.orgSubjectKey || '';

                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCourseId(id);
                              setCourseIdAndUrl?.(id);
                            }}
                            className={[
                              'w-full text-left px-2 py-1.5 rounded-lg text-xs sm:text-sm',
                              'hover:bg-white dark:hover:bg-white/10 transition',
                              courseId === id
                                ? 'bg-white dark:bg-white/10 ring-1 ring-[#3d99f5]/60'
                                : '',
                            ].join(' ')}
                          >
                            <div className="font-medium truncate">{label}</div>
                            <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-600 dark:text-white/70">
                              {classLabel && (
                                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10">
                                  Class: {classLabel}
                                </span>
                              )}
                              {subjectKey && (
                                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10">
                                  Subject: {subjectKey}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10">
                                ID: {id.slice(0, 8)}…
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>


          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={onCreateAssignment}
              className={`btn ${
                canAssignments ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-white/10 cursor-not-allowed'
              } w-full sm:w-auto`}
              disabled={!canAssignments}
            >
              Create assignment
            </button>

            {inviteLink && instructorEmails.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {bccChunks.map((emails, idx) => {
                  const subject = encodeURIComponent('Course invite');
                  const body = encodeURIComponent(inviteLink);
                  const bcc = encodeURIComponent(emails.join(','));
                  const mailto = `mailto:?subject=${subject}&bcc=${bcc}&body=${body}`;

                  return (
                    <a
                      key={idx}
                      className="chip chip-active"
                      href={mailto}
                      title={`Email ${emails.length} instructor${emails.length > 1 ? 's' : ''}`}
                      aria-label={`Email ${emails.length} instructor${emails.length > 1 ? 's' : ''}`}
                    >
                      {bccChunks.length === 1
                        ? 'Email instructors'
                        : `Email instructors (grp ${idx + 1})`}
                    </a>
                  );
                })}

                <a
                  className="chip"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Please share this course invite with your learners:\n\n${inviteLink}`
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Share to WhatsApp"
                  aria-label="Share invite link via WhatsApp"
                >
                  WhatsApp instructors
                </a>
              </div>
            )}

            {inviteLink && (org?.email_domain || form.email_domain) && (
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                This invite is restricted to:{' '}
                <b>{(form.email_domain || org?.email_domain || '').trim()}</b>
              </div>
            )}
          </div>

          <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
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
    <section className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4">
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
              onClick={onExportCSV}
              className="chip chip-active w-full sm:w-auto"
              title="Export CSV (Enterprise)"
            >
              Export CSV
            </button>
          )}
          {loadingAnalytics && (
            <span className="text-xs text-[#49739c] dark:text-darkTextSecondary">
              Loading…
            </span>
          )}
          <button onClick={onRefresh} className="chip w-full sm:w-auto">
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="text-left text-[#49739c] dark:text-darkTextSecondary">
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
              <tr key={i} className="border-t border-[#e7edf4] dark:border-white/10">
                <td className="py-2 pr-4">
                  {new Date(r.bucket).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4">{r.attempts}</td>
                <td className="py-2 pr-4">{r.passes}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_score || 0)}%</td>
                {canEmailReports && (
                  <td className="py-2 pr-4">
                    <button
                      className="px-2 py-1 rounded bg-[#e7edf4] dark:bg-white/10 hover:bg-[#d7e4f0] dark:hover:bg-white/15 text-xs text-[#0d141c] dark:text-darkTextPrimary"
                      onClick={() =>
                        onSendReportRow(new Date(r.bucket).toISOString(), period)
                      }
                    >
                      Email row
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!analytics.length && (
              <tr className="border-t border-[#e7edf4] dark:border-white/10">
                <td
                  className="py-6 pr-4 text-[#49739c] dark:text-darkTextSecondary"
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
        <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          Monthly analytics are not included. Upgrade to view analytics.
        </div>
      )}
    </section>
  );
}
