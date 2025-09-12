// packages/shared/hooks/useOrgAssignment.ts
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';

type LockedConfig = {
  minutes?: number;
  totalLessons?: number;
  quizSize?: number;
  [k: string]: unknown;
};

type AttemptMeta = {
  attemptId: string;
  assignmentId: string;
  courseId: string;
  locked_config: LockedConfig | null;
  passMark: number;
  timer_s: number;
  due_at: string | null;
  status: 'active' | 'expired' | 'submitted' | string;
  org_id: string;
  title_override: string | null;
};

export function useOrgAssignment() {
  const [sp] = useSearchParams();
  const assignmentId = sp.get('assignmentId') || '';
  const attemptId    = sp.get('attemptId') || '';
  const lockFlag     = sp.get('lock') === '1';

  const { backendUrl, token } = useShopContext();

  const [meta, setMeta] = useState<AttemptMeta | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // fetch meta once we have (attemptId OR assignmentId) + token
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!token) { setMeta(null); return; }
      if (!attemptId && !assignmentId) { setMeta(null); return; }

      setLoading(true);
      setError(null);

      try {
        const url = attemptId
          ? `${backendUrl}/api/orgs/attempts/${encodeURIComponent(attemptId)}/meta`
          : `${backendUrl}/api/orgs/assignments/${encodeURIComponent(assignmentId)}/mine`;

        const r = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const data = await r.json();
        if (aborted) return;

        const m: AttemptMeta = data?.meta;
        setMeta(m || null);

        // seed timer immediately
        const due = m?.due_at ? new Date(m.due_at).getTime() : 0;
        setRemainingMs(due ? Math.max(0, due - Date.now()) : 0);
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Failed to load assignment');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => { aborted = true; };
  }, [attemptId, assignmentId, backendUrl, token]);

  // tick remaining time
  useEffect(() => {
    if (!meta?.due_at) return;
    const due = new Date(meta.due_at).getTime();
    const tick = () => setRemainingMs(Math.max(0, due - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [meta?.due_at]);

  const expired = useMemo(() => remainingMs <= 0 && !!meta?.due_at, [remainingMs, meta?.due_at]);

  return {
    // ids & flags
    assignmentId: meta?.assignmentId || assignmentId || null,
    attemptId: meta?.attemptId || attemptId || null,
    locked: lockFlag || Boolean(meta || assignmentId || attemptId),

    // meta for locking UI + generation
    lockedConfig: (meta?.locked_config || null) as LockedConfig | null,
    passMark: meta?.passMark ?? null,
    timerS: meta?.timer_s ?? null,
    dueAt: meta?.due_at ?? null,
    status: meta?.status ?? null,

    // timer state
    remainingMs,
    expired,

    // raw + load state
    meta,
    loading,
    error,
  };
}
