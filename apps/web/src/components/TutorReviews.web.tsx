import React from 'react';
import {
  FaStar as RawFaStar,
  FaStarHalfAlt as RawFaStarHalfAlt,
  FaRegStar as RawFaRegStar,
} from 'react-icons/fa';
import { useShopContext } from '@mytutorapp/shared/context';
import { useTutorReviews } from '@mytutorapp/shared/hooks';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({ tutorId, showComments = true }) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews } = useTutorReviews(tutorId);
  const StarIcon = RawFaStar as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
  const StarHalfIcon = RawFaStarHalfAlt as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
  const StarEmptyIcon = RawFaRegStar as unknown as React.FC<React.SVGProps<SVGSVGElement>>;

  const renderStars = (): JSX.Element[] => {
    const stars: JSX.Element[] = [];
    const rating = Math.round(avgRating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<StarIcon key={i} className="text-yellow-500" />);
      } else if (rating + 0.5 === i) {
        stars.push(<StarHalfIcon key={i} className="text-yellow-500" />);
      } else {
        stars.push(<StarEmptyIcon key={i} className="text-yellow-500" />);
      }
    }
    return stars;
  };

  return (
    <div className="tutor-reviews">
      <div className="flex items-center">
        {renderStars()}
        <span className="ml-2 text-xs text-gray-200">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>

      {/* Only render comments if showComments is true */}
      {showComments && (
        <div className="mt-4">
          {reviews.map((review) => (
            <div key={review.id} className="mb-4 p-4 bg-gray-800 rounded">
              <p className="text-yellow-300 font-bold">Rating: {review.rating}</p>
              <p className="text-gray-200">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorReviews;
