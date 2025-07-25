import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
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
 * List-screen hook
 *
 * @param subjectFilter  single chosen subject (or empty = no filter)
 * @param gradeFilter    single chosen grade (or empty = no filter)
 */
export function useClassVault(
  subjectFilter: string = '',
  gradeFilter: string = ''
) {
  const { backendUrl, token, tokens, setTokens } = useShopContext()
  const qc = useQueryClient()

  // 1) All videos
  const {
    data: videos = [],
    isLoading: loadingVideos,
    error: videosError,
    refetch: refreshVideos,
  } = useQuery<RecordedVideo[], Error>({
    queryKey: ['classVaultVideos'],
    queryFn: () => fetchAllVideos(backendUrl),
    enabled: Boolean(backendUrl),
  })

  // 2) Purchased IDs
  const {
    data: purchasedIdsArr = [],
    isLoading: loadingPurchased,
    error: purchasedError,
    refetch: refreshPurchased,
  } = useQuery<number[], Error>({
    queryKey: ['purchasedVideoIds', token],
    queryFn: () => fetchPurchasedVideoIds(backendUrl, token),
    enabled: Boolean(token),
  })
  const purchasedIds = useMemo(() => new Set<number>(purchasedIdsArr), [purchasedIdsArr])

  // composite loading / error
  const loading = loadingVideos || loadingPurchased
  const error = videosError?.message || purchasedError?.message || ''

  // 3) Refresh both
  const refresh = useCallback(() => {
    void refreshVideos()
    void refreshPurchased()
  }, [refreshVideos, refreshPurchased])

  // 4) Purchase mutation
  const purchaseMutation = useMutation<{video_url:string;pdf_url:string}, Error, RecordedVideo>({
    mutationFn: (video) => purchaseClassVault(backendUrl, video.id, token),
    onMutate: (video) => {
      // optimistically subtract tokens & mark purchased
      setTokens((t) => t - video.price)
      qc.setQueryData<number[]>(['purchasedVideoIds', token], (prev = []) => [
        ...prev,
        video.id,
      ])
    },
    onError: () => {
      // in case of error, refetch both to revert
      void refreshPurchased()
      void qc.invalidateQueries({ queryKey: ['userTokens'] })
    },
  })

  const purchase = useCallback(
    async (video: RecordedVideo) => {
      if (tokens < video.price) {
        throw new Error('Insufficient tokens')
      }
      await purchaseMutation.mutateAsync(video)
    },
    [purchaseMutation, tokens]
  )

  // 5) Delete mutation (tutor)
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (id) => deleteVideoById(backendUrl, id, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classVaultVideos'] })
    },
  })

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync(id)
    },
    [deleteMutation]
  )

  // 6) Filtering
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (!v.video_url) return false
      if (subjectFilter && v.subject !== subjectFilter) return false
      if (gradeFilter && String(v.grade_level) !== gradeFilter) return false
      return true
    })
  }, [videos, subjectFilter, gradeFilter])

  const filteredPdfRows = useMemo(() => {
    const pdfs = videos.filter((v) => {
      if (!v.pdf_url) return false
      if (subjectFilter && v.subject !== subjectFilter) return false
      if (gradeFilter && String(v.grade_level) !== gradeFilter) return false
      return true
    })
    return chunk(pdfs, 2)
  }, [videos, subjectFilter, gradeFilter])

  return {
    videos,
    purchasedIds,
    loading,
    error,
    refresh,
    purchase,
    remove,
    filteredVideos,
    filteredPdfRows,
  }
}

/**
 * Detail-screen hook
 *
 * @param videoId  the id to fetch & unlock
 */
export function useClassVaultDetail(videoId: number) {
  const { backendUrl, token } = useShopContext()
  const qc = useQueryClient()

  // 1) Load video metadata
  const {
    data: video,
    isLoading: loadingVideo,
    error: videoError,
    refetch: refreshVideo,
  } = useQuery<RecordedVideo, Error>({
    queryKey: ['classVaultVideo', videoId],
    queryFn: () => fetchVideoById(backendUrl, videoId),
    enabled: Boolean(backendUrl),
  })

  // 2) Unlock download URLs on demand
  const {
    data: resources,
    isLoading: loadingResources,
    error: resourcesError,
    refetch: unlockContent,
  } = useQuery<{ video_url: string; pdf_url: string }, Error>({
    queryKey: ['classVaultResources', token, videoId],
    queryFn: () => fetchDownloadResources(backendUrl, videoId, token),
    enabled: false,
  })

  return {
    video: video ?? null,
    resources: resources ?? null,
    error: videoError?.message || resourcesError?.message || '',
    loading: loadingVideo || loadingResources,
    refresh: async () => {
      await refreshVideo()
      qc.removeQueries({ queryKey: ['classVaultResources', token, videoId] })
    },
    unlockContent: async () => {
      await unlockContent()
    },
  }
}
