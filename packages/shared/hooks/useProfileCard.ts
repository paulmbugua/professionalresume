// /packages/shared/hooks/useProfileCard.ts
import { useState, useEffect } from 'react';
import { fetchTutorReviews, fetchTutorCertification } from '../api/profileCardApi';

export const useProfileCard = (profile: any, backendUrl: string, token: string) => {
  const [ratingData, setRatingData] = useState({ avgRating: 0, totalReviews: 0 });
  const [certification, setCertification] = useState<any>(null);

  useEffect(() => {
    if (profile && profile.role === 'tutor') {
      const tutorId = profile.id; // Use profile.id (for PostgreSQL) instead of _id
      fetchTutorReviews(backendUrl, tutorId)
        .then((data) => {
          setRatingData({
            avgRating: data.avgRating,
            totalReviews: data.totalReviews,
          });
        })
        .catch((error) => {
          console.error('Error fetching tutor reviews:', error.response?.data || error.message);
        });
    }
  }, [profile, backendUrl]);

  useEffect(() => {
    if (profile && profile.role === 'tutor' && token) {
      fetchTutorCertification(backendUrl, token, profile.id)
        .then((data) => {
          if (data.certification) {
            setCertification(data.certification);
          }
        })
        .catch((error) => {
          console.error('Error fetching certification status:', error.response?.data || error.message);
        });
    }
  }, [profile, backendUrl, token]);

  return { ratingData, certification };
};
