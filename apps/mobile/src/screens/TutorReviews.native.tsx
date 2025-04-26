import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useTutorReviews } from '@mytutorapp/shared/hooks';

interface TutorReviewsProps {
  tutorId: string;
  showComments?: boolean;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({ tutorId, showComments = true }) => {
  const { backendUrl } = useShopContext();
  const { reviews, avgRating, totalReviews } = useTutorReviews(tutorId, backendUrl);

  const renderStars = (): React.ReactNode[] => {
    const stars: React.ReactNode[] = [];
    const rating = Math.round(avgRating * 2) / 2;

    for (let i = 1; i <= 5; i++) {
      const name = rating >= i ? 'star' : rating + 0.5 === i ? 'star-half-full' : 'star-o';

      stars.push(<FontAwesome key={i} name={name} size={16} color="#F59E0B" style={styles.star} />);
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {renderStars()}
        <Text style={styles.reviewCount}>
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </Text>
      </View>

      {showComments && (
        <View style={styles.commentsContainer}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.commentBox}>
              <Text style={styles.commentRating}>Rating: {review.rating}</Text>
              <Text style={styles.commentText}>{review.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentBox: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  commentRating: {
    color: '#FBBF24',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    color: '#E5E7EB',
  },
  commentsContainer: {
    marginTop: 12,
  },
  container: {
    padding: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  reviewCount: {
    color: '#E5E7EB',
    fontSize: 12,
    marginLeft: 8,
  },
  star: {
    marginRight: 4,
  },
});

export default TutorReviews;
