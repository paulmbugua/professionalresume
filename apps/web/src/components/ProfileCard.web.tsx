import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaCertificate,
} from 'react-icons/fa';
import { useShopContext } from '@shared/context';
import { useProfileCard } from '@shared/hooks';
import type { Profile } from '@shared/types';

// Define props for TutorRating
interface TutorRatingProps {
  rating: number;
  totalReviews: number;
}

// Reuse shared Profile type for props
interface ProfileCardProps {
  profile: Profile;
}

// Cast icons
const StarIcon = FaStar as React.ComponentType<{ className?: string }>;
const StarHalfIcon = FaStarHalfAlt as React.ComponentType<{ className?: string }>;
const StarEmptyIcon = FaRegStar as React.ComponentType<{ className?: string }>;
const CertificateIcon = FaCertificate as React.ComponentType<{ className?: string }>;

const TutorRating: React.FC<TutorRatingProps> = ({ rating, totalReviews }) => {
  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (roundedRating >= i) {
      stars.push(<StarIcon key={i} className="text-yellow-500" />);
    } else if (roundedRating + 0.5 === i) {
      stars.push(<StarHalfIcon key={i} className="text-yellow-500" />);
    } else {
      stars.push(<StarEmptyIcon key={i} className="text-yellow-500" />);
    }
  }

  return (
    <div className="flex items-center">
      {stars}
      <span className="ml-2 text-xs text-gray-200">
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  const navigate = useNavigate();
  const { backendUrl, token } = useShopContext();
  const { ratingData, certification } = useProfileCard(profile, backendUrl, token);

  const statusColor =
    profile.status === 'Online'
      ? 'bg-green-500'
      : profile.status === 'Busy'
      ? 'bg-yellow-500'
      : profile.status === 'New'
      ? 'bg-blue-500'
      : profile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-softPink';

  const handleCardClick = () => {
    navigate(`/profile/${profile.id}`);
  };

  const profileImage =
    (profile.gallery ?? []).length > 0 ? profile.gallery[0] : null;

  return (
    <motion.div
      className="relative w-full h-48 sm:h-64 bg-gray-100 rounded-lg overflow-hidden shadow-lg cursor-pointer"
      onClick={handleCardClick}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      {profileImage ? (
        <img
          src={typeof profileImage === 'string' ? profileImage : '/fallback.jpg'}
          alt={`${profile.name}'s profile`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600">
          No Image
        </div>
      )}

      {profile.role === 'tutor' && certification?.status === 'Verified' && (
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center">
          <CertificateIcon className="text-blue-400" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent text-white p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-white">
            {profile.name || 'Unnamed'}
          </h3>
          {profile.role === 'tutor' && certification?.status === 'Verified' && (
            <div
              className="flex items-center"
              title="Tutor has submitted their qualification certificates"
            >
              <CertificateIcon className="text-blue-400" />
              <span className="ml-1 text-xs">Certified</span>
            </div>
          )}
        </div>
        {profile.status && (
          <span className={`text-xs px-2 sm:px-3 py-1 rounded-full inline-block mt-1 sm:mt-2 ${statusColor}`}>
            {profile.status}
          </span>
        )}
        {profile.role === 'tutor' && ratingData && (
          <div className="mt-2">
            <TutorRating rating={ratingData.avgRating} totalReviews={ratingData.totalReviews} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileCard;
