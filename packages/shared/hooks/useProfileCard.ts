// packages/shared/hooks/useProfileCard.ts

import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import {
  fetchTutorReviews,
  fetchTutorCertification,
} from '@mytutorapp/shared/api';
import type { Profile, RatingStats } from '@mytutorapp/shared/types';

interface CertificationData {
  status?: string;
  [key: string]: unknown;
}

interface UseProfileCardResult {
  ratingData: RatingStats;
  certification: CertificationData | null;
  showCertBadge: boolean;
}

const reviewsCache: Record<string, RatingStats> = {};
const certCache: Record<string, CertificationData | null> = {};

export default function useProfileCard(
  profile: Profile,
  backendUrl: string,
  token: string
): UseProfileCardResult {
  const [ratingData, setRatingData] = useState<RatingStats>({
    avgRating: 0,
    totalReviews: 0,
  });
  const [certification, setCertification] = useState<CertificationData | null>(
    null
  );

  useEffect(() => {
    if (profile.role !== 'tutor') {
      setRatingData({ avgRating: 0, totalReviews: 0 });
      setCertification(null);
      return;
    }

    // Use profile.id (DB PK) for both reviews and certification
    const tid = profile.id;

    // 1) Fetch tutor reviews (with simple in-memory cache)
    (async () => {
      try {
        const cached = reviewsCache[tid];
        if (cached) {
          setRatingData(cached);
        } else {
          const data = await fetchTutorReviews(backendUrl, tid);
          const summary: RatingStats = {
            avgRating: data.avgRating,
            totalReviews: data.totalReviews,
          };
          reviewsCache[tid] = summary;
          setRatingData(summary);
        }
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response) {
          if (error.response.status !== 429) {
            console.error(
              '[useProfileCard] Error fetching reviews:',
              error.response.data
            );
          }
        } else {
          console.error(
            '[useProfileCard] Unexpected error fetching reviews:',
            error
          );
        }
      }
    })();

    // Fetch certification status
    (async () => {
      try {
        if (tid in certCache) {
          setCertification(certCache[tid]);
        } else {
          const resp = await fetchTutorCertification(backendUrl, token, tid);
          const cert =
            (resp as { certification?: CertificationData }).certification ?? null;
          certCache[tid] = cert;
          setCertification(cert);
        }
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response) {
          const status = error.response.status;
          if (status === 404 || status === 429) {
            // certification not found or rate limited: silently ignore
            certCache[tid] = null;
            setCertification(null);
          } else {
            console.error(
              '[useProfileCard] Error fetching certification:',
              error.response.data?.message ?? error.message
            );
            certCache[tid] = null;
            setCertification(null);
          }
        } else {
          console.error('[useProfileCard] Unexpected error:', error);
          certCache[tid] = null;
          setCertification(null);
        }
      }
    })();
  }, [profile.id, profile.role, backendUrl, token]);

  const isCertifiedFlag = Boolean(profile.certified);
  const isVerifiedStatus = certification?.status === 'Verified';
  const showCertBadge =
    profile.role === 'tutor' && (isCertifiedFlag || isVerifiedStatus);

  return { ratingData, certification, showCertBadge };
}
