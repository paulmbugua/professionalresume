// /packages/shared/hooks/useTutorReviews.ts
import { useState, useEffect } from 'react';
import { fetchTutorReviews } from '../api/tutorReviewsApi';

export const useTutorReviews = (tutorId: string, backendUrl: string) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (tutorId) {
      fetchTutorReviews(backendUrl, tutorId)
        .then((data) => {
          setAvgRating(Number(data.avgRating) || 0);
          setTotalReviews(data.totalReviews || 0);
          setReviews(data.reviews || []);
        })
        .catch((error) => {
          console.error('Error fetching tutor reviews:', error.response?.data || error.message);
        });
    }
  }, [tutorId, backendUrl]);

  return { reviews, avgRating, totalReviews };
};
