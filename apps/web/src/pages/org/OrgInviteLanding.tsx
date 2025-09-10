import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrgInvite } from '@mytutorapp/shared/hooks';
import { acceptOrgInvite } from '@mytutorapp/shared/api';
import type { OrgInviteInfo } from '@mytutorapp/shared/types';

export default function OrgInviteLanding() {
  const { code = '' } = useParams();
  const { backendUrl, token } = useShopContext();
  const nav = useNavigate();

  const { data: meta, loading } = useOrgInvite(code);
  const [error, setError] = React.useState<string>('');
  const [accepting, setAccepting] = React.useState<boolean>(false);

  const onAccept = async () => {
    setError('');
    if (!code) return setError('Invalid invite.');
    if (!token) {
      return nav('/login', {
        state: { next: `/org/join/${code}`, reason: 'org_invite' },
      });
    }
    setAccepting(true);
    try {
      const resp = await acceptOrgInvite(backendUrl, code, token);
      nav(
        `/robot?assignmentId=${resp.attempt.assignment_id}&courseId=${(meta as OrgInviteInfo)?.course_id}`
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  // ── UI helpers ───────────────────────────────────────────
  const passMarkLabel = React.useMemo(() => {
    if (!meta) return '—';
    const pass = meta.pass_mark ?? meta.default_pass_mark;
    return pass != null ? `${pass}%` : '—';
  }, [meta]);

  const timerLabel = React.useMemo(() => {
    if (!meta) return '—';
    const secs = meta.timer_s ?? meta.quiz_time_limit_s;
    if (!secs) return '—';
    return secs % 60 === 0 ? `${secs / 60} min` : `${secs}s`;
  }, [meta]);

  const dueLabel = React.useMemo(() => {
    if (!meta?.due_at) return null;
    try {
      const d = new Date(meta.due_at);
      return d.toLocaleString();
    } catch {
      return meta.due_at;
    }
  }, [meta]);

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-6 grid place-items-center">
      <div className="w-full max-w-md sm:max-w-xl rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 sm:p-5">
        {/* Loading / invalid */}
        {!meta ? (
          <div className="text-white/80 text-sm sm:text-base">
            {error || (loading ? 'Loading…' : 'Invalid invite.')}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              {meta.logo_url && (
                <img
                  src={meta.logo_url}
                  alt={`${meta.org_name || 'Organization'} logo`}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="text-[13px] text-white/70">Invitation to learn</div>
                <div className="text-lg sm:text-xl font-semibold truncate">
                  {meta.title_override || 'Assigned Course'}
                </div>
                <div className="text-white/70 text-sm truncate">{meta.org_name}</div>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                Pass mark: <b>{passMarkLabel}</b>
              </span>
              <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                Timer: <b>{timerLabel}</b>
              </span>
              {typeof meta.max_attempts === 'number' && (
                <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                  Attempts: <b>{meta.max_attempts}</b>
                </span>
              )}
              {dueLabel && (
                <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                  Due: <b>{dueLabel}</b>
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAccept}
                disabled={accepting}
                className="btn bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto disabled:opacity-60"
                aria-busy={accepting}
              >
                {token ? (accepting ? 'Starting…' : 'Accept & Start') : 'Sign in to start'}
              </button>
              <button
                onClick={() => nav(-1)}
                className="chip w-full sm:w-auto"
                title="Go back"
              >
                Cancel
              </button>
            </div>

            {/* Signature (optional) */}
            {meta.signature_url && (
              <div className="mt-4">
                <img
                  src={meta.signature_url}
                  alt="Authorized signature"
                  className="h-10 opacity-70"
                />
              </div>
            )}

            {/* Error */}
            {!!error && (
              <div className="mt-3 text-amber-300 text-xs">{error}</div>
            )}

            {/* Subtle footnote */}
            <p className="mt-4 text-[12px] text-white/60">
              By starting, you’ll be added as a learner in <b>{meta.org_name}</b> for this course.
              Your attempt may be timed and limited by your organization’s policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
