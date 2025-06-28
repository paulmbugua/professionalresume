// /apps/web/src/components/ProfileGrid.web.tsx

import React from 'react';
import { motion } from 'framer-motion';
import ProfileCard from './ProfileCard.web';
import type { Profile } from '@mytutorapp/shared/types';

interface ProfileGridProps {
  profiles: Profile[];
}

const ProfileGrid: React.FC<ProfileGridProps> = ({ profiles }) => {
  return (
    <div className="p-4">
      {profiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.user_id}
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
    </div>
  );
};

export default ProfileGrid;
