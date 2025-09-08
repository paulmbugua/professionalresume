// apps/web/src/pages/OrgInviteLanding.tsx
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

  const accept = async () => {
    if (!code) return setError('Invalid invite.');
    if (!token) {
      return nav('/login', { state: { next: `/org/join/${code}`, reason: 'org_invite' } });
    }
    try {
      const resp = await acceptOrgInvite(backendUrl, code, token);
      // redirect to robot teacher; pass assignmentId for timer enforcement
      nav(`/robot?assignmentId=${resp.attempt.assignment_id}&courseId=${(meta as OrgInviteInfo)?.course_id}`);
    } catch {
      setError('Failed to accept invite.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-6 grid place-items-center">
      <div className="w-full max-w-md sm:max-w-xl rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 sm:p-5">
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
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                Pass mark: <b>{meta.pass_mark || meta.default_pass_mark}%</b>
              </span>
              <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                Timer: <b>{meta.timer_s || meta.quiz_time_limit_s}s</b>
              </span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={accept}
                className="btn bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto"
              >
                Accept & Start
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
          </>
        )}
      </div>
    </div>
  );
}
