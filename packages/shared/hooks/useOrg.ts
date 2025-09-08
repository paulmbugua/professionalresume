// packages/shared/hooks/useOrg.ts
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useShopContext } from '@mytutorapp/shared/context';
import { fetchCurrentUser } from '@mytutorapp/shared/api';
import type { OrgMembership, CurrentUser } from '@mytutorapp/shared/types';

export function useOrg() {
  const { backendUrl, token, userId } = useShopContext();
  const [membership, setMembership] = useState<OrgMembership | OrgMembership[] | null>(null);

  const fetchMembership = useCallback(async () => {
    if (!token) return;
    try {
      const me: CurrentUser = await fetchCurrentUser(backendUrl, token);
      // Assumes your /api/user/me optionally returns `org` (single or array)
      setMembership((me as any)?.org ?? null);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        // eslint-disable-next-line no-console
        console.warn('[useOrg] fetchMembership failed', e.response?.status, e.message);
      }
      setMembership(null);
    }
  }, [backendUrl, token]);

  useEffect(() => { fetchMembership(); }, [fetchMembership]);

  return {
    userId,
    membership,   // { orgId, role, tier?, features? } | OrgMembership[]
    refresh: fetchMembership,
  };
}
