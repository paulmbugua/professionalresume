// apps/web/src/components/org/OrgShareDialog.tsx
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
  totalLessons?: number;  // ⬅️ add
  quizCount?: number;     // ⬅️ add
  minutes?: number;       // ⬅️ add (target lesson minutes)
};

const STARTER_MAX_TIMER = 1800; // 30 minutes hard cap

const PLAN_DEFAULTS: Record<string, { pass: number; time: number }> = {
  start: { pass: 70, time: STARTER_MAX_TIMER },
  starter: { pass: 70, time: STARTER_MAX_TIMER },
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

// hh:mm → seconds
const hmToSeconds = (h: number, m: number) => {
  const hh = Number.isFinite(h) ? h : 0;
  const mm = Number.isFinite(m) ? m : 0;
  return Math.max(0, hh * 3600 + mm * 60);
};

export default function OrgShareDialog({
  open,
  onClose,
  onCancel,
  courseId,
  courseTitle,
  totalLessons,
  quizCount,
  minutes,
}: Props) {
  const nav = useNavigate();
  const { backendUrl, token } = useShopContext();
  const { org, activeOrgId, orgTier } = useOrg();

  // Plan-driven fixed values
  const planKey = (orgTier || (org as any)?.subscription?.tier || (org as any)?.tier || (org as any)?.plan || '')
    .toString()
    .toLowerCase();

  const isStarter = planKey === 'start' || planKey === 'starter';
  const planDefaults = PLAN_DEFAULTS[planKey] || PLAN_DEFAULTS.starter;

  const fixedPass = Number.isFinite(Number(org?.default_pass_mark))
    ? Number(org?.default_pass_mark)
    : planDefaults.pass;

  // Starter: always cap to 30 mins (1800s)
  const baseTime = Number.isFinite(Number(org?.quiz_time_limit_s))
    ? Number(org?.quiz_time_limit_s)
    : planDefaults.time;
  const fixedTime = isStarter ? Math.min(baseTime || STARTER_MAX_TIMER, STARTER_MAX_TIMER) : baseTime;

  // Lock rules
  const lockTimer = isStarter; // Starter cannot change timer
  const lockPass = false;      // Pass mark remains editable
  const lockAttempts = isStarter; // Starter locked to 1 attempt

  // UI state
  const [titleOverride, setTitleOverride] = React.useState('');
  const [passMark, setPassMark] = React.useState<number | ''>(fixedPass);
  const [timerH, setTimerH] = React.useState<number>(0);
  const [timerM, setTimerM] = React.useState<number>(30);
  const [maxAttempts, setMaxAttempts] = React.useState<number>(isStarter ? 1 : 2);
  const [dueDate, setDueDate] = React.useState<string>(todayDateInput()); // yyyy-mm-dd
  const [inviteLink, setInviteLink] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  // Drag / position
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
  } | null>(null);

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

    // Derive hours/minutes from fixedTime (Starter will be 30m by rule)
    const initH = Math.floor((fixedTime || 0) / 3600);
    const initM = Math.floor(((fixedTime || 0) % 3600) / 60);

    if (isStarter) {
      setTimerH(0);
      setTimerM(30); // locked 30 minutes for Starter
      setMaxAttempts(1);
    } else {
      setTimerH(initH);
      setTimerM(initM);
      setMaxAttempts((prev) => (prev === 1 ? 2 : prev)); // sensible default for non-starter
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedPass, fixedTime, isStarter]);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Center once when opened
  React.useEffect(() => {
    if (!open) return;
    setPos((p) => p ?? { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) });
  }, [open]);

  function clampToViewport(next: { x: number; y: number }) {
    const margin = 16;
    const w = modalRef.current?.offsetWidth || 480;
    const h = modalRef.current?.offsetHeight || 320;
    const minX = margin + w / 2;
    const maxX = window.innerWidth - margin - w / 2;
    const minY = margin + h / 2;
    const maxY = window.innerHeight - margin - h / 2;
    return {
      x: Math.max(minX, Math.min(next.x, maxX)),
      y: Math.max(minY, Math.min(next.y, maxY)),
    };
  }

  const onDragStart: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('button, a, input, [role="button"]')) return; // ignore interactive controls
    if (!pos) return;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: pos };
  };

  const onDragMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clampToViewport({
      x: dragRef.current.startPos.x + dx,
      y: dragRef.current.startPos.y + dy,
    });
    setPos(next);
  };

  const onDragEnd: React.PointerEventHandler<HTMLDivElement> = (e) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
    setDragging(false);
  };

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
    if (onCancel) onCancel();
    else onClose();
  };

  // Backdrop click — normal close (but ignore while dragging)
  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (dragging) return; // don't close while dragging
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

    // Enforce Starter cap on the client too
    const pickedSeconds = hmToSeconds(timerH || 0, timerM || 0);
    const requestedTimer = pickedSeconds === 0 ? 0 : pickedSeconds;
    const effectiveTimer = isStarter
      ? Math.min(requestedTimer || STARTER_MAX_TIMER, STARTER_MAX_TIMER)
      : requestedTimer;

    const effectivePass = passMark === '' ? null : Number(passMark);
    const effectiveAttempts = isStarter ? 1 : Math.max(1, Math.min(10, Number(maxAttempts) || 1));

    setBusy(true);
    try {
      const assignOpts = {
        title_override: titleOverride.trim() || null,
        pass_mark: effectivePass,
        timer_s: effectiveTimer,
        max_attempts: effectiveAttempts, // ⬅️ NEW
        due_at: dueAtISO,
        locked_config: {
          totalLessons: typeof totalLessons === 'number' ? totalLessons : undefined,
          quizSize: typeof quizCount === 'number' ? quizCount : undefined,
          minutes: typeof minutes === 'number' ? minutes : undefined,
        },
      };

      // Build payload
      const payload = {
        ...(courseId ? { courseId } : { title: courseTitle!.trim() }),
        ...(typeof minutes === 'number' ? { minutes } : {}),
        ...assignOpts,
      };

      const resp = await ensureOrgShareableAssignment(
        backendUrl,
        token,
        activeOrgId,
        payload as any
      );

      const code =
        resp.assignment?.invite_code ??
        resp.assignment?.inviteCode ??
        resp.assignment?.code;

      if (!code) throw new Error('Invite code missing');
      const link = `${window.location.origin}/org/join/${code}`;
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
              max_attempts: effectiveAttempts, // ⬅️ ensure legacy path carries it
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
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 p-3 bg-black/60"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share course with learners"
        className="
          fixed w-full max-w-lg md:max-w-xl rounded-2xl
          bg-white text-gray-900 shadow-xl
          dark:bg-[#0f1821] dark:text-white dark:ring-1 dark:ring-white/10
        "
        style={pos ? { left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' } : { visibility: 'hidden' }}
      >
        {/* Header */}
        <div
          className="
            px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200
            dark:border-white/10 flex items-start justify-between gap-3
            cursor-move select-none touch-none
          "
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          aria-roledescription="draggable"
        >
          <div className="min-w-0">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-white/70">
                Share course with learners
              </div>
              <div className="font-semibold truncate text-sm sm:text-base">
                {courseTitle || 'Selected course'}
              </div>

              {(typeof totalLessons === 'number' || typeof quizCount === 'number') && (
                <div className="text-[11px] sm:text-xs text-gray-500 dark:text-white/60 mt-0.5">
                  {typeof totalLessons === 'number' ? `${totalLessons} lessons` : '—'}
                  {typeof quizCount === 'number' ? ` • ${quizCount} questions` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Top-right Cancel (X) — restored to transparent background */}
          <button
            type="button"
            aria-label="Cancel"
            title="Cancel and pick another course"
            onClick={handleCancelIcon}
            className="
              h-8 w-8 shrink-0 rounded-lg ring-1 ring-gray-300
              grid place-items-center
              bg-transparent hover:bg-gray-50
              dark:bg-transparent dark:text-white dark:ring-white/20 dark:hover:bg-white/10
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

              {/* Pass mark / Timer (Starter: timer locked & capped) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="grid gap-1">
                  <span className="text-sm text-gray-600 dark:text-white/70">Pass mark (%)</span>
                  <input
                    className={`input ${lockPass ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                    type="number"
                    min={0}
                    max={100}
                    value={passMark}
                    onChange={(e) => setPassMark(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={lockPass}
                    readOnly={lockPass}
                    title={lockPass ? 'Managed by your plan; cannot be changed.' : undefined}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm text-gray-600 dark:text-white/70">
                    Timer (duration){' '}
                    {isStarter && <em className="text-[11px] text-gray-500">• Starter fixed at 30 min</em>}
                  </span>

                  {/* Hours / Minutes selectors */}
                  <div className="flex items-center gap-2">
                    {/* Hours */}
                    <select
                      className={`input !py-2 !px-3 w-[110px] ${lockTimer ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                      value={timerH}
                      onChange={(e) => setTimerH(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      disabled={lockTimer}
                    >
                      {Array.from({ length: 13 }).map((_, h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? 'hour' : 'hours'}
                        </option>
                      ))}
                    </select>

                    {/* Minutes */}
                    <select
                      className={`input !py-2 !px-3 w-[130px] ${lockTimer ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                      value={timerM}
                      onChange={(e) => setTimerM(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      disabled={lockTimer}
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>
                          {m} {m === 1 ? 'minute' : 'minutes'}
                        </option>
                      ))}
                    </select>

                    {/* HH:MM preview */}
                    <span className="text-xs text-gray-600 dark:text-white/60">
                      {(timerH ?? 0).toString().padStart(2, '0')}:
                      {(timerM ?? 0).toString().padStart(2, '0')}:00
                    </span>
                  </div>

                  <span className="text-[11px] text-gray-500 dark:text-white/60">
                    Set both to 0 for no time limit.
                  </span>
                </label>
              </div>

              {/* Max attempts (Starter locked to 1) */}
              <label className="grid gap-1">
                <span className="text-sm text-gray-600 dark:text-white/70">
                  Max quiz attempts
                  {isStarter && <em className="ml-1 text-[11px] text-gray-500">• Starter locked to 1</em>}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    className={`input w-28 ${lockAttempts ? 'bg-gray-100 cursor-not-allowed dark:bg-white/10' : ''}`}
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    disabled={lockAttempts}
                    readOnly={lockAttempts}
                  />
                  <span className="text-xs text-gray-600 dark:text-white/60">
                    Learners can retry up to this number.
                  </span>
                </div>
              </label>

              {isStarter && (
                <div className="text-[11px] text-gray-500 dark:text-white/60">
                  <strong>Starter Plan:</strong> Quiz timer is limited to 30 minutes and attempts are limited to 1.
                  Upgrade to PRO or ENTERPRISE to customize.
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
