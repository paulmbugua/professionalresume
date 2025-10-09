import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

const card =
  'rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 sm:p-5';

export default function OrgInstructorHome() {
  const { org } = useOrg();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-6">
      <div className="max-w-screen-lg mx-auto space-y-4">

        {/* Header */}
        <header className={`${card} flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="text-[13px] text-white/70">Instructor</div>
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {org?.name || 'Your organization'}
            </h1>
            <div className="text-xs text-white/60 mt-0.5">
              {org?.tier ? org.tier.toUpperCase() : 'STARTER'} plan
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/org/portal"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
              title="Open E-Learning Portal"
            >
              Open Portal
            </Link>
            <button
              onClick={() => navigate('/robot-teach')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
              title="Try Robot Tutor now"
            >
              Try Robot Tutor
            </button>
          </div>
        </header>

        {/* Quick actions */}
        <section className={card}>
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to="/org/portal" className="chip chip-active">Create assignment</Link>
            <Link to="/org/portal" className="chip">Analytics</Link>
            <Link to="/org/portal" className="chip">Branding</Link>
            <Link to="/org/learn" className="chip">View learner home</Link>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Use the E-Learning Portal to configure pass marks & timers, generate invite links,
            and review attempt analytics.
          </p>
        </section>

        {/* Info */}
        <section className={card}>
          <h3 className="text-base font-semibold mb-1">How sharing works</h3>
          <ol className="list-decimal ml-5 text-sm text-white/80 space-y-1">
            <li>Create an assignment in the Portal and copy the invite link.</li>
            <li>Share the invite with learners (email/WhatsApp/QR).</li>
            <li>Learners sign in and are taken directly to Robot Tutor.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
