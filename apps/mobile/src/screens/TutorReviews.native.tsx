import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useTutorReviews } from '@mytutorapp/shared/hooks';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({
  tutorId,
  showComments = true,
}) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews } = useTutorReviews(
    tutorId,
    backendUrl
  );

  const rating = Math.round(avgRating * 2) / 2;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    if (rating >= idx) return 'star';
    if (rating + 0.5 === idx) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View className="p-2">
      {/* Stars + count */}
      <View className="flex-row items-center">
        {stars.map((name, i) => (
          <FontAwesome
            key={i}
            name={name}
            size={16}
            className="text-gold mr-1"
          />
        ))}
        <Text className="text-gray-200 text-xs ml-2">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </Text>
      </View>

      {/* Comments */}
      {showComments && (
        <View className="mt-3 space-y-4">
          {reviews.map((review) => (
            <View
              key={review.id}
              className="bg-gray-800 rounded-lg p-4 shadow-soft"
            >
              <Text className="text-gold font-bold mb-1">
                Rating: {review.rating}
              </Text>
              <Text className="text-gray-200">{review.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default TutorReviews;
