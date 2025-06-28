// apps/web/src/components/ProfileCard.web.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaCertificate,
} from 'react-icons/fa';
import { useShopContext } from '@mytutorapp/shared/context';
import useProfileCard from '@mytutorapp/shared/hooks/useProfileCard';
import type { Profile } from '@mytutorapp/shared/types';
import fallbackImg from '../assets/fallback.png';

interface ProfileCardProps {
  profile: Profile;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  const navigate = useNavigate();
  const { backendUrl, token } = useShopContext();
  const { profile: card, ratingData, certification } = useProfileCard(
    profile,
    backendUrl,
    token
  );

  const isCertified =
    card.role === 'tutor' &&
    (certification?.status === 'Verified' || card.certified);

  const statusColor =
    card.status === 'Online'
      ? 'bg-green-400'
      : card.status === 'Busy'
      ? 'bg-yellow-500'
      : card.status === 'New'
      ? 'bg-blue-500'
      : card.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-softPink';

  const firstImage =
    Array.isArray(card.gallery) && card.gallery.length > 0
      ? card.gallery[0]
      : null;
  const resolvedImage =
    typeof firstImage === 'string'
      ? firstImage.startsWith('/')
        ? `${backendUrl}${firstImage}`
        : firstImage
      : fallbackImg;

  // Stars in gold
  const rating = Math.round(ratingData.avgRating * 2) / 2;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    if (rating >= idx) {
      return <FaStar key={i} className="text-yellow-500" />;
    }
    if (rating + 0.5 === idx) {
      return <FaStarHalfAlt key={i} className="text-yellow-500" />;
    }
    return <FaRegStar key={i} className="text-yellow-500" />;
  });

  return (
    <motion.div
      onClick={() => navigate(`/profile/${card.id}`)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
      className="relative w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gray-100 rounded-lg overflow-hidden shadow-lg cursor-pointer"
    >
      <img
        src={resolvedImage}
        alt={`${card.name || 'Unnamed'}'s profile`}
        className="w-full h-full object-cover"
      />

      {isCertified && (
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center">
          <FaCertificate className="text-gold" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full px-3 py-2 bg-gradient-to-t from-black/80 to-transparent text-white">
        {/* Name & status */}
        <div className="flex justify-between items-center">
          <h3 className="text-xs sm:text-sm md:text-base font-semibold">
            {card.name || 'Unnamed'}
          </h3>
          {card.status && (
            <div className={`rounded-full ${statusColor}`}>
              <span className="text-[10px] sm:text-xs px-2 py-1">
                {card.status}
              </span>
            </div>
          )}
        </div>

        {/* Category only */}
        <div className="mt-1">
          {card.category && (
            <span className="text-[10px] sm:text-xs text-gray-200">
              {card.category}
            </span>
          )}
        </div>

        {/* Gold stars + review count */}
        {card.role === 'tutor' && (
          <div className="mt-1 flex items-center space-x-1 text-[8px] sm:text-[10px] md:text-xs whitespace-nowrap overflow-hidden">
            {stars}
            <span>({ratingData.totalReviews})</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileCard;
