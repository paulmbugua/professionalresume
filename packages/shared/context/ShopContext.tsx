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
import type {
  ShopContextValue,
  Profile,
} from '@mytutorapp/shared/types/ShopContextTypes';

export interface ShopContextDependencies {
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  navigateFn?: (destination: string) => void;
}

interface ShopContextProviderProps extends ShopContextDependencies {
  children: ReactNode;
  backendUrl: string;
}

export const ShopContext = createContext<ShopContextValue | undefined>(
  undefined
);

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({
  children,
  storage,
  navigateFn,
  backendUrl,
}) => {
  const [token, setTokenState] = useState<string>('');
  const [language, setLanguage] = useState<string>('EN');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);      // ← state for userId
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [role, setRole] = useState<'student' | 'tutor' | null>(null);

  // Persist / load token
  useEffect(() => {
    if (storage) {
      storage.getItem('token').then((t) => {
        if (t) setTokenState(t);
      });
    }
  }, [storage]);

  // Exposed setter
  const setToken = useCallback(
    async (newToken: string) => {
      setTokenState(newToken);
      if (storage) await storage.setItem('token', newToken);
    },
    [storage]
  );

  // Logout
  const logout = useCallback(async () => {
    setTokenState('');
    setUserEmail(null);
    setProfile(null);
    setUserId(null);                                             // ← clear it on logout
    if (storage) await storage.removeItem('token');
    if (navigateFn) navigateFn('/login');
  }, [storage, navigateFn]);

  // Language
  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'EN' ? 'FR' : 'EN'));
  }, []);

  // Fetch user details
  const fetchUserDetails = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserEmail(data.email ?? null);
      setTokens(data.tokens ?? 0);
      setUserId(data.userId ? String(data.userId) : null);      // ← capture userId
      setRole(data.role ?? null);
    } catch (err) {
      console.error('Error fetching user details', err);
    }
  }, [backendUrl, token]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data.profileExists ? data.profile : null);
    } catch (err) {
      console.error('Error fetching profile', err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [backendUrl, token]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const refreshUserDetails = useCallback(async () => {
    await fetchUserDetails();
  }, [fetchUserDetails]);

  // When token arrives, load details + profile
  useEffect(() => {
    if (token) {
      fetchUserDetails();
      fetchProfile();
    }
  }, [token, fetchUserDetails, fetchProfile]);

  // === HERE: include userId in the provided value ===
  const value = useMemo<ShopContextValue>(
    () => ({
      backendUrl,
      token,
      userId,                                                   // ← exposed here
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
      userId,                                                   // ← and in deps
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
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShopContext = (): ShopContextValue => {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error(
      'useShopContext must be used within a ShopContextProvider'
    );
  }
  return ctx;
};

export default ShopContextProvider;
