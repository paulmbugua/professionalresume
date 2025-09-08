// packages/shared/hooks/useOrgInvite.ts
import { useEffect, useState } from 'react';
import { resolveOrgInvite } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import type { OrgInviteInfo } from '@mytutorapp/shared/types';

export function useOrgInvite(code?: string) {
  const { backendUrl } = useShopContext();
  const [data, setData] = useState<OrgInviteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    (async () => {
      try {
        const info = await resolveOrgInvite(backendUrl, code);
        setData(info ?? null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [backendUrl, code]);

  return { data, loading };
}
