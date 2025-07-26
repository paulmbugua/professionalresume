// apps/web/src/components/ClassVaultList.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from './Navbar.web'
import Footer from './Footer.web'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import {
  faPlayCircle,
  faTimesCircle,
  faFilePdf,
  faTrash,
  faDownload,
  faShoppingCart,
} from '@fortawesome/free-solid-svg-icons'
import { useShopContext } from '@mytutorapp/shared/context'
import { useClassVault } from '@mytutorapp/shared/hooks'
import type { RecordedVideo } from '@mytutorapp/shared/types'

type TabKey = 'videos' | 'notes'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'videos', label: 'Videos' },
  { key: 'notes',  label: 'Class Notes' },
]

interface Filters {
  videoCategory?: string[]
  videoAgeGroup?: string[]
  [key: string]: string[] | undefined
}

export default function ClassVaultList() {
  const navigate = useNavigate()
  const { role } = useShopContext()

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
  const chosenGrade   = filters.videoAgeGroup?.[0]    ?? ''

  // Fetch & base-filter
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

  // Apply global search to videos
  const searchFilteredVideos = useMemo(() => {
    if (!searchTerm) return filteredVideos
    return filteredVideos.filter(v => {
      const titleMatch   = v.title.toLowerCase().includes(searchTerm)
      const subjectMatch = v.subject?.toLowerCase().includes(searchTerm) ?? false
      const gradeMatch   = v.grade_level != null
        ? String(v.grade_level).includes(searchTerm)
        : false
      return titleMatch || subjectMatch || gradeMatch
    })
  }, [filteredVideos, searchTerm])

  // Apply global search to PDFs
  const searchFilteredPdfRows = useMemo(() => {
    if (!searchTerm) return filteredPdfRows
    return filteredPdfRows
      .map(row =>
        row.filter(pdf => {
          const titleMatch   = pdf.title.toLowerCase().includes(searchTerm)
          const subjectMatch = pdf.subject?.toLowerCase().includes(searchTerm) ?? false
          const gradeMatch   = pdf.grade_level != null
            ? String(pdf.grade_level).includes(searchTerm)
            : false
          return titleMatch || subjectMatch || gradeMatch
        })
      )
      .filter(row => row.length > 0)
  }, [filteredPdfRows, searchTerm])

  // Tab & preview state
  const [currentTab, setCurrentTab] = useState<TabKey>('videos')
  const [previewId,   setPreviewId]   = useState<number | null>(null)

  const handlePurchase = useCallback(async (item: RecordedVideo) => {
    try {
      await purchase(item)
      alert(`Purchased: ${item.title}`)
      navigate(`/class-vault/${item.id}`)
    } catch (err: any) {
      if (err.message.includes('Insufficient tokens')) {
        if (window.confirm('Not enough tokens. Buy more?')) {
          navigate('/buy-tokens')
        }
      } else {
        alert(err.message || 'Purchase failed')
      }
    }
  }, [purchase, navigate])

  const handleDownload = useCallback((id: number) => {
    navigate(`/class-vault/${id}`)
  }, [navigate])

  const handleDelete = useCallback((id: number) => {
    if (role !== 'tutor') return
    if (!window.confirm('Delete this item?')) return
    remove(id).catch(() => alert('Deletion failed'))
  }, [remove, role])

  if (loading) return <div className="flex items-center justify-center h-64">…Loading…</div>
  if (error)   return <div className="text-red-500 text-center py-8">{error}</div>

  const videosEmpty = searchFilteredVideos.length === 0
  const notesEmpty  = searchFilteredPdfRows.flat().length === 0

  return (
    <>
      <Navbar
        filters={filters}
        onFilterChange={onFilterChange}
        clearFilters={clearFilters}
      />

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">
          {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-6 space-x-4 bg-gray-200 rounded-full p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                currentTab === tab.key
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Videos */}
        {currentTab === 'videos' ? (
          videosEmpty ? (
            <div className="text-center text-gray-500 py-8">
              {role === 'tutor' ? 'No recorded videos yet.' : 'No available videos.'}
              {role === 'tutor' && (
                <button
                  onClick={() => navigate('/class-vault/upload')}
                  className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                >
                  Upload Your First Class
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {searchFilteredVideos.map(video => (
                  <div key={video.id} className="bg-white rounded-lg shadow flex flex-col">
                    <div className="relative">
                      {previewId === video.id ? (
                        <>
                          <video
                            src={video.preview_url!}
                            className="w-full h-40 object-cover"
                            controls
                            autoPlay
                          />
                          <button
                            onClick={() => setPreviewId(null)}
                            className="absolute top-2 right-2 text-white text-xl"
                          >
                            <FontAwesomeIcon icon={faTimesCircle as IconProp} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setPreviewId(video.id)}
                          className="w-full h-40 bg-black flex items-center justify-center text-white text-4xl"
                        >
                          <FontAwesomeIcon icon={faPlayCircle as IconProp} />
                        </button>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h2 className="font-semibold text-lg line-clamp-2">
                        {video.title}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 flex-1">
                        {video.subject ?? 'Unknown subject'} • Grade {video.grade_level}
                      </p>
                      <p className="text-sm text-gray-700">Price: {video.price} tokens</p>
                      <div className="mt-4 space-x-2">
                        {role === 'tutor' ? (
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500 flex items-center"
                          >
                            <FontAwesomeIcon icon={faTrash as IconProp} className="mr-1" />
                            Delete
                          </button>
                        ) : purchasedIds.has(video.id) ? (
                          <button
                            onClick={() => handleDownload(video.id)}
                            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                          >
                            <FontAwesomeIcon icon={faDownload as IconProp} className="mr-1" />
                            Download
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchase(video)}
                            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                          >
                            <FontAwesomeIcon icon={faShoppingCart as IconProp} className="mr-1" />
                            Purchase
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {role === 'tutor' && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => navigate('/class-vault/upload')}
                    className="px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                  >
                    Upload New Class
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          /* Notes */
          notesEmpty ? (
            <div className="text-center text-gray-500 py-8">
              {role === 'tutor'
                ? 'No class notes uploaded yet.'
                : 'No class notes available.'}
              {role === 'tutor' && (
                <button
                  onClick={() => navigate('/class-vault/upload')}
                  className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
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
                    className="bg-white rounded-lg shadow p-4 flex flex-col items-center"
                  >
                    <FontAwesomeIcon
                      icon={faFilePdf as IconProp}
                      className="text-red-600 text-4xl mb-2"
                    />
                    <h3 className="font-semibold text-center line-clamp-2">
                      {pdf.title}
                    </h3>
                    <p className="text-sm text-gray-700 mt-2">
                      Price: {pdf.price} tokens
                    </p>
                    <div className="mt-auto flex space-x-2">
                      {role === 'tutor' ? (
                        <button
                          onClick={() => handleDelete(pdf.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                        >
                          <FontAwesomeIcon icon={faTrash as IconProp} />
                        </button>
                      ) : purchasedIds.has(pdf.id) ? (
                        <button
                          onClick={() => handleDownload(pdf.id)}
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <FontAwesomeIcon icon={faDownload as IconProp} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(pdf as RecordedVideo)}
                          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
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
                    className="px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
                  >
                    Upload New Notes
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      <Footer />
    </>
  )
}
