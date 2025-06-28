// packages/shared/hooks/useTutorReviews.ts
import { useState, useEffect } from 'react';
import { fetchTutorReviews } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import type { RatingFormData } from '@mytutorapp/shared/types';

interface UseTutorReviewsResult {
  reviews: RatingFormData[];
  avgRating: number;
  totalReviews: number;
  loading: boolean;
  error: string | null;
}

const useTutorReviews = (tutorId: string): UseTutorReviewsResult => {
  const { backendUrl } = useShopContext();

  const [reviews, setReviews] = useState<RatingFormData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tutorId || !backendUrl) return;

    setLoading(true);
    setError(null);
    console.log('[useTutorReviews] fetching reviews for', tutorId, 'from', backendUrl);

    fetchTutorReviews(backendUrl, tutorId)
      .then((data) => {
        console.log('[useTutorReviews] fetched data:', data);
        setAvgRating(Number(data.avgRating) || 0);
        setTotalReviews(data.totalReviews || 0);
        setReviews(data.reviews || []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useTutorReviews] error fetching:', msg);
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tutorId, backendUrl]);

  return { reviews, avgRating, totalReviews, loading, error };
};

export default useTutorReviews;
