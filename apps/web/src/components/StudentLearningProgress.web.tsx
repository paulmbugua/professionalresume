// apps/web/src/components/StudentLearningProgress.web.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useEnrollments } from '@mytutorapp/shared/hooks';
import type { Enrollment } from '@mytutorapp/shared/types';

export default function StudentLearningProgress() {
  const { backendUrl, token, profile } = useShopContext();

  // studentId like you’ve done elsewhere (user_id or id)
  const studentId =
    (profile as { user_id?: number | string; id?: number | string } | null)?.user_id ??
    (profile as { id?: number | string } | null)?.id;

  const { enrollments, loading, error, fetchMine } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: studentId as string | number | undefined,
  });

  useEffect(() => {
    if (studentId) fetchMine();
  }, [studentId, fetchMine]);

  return (
    <>
      <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.015em] px-4 pb-3 pt-5">
        Learning progress
      </h2>

      <div className="mx-4 grid grid-cols-1 gap-3">
        {loading && <p className="text-sm text-[#49739c]">Loading your progress…</p>}
        {!loading && error && <p className="text-sm text-red-600">Failed to load progress.</p>}
        {!loading && !error && enrollments.length === 0 && (
          <p className="text-sm text-[#49739c]">You haven’t enrolled in any course yet.</p>
        )}

        {enrollments.map((e: Enrollment) => {
          const pct = Math.max(0, Math.min(100, Number(e.progress ?? 0)));
          return (
            <div
              key={e.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3"
            >
              <div className="flex flex-col">
                <p className="text-base font-semibold leading-normal">
                  {/* If your enrollments API includes course title, use it; otherwise link generically */}
                  Course #{String(e.courseId)}
                </p>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">
                  {pct}% completed
                </p>
              </div>

              <div className="sm:ml-auto flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none w-full sm:w-[180px] overflow-hidden rounded-sm bg-[#cedbe8] dark:bg-darkCard">
                  <div className="h-1.5 rounded-full bg-[#3d99f5]" style={{ width: `${pct}%` }} />
                </div>
                <Link
                  to={`/courses/${e.courseId}/continue`}
                  className="rounded-lg h-8 px-3 flex items-center bg-[#3d99f5] text-white font-semibold"
                >
                  Continue
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
