// packages/shared/hooks/useHomePage.ts
import { useState, useMemo, useCallback } from 'react'
import type { Profile, MappedProfile } from '@mytutorapp/shared/types'
import { fetchTutorProfiles } from '@mytutorapp/shared/api'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'

type Filters = Record<string, string[]>

// helper for DRY query keys
const makeKey = (resource: string) => [resource] as const

/** 
 * Try camelCase, snake_case, or nested (dot-path) lookups 
 */
function getField(obj: any, key: string): any {
  if (key.includes('.')) {
    return key
      .split('.')
      .reduce((acc, seg) => (acc != null ? acc[seg] : undefined), obj)
  }
  if (obj[key] !== undefined) {
    return obj[key]
  }
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase()
  return obj[snake]
}

const useHomePage = () => {
  const { backendUrl } = useShopContext()

  // 1️⃣ Use React Query with proper typing + select() to cast/morph
  const {
    data: profiles = [],
    isLoading: loading,
    refetch: reloadProfiles,
  } = useAppQuery<
    Profile[],            // raw data from fetchTutorProfiles
    Error,
    MappedProfile[]       // what our hook returns downstream
  >(
    makeKey('tutorProfiles'),
    () => fetchTutorProfiles(backendUrl),
    {
      enabled: Boolean(backendUrl),
      select: (rawProfiles) =>
        // if you need to actually transform Profile => MappedProfile,
        // you can map here. For now we just assert:
        rawProfiles as unknown as MappedProfile[],
    }
  )

  // 2️⃣ Local UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters]       = useState<Filters>({})

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  /** One choice per filter-group; click again to clear it */
  const onFilterChange = useCallback((filterType: string, value: string) => {
    setFilters(prev => {
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

  // ─── Compute filteredProfiles ────────────────────────────────────────────
  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    let result = profiles

    // 1) Section (radio) first
    const sec = filters.section?.[0]
    if (sec && sec !== 'All Tutors') {
      if (sec === 'Free Session') {
        result = result.filter(
          (p) => (getField(p, 'pricing')?.privateSession ?? Infinity) === 0
        )
      }
      // …other sections…
    }

    // 2) Text search + each dropdown filter
    return result.filter((p) => {
      // 2a) Search across multiple fields
      if (q) {
        const nameMatch = String(getField(p, 'name') ?? '')
          .toLowerCase()
          .includes(q)
        const catMatch = String(getField(p, 'category') ?? '')
          .toLowerCase()
          .includes(q)

        const expArr = getField(p, 'description.expertise')
        const expMatch = Array.isArray(expArr)
          ? expArr.some((x) => String(x).toLowerCase().includes(q))
          : false

        const styleArr = getField(p, 'description.teachingStyle')
        const styleMatch = Array.isArray(styleArr)
          ? styleArr.some((x) => String(x).toLowerCase().includes(q))
          : false

        const ageArr = getField(p, 'ageGroup')
        const ageMatch = Array.isArray(ageArr)
          ? ageArr.some((x) => String(x).toLowerCase().includes(q))
          : String(ageArr ?? '')
              .toLowerCase()
              .includes(q)

        if (
          !(
            nameMatch ||
            catMatch ||
            expMatch ||
            styleMatch ||
            ageMatch
          )
        ) {
          return false
        }
      }

      // 2b) Apply each filter-group
      for (const [key, values] of Object.entries(filters)) {
        if (key === 'section' || values.length === 0) continue
        const want = values[0].toLowerCase()

        // pricing buckets
        if (key === 'pricing') {
          const [min, max] = want.split('-').map(Number)
          const price = getField(p, 'pricing') || {}
          const ok =
            ((price.privateSession ?? 0) >= min &&
              (price.privateSession ?? 0) <= max) ||
            ((price.groupSession ?? 0) >= min &&
              (price.groupSession ?? 0) <= max) ||
            ((price.lecture ?? 0) >= min &&
              (price.lecture ?? 0) <= max) ||
            ((price.workshop ?? 0) >= min &&
              (price.workshop ?? 0) <= max)
          if (!ok) return false
          continue
        }

        // subject/category fuzzy
        if (key === 'category') {
          const cat = String(getField(p, 'category') ?? '').toLowerCase()
          if (!cat.includes(want) && !want.includes(cat)) {
            return false
          }
          continue
        }

        // experience level exact
        if (key === 'experienceLevel') {
          const exp = String(getField(p, 'experienceLevel') ?? '').toLowerCase()
          if (exp !== want) return false
          continue
        }

        // age group array
        if (key === 'ageGroup') {
          const ag = getField(p, 'ageGroup')
          if (
            !Array.isArray(ag) ||
            !ag.some((item) => String(item).toLowerCase() === want)
          ) {
            return false
          }
          continue
        }

        // generic field match
        const fld = getField(p, key)
        if (fld == null) return false
        if (Array.isArray(fld)) {
          if (!fld.some((item) => String(item).toLowerCase() === want)) {
            return false
          }
        } else {
          if (String(fld).toLowerCase() !== want) {
            return false
          }
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
