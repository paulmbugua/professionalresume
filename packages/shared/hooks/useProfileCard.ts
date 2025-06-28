// packages/shared/hooks/useProfileCard.ts

import { useState, useEffect } from 'react'
import {
  fetchTutorProfile,
  fetchTutorReviews,
  fetchTutorCertification,
} from '@mytutorapp/shared/api'
import type {
  Profile,
  ProfileCardProps,
  RatingStats,
} from '@mytutorapp/shared/types'

interface CertificationData {
  status?: string
  [key: string]: unknown
}

// Caches keyed by numeric user_id
const profileCache: Record<number, Profile> = {}
const reviewsCache: Record<number, RatingStats> = {}
const certCache: Record<number, CertificationData | null> = {}

export interface UseProfileCardResult {
  profile: Profile
  ratingData: RatingStats
  certification: CertificationData | null
}

export default function useProfileCard(
  initialProfile: ProfileCardProps['profile'], // a full Profile type
  backendUrl: string,
  token: string
): UseProfileCardResult {
  // 0) Log exactly what we got
  console.log('[useProfileCard] initialProfile:', initialProfile)

  // 1) Pull out the tutor’s real user_id and role
  const tutorUserId = initialProfile.user_id
  const role        = initialProfile.role
  console.log(`[useProfileCard] tutorUserId=${tutorUserId}, role=${role}`)

  // 2) Seed local state with that full Profile
  const [cardProfile, setCardProfile] = useState<Profile>(initialProfile)
  const [ratingData, setRatingData] = useState<RatingStats>({
    avgRating:    0,
    totalReviews: 0,
  })
  const [certification, setCertification] =
    useState<CertificationData | null>(null)

  // 3) Always fetch the up-to-date profile by user_id
  useEffect(() => {
    if (!backendUrl || !tutorUserId) return
    console.log(`[useProfileCard] fetching profile for userId=${tutorUserId}`)

    if (profileCache[tutorUserId]) {
      setCardProfile(profileCache[tutorUserId])
    } else {
      fetchTutorProfile(backendUrl, tutorUserId)
        .then(full => {
          profileCache[tutorUserId] = full
          setCardProfile(full)
        })
        .catch(err =>
          console.error(
            `[useProfileCard] fetchProfile error userId=${tutorUserId}:`,
            err
          )
        )
    }
  }, [backendUrl, tutorUserId])

  // 4) Fetch reviews if this is a tutor
  useEffect(() => {
    if (!backendUrl || cardProfile.role !== 'tutor') return
    console.log(`[useProfileCard] fetching reviews for userId=${tutorUserId}`)

    if (reviewsCache[tutorUserId]) {
      setRatingData(reviewsCache[tutorUserId])
    } else {
      fetchTutorReviews(backendUrl, tutorUserId)
        .then(data => {
          const summary: RatingStats = {
            avgRating:    Number(data.avgRating)    || 0,
            totalReviews: Number(data.totalReviews) || 0,
          }
          reviewsCache[tutorUserId] = summary
          setRatingData(summary)
        })
        .catch(err =>
          console.error(
            `[useProfileCard] fetchReviews error userId=${tutorUserId}:`,
            err
          )
        )
    }
  }, [backendUrl, tutorUserId, cardProfile.role])

  // 5) Fetch certification if this is a tutor
  useEffect(() => {
    if (!backendUrl || cardProfile.role !== 'tutor') {
      setCertification(null)
      return
    }
    console.log(`[useProfileCard] fetching certification for userId=${tutorUserId}`)

    if (certCache.hasOwnProperty(tutorUserId)) {
      setCertification(certCache[tutorUserId])
    } else {
      fetchTutorCertification(backendUrl, token, tutorUserId)
        .then(resp => {
          certCache[tutorUserId] = resp.certification
          setCertification(resp.certification)
        })
        .catch(err => {
          console.error(
            `[useProfileCard] fetchCertification error userId=${tutorUserId}:`,
            err
          )
          certCache[tutorUserId] = null
          setCertification(null)
        })
    }
  }, [backendUrl, token, tutorUserId, cardProfile.role])

  return {
    profile:       cardProfile,
    ratingData,
    certification,
  }
}
