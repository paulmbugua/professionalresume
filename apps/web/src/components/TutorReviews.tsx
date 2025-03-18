// /apps/web/src/components/TutorReviews.tsx
import React, { useContext } from 'react';
import { ShopContext } from '@shared/context/ShopContext';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { useTutorReviews } from '@shared/hooks/useTutorReviews';

const TutorReviews = ({ tutorId }: { tutorId: string }) => {
  const { backendUrl } = useContext(ShopContext);
  const { reviews, avgRating, totalReviews } = useTutorReviews(tutorId, backendUrl);

  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating * 2) / 2;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (roundedRating >= i) {
        stars.push(<FaStar key={i} className="text-yellow-500" />);
      } else if (roundedRating + 0.5 === i) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-500" />);
      }
    }
    return stars;
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-pink-600 mb-4">Reviews</h3>
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          {renderStars(avgRating)}
        </div>
        <span className="ml-2 text-gray-300 text-sm">
          {avgRating.toFixed(1)} / 5 ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="p-4 bg-gray-700 rounded-lg">
              <p className="text-sm text-blue-400 font-semibold">
                {review.student?.name || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-300">{review.comment}</p>
              <div className="flex mt-1">
                {renderStars(review.rating)}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No reviews yet.</p>
        )}
      </div>
    </div>
  );
};

export default TutorReviews;
