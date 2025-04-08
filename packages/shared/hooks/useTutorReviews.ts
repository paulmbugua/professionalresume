import { useState, useEffect } from 'react';
import { fetchTutorReviews } from '@shared/api';
import type { RatingFormData } from '@shared/types';

const useTutorReviews = (tutorId: string, backendUrl: string) => {
  const [reviews, setReviews] = useState<RatingFormData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (tutorId) {
      fetchTutorReviews(backendUrl, tutorId)
        .then((data) => {
          console.log('Fetched tutor reviews data:', data);
          setAvgRating(Number(data.avgRating) || 0);
          setTotalReviews(data.totalReviews || 0);
          setReviews(data.reviews || []);
        })
        .catch((error: unknown) => {
          console.error(
            'Error fetching tutor reviews:',
            error instanceof Error ? error.message : error
          );
        });
    }
  }, [tutorId, backendUrl]);

  return { reviews, avgRating, totalReviews };
};

export default useTutorReviews;
