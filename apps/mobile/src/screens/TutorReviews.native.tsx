// apps/mobile/src/screens/TutorReviews.native.tsx
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useTutorReviews } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviewsNative: React.FC<TutorReviewsProps> = ({
  tutorId,
  showComments = true,
}) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews, error } = useTutorReviews(tutorId);

  // Normalize numbers in case API returns strings
  const normalizedAvg = useMemo(() => Number(avgRating ?? 0), [avgRating]);
  const normalizedTotal = useMemo(() => Number(totalReviews ?? 0), [totalReviews]);

  // Round to nearest 0.5 (same as web)
  const rounded = useMemo(
    () => Math.round(normalizedAvg * 2) / 2,
    [normalizedAvg]
  );

  // Debug logs (mirror web logs)
  console.log('[Native TutorReviews] incoming props & hook data', {
    tutorId,
    backendUrl,
    avgRating: normalizedAvg,
    totalReviews: normalizedTotal,
    reviews,
    error: error ?? null,
  });

  const stars = useMemo(() => {
    // Build star names identical to the web logic
    // FontAwesome (expo) names: 'star', 'star-half-full', 'star-o'
    return Array.from({ length: 5 }, (_, i) => {
      const idx = i + 1;
      if (rounded >= idx) return 'star' as const;
      if (rounded + 0.5 === idx) return 'star-half-full' as const;
      return 'star-o' as const;
    });
  }, [rounded]);

  return (
    <View style={tw`p-1`}>
      {/* Stars + count (compact, like web) */}
      <View style={tw`flex-row items-center`}>
        {stars.map((name, i) => (
          <FontAwesome
            key={i}
            name={name}
            size={12}
            color="#f59e0b" // tailwind amber-500 equivalent (web used text-yellow-500)
            style={tw`mr-0.5`}
          />
        ))}
        <Text style={tw`text-gray-300 text-xs ml-1`}>
          ({normalizedTotal} {normalizedTotal === 1 ? 'review' : 'reviews'})
        </Text>
      </View>

      {/* Optional comments list */}
      {showComments && reviews?.length > 0 && (
        <View style={tw`mt-2`}>
          {reviews.map((r, index) => (
            <View
              key={r.id ?? `${tutorId}-${index}`}
              style={tw`bg-[#283039] p-3 rounded ${index !== reviews.length - 1 ? 'mb-2' : ''}`}
            >
              <Text style={[tw`font-bold mb-1`, { color: '#f59e0b' }]}>
                {r.studentName}
              </Text>
              <Text style={tw`text-gray-200 text-sm`}>{r.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default TutorReviewsNative;
