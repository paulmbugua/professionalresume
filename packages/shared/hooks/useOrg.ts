// packages/shared/hooks/useOrg.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useShopContext } from '@mytutorapp/shared/context';
import { fetchCurrentUser, getMyOrg } from '@mytutorapp/shared/api/orgApi';
import type { OrgMembership, CurrentUser, OrgTier } from '@mytutorapp/shared/types';
import type { OrgResp } from '@mytutorapp/shared/api/orgApi';

export function useOrg() {
  const { backendUrl, token, orgToken, userId } = useShopContext() as any;
  const authToken: string | undefined = orgToken || token; // <-- use org token when present

  // State
  const [membership, setMembership] = useState<OrgMembership | OrgMembership[] | null>(null);
  const [org, setOrg] = useState<OrgResp | null>(null);

  // Prime from localStorage so UI can gate instantly (before network)
  const [activeOrgId, setActiveOrgId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return (
      localStorage.getItem('org:activeId') ||
      localStorage.getItem('auth:orgId') ||
      undefined
    );
  });
  const [localRole, setLocalRole] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const r = localStorage.getItem('org:role');
    return r ? r.toLowerCase() : undefined;
  });

  // Optional loading flags
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // Keep storage in sync (handles hard reload + other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key === 'org:activeId' || e.key === 'auth:orgId') {
        setActiveOrgId(
          localStorage.getItem('org:activeId') ||
          localStorage.getItem('auth:orgId') ||
          undefined
        );
      }
      if (e.key === 'org:role') {
        const r = localStorage.getItem('org:role');
        setLocalRole(r ? r.toLowerCase() : undefined);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fetchMembership = useCallback(async (): Promise<void> => {
    if (!authToken) return; // <-- use combined token
    setLoadingMembership(true);
    try {
      const me: CurrentUser = await fetchCurrentUser(backendUrl, authToken);
      setMembership((me as any)?.org ?? null);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.warn('[useOrg] fetchMembership failed', e.response?.status, e.message);
      }
      setMembership(null);
    } finally {
      setLoadingMembership(false);
    }
  }, [backendUrl, authToken]);

  const fetchOrg = useCallback(async (): Promise<void> => {
    if (!authToken) return; // <-- use combined token
    setLoadingOrg(true);
    try {
      const o = await getMyOrg(backendUrl, authToken);
      setOrg(o ?? null);

      // also update activeOrgId/role from server response when available
      if (o?.id) setActiveOrgId((prev) => prev ?? o.id);
      const myRole = ((o as any)?.my_role || (o as any)?.role || '').toString().toLowerCase();
      if (myRole) setLocalRole((prev) => prev ?? myRole);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.warn('[useOrg] fetchOrg failed', e.response?.status, e.message);
      }
      setOrg(null);
    } finally {
      setLoadingOrg(false);
    }
  }, [backendUrl, authToken]);

  useEffect(() => {
    if (!authToken) {
      setMembership(null);
      setOrg(null);
      return;
    }
    fetchMembership();
    fetchOrg();
  }, [authToken, fetchMembership, fetchOrg]);

  // Derive primary membership (prefer owner/admin)
  const primaryMembership = useMemo(() => {
    if (!membership) return null;
    if (Array.isArray(membership)) {
      return membership.find(m => m.role === 'owner' || m.role === 'admin') || membership[0] || null;
    }
    return membership;
  }, [membership]);

  // Prefer server org id; fallback stays available via state `activeOrgId`
  const effectiveOrgId =
    org?.id ??
    (Array.isArray(membership) ? membership[0]?.orgId : membership?.orgId) ??
    activeOrgId; // <-- storage/primed fallback

  // Tier
  const orgTier: OrgTier | undefined =
    (org?.tier as OrgTier | null) ??
    (primaryMembership?.tier as OrgTier | undefined) ??
    undefined;

  const hasOrg = Boolean(effectiveOrgId);
  const isStarterTier = hasOrg && (orgTier === 'starter' || (orgTier as any) === 'start');
  const isProTier = hasOrg && orgTier === 'pro';
  const isEnterpriseTier = hasOrg && orgTier === 'enterprise';

  const isOwnerOrAdmin =
    (!!primaryMembership && (primaryMembership.role === 'owner' || primaryMembership.role === 'admin')) ||
    localRole === 'owner' || localRole === 'admin'; // <-- storage role helps early gate

  const orgSeats = typeof org?.seats === 'number' ? org.seats : undefined;

  const refresh = fetchMembership;
  const refreshOrg = fetchOrg;
  const refreshAll = async () => {
    await Promise.allSettled([fetchMembership(), fetchOrg()]);
  };

  return {
    userId,
    membership,
    refresh,

    org,
    orgTier,
    orgSeats,
    activeOrgId: effectiveOrgId,  // <-- now non-undefined as soon as storage or server has it
    isOwnerOrAdmin,
    refreshOrg,
    refreshAll,
    loading: loadingMembership || loadingOrg,
    loadingMembership,
    loadingOrg,

    isStarterTier,
    isProTier,
    isEnterpriseTier,
    // optionally expose localRole if your UI wants it
    role: localRole || (primaryMembership?.role ?? undefined),
  };
}
