// packages/shared/hooks/useOrg.ts
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useShopContext } from '@mytutorapp/shared/context';

// ⬇️ Import fetchCurrentUser from your org API file (adjust path if you re-export from a barrel)
import { fetchCurrentUser } from '@mytutorapp/shared/api/orgApi';

import type { OrgMembership, CurrentUser } from '@mytutorapp/shared/types';

export function useOrg() {
  const { backendUrl, token, userId } = useShopContext();
  const [membership, setMembership] = useState<OrgMembership | OrgMembership[] | null>(null);

  const fetchMembership = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const me: CurrentUser = await fetchCurrentUser(backendUrl, token);
      // /api/user/me may return a single membership, an array, or null
      setMembership((me as any)?.org ?? null);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        // eslint-disable-next-line no-console
        console.warn('[useOrg] fetchMembership failed', e.response?.status, e.message);
      }
      setMembership(null);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  return {
    userId,
    membership,   // { orgId, role, tier?, features? } | OrgMembership[]
    refresh: fetchMembership,
  };
}
