import { useState, useEffect } from 'react';
import { fetchTutorReviews, fetchTutorCertification } from '@mytutorapp/shared/api';
import type { ProfileCardProps, RatingStats } from '@mytutorapp/shared/types';

interface CertificationData {
  status?: string;
  [key: string]: unknown;
}

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
    if (profile && profile.role === 'tutor') {
      const tutorId = profile.id;
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
          console.error(
            'Error fetching certification status:',
            error.response?.data || error.message
          );
        });
    }
  }, [profile, backendUrl, token]);

  return { ratingData, certification };
};

export default useProfileCard;
