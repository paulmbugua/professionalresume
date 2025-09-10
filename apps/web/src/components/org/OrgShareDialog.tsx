import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';
import {
  createOrgAssignment,          // legacy fallback
  ensureOrgShareableAssignment, // preferred route
} from '@mytutorapp/shared/api/orgApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void; // ← used by the top-right (X) cancel
  courseId: string | null | undefined;
  courseTitle?: string | null;
};

const PLAN_DEFAULTS: Record<string, { pass: number; time: number }> = {
  start: { pass: 70, time: 900 },
  starter: { pass: 70, time: 900 },
  pro: { pass: 75, time: 1200 },
  enterprise: { pass: 80, time: 1500 },
};

// yyyy-mm-dd for <input type="date">
function todayDateInput(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// end-of-day (local) → ISO
function endOfDayIso(localDateYmd: string | null): string | null {
  if (!localDateYmd) return null;
  const d = new Date(localDateYmd); // local midnight
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function OrgShareDialog({
  open,
  onClose,
  onCancel,
  courseId,
  courseTitle,
}: Props) {
  const nav = useNavigate();
  const { backendUrl, token } = useShopContext();
  const { activeOrgId, org, isOwnerOrAdmin } = useOrg();

  // Plan-driven fixed values
  const planKey = (
    (org?.subscription?.tier || (org as any)?.tier || (org as any)?.plan || '')
      .toString()
      .toLowerCase()
  );
  const planDefaults = PLAN_DEFAULTS[planKey] || PLAN_DEFAULTS.start;

  const fixedPass = Number.isFinite(Number(org?.default_pass_mark))
    ? Number(org?.default_pass_mark)
    : planDefaults.pass;

  const fixedTime = Number.isFinite(Number(org?.quiz_time_limit_s))
    ? Number(org?.quiz_time_limit_s)
    : planDefaults.time;

  // Owners/admins: pass/timer locked from subscription/org settings
  const lockPassTimer = Boolean(isOwnerOrAdmin);

  // UI state
  const [titleOverride, setTitleOverride] = React.useState('');
  const [passMark, setPassMark] = React.useState<number | ''>(fixedPass);
  const [timerSecs, setTimerSecs] = React.useState<number | ''>(fixedTime);
  const [dueDate, setDueDate] = React.useState<string>(todayDateInput()); // yyyy-mm-dd
  const [inviteLink, setInviteLink] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  // Sync defaults when modal opens / plan values change
  React.useEffect(() => {
    if (!open) {
      setInviteLink('');
      setErr('');
      setBusy(false);
      setTitleOverride('');
      setDueDate(todayDateInput());
    }
    setPassMark(fixedPass);
    setTimerSecs(fixedTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedPass, fixedTime]);

  // ESC to close (normal close)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resetLocal = () => {
    setInviteLink('');
    setErr('');
    setBusy(false);
    setTitleOverride('');
    setDueDate(todayDateInput());
  };

  // Top-right (X) — CANCEL semantics
  const handleCancelIcon = () => {
    resetLocal();
    // notify parent that this was a cancel, so it can re-arm auto-open
    if (onCancel) onCancel();
    else onClose();
  };

  // Backdrop click — normal close
  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canCreate = !!courseId || !!(courseTitle && courseTitle.trim());

  const handleShare = async () => {
    setErr('');
    if (!token) {
      return nav('/login', {
        state: { next: window.location.pathname + window.location.search, reason: 'org_share' },
      });
    }
    if (!activeOrgId) return setErr('You are not in an organization.');
    if (!canCreate) return setErr('Select a course or type a topic first.');

    const dueAtISO = endOfDayIso(dueDate);
    const effectivePass = lockPassTimer ? fixedPass : passMark === '' ? null : Number(passMark);
    const effectiveTimer = lockPassTimer ? fixedTime : timerSecs === '' ? null : Number(timerSecs);

    setBusy(true);
    try {
      const assignOpts = {
        title_override: titleOverride.trim() || null,
        pass_mark: effectivePass,
        timer_s: effectiveTimer,
        due_at: dueAtISO,
      };

      const resp = await ensureOrgShareableAssignment(
        backendUrl,
        token,
        activeOrgId,
        {
          ...(courseId ? { courseId } : { title: courseTitle!.trim() }),
          ...assignOpts,
        }
      );

      const code =
  resp.assignment?.invite_code ??
  resp.assignment?.inviteCode ??
  resp.assignment?.code;

const link = `${window.location.origin}/org/join/${code}`;
if (!code) throw new Error('Invite code missing');
setInviteLink(link);

      if (!link) throw new Error('Share link not returned.');
      setInviteLink(link);
    } catch (e: any) {
      const status = e?.response?.status;
      const canFallback = !!courseId && (status === 404 || status === 501 || status === 400);
      if (canFallback) {
        try {
          const legacy = await createOrgAssignment(
            backendUrl,
            token,
            activeOrgId,
            {
              courseId,
              title_override: titleOverride.trim() || null,
              pass_mark: effectivePass,
              timer_s: effectiveTimer,
              due_at: dueAtISO,
            } as any
          );
          const link = `${window.location.origin}/org/join/${
            legacy.invite_code || legacy.inviteCode || legacy.code
          }`;
          setInviteLink(link);
        } catch (e2: any) {
          setErr(e2?.response?.data?.message || e2?.message || 'Failed to create invite.');
        }
      } else {
        setErr(e?.response?.data?.message || e?.message || 'Failed to share course.');
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {/* ignore */}
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-3 bg-black/60"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Share course with learners"
    >
      <div
        className="
          w-full max-w-lg md:max-w-xl rounded-2xl
          bg-white text-gray-900 shadow-xl
          dark:bg-[#0f1821] dark:text-white dark:ring-1 dark:ring-white/10
        "
      >
        {/* Header */}
        <div
          className="
            px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200
            dark:border-white/10 flex items-start justify-between gap-3
          "
        >
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-white/70">
              Share course with learners
            </div>
            <div className="font-semibold truncate text-sm sm:text-base">
              {courseTitle || 'Selected course'}
            </div>
          </div>

          {/* Top-right Cancel (X) */}
          <button
            type="button"
            aria-label="Cancel"
            title="Cancel and pick another course"
            onClick={handleCancelIcon}
            className="
              h-8 w-8 shrink-0 rounded-lg ring-1 ring-gray-300 bg-white hover:bg-gray-50
              grid place-items-center
              dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:bg-white/15
            "
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M11.414 10l4.95-4.95-1.414-1.414L10 8.586 5.05 3.636 3.636 5.05 8.586 10l-4.95 4.95 1.414 1.414L10 11.414l4.95 4.95 1.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4">
          {!inviteLink ? (
            <div className="grid gap-3 sm:gap-4">
              {/* Title override */}
              <label className="grid gap-1">
                <span className="text-sm text-gray-600 dark:text-white/70">
                  Title (optional override)
                </span>
                <input
                  className="input"
                  placeholder="e.g., Algebra Essentials — Cohort A"
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                />
              </label>

              {/* Pass mark / Timer (locked for owner/admin) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600 dark:text-white/70">Pass mark (%)</span>
                  <input
                    className={`input ${lockPassTimer ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                    type="number"
                    min={0}
                    max={100}
                    value={passMark}
                    onChange={(e) => setPassMark(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={lockPassTimer}
                    readOnly={lockPassTimer}
                    title={lockPassTimer ? 'Managed by your subscription; cannot be changed.' : undefined}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-gray-600 dark:text-white/70">Timer (seconds)</span>
                  <input
                    className={`input ${lockPassTimer ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                    type="number"
                    min={30}
                    step={30}
                    value={timerSecs}
                    onChange={(e) => setTimerSecs(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={lockPassTimer}
                    readOnly={lockPassTimer}
                    title={lockPassTimer ? 'Managed by your subscription; cannot be changed.' : undefined}
                  />
                </label>
              </div>

              {lockPassTimer && (
                <div className="text-[11px] text-gray-500 dark:text-white/60">
                  Subscription plan{' '}
                  <span className="font-medium">
                    {planKey ? planKey[0].toUpperCase() + planKey.slice(1) : 'Starter'}
                  </span>{' '}
                  manages pass mark and timer.
                </div>
              )}

              {/* Date picker */}
              <label className="grid gap-1">
                <span className="text-sm text-gray-600 dark:text-white/70">
                  Due date (defaults to today)
                </span>
                <input
                  className="input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <span className="text-[11px] text-gray-500 dark:text-white/60">
                  The deadline is set to the end of the selected day (23:59:59).
                </span>
              </label>

              {!!err && (
                <div className="text-amber-600 dark:text-amber-300 text-sm">{err}</div>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="text-sm text-gray-600 dark:text-white/70">Invite link</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input className="input flex-1" readOnly value={inviteLink} />
                <button className="btn" onClick={copy}>Copy</button>
              </div>
              <div className="text-xs text-gray-500 dark:text-white/60">
                Share this link with your learners. They’ll see your org branding and “Accept &amp; Start”.
              </div>
            </div>
          )}
        </div>

        {/* Footer — only the Create button on the right (responsive) */}
        {!inviteLink && (
          <div
            className="
              px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-white/10
              flex items-center justify-end
            "
          >
            <button
              type="button"
              onClick={handleShare}
              disabled={busy || !canCreate}
              className="
                btn bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60
                dark:bg-emerald-600 dark:hover:bg-emerald-500
              "
            >
              {busy ? 'Creating…' : 'Create invite'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
