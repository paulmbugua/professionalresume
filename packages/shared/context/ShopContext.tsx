// packages/shared/context/ShopContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import useAppQuery from '../hooks/useAppQuery';
import type {
  ShopContextValue,
  Profile,
  UserRole,
} from '@mytutorapp/shared/types/ShopContextTypes';

interface ShopContextProviderProps {
  children: ReactNode;
  backendUrl: string;
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  navigateFn?: (destination: string) => void;
}

interface ApiProfileMeResponse {
  profileExists: boolean;
  profile: Profile;
}

interface ApiUserMeResponse {
  email?: string | null;
  tokens?: number;
  userId?: string | number | null;
  role?: string | null;
}

export const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const normalizeRole = (r: unknown): UserRole => {
  if (typeof r !== 'string') return null;
  const v = r.toLowerCase();
  if (v === 'student' || v === 'tutor' || v === 'admin' || v === 'superadmin') {
    return v as UserRole;
  }
  return null;
};

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({
  children,
  backendUrl,
  storage,
  navigateFn,
}) => {
  const queryClient = useQueryClient();

  // ── Local state ───────────────────────────────────────────────────────────
  const [token, setTokenState] = useState<string>('');
  const [initializing, setInitializing] = useState<boolean>(true);
  const [language, setLanguage] = useState<'EN' | 'FR'>('EN');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);

  // ── Persist / load token & role only once ─────────────────────────────────
  useEffect(() => {
    (async () => {
      const [t, r] = await Promise.all([
        storage?.getItem('token'),
        storage?.getItem('role'),
      ]);
      if (t) setTokenState(t);
      if (r) setRole(normalizeRole(r));
      setInitializing(false);
    })();
  }, [storage]);

  // ── Set / clear token (writes to storage) ─────────────────────────────────
  const setToken = useCallback(
    async (newToken: string): Promise<void> => {
      setTokenState(newToken);
      if (storage) {
        if (newToken) {
          await storage.setItem('token', newToken);
        } else {
          await storage.removeItem('token');
          await storage.removeItem('role'); // clear cached role when logging out
        }
      }
    },
    [storage]
  );

  const logout = useCallback(async (): Promise<void> => {
    setTokenState('');
    setUserEmail(null);
    setUserId(null);
    setRole(null);
    queryClient.removeQueries({ queryKey: ['profile', token] });
    if (storage) {
      await storage.removeItem('token');
      await storage.removeItem('role'); // ensure role is cleared
    }
    if (navigateFn) navigateFn('/login');
  }, [queryClient, storage, navigateFn, token]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'EN' ? 'FR' : 'EN'));
  }, []);

  // ── React Query: fetch /api/profile/me ────────────────────────────────────
  const {
    data: queryData,
    isLoading: loadingProfile,
    refetch,
  } = useAppQuery<Profile | null, Error>(
    ['profile', token],
    async () => {
      const res = await axios.get<ApiProfileMeResponse>(`${backendUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.profileExists ? res.data.profile : null;
    },
    {
      enabled: Boolean(token),
      retry: false,
    }
  );

  const profile: Profile | null = queryData ?? null;

  const refreshProfile = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  // ── Fetch /api/user/me ─────────────────────────────────────────────────────
  const fetchUserDetails = useCallback(async (): Promise<void> => {
    const { data } = await axios.get<ApiUserMeResponse>(`${backendUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const incomingEmail = data.email ?? null;
    if (incomingEmail !== userEmail) setUserEmail(incomingEmail);

    const incomingTokens = data.tokens ?? 0;
    if (incomingTokens !== tokens) setTokens(incomingTokens);

    const incomingUserId =
      data.userId != null ? String(data.userId) : null;
    if (incomingUserId !== userId) setUserId(incomingUserId);

    const incomingRole = normalizeRole(data.role ?? null);
    if (incomingRole !== role) setRole(incomingRole);

    // persist role for reloads
    if (storage) {
      if (incomingRole) {
        await storage.setItem('role', incomingRole);
      } else {
        await storage.removeItem('role');
      }
    }
  }, [backendUrl, token, userEmail, tokens, userId, role, storage]);

  useEffect(() => {
    if (!token) return;
    void fetchUserDetails().catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  }, [token, fetchUserDetails]);

  const refreshUserDetails = useCallback(async (): Promise<void> => {
    await fetchUserDetails();
  }, [fetchUserDetails]);

  // ── Compose and provide context value ─────────────────────────────────────
  const value = useMemo<ShopContextValue>(
    () => ({
      backendUrl,
      token,
      initializing,
      userId,
      language,
      setToken,
      toggleLanguage,
      logout,
      userEmail,
      tokens,
      setTokens,
      loadingProfile,
      profile,
      refreshProfile,
      refreshUserDetails,
      role,
    }),
    [
      backendUrl,
      token,
      initializing,
      userId,
      language,
      setToken,
      toggleLanguage,
      logout,
      userEmail,
      tokens,
      loadingProfile,
      profile,
      refreshProfile,
      refreshUserDetails,
      role,
    ]
  );

  return (
    <ShopContext.Provider value={value}>
      {initializing ? null : children}
    </ShopContext.Provider>
  );
};

export const useShopContext = (): ShopContextValue => {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error('useShopContext must be used within a ShopContextProvider');
  }
  return ctx;
};

export default ShopContextProvider;
