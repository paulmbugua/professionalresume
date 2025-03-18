// /apps/mobile/src/screens/TutorReviews.native.tsx
import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ShopContext } from '@shared/context/ShopContext';
import { useTutorReviews } from '@shared/hooks/useTutorReviews';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faStarHalfAlt } from '@fortawesome/free-solid-svg-icons';
import { faStar as faRegStar } from '@fortawesome/free-regular-svg-icons';

interface TutorReviewsProps {
  tutorId: string;
}

const TutorReviews: React.FC<TutorReviewsProps> = ({ tutorId }) => {
  // Ensure ShopContext is provided
  const { backendUrl } = useContext(ShopContext)!;
  const { reviews, avgRating, totalReviews } = useTutorReviews(tutorId, backendUrl);

  // Helper to render star icons based on the rating value
  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating * 2) / 2;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (roundedRating >= i) {
        stars.push(<FontAwesomeIcon key={i} icon={faStar} style={styles.starIcon} />);
      } else if (roundedRating + 0.5 === i) {
        stars.push(<FontAwesomeIcon key={i} icon={faStarHalfAlt} style={styles.starIcon} />);
      } else {
        stars.push(<FontAwesomeIcon key={i} icon={faRegStar} style={styles.starIcon} />);
      }
    }
    return stars;
  };

  // Render an individual review item
  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewerName}>
        {item.student?.name || 'Anonymous'}
      </Text>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <View style={styles.reviewStars}>
        {renderStars(item.rating)}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reviews</Text>
      <View style={styles.ratingContainer}>
        <View style={styles.starsContainer}>{renderStars(avgRating)}</View>
        <Text style={styles.ratingText}>
          {avgRating.toFixed(1)} / 5 ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </Text>
      </View>
      {reviews && reviews.length > 0 ? (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.reviewsList}
        />
      ) : (
        <Text style={styles.noReviews}>No reviews yet.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937', // gray-800
    borderRadius: 8,
    padding: 16,
    margin: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // Android elevation
    elevation: 5,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EC4899', // pink-600
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    color: '#F59E0B', // yellow-500
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 8,
    color: '#D1D5DB', // gray-300
    fontSize: 14,
  },
  reviewsList: {
    paddingBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#374151', // gray-700
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewerName: {
    fontSize: 14,
    color: '#60A5FA', // blue-400
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#D1D5DB', // gray-300
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    marginTop: 4,
  },
  noReviews: {
    color: '#9CA3AF', // gray-400
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TutorReviews;
