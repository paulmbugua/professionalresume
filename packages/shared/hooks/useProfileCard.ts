// packages/shared/hooks/useProfileCard.ts

import { useState, useEffect } from 'react';
import {
  fetchTutorReviews,
  fetchTutorCertification,
} from '@mytutorapp/shared/api';
import type { ProfileCardProps, RatingStats } from '@mytutorapp/shared/types';

interface CertificationData {
  status?: string;
  [key: string]: unknown;
}

// In‐memory caches so we don’t re‐fetch on every render
const reviewsCache: Record<string, RatingStats> = {};
const certCache: Record<string, CertificationData | null> = {};

const useProfileCard = (
  profile: ProfileCardProps['profile'],
  backendUrl: string,
  token: string
) => {
  const [ratingData, setRatingData] = useState<RatingStats>({
    avgRating: 0,
    totalReviews: 0,
  });
  const [certification, setCertification] = useState<CertificationData | null>(null);

  useEffect(() => {
    // Only do anything if this profile is a tutor
    if (profile.role !== 'tutor') {
      setRatingData({ avgRating: 0, totalReviews: 0 });
      setCertification(null);
      return;
    }

    const tid = profile.id;

    // ────────────── 1️⃣ REVIEWS ──────────────
    (async () => {
      try {
        if (reviewsCache[tid]) {
          // Already in cache
          setRatingData(reviewsCache[tid]!);
        } else {
          const data = await fetchTutorReviews(backendUrl, tid);
          // Expect data shape: { avgRating: number, totalReviews: number, … }
          const summary: RatingStats = {
            avgRating: data.avgRating,
            totalReviews: data.totalReviews,
          };
          reviewsCache[tid] = summary;
          setRatingData(summary);
        }
      } catch (err: any) {
        // If it’s a 429 “too many requests,” skip logging; otherwise log.
        const status = err?.response?.status;
        if (status !== 429) {
          console.error(
            '[useProfileCard] Error fetching tutor reviews:',
            err?.response?.data ?? err?.message
          );
        }
        // Keep ratingData at default (0/0)
      }
    })();

    // ────────────── 2️⃣ CERTIFICATION ──────────────
    // If no token, just bail out and clear certification
    if (!token) {
      setCertification(null);
      return;
    }

    (async () => {
      try {
        // If already cached (could be `null`), reuse
        if (certCache.hasOwnProperty(tid)) {
          setCertification(certCache[tid]!);
          return;
        }

        // Otherwise, fetch from API
        const data = await fetchTutorCertification(backendUrl, token, tid);
        // Expect data shape: { certification: { status: string, … } } or {}
        const cert: CertificationData | null =
          (data as any).certification ?? null;
        certCache[tid] = cert;
        setCertification(cert);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 429) {
          // 404 = “no certification” → silence, set null
          certCache[tid] = null;
          setCertification(null);
        } else {
          // Unexpected error: log it once, but still store null
          console.error(
            '[useProfileCard] Error fetching certification:',
            err?.response?.data?.message ?? err?.message
          );
          certCache[tid] = null;
          setCertification(null);
        }
      }
    })();
  }, [profile.id, profile.role, backendUrl, token]);

  return { ratingData, certification };
};

export default useProfileCard;
