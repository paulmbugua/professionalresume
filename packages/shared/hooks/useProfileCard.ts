// packages/shared/hooks/useProfileCard.ts

import { useState, useEffect } from 'react'
import { fetchTutorReviews, fetchTutorCertification } from '@mytutorapp/shared/api'
import type { ProfileCardProps, RatingStats } from '@mytutorapp/shared/types'

// simple module-level caches
const reviewsCache: Record<string, RatingStats> = {}
const certCache: Record<string, CertificationData | null> = {}

interface CertificationData {
  status?: string
  [key: string]: unknown
}

const useProfileCard = (
  profile: ProfileCardProps['profile'],
  backendUrl: string,
  token: string
) => {
  const [ratingData, setRatingData] = useState<RatingStats>({
    avgRating: 0,
    totalReviews: 0,
  })
  const [certification, setCertification] = useState<CertificationData | null>(null)

  useEffect(() => {
    if (profile.role !== 'tutor') return

    const tid = profile.id

    // 1️⃣ Reviews
    if (reviewsCache[tid]) {
      // already fetched
      setRatingData(reviewsCache[tid]!)
    } else {
      fetchTutorReviews(backendUrl, tid)
        .then((data) => {
          reviewsCache[tid] = { avgRating: data.avgRating, totalReviews: data.totalReviews }
          setRatingData(reviewsCache[tid]!)
        })
        .catch((err) => {
          // only log real errors
          if (err.response?.status !== 429 /* too many requests */) {
            console.error('Error fetching tutor reviews:', err.response?.data || err.message)
          }
        })
    }

    // 2️⃣ Certification
    if (!token) return
    if (certCache[tid] !== undefined) {
      // note: this could be null if we already tried and got 404
      setCertification(certCache[tid]!)
    } else {
      fetchTutorCertification(backendUrl, token, tid)
        .then((data) => {
          certCache[tid] = data.certification ?? null
          setCertification(certCache[tid]!)
        })
        .catch((err) => {
          const status = err.response?.status
          // silence 404 or 429
          if (status !== 404 && status !== 429) {
            console.error('Error fetching certification:', err.response?.data?.message || err.message)
          }
          certCache[tid] = null
        })
    }
  }, [profile.id, profile.role, backendUrl, token])

  return { ratingData, certification }
}

export default useProfileCard
