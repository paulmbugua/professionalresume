// packages/shared/context/ShopContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ShopContextValue,
  Profile,
} from '@mytutorapp/shared/types/ShopContextTypes'

export interface ShopContextDependencies {
  storage?: {
    getItem: (key: string) => Promise<string | null>
    setItem: (key: string, value: string) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }
  navigateFn?: (destination: string) => void
}

interface ShopContextProviderProps extends ShopContextDependencies {
  children: ReactNode
  backendUrl: string
}

export const ShopContext = createContext<ShopContextValue | undefined>(
  undefined
)

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({
  children,
  storage,
  navigateFn,
  backendUrl,
}) => {
  const queryClient = useQueryClient()

  // ── Local state ───────────────────────────────────────────────────────────
  const [token, setTokenState] = useState<string>('')
  const [language, setLanguage] = useState<'EN' | 'FR'>('EN')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [tokens, setTokens] = useState<number>(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'student' | 'tutor' | null>(null)

  // ── Persist / load token ────────────────────────────────────────────────────
  useEffect(() => {
    storage?.getItem('token').then((t) => {
      if (t) setTokenState(t)
    })
  }, [storage])

  const setToken = useCallback(
    async (newToken: string) => {
      setTokenState(newToken)
      if (storage) await storage.setItem('token', newToken)
    },
    [storage]
  )

  const logout = useCallback(async () => {
    setTokenState('')
    setUserEmail(null)
    setUserId(null)
    setRole(null)
    // clear the cached profile query
    queryClient.removeQueries({ queryKey: ['profile'] })
    if (storage) await storage.removeItem('token')
    navigateFn?.('/login')
  }, [storage, navigateFn, queryClient])

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'EN' ? 'FR' : 'EN'))
  }, [])

  // ── React-Query: fetch /api/profile/me ──────────────────────────────────────
  const {
    data: queryData,
    isLoading: loadingProfile,
    refetch: _refetchProfile,
  } = useQuery<Profile | null, Error, Profile | null, ['profile']>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await axios.get(`${backendUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return data.profileExists ? data.profile : null
    },
    enabled: Boolean(token),
    retry: false,
  })

  // coerce undefined→null so our context type is always Profile|null
  const profile: Profile | null = queryData ?? null

  const refreshProfile = useCallback(async () => {
    await _refetchProfile()
  }, [_refetchProfile])

  // ── Fetch /api/user/me ─────────────────────────────────────────────────────
  const fetchUserDetails = useCallback(async () => {
    const { data } = await axios.get(`${backendUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setUserEmail(data.email ?? null)
    setTokens(data.tokens ?? 0)
    setUserId(data.userId ? String(data.userId) : null)
    setRole(data.role ?? null)
  }, [backendUrl, token])

  useEffect(() => {
    if (token) {
      void fetchUserDetails()
    }
  }, [token, fetchUserDetails])

  const refreshUserDetails = useCallback(async () => {
    await fetchUserDetails()
  }, [fetchUserDetails])

  // ── Compose and provide context value ──────────────────────────────────────
  const value = useMemo<ShopContextValue>(
    () => ({
      backendUrl,
      token,
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
  )

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  )
}

export const useShopContext = (): ShopContextValue => {
  const ctx = useContext(ShopContext)
  if (!ctx) {
    throw new Error('useShopContext must be used within a ShopContextProvider')
  }
  return ctx
}

export default ShopContextProvider
