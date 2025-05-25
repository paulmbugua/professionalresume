// packages/shared/hooks/useHomePage.ts

import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchTutorProfiles } from '@mytutorapp/shared/api'
import { useShopContext } from '@mytutorapp/shared/context'
import type { MappedProfile } from '@mytutorapp/shared/types'

type Filters = Record<string, string[]>

const useHomePage = () => {
  const { backendUrl } = useShopContext()
  const [profiles, setProfiles] = useState<MappedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Filters>({})

  // 1) Fetch on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTutorProfiles(backendUrl)
      .then((tutors) => {
        if (!cancelled) {
          setProfiles(tutors as MappedProfile[])
        }
      })
      .catch((err) => console.error('Failed to fetch profiles:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [backendUrl])

  // 2) Handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const onFilterChange = useCallback(
    (filterType: string, value: string, merge = true) => {
      setFilters((prev) => {
        const existing = prev[filterType] || []
        const next = merge
          ? existing.includes(value)
            ? existing.filter((v) => v !== value)
            : [...existing, value]
          : [value]
        return { ...prev, [filterType]: next }
      })
    },
    []
  )

  const clearFilters = useCallback(() => {
    setSearchTerm('')
    setFilters({})
  }, [])

  // 3) Apply search + filters
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // search by name
      if (
        searchTerm &&
        !p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // apply each filter key
      for (const [key, values] of Object.entries(filters)) {
        if (values.length === 0) continue

        if (key === 'pricing') {
          const [min, max] = values[0].split('-').map(Number)
          const meets =
            ((p.pricing?.privateSession ?? 0) >= min &&
              (p.pricing?.privateSession ?? 0) <= max) ||
            ((p.pricing?.groupSession ?? 0) >= min &&
              (p.pricing?.groupSession ?? 0) <= max) ||
            ((p.pricing?.lecture ?? 0) >= min &&
              (p.pricing?.lecture ?? 0) <= max) ||
            ((p.pricing?.workshop ?? 0) >= min &&
              (p.pricing?.workshop ?? 0) <= max)
          if (!meets) return false

        } else {
          const field = (p as any)[key]
          if (Array.isArray(field)) {
            if (!values.some((v) => field.includes(v))) return false
          } else {
            if (!values.includes(String(field))) return false
          }
        }
      }

      return true
    })
  }, [profiles, searchTerm, filters])

  return {
    filteredProfiles,
    loading,
    handleSearch,
    onFilterChange,
    clearFilters,
  }
}

export default useHomePage
