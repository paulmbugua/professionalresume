// packages/shared/hooks/useClassVault.ts

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import {
  fetchAllVideos,
  fetchPurchasedVideoIds,
  purchaseClassVault,
  deleteVideoById,
  fetchVideoById,
  fetchDownloadResources,
} from '@mytutorapp/shared/api/classVaultApi'
import type { RecordedVideo } from '@mytutorapp/shared/types'

/** split into rows of `size` */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

/**
 * Main vault‐list hook.
 *
 * @param videoSubFilters  e.g. ['Subject','Grade Level']
 * @param subjectFilter    e.g. 'Math'
 * @param gradeFilter      e.g. 'Lower Primary'
 */
export const useClassVault = (
  videoSubFilters: string[] = [],
  subjectFilter?: string,
  gradeFilter?: string
) => {
  const { backendUrl, token, tokens, setTokens } = useShopContext()

  // raw state
  const [videos, setVideos] = useState<RecordedVideo[]>([])
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** fetch all videos & purchased IDs */
  const fetchAll = useCallback(async () => {
    if (!backendUrl) {
      setError('Missing backend URL')
      return
    }
    setLoading(true)
    try {
      const [allVideos, boughtIds] = await Promise.all([
        fetchAllVideos(backendUrl),
        fetchPurchasedVideoIds(backendUrl, token),
      ])

       console.log('useClassVault › fetched allVideos:', allVideos)
        console.log('useClassVault › fetched purchasedIds:', boughtIds)

      setVideos(allVideos)
      setPurchasedIds(new Set(boughtIds))
      setError('')
    } catch (err: any) {
      console.error('useClassVault.fetchAll error:', err)
      setError('Failed to load classes.')
    } finally {
      setLoading(false)
    }
  }, [backendUrl, token])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const refresh = fetchAll

  /** purchase a class (student) */
  const purchase = useCallback(
    async (video: RecordedVideo) => {
      if (!backendUrl || !token) {
        throw new Error('Missing backend URL or auth token')
      }
      if (tokens < video.price) {
        throw new Error('Insufficient tokens')
      }
      await purchaseClassVault(backendUrl, video.id, token)
      setTokens(prev => prev - video.price)
      setPurchasedIds(prev => new Set(prev).add(video.id))
    },
    [backendUrl, token, tokens, setTokens]
  )

  /** delete a class (tutor) */
  const remove = useCallback(
    async (id: number) => {
      if (!backendUrl || !token) {
        throw new Error('Missing backend URL or auth token')
      }
      await deleteVideoById(backendUrl, id, token)
      await fetchAll()
    },
    [backendUrl, token, fetchAll]
  )

  // ─── Filtering ─────────────────────────────────────────────────────────
  const filteredVideos = useMemo(() => {
  return videos.filter(v => {
    if (!v.video_url) return false;

    // if a subject is selected, require it match
    if (subjectFilter && v.subject !== subjectFilter) {
      return false;
    }

    // if a grade is selected, require it match
    if (gradeFilter && String(v.grade_level) !== gradeFilter) {
      return false;
    }

    return true;
  });
}, [videos, subjectFilter, gradeFilter]);


  const filteredPdfRows = useMemo(() => {
    const pdfs = videos.filter(v => !!v.pdf_url)
    return chunk(pdfs, 2)
  }, [videos])

  return {
    // raw
    videos,
    purchasedIds,
    loading,
    error,
    purchase,
    remove,
    refresh,
    chunk,

    // filtered
    filteredVideos,
    filteredPdfRows,
  }
}

// ─── Detail hook ─────────────────────────────────────────────────────────────

export const useClassVaultDetail = (videoId: number) => {
  const { backendUrl, token } = useShopContext()

  const [video, setVideo] = useState<RecordedVideo | null>(null)
  const [resources, setResources] = useState<{
    video_url: string
    pdf_url: string
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!backendUrl) {
      setError('Missing backend URL')
      return
    }
    const loadVideo = async () => {
      try {
        const data = await fetchVideoById(backendUrl, videoId)
        setVideo(data)
        setError('')
      } catch (err: any) {
        console.error('useClassVaultDetail.fetchVideoById error:', err)
        setError('Failed to load video')
      }
    }
    loadVideo()
  }, [backendUrl, videoId])

  const unlockContent = useCallback(async () => {
    if (!backendUrl) {
      setError('Missing backend URL')
      return
    }
    if (!token) {
      setError('Unauthorized')
      return
    }
    try {
      const res = await fetchDownloadResources(backendUrl, videoId, token)
      setResources(res)
      setError('')
    } catch (err: any) {
      console.error('useClassVaultDetail.fetchDownloadResources error:', err)
      setError('Purchase required or access denied')
    }
  }, [backendUrl, token, videoId])

  return {
    video,
    resources,
    unlockContent,
    error,
  }
}
