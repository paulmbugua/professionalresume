// packages/shared/hooks/useOrg.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useShopContext } from '@mytutorapp/shared/context';

// API
import { fetchCurrentUser, getMyOrg } from '@mytutorapp/shared/api/orgApi';

// Types
import type { OrgMembership, CurrentUser, OrgTier } from '@mytutorapp/shared/types';
import type { OrgResp } from '@mytutorapp/shared/api/orgApi';

export function useOrg() {
  const { backendUrl, token, userId } = useShopContext();

  // Existing state
  const [membership, setMembership] = useState<OrgMembership | OrgMembership[] | null>(null);

  // NEW: active org details (from /api/orgs/mine)
  const [org, setOrg] = useState<OrgResp | null>(null);

  // Optional loading flags (useful for UI spinners if you need them)
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(false);

  const fetchMembership = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoadingMembership(true);
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
    } finally {
      setLoadingMembership(false);
    }
  }, [backendUrl, token]);

  const fetchOrg = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoadingOrg(true);
    try {
      const o = await getMyOrg(backendUrl, token);
      setOrg(o ?? null);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        // eslint-disable-next-line no-console
        console.warn('[useOrg] fetchOrg failed', e.response?.status, e.message);
      }
      setOrg(null);
    } finally {
      setLoadingOrg(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (!token) {
      setMembership(null);
      setOrg(null);
      return;
    }
    fetchMembership();
    fetchOrg();
  }, [token, fetchMembership, fetchOrg]);

  // Derive primary membership (prefer owner/admin)
  const primaryMembership = useMemo(() => {
    if (!membership) return null;
    if (Array.isArray(membership)) {
      return membership.find(m => m.role === 'owner' || m.role === 'admin') || membership[0] || null;
    }
    return membership;
  }, [membership]);

  const isOwnerOrAdmin = !!primaryMembership && (primaryMembership.role === 'owner' || primaryMembership.role === 'admin');

  const activeOrgId =
    org?.id ||
    (Array.isArray(membership) ? membership[0]?.orgId : membership?.orgId) ||
    undefined;

  // Prefer server-joined subscription tier, fallback to membership hint
  // NOTE: do NOT default to 'starter' if there's no org — that would restrict normal users.
  const orgTier: OrgTier | undefined =
    (org?.tier as OrgTier | null) ??
    (primaryMembership?.tier as OrgTier | undefined) ??
    undefined;

  const hasOrg = Boolean(activeOrgId);

  // Convenience booleans — only true if the user actually has an org
  const isStarterTier = hasOrg && (orgTier === 'starter' || (orgTier as any) === 'start');
  const isProTier = hasOrg && orgTier === 'pro';
  const isEnterpriseTier = hasOrg && orgTier === 'enterprise';

  const orgSeats = typeof org?.seats === 'number' ? org.seats : undefined;

  // Keep existing name for compatibility, plus richer refreshers
  const refresh = fetchMembership;
  const refreshOrg = fetchOrg;
  const refreshAll = async () => {
    await Promise.allSettled([fetchMembership(), fetchOrg()]);
  };

  return {
    // existing
    userId,
    membership, // { orgId, role, tier?, features? } | OrgMembership[]
    refresh,

    // new
    org,
    orgTier,
    orgSeats,
    activeOrgId,
    isOwnerOrAdmin,
    refreshOrg,
    refreshAll,
    loading: loadingMembership || loadingOrg,
    loadingMembership,
    loadingOrg,

    // NEW convenience flags (org-scoped)
    isStarterTier,
    isProTier,
    isEnterpriseTier,
  };
}
