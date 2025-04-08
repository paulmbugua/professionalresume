import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useShopContext } from '@shared/context';
import { useTutorReviews } from '@shared/hooks';
import tw from 'twrnc';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({ tutorId, showComments = true }) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews } = useTutorReviews(tutorId, backendUrl);

  const renderStars = (): JSX.Element[] => {
    const stars: JSX.Element[] = [];
    const rating = Math.round(avgRating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(
          <FontAwesome
            key={i}
            name="star"
            size={16}
            color="#F59E0B"
            style={tw`mr-1`}
          />
        );
      } else if (rating + 0.5 === i) {
        stars.push(
          <FontAwesome
            key={i}
            name="star-half-full"
            size={16}
            color="#F59E0B"
            style={tw`mr-1`}
          />
        );
      } else {
        stars.push(
          <FontAwesome
            key={i}
            name="star-o"
            size={16}
            color="#F59E0B"
            style={tw`mr-1`}
          />
        );
      }
    }
    return stars;
  };

  return (
    <View style={tw`p-2`}>
      <View style={tw`flex-row items-center`}>
        {renderStars()}
        <Text style={tw`ml-2 text-xs text-gray-200`}>
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </Text>
      </View>
      {showComments && (
        <View style={tw`mt-4`}>
          {reviews.map((review) => (
            <View
              key={review.id}
              style={tw`mb-4 p-4 bg-gray-800 rounded`}
            >
              <Text style={tw`text-yellow-300 font-bold`}>
                Rating: {review.rating}
              </Text>
              <Text style={tw`text-gray-200`}>{review.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default TutorReviews;
