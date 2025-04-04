// /apps/web/src/components/TutorReviews.tsx
import React from 'react';
import { FaStar as RawFaStar, FaStarHalfAlt as RawFaStarHalfAlt, FaRegStar as RawFaRegStar } from 'react-icons/fa';
import { useShopContext } from '@shared/context';
import { useTutorReviews } from '@shared/hooks';

interface TutorReviewsProps {
  tutorId: string;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({ tutorId }) => {
  const { token } = useShopContext();
  // Call the hook with the expected arguments (assuming it expects tutorId and token)
  const { avgRating, totalReviews } = useTutorReviews(tutorId, token);

  // Cast the raw icons so that they are recognized as functional components returning JSX.Element.
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
    </div>
  );
};

export default TutorReviews;
