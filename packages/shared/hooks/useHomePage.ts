// packages/shared/hooks/useHomePage.ts

import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchTutorProfiles } from '@mytutorapp/shared/api'
import { useShopContext } from '@mytutorapp/shared/context'
import type { MappedProfile } from '@mytutorapp/shared/types'

type Filters = Record<string, string[]>

/** 
 * Try camelCase, snake_case, or nested (dot-path) lookups 
 */
function getField(obj: any, key: string): any {
  if (key.includes('.')) {
    return key.split('.').reduce((acc, seg) => (acc != null ? acc[seg] : undefined), obj)
  }
  if (obj[key] !== undefined) {
    return obj[key]
  }
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase()
  return obj[snake]
}

const useHomePage = () => {
  const { backendUrl } = useShopContext()
  const [profiles, setProfiles]   = useState<MappedProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters]     = useState<Filters>({})

  // ─── Load ───────────────────────────────────────────────────────────────
  const reloadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await fetchTutorProfiles(backendUrl)
      setProfiles((raw as unknown) as MappedProfile[])
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => {
    reloadProfiles()
  }, [reloadProfiles])

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
    let result = profiles

    // 1) Section (radio) first
    const sec = filters.section?.[0]
    if (sec && sec !== 'All Tutors') {
      if (sec === 'Free Session') {
        result = result.filter(
          p => (getField(p, 'pricing')?.privateSession ?? Infinity) === 0
        )
      }
      // …your other “section” logic…
    }

    // 2) Text search + each other filter
    return result.filter(p => {
      // 2a) Search by name
      if (
        searchTerm &&
        !String(getField(p, 'name') ?? '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // 2b) Apply every filter-group
      for (const [key, values] of Object.entries(filters)) {
        if (key === 'section' || values.length === 0) continue

        const want = values[0].toLowerCase()

        // 2c) Pricing buckets
        if (key === 'pricing') {
          const [min, max] = values[0].split('-').map(Number)
          const price = getField(p, 'pricing') || {}
          const ok =
            ((price.privateSession ?? 0) >= min &&
              (price.privateSession ?? 0) <= max) ||
            ((price.groupSession   ?? 0) >= min &&
              (price.groupSession   ?? 0) <= max) ||
            ((price.lecture        ?? 0) >= min &&
              (price.lecture        ?? 0) <= max) ||
            ((price.workshop       ?? 0) >= min &&
              (price.workshop       ?? 0) <= max)
          if (!ok) return false
          continue
        }

        // 2d) Category uses substring both ways
        if (key === 'category') {
          const cat = String(getField(p, 'category') || '').toLowerCase()
          if (!cat.includes(want) && !want.includes(cat)) {
            return false
          }
          continue
        }

         if (key === 'experienceLevel' || key === 'ageGroup') {
          const rawVal = getField(p, key)
          console.log(
            `[DEBUG][${key}] want=`, values[0],
            `| getField=`, rawVal,
            `| full keys=`, Object.keys(p)
          )
        }

        // 2e) Explicit experienceLevel match
        if (key === 'experienceLevel') {
          const exp = String(getField(p, 'experienceLevel') || '').toLowerCase()
          if (exp !== want) return false
          continue
        }

        // 2f) Explicit ageGroup (array) match
        if (key === 'ageGroup') {
          const ag = getField(p, 'ageGroup')
          if (
            !Array.isArray(ag) ||
            !ag.some((item: any) => String(item).toLowerCase() === want)
          ) {
            return false
          }
          continue
        }

        // 2g) Nested or other array/string fields
        const fld = getField(p, key)
        if (fld == null) {
          return false
        }
        if (Array.isArray(fld)) {
          if (!fld.some(item => String(item).toLowerCase() === want)) {
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
