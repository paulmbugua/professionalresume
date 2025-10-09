import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

const card =
  'rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 sm:p-5';

export default function OrgLearnerHome() {
  const { org } = useOrg();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const assignmentId = params.get('assignmentId') || '';
  const courseId = params.get('courseId') || '';
  const hasAssignment = Boolean(assignmentId);

  const goClassroom = () => {
    if (hasAssignment) {
      const qs = new URLSearchParams({
        assignmentId,
        ...(courseId ? { courseId } : {}),
        lock: '1',
        flow: 'org',
      }).toString();
      navigate(`/robot-teach?${qs}`);
    } else {
      navigate('/robot-teach');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-6">
      <div className="max-w-screen-lg mx-auto space-y-4">

        {/* Header */}
        <header className={`${card} flex items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="text-[13px] text-white/70">Institution</div>
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {org?.name || 'Your organization'}
            </h1>
            <div className="text-xs text-white/60 mt-0.5">
              {org?.tier ? org.tier.toUpperCase() : 'STARTER'} plan
            </div>
          </div>
          <Link
            to="/org/portal"
            className="shrink-0 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
            title="Open E-Learning Portal"
          >
            Open Portal
          </Link>
        </header>

        {/* Classroom CTA */}
        <section className={card}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your classroom</h2>
              <p className="text-sm text-white/70">
                {hasAssignment
                  ? 'Resume your assigned activity.'
                  : 'Enter Robot Tutor to start learning.'}
              </p>
            </div>
            <button
              onClick={goClassroom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              <span className="text-base">🤖</span>
              {hasAssignment ? 'Resume assignment' : 'Enter Robot Tutor'}
            </button>
          </div>

          {/* Tiny hint */}
          {hasAssignment && (
            <div className="mt-3 text-xs text-white/60">
              Assignment ID <code className="opacity-90">{assignmentId}</code>
              {courseId ? <> · Course <code className="opacity-90">{courseId}</code></> : null}
            </div>
          )}
        </section>

        {/* Helpful links */}
        <section className={card}>
          <h3 className="text-base font-semibold mb-2">Helpful</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/org/portal" className="chip">Assignments</Link>
            <Link to="/org/profile" className="chip">Institution profile</Link>
            <Link to="/help" className="chip">Help</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
