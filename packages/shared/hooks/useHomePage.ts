import { useState, useMemo, useCallback } from 'react'
import type { Profile } from '@mytutorapp/shared/types'
import { fetchTutorProfiles, fetchTutorReviews } from '@mytutorapp/shared/api'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'

type Filters = Record<string, string[]>

const getField = (obj: Record<string, unknown>, key: string): unknown => {
  if (key.includes('.')) {
    return key.split('.').reduce<unknown>(
      (acc, seg) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[seg]
          : undefined,
      obj
    )
  }
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase()
  return obj[key] ?? obj[snake]
}

const useHomePage = () => {
   const { backendUrl, token, /* initializing */ } = useShopContext()

  const {
    data: profiles = [],
    isLoading: loading,
    refetch: reloadProfiles,
  } = useAppQuery<Profile[]>(
    ['tutorProfiles'],
    async (): Promise<Profile[]> => {
      // OPTION A (recommended): rely on axios defaults from ShopContext
      const baseProfiles = await fetchTutorProfiles(backendUrl)

      const ratedProfiles: Profile[] = await Promise.all(
        baseProfiles.map(async (p) => {
          if (p.role !== 'tutor') return p
          try {
            // Same note as above—pass token if your helper supports it
            const reviewData = await fetchTutorReviews(backendUrl, p.user_id /*, token */)
            return {
              ...p,
              avgRating: parseFloat(`${reviewData.avgRating ?? 0}`),
              totalReviews: Number(`${reviewData.totalReviews ?? 0}`),
            }
          } catch (err) {
            console.error(`❌ Failed to fetch reviews for ${p.name}`, err)
            return { ...p, avgRating: 0, totalReviews: 0 }
          }
        })
      )

      return ratedProfiles
    },
    {
    enabled: Boolean(backendUrl && token),
      retry: false,
    }
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Filters>({})

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const onFilterChange = useCallback((filterType: string, value: string) => {
    setFilters((prev) => {
      const existing = prev[filterType] || []
      if (existing.includes(value)) {
        const next = { ...prev }
        delete next[filterType]
        return next
      }
      return { ...prev, [filterType]: [value] }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSearchTerm('')
    setFilters({})
  }, [])

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    // 🔎 See the active filter state for every compute
    console.log('🔎 Active filters:', JSON.stringify(filters))

    return profiles.filter((p) => {
      const profileRecord = p as unknown as Record<string, unknown>

      // Text search
      if (q) {
        const nameMatch = String(getField(profileRecord, 'name') ?? '')
          .toLowerCase()
          .includes(q)
        const catMatch = String(getField(profileRecord, 'category') ?? '')
          .toLowerCase()
          .includes(q)
        if (!(nameMatch || catMatch)) return false
      }

      // Filters (intersection)
      for (const [key, values] of Object.entries(filters)) {
        if (values.length === 0) continue
        const selected = values[0].toLowerCase()

        // ⭐ Rating (round tutor avg to whole number; compare to selected 1..5)
        if (key === 'rating') {
          const wantNum = parseInt(values[0], 10)
          const ratingNum = Number(getField(profileRecord, 'avgRating') ?? 0)
          const rounded = Math.round(ratingNum)
          const pass = rounded === wantNum
          console.log(
            '⭐ Rating check:',
            p.name,
            '| selected:', wantNum,
            '| avg:', ratingNum,
            '| rounded:', rounded,
            '| pass:', pass
          )
          if (!pass) return false
          continue
        }

        // 🟢 Availability — normalize: "online"/"new" → "free"
        if (key === 'status') {
          const rawStatus = String(getField(profileRecord, 'status') ?? '').toLowerCase()
          const normalized = rawStatus === 'online' || rawStatus === 'new' ? 'free' : rawStatus
          const pass = normalized === selected
          console.log(
            '🟢 Availability check:',
            p.name,
            '| raw:', rawStatus,
            '| normalized:', normalized,
            '| selected:', selected,
            '| pass:', pass
          )
          if (!pass) return false
          continue
        }

        // 📚 Subject/category fuzzy match (Math vs Mathematics)
        if (key === 'category') {
          const cat = String(getField(profileRecord, 'category') ?? '').toLowerCase()
          const pass = cat.includes(selected) || selected.includes(cat)
          console.log('📚 Subject check:', p.name, '| cat:', cat, '| selected:', selected, '| pass:', pass)
          if (!pass) return false
          continue
        }
      }

      return true
    })
  }, [profiles, searchTerm, filters])

  return {
    filteredProfiles,
    filters,
    loading,
    handleSearch,
    onFilterChange,
    clearFilters,
    reloadProfiles,
  }
}

export default useHomePage
