import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useAppQuery from '../hooks/useAppQuery'
import type { ShopContextValue, Profile } from '@mytutorapp/shared/types/ShopContextTypes'

interface ShopContextProviderProps {
  children: ReactNode
  backendUrl: string
  storage?: {
    getItem: (key: string) => Promise<string | null>
    setItem: (key: string, value: string) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }
  navigateFn?: (destination: string) => void
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined)

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({
  children,
  backendUrl,
  storage,
  navigateFn,
}) => {
  const queryClient = useQueryClient()

  // ── Auth token in storage ─────────────────────────────────────────────────
  const [token, setTokenState] = useState<string>('')
  const [initializing, setInitializing] = useState<boolean>(true)

  useEffect(() => {
    storage
      ?.getItem('token')
      .then(t => {
        if (t) setTokenState(t)
      })
      .finally(() => {
        setInitializing(false)
      })
  }, [storage])

  const setToken = useCallback(
    async (newToken: string) => {
      setTokenState(newToken)
      if (storage) {
        await storage.setItem('token', newToken)
      }
    },
    [storage]
  )

  const logout = useCallback(async () => {
    setTokenState('')
    queryClient.removeQueries()
    if (storage) {
      await storage.removeItem('token')
    }
    navigateFn?.('/login')
  }, [queryClient, storage, navigateFn])

  // ── Language toggle ───────────────────────────────────────────────────────
  const [language, setLanguage] = useState<'EN' | 'FR'>('EN')
  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'EN' ? 'FR' : 'EN'))
  }, [])

  // ── Track user‐side tokens bucket ─────────────────────────────────────────
  const [tokens, setTokens] = useState<number>(0)

   // ── Build an axios instance with dynamic auth + 429 retry ────────────────
  const http: AxiosInstance = useMemo(() => {
    const inst = axios.create({ baseURL: backendUrl, timeout: 30_000 })

    inst.interceptors.request.use(config => {
      const existing = (config.headers as Record<string, string>) || {}
      const merged: Record<string, string> = {
        ...existing,
        Authorization: `Bearer ${token}`,
      }

      // cast to AxiosRequestHeaders so TS is happy
      config.headers = merged as AxiosRequestHeaders
      return config
    })

    inst.interceptors.response.use(
      res => res,
      async err => {
        if (err.response?.status === 429) {
          await new Promise(r => setTimeout(r, 1000))
          return inst.request(err.config)
        }
        return Promise.reject(err)
      }
    )

    return inst
  }, [backendUrl, token])

  // ── Profile query ────────────────────────────────────────────────────────
  const {
    data: profileData,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useAppQuery<Profile | null, Error>(
    ['profile', token],
    async () => {
      const { data } = await http.get<{
        profileExists: boolean
        profile: Profile
      }>('/api/profile/me')
      return data.profileExists ? data.profile : null
    },
    { enabled: !!token, retry: false }
  )
  const profile: Profile | null = profileData ?? null

  const refreshProfile = useCallback(async (): Promise<void> => {
    await refetchProfile()
  }, [refetchProfile])

  // ── User details (email, token-count, role) ─────────────────────────────
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'student' | 'tutor' | null>(null)

  const fetchUserDetails = useCallback(async () => {
    const { data } = await http.get<{
      email: string
      tokens: number
      userId: string
      role: 'student' | 'tutor'
    }>('/api/user/me')

    setUserEmail(data.email)
    setTokens(data.tokens)
    setUserId(data.userId)
    setRole(data.role)
  }, [http])

  useEffect(() => {
    if (token) {
      void fetchUserDetails()
    }
  }, [token, fetchUserDetails])

  const refreshUserDetails = useCallback(async (): Promise<void> => {
    await fetchUserDetails()
  }, [fetchUserDetails])

  // ── Build & provide ShopContextValue ────────────────────────────────────
  const value = useMemo<ShopContextValue>(() => ({
    backendUrl,
    token,
    initializing,
    http,
    userEmail,
    tokens,
    userId,
    role,
    profile,
    loadingProfile,
    setToken,
    logout,
    language,
    toggleLanguage,
    setTokens,
    refreshProfile,
    refreshUserDetails,
    navigateFn,
  }), [
    backendUrl, token, initializing, http,
    userEmail, tokens, userId, role,
    profile, loadingProfile,
    setToken, logout,
    language, toggleLanguage, setTokens,
    refreshProfile, refreshUserDetails, navigateFn,
  ])

  return (
    <ShopContext.Provider value={value}>
      {initializing ? null : children}
    </ShopContext.Provider>
  )
}

export const useShopContext = (): ShopContextValue => {
  const ctx = useContext(ShopContext)
  if (!ctx) {
    throw new Error('useShopContext must be used within ShopContextProvider')
  }
  return ctx
}

export default ShopContextProvider
