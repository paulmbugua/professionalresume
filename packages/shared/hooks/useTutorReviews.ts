// packages/shared/hooks/useTutorReviews.ts

import { useCallback } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'
import type { RatingFormData } from '@mytutorapp/shared/types'
import { fetchTutorReviews as fetchTutorReviewsFromApi } from '@mytutorapp/shared/api'

interface TutorReviewsResponse {
  avgRating: number
  totalReviews: number
  reviews: RatingFormData[]
}

interface UseTutorReviewsResult {
  reviews: RatingFormData[]
  avgRating: number
  totalReviews: number
  loading: boolean
  error: string | null
  refreshReviews: () => Promise<void>
}

const useTutorReviews = (tutorId: string): UseTutorReviewsResult => {
  const { backendUrl } = useShopContext()

  const {
    data,
    isLoading,
    error,
    refetch: refetchReviews,
  } = useAppQuery<TutorReviewsResponse, Error>(
    ['tutorReviews', tutorId],
    async () => {
      // fetch avgRating & totalReviews from API
      const { avgRating, totalReviews } = await fetchTutorReviewsFromApi(
        backendUrl,
        tutorId
      )
      // API doesn’t yet return a list—so we supply an empty reviews array
      return { avgRating, totalReviews, reviews: [] }
    },
    { enabled: Boolean(tutorId && backendUrl) }
  )

  const reviews      = data?.reviews      ?? []
  const avgRating    = Number(data?.avgRating)    || 0
  const totalReviews = data?.totalReviews ?? 0
  const errorMessage = error?.message      ?? null

  const refreshReviews = useCallback(async () => {
    await refetchReviews()
  }, [refetchReviews])

  return {
    reviews,
    avgRating,
    totalReviews,
    loading: isLoading,
    error: errorMessage,
    refreshReviews,
  }
}

export default useTutorReviews
