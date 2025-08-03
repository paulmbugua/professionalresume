// apps/mobile/src/components/TutorReviews.native.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useTutorReviews } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({
  tutorId,
  showComments = true,
}) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews } =
    useTutorReviews(tutorId);

    console.log(
    '[TutorReviews]',
    { tutorId, avgRating, totalReviews, reviews }
  );

  // Round to nearest 0.5
  const rating = Math.round(avgRating * 2) / 2;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    if (rating >= idx) return 'star';
    if (rating + 0.5 === idx) return 'star-half-full';
    return 'star-o';
  });

  return (
    <View style={tw`p-1`}>
      {/* Stars + count on one line */}
      <View style={tw`flex-row items-center`}>
        {stars.map((name, i) => (
          <FontAwesome
            key={i}
            name={name}
            size={10}               // smaller icon
            style={tw`text-gold mr-0.5`} // very tight margin
          />
        ))}
        <Text style={tw`text-gray-200 text-xs ml-1`}>
           ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </Text>
      </View>

      {/* Optional comments below */}
{showComments && (
  <View style={tw`mt-2`}>
    {reviews.map((r, index) => (
      <View
        key={r.id}
        style={tw`bg-gray-800 p-4 rounded shadow-sm ${index !== reviews.length - 1 ? 'mb-3' : ''}`}
      >
        <Text style={tw`text-gold font-bold mb-1`}>
          {r.studentName}
        </Text>
        <Text style={tw`text-gray-200 text-sm`}>
          {r.comment}
        </Text>
      </View>
    ))}
  </View>
)}

    </View>
  );
};

export default TutorReviews;
