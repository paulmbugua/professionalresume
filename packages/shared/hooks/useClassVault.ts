// packages/shared/hooks/useClassVault.ts

import { useState, useEffect, useCallback } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import {
  fetchAllVideos,
  fetchVideoById,
  fetchDownloadResources,
  purchaseClassVault,
} from '@mytutorapp/shared/api/classVaultApi'
import type { RecordedVideo } from '@mytutorapp/shared/types'

/** Utility: split an array into rows of `size` */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export const useClassVault = () => {
  const { backendUrl, token, tokens, setTokens } = useShopContext()

  const [videos, setVideos] = useState<RecordedVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** 1️⃣ Fetch or refresh the full list */
  const fetch = useCallback(async () => {
    if (!backendUrl) {
      setError('Missing backend URL')
      return
    }
    setLoading(true)
    try {
      const data = await fetchAllVideos(backendUrl)
      setVideos(data)
      setError('')
    } catch (err: any) {
      console.error('useClassVault.fetch error:', err)
      setError('Failed to load classes.')
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  // Initial load
  useEffect(() => {
    fetch()
  }, [fetch])

  /** 2️⃣ Purchase a single class */
  const purchase = useCallback(
    async (video: RecordedVideo) => {
      if (!backendUrl || !token) {
        throw new Error('Missing backend URL or auth token')
      }
      if (tokens < video.price) {
        throw new Error('Insufficient tokens')
      }
      const resources = await purchaseClassVault(backendUrl, video.id, token)
      // deduct locally so UI updates immediately
      setTokens(prev => prev - video.price)
      return resources
    },
    [backendUrl, token, tokens, setTokens]
  )

  return {
    videos,
    loading,
    error,
    purchase,
    refresh: fetch,
    chunk,
  }
}


export const useClassVaultDetail = (videoId: number) => {
  const { backendUrl, token } = useShopContext()

  const [video, setVideo] = useState<RecordedVideo | null>(null)
  const [resources, setResources] = useState<{ video_url: string; pdf_url: string } | null>(null)
  const [error, setError] = useState('')

  // Load the RecordedVideo data
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

  /** Unlock the paid download URLs */
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
