// apps/web/src/components/ClassVaultList.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import debounce from 'lodash.debounce'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import {
  faPlayCircle,
  faTimesCircle,
  faFilePdf,
  faTrash,
  faDownload,
  faShoppingCart,
  faStar as faStarSolid,
  faStarHalfAlt as faStarHalf,
  faStar as faStarOutlineAlias, // we'll style empties via opacity
} from '@fortawesome/free-solid-svg-icons'
import { useShopContext } from '@mytutorapp/shared/context'
import { useClassVault } from '@mytutorapp/shared/hooks'
import { fetchVideoReviews } from '@mytutorapp/shared/api/classVaultApi'
import type { RecordedVideo, VideoReview } from '@mytutorapp/shared/types'

type TabKey = 'videos' | 'notes'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'videos', label: 'Videos' },
  { key: 'notes',  label: 'Class Notes' },
]

// limit how many cards we prefetch reviews for (avoid 429s)
const VISIBLE_LIMIT = 8
// debounce window for batching review fetches
const DEBOUNCE_MS = 300

interface Filters {
  videoCategory?: string[]
  videoAgeGroup?: string[]
  [key: string]: string[] | undefined
}

function StarRow({ avg }: { avg: number }) {
  const rounded = Math.round(avg * 2) / 2
  const icons: JSX.Element[] = []
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) {
      icons.push(
        <FontAwesomeIcon
          key={i}
          icon={faStarSolid as IconProp}
          className="text-yellow-500"
        />
      )
    } else if (rounded + 0.5 === i) {
      icons.push(
        <FontAwesomeIcon
          key={i}
          icon={faStarHalf as IconProp}
          className="text-yellow-500"
        />
      )
    } else {
      icons.push(
        <FontAwesomeIcon
          key={i}
          icon={faStarOutlineAlias as IconProp}
          className="text-yellow-500 opacity-30"
        />
      )
    }
  }
  return <span aria-label={`Rated ${avg} out of 5`} className="inline-flex gap-0.5">{icons}</span>
}

export default function ClassVaultList() {
  const navigate = useNavigate()
  const { role, backendUrl, userId } = useShopContext()

  // Read global search term from URL
  const [searchParams] = useSearchParams()
  const searchTerm = useMemo(
    () => searchParams.get('q')?.trim().toLowerCase() ?? '',
    [searchParams]
  )

  // Local filter state
  const [filters, setFilters] = useState<Filters>({})
  const clearFilters = useCallback(() => {
    setFilters({})
    navigate(searchTerm ? `/search?q=${encodeURIComponent(searchTerm)}` : '/')
  }, [navigate, searchTerm])
  const onFilterChange = useCallback((filterKey: string, value: string) => {
    setFilters(prev => {
      const current = prev[filterKey] ?? []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [filterKey]: next }
    })
  }, [])

  // Extract subject & grade for hook
  const chosenSubject = filters.videoCategory?.[0] ?? ''
  const chosenGrade   = filters.videoAgeGroup?.[0] ?? ''

  // Fetch & base-filter (global marketplace lists)
  const {
    filteredVideos,
    filteredPdfRows,
    purchasedIds,
    loading,
    error,
    refresh,
    purchase,
    remove,
  } = useClassVault(chosenSubject, chosenGrade)

  useEffect(() => {
    refresh()
  }, [refresh])

  // ---------- Scope lists by role ----------
  // Tutors should only see their own uploads; students see everything.
  const scopedVideos = useMemo(() => {
    if (role === 'tutor') {
      const me = Number(userId)
      return filteredVideos.filter(v => Number(v.tutor_id) === me)
    }
    return filteredVideos
  }, [filteredVideos, role, userId])

  const scopedPdfRows = useMemo(() => {
    if (role === 'tutor') {
      const me = Number(userId)
      const rows = filteredPdfRows
        .map(row => row.filter(pdf => Number((pdf as any).tutor_id) === me))
        .filter(row => row.length > 0)
      return rows
    }
    return filteredPdfRows
  }, [filteredPdfRows, role, userId])

  // ---------- Ratings (prefetch only for first N; debounce the batch) ----------
  // Cache: id -> { avg, count }
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({})
  const fetchingIdsRef = useRef<Set<number>>(new Set())

  // derive ids to prefetch based on the *displayed* list (after role-scope + search)
  const searchFilteredVideos = useMemo(() => {
    if (!searchTerm) return scopedVideos
    return scopedVideos.filter(v => {
      const titleMatch   = v.title.toLowerCase().includes(searchTerm)
      const subjectMatch = v.subject?.toLowerCase().includes(searchTerm) ?? false
      const gradeMatch   = v.grade_level != null
        ? String(v.grade_level).toLowerCase().includes(searchTerm)
        : false
      return titleMatch || subjectMatch || gradeMatch
    })
  }, [scopedVideos, searchTerm])

  const idsToPrefetch = useMemo<number[]>(
    () => searchFilteredVideos.slice(0, VISIBLE_LIMIT).map(v => v.id),
    [searchFilteredVideos]
  )

  const debouncedFetch = useMemo(
    () =>
      debounce(async (ids: number[]) => {
        if (!backendUrl) return
        for (const id of ids) {
          if (ratings[id] || fetchingIdsRef.current.has(id)) continue
          fetchingIdsRef.current.add(id)
          try {
            const data: VideoReview[] = await fetchVideoReviews(backendUrl, id)
            const count = data.length
            const avg =
              count > 0
                ? Number(
                    (
                      data.reduce((s, r) => s + Number(r.rating), 0) / count
                    ).toFixed(2)
                  )
                : 0
            setRatings(prev => (prev[id] ? prev : { ...prev, [id]: { avg, count } }))
          } catch {
            // leave unrated if fetch fails
          } finally {
            fetchingIdsRef.current.delete(id)
          }
        }
      }, DEBOUNCE_MS),
    [backendUrl, ratings]
  )

  useEffect(() => {
    const pending = idsToPrefetch.filter(id => !ratings[id] && !fetchingIdsRef.current.has(id))
    if (pending.length > 0) debouncedFetch(pending)
    return () => {
      debouncedFetch.cancel()
    }
  }, [idsToPrefetch, ratings, debouncedFetch])

  // Apply global search to PDFs (after role-scope)
  const searchFilteredPdfRows = useMemo(() => {
    if (!searchTerm) return scopedPdfRows
    return scopedPdfRows
      .map(row =>
        row.filter(pdf => {
          const titleMatch   = pdf.title.toLowerCase().includes(searchTerm)
          const subjectMatch = pdf.subject?.toLowerCase().includes(searchTerm) ?? false
          const gradeMatch   = pdf.grade_level != null
            ? String(pdf.grade_level).toLowerCase().includes(searchTerm)
            : false
          return titleMatch || subjectMatch || gradeMatch
        })
      )
      .filter(row => row.length > 0)
  }, [scopedPdfRows, searchTerm])

  // Tab & preview state
  const [currentTab, setCurrentTab] = useState<TabKey>('videos')
  const [previewId, setPreviewId] = useState<number | null>(null)

  // Purchase: guard double click + confirm
  const [buyingId, setBuyingId] = useState<number | null>(null)
  const handlePurchase = useCallback(async (item: RecordedVideo) => {
    if (buyingId === item.id) return
    const ok = window.confirm(
      `You are about to purchase "${item.title}" for ${item.price} tokens.\n\n` +
      `This amount will be deducted from your balance. Do you want to continue?`
    )
    if (!ok) return
    try {
      setBuyingId(item.id)
      await purchase(item)
      alert(`Purchase successful! "${item.title}" is now unlocked.`)
      navigate(`/class-vault/${item.id}`)
    } catch (err: unknown) {
      const e = (err ?? {}) as { message?: string }
      if (e.message?.includes('Insufficient tokens')) {
        if (window.confirm('Not enough tokens. Would you like to buy more?')) navigate('/buy-tokens')
      } else {
        alert(e.message || 'Purchase failed')
      }
    } finally {
      setBuyingId(null)
    }
  }, [purchase, navigate, buyingId])

  const handleDownload = useCallback((id: number) => {
    navigate(`/class-vault/${id}`)
  }, [navigate])

  const handleDelete = useCallback((id: number) => {
    if (role !== 'tutor') return
    if (!window.confirm('Delete this item?')) return
    remove(id).catch(() => alert('Deletion failed'))
  }, [remove, role])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#0d141c] dark:text-darkTextPrimary">
        …Loading…
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        {error}
      </div>
    )
  }

  const videosEmpty = searchFilteredVideos.length === 0
  const notesEmpty  = searchFilteredPdfRows.flat().length === 0

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 text-[#0d141c] dark:text-darkTextPrimary">
      <h1 className="text-2xl font-bold text-center">
        {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
      </h1>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2 rounded-full p-1 bg-[#e7edf4] dark:bg-[#172534] ring-1 ring-[#cedbe8] dark:ring-darkCard">
          {tabs.map(tab => {
            const active = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setCurrentTab(tab.key)}
                className={
                  'px-4 py-2 rounded-full font-medium transition ' +
                  (active
                    ? 'bg-white dark:bg-[#0f1821] shadow text-[#0d141c] dark:text-darkTextPrimary'
                    : 'text-[#0d141c]/80 dark:text-darkTextSecondary hover:text-[#0d141c] dark:hover:text-darkTextPrimary')
                }
                aria-pressed={active}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Videos */}
      {currentTab === 'videos' ? (
        videosEmpty ? (
          <div className="text-center text-[#49739c] dark:text-darkTextSecondary py-8">
            {role === 'tutor' ? 'No recorded videos yet.' : 'No available videos.'}
            {role === 'tutor' && (
              <button
                onClick={() => navigate('/class-vault/upload')}
                className="mt-4 px-6 py-2 rounded-full bg-[#3d99f5] text-white font-semibold hover:brightness-110"
              >
                Upload Your First Class
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {searchFilteredVideos.map(video => {
                const stat = ratings[video.id]
                const showStars = Boolean(stat && stat.count > 0)

                return (
                  <div
                    key={video.id}
                    className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm flex flex-col"
                  >
                    {/* Preview area (always visible, muted/autoplay/loop) */}
                    <div className="relative group">
                      {video.preview_url ? (
                        <video
                          src={video.preview_url}
                          // poster={video.thumbnail_url || undefined}
                          className="w-full h-40 object-cover"
                          muted
                          playsInline
                          loop
                          autoPlay
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-40 bg-black flex items-center justify-center text-white text-4xl">
                          <FontAwesomeIcon icon={faPlayCircle as IconProp} />
                        </div>
                      )}

                      {/* Overlay: toggle controls on/off */}
                      {video.preview_url && (
                        <button
                          onClick={() => setPreviewId(prev => (prev === video.id ? null : video.id))}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition"
                          aria-label={previewId === video.id ? 'Hide controls' : 'Show controls'}
                          title={previewId === video.id ? 'Hide controls' : 'Show controls'}
                        >
                          <span className="sr-only">Toggle controls</span>
                        </button>
                      )}

                      {/* Controls mode */}
                      {previewId === video.id && video.preview_url && (
                        <>
                          <video
                            src={video.preview_url}
                            className="absolute inset-0 w-full h-40 object-cover"
                            controls
                            autoPlay
                            muted
                            playsInline
                          />
                          <button
                            onClick={() => setPreviewId(null)}
                            className="absolute top-2 right-2 text-white text-xl"
                            aria-label="Close preview"
                            title="Close preview"
                          >
                            <FontAwesomeIcon icon={faTimesCircle as IconProp} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h2 className="font-semibold text-lg line-clamp-2">
                        {video.title}
                      </h2>

                      {/* ⭐ Stars if rated */}
                      {showStars && (
                        <div className="mt-1 flex items-center gap-2">
                          <StarRow avg={stat!.avg} />
                          <span className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                            ({stat!.count})
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-[#49739c] dark:text-darkTextSecondary mt-1 flex-1">
                        {video.subject ?? 'Unknown subject'} • Grade {video.grade_level}
                      </p>

                      <p className="text-sm text-[#0d141c] dark:text-darkTextPrimary">
                        Price: {video.price} tokens
                      </p>

                      <div className="mt-4 space-x-2">
                        {role === 'tutor' ? (
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-500 inline-flex items-center"
                          >
                            <FontAwesomeIcon icon={faTrash as IconProp} className="mr-1" />
                            Delete
                          </button>
                        ) : purchasedIds.has(video.id) ? (
                          <>
                            <button
                              onClick={() => handleDownload(video.id)}
                              className="px-3 py-2 rounded ring-1 ring-[#cedbe8] dark:ring-darkCard hover:bg-slate-50 dark:hover:bg-[#172534] inline-flex items-center"
                            >
                              <FontAwesomeIcon icon={faDownload as IconProp} className="mr-1" />
                              Download
                            </button>
                            <button
                              onClick={() => navigate(`/class-vault/${video.id}#review`)}
                              className="px-3 py-2 rounded ring-1 ring-[#cedbe8] dark:ring-darkCard hover:bg-slate-50 dark:hover:bg-[#172534] inline-flex items-center ml-2"
                              aria-label="Review this video"
                              title="Review this video"
                            >
                              ★ Review
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={buyingId === video.id}
                            onClick={() => handlePurchase(video)}
                            className="px-3 py-2 rounded ring-1 ring-[#cedbe8] dark:ring-darkCard hover:bg-slate-50 dark:hover:bg-[#172534] inline-flex items-center disabled:opacity-60"
                            title={buyingId === video.id ? 'Processing…' : 'Purchase'}
                          >
                            <FontAwesomeIcon icon={faShoppingCart as IconProp} className="mr-1" />
                            {buyingId === video.id ? 'Purchasing…' : 'Purchase'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {role === 'tutor' && (
              <div className="text-center mt-6">
                <button
                  onClick={() => navigate('/class-vault/upload')}
                  className="px-6 py-2 rounded-full bg-[#3d99f5] text-white font-semibold hover:brightness-110"
                >
                  Upload New Class
                </button>
              </div>
            )}
          </>
        )
      ) : (
        // Notes
        notesEmpty ? (
          <div className="text-center text-[#49739c] dark:text-darkTextSecondary py-8">
            {role === 'tutor'
              ? 'No class notes uploaded yet.'
              : 'No class notes available.'}
            {role === 'tutor' && (
              <button
                onClick={() => navigate('/class-vault/upload')}
                className="mt-4 px-6 py-2 rounded-full bg-[#3d99f5] text-white font-semibold hover:brightness-110"
              >
                Upload Your First Notes
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {searchFilteredPdfRows.flat().map(pdf => (
                <div
                  key={pdf.id}
                  className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm p-4 flex flex-col items-center"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf as IconProp}
                    className="text-red-600 text-4xl mb-2"
                  />
                  <h3 className="font-semibold text-center line-clamp-2">
                    {pdf.title}
                  </h3>
                  <p className="text-sm text-[#0d141c] dark:text-darkTextPrimary mt-2">
                    Price: {pdf.price} tokens
                  </p>
                  <div className="mt-auto flex space-x-2">
                    {role === 'tutor' ? (
                      <button
                        onClick={() => handleDelete(pdf.id)}
                        className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-500"
                        aria-label="Delete note"
                        title="Delete"
                      >
                        <FontAwesomeIcon icon={faTrash as IconProp} />
                      </button>
                    ) : purchasedIds.has(pdf.id) ? (
                      <button
                        onClick={() => handleDownload(pdf.id)}
                        className="px-3 py-2 rounded ring-1 ring-[#cedbe8] dark:ring-darkCard hover:bg-slate-50 dark:hover:bg-[#172534]"
                        aria-label="Download note"
                        title="Download"
                      >
                        <FontAwesomeIcon icon={faDownload as IconProp} />
                      </button>
                    ) : (
                      <button
                        disabled={buyingId === pdf.id}
                        onClick={() => handlePurchase(pdf as RecordedVideo)}
                        className="px-3 py-2 rounded ring-1 ring-[#cedbe8] dark:ring-darkCard hover:bg-slate-50 dark:hover:bg-[#172534] disabled:opacity-60"
                        aria-label="Purchase note"
                        title={buyingId === pdf.id ? 'Processing…' : 'Purchase'}
                      >
                        <FontAwesomeIcon icon={faShoppingCart as IconProp} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {role === 'tutor' && (
              <div className="text-center mt-6">
                <button
                  onClick={() => navigate('/class-vault/upload')}
                  className="px-6 py-2 rounded-full bg-[#3d99f5] text-white font-semibold hover:brightness-110"
                >
                  Upload New Notes
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
