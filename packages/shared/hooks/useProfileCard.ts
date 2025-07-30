// packages/shared/hooks/useProfileCard.ts

import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'
import type { Profile, RatingStats } from '@mytutorapp/shared/types'
import {
  fetchTutorReviews   as fetchTutorReviewsFromApi,
  fetchTutorCertification as fetchTutorCertFromApi,
} from '@mytutorapp/shared/api'

interface CertificationData {
  status?: string
  [key: string]: unknown
}

interface UseProfileCardResult {
  ratingData: RatingStats
  certification: CertificationData | null
  showCertBadge: boolean
}

/**
 * You can now call this as:
 *   useProfileCard(profile)
 * or
 *   useProfileCard(profile, backendUrl, token)
 */
export default function useProfileCard(
  profile: Profile,
  backendUrlArg?: string,
  tokenArg?: string
): UseProfileCardResult {
  // prefer explicit args, otherwise fall back to shop context
  const { backendUrl: ctxUrl, token: ctxToken } = useShopContext()
  const backendUrl = backendUrlArg ?? ctxUrl
  const token      = tokenArg      ?? ctxToken

  const tutorId = profile.id
  const isTutor = profile.role === 'tutor'

  // 1) Tutor reviews, default to zero stats
  const {
    data: ratingData = { avgRating: 0, totalReviews: 0 },
  } = useAppQuery<RatingStats, Error>(
    ['tutorReviews', tutorId],
    () => fetchTutorReviewsFromApi(backendUrl, tutorId),
    {
      enabled: isTutor && Boolean(backendUrl),
      initialData: { avgRating: 0, totalReviews: 0 },
      retry: false,
    }
  )

  // 2) Tutor certification, default to null
  const {
    data: certification = null,
  } = useAppQuery<CertificationData | null, Error>(
    ['tutorCertification', tutorId],
    async () => {
      const resp = await fetchTutorCertFromApi(backendUrl, token, tutorId)
      return (resp as { certification?: CertificationData }).certification ?? null
    },
    {
      enabled: isTutor && Boolean(backendUrl) && Boolean(token),
      initialData: null,
      retry: false,
    }
  )

  // 3) Badge logic
  const isCertifiedFlag = Boolean(profile.certified)
  const isVerifiedStatus = certification?.status === 'Verified'
  const showCertBadge = isTutor && (isCertifiedFlag || isVerifiedStatus)

  return {
    ratingData,
    certification,
    showCertBadge,
  }
}
