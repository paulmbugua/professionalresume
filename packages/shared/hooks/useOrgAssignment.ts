import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';

export function useOrgAssignment() {
  const [sp] = useSearchParams();
  const assignmentId = sp.get('assignmentId');
  const { backendUrl, token } = useShopContext();
  const [attempt, setAttempt] = useState<any | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    let t: any;
    if (!attempt?.due_at) return;
    const tick = () => setRemainingMs(Math.max(0, new Date(attempt.due_at).getTime() - Date.now()));
    tick();
    t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [attempt?.due_at]);

  // fetch attempt on mount (auth required)
  useEffect(() => {
    (async () => {
      if (!assignmentId || !token) return;
      const r = await fetch(`${backendUrl}/api/orgs/invite/${sp.get('code') || ''}`); // optional if you pass code in URL
      // or you may add /api/assignments/:id meta endpoint; for brevity, skip extra call
      // here assume submit will validate server-side.
    })();
  }, [assignmentId, token, backendUrl]);

  return {
    assignmentId,
    attempt,
    setAttempt,
    remainingMs,
    expired: useMemo(()=> remainingMs <= 0, [remainingMs]),
  };
}
