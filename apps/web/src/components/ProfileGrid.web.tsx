// /apps/web/src/components/ProfileGrid.tsx
import React from 'react';
import { motion } from 'framer-motion';
import ProfileCard from './ProfileCard.web';
import { useInfiniteScroll } from '@shared/hooks';
import type { Profile } from '@shared/types';


interface ProfileGridProps {
  profiles: Profile[];
}


const ProfileGrid: React.FC<ProfileGridProps> = ({ profiles }) => {
  const { visibleCount, loadMoreRef } = useInfiniteScroll(10, 10);

  return (
    <div className="p-4">
      {profiles && profiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {profiles.slice(0, visibleCount).map((profile, index) => (
            <motion.div
            key={profile.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProfileCard profile={profile} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500">No profiles available.</div>
      )}

      {/* Trigger to load more */}
      <div ref={loadMoreRef} className="w-full h-10"></div>
    </div>
  );
};

export default ProfileGrid;
