// apps/web/src/components/ProfileActions.web.tsx
import React from 'react';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useProfileActions } from '@mytutorapp/shared/hooks';
import type { TutorProfile } from '@mytutorapp/shared/types';

// Props for the main ProfileActions component
interface ProfileActionsProps {
  recipientId: string;
  onSendMessage: (recipientId: string) => void;
}

// Create a type that adds static properties for the extra components.
interface ProfileActionsStatic {
  Header: React.FC<{ profile: TutorProfile; statusColor: string }>;
  Pricing: React.FC<{ pricing: Record<string, number> }>;
  StatusButton: React.FC<{ status?: string; statusColor: string; lastOnline?: string }>;
  Recommended: React.FC<{ recommended?: TutorProfile[]; statusColor: string }>;
}

// Main ProfileActions component combined with static exports
const ProfileActions: React.FC<ProfileActionsProps> & ProfileActionsStatic = ({
  recipientId,
  onSendMessage,
}) => {
  const { handleAddToFavorites } = useProfileActions();

  return (
    <div className="space-y-2">
      <button
        onClick={() => onSendMessage(recipientId)}
        className="flex items-center justify-center w-full bg-pink-600 py-2 rounded-lg shadow-lg hover:bg-pink-700 transition"
      >
        {/* Cast each icon to IconProp to satisfy the type */}
        <FontAwesomeIcon icon={faEnvelope as IconProp} className="mr-2" />
        Send Message
      </button>
      <button
        onClick={() => handleAddToFavorites(recipientId)}
        className="flex items-center justify-center w-full bg-gray-600 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition"
      >
        <FontAwesomeIcon icon={faHeart as IconProp} className="mr-2" />
        Add to Favorites
      </button>
    </div>
  );
};

// Static component: ProfileHeader
ProfileActions.Header = ({ profile, statusColor }) => (
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold">{profile.name}</h2>
    <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
  </div>
);

// Static component: ProfilePricing
ProfileActions.Pricing = ({ pricing }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-300 mb-2">Session Pricing</h3>
    <ul className="space-y-1 text-gray-400 text-sm">
      {Object.entries(pricing).map(([key, value]) => (
        <li key={key}>
          {key.replace(/([A-Z])/g, ' $1')}: <span className="text-pink-400">{value} Tokens</span>
        </li>
      ))}
    </ul>
  </div>
);

// Static component: ProfileStatusButton
ProfileActions.StatusButton = ({ status, statusColor, lastOnline }) => (
  <div className="flex items-center justify-between mt-2">
    <span className="text-sm text-gray-400">
      Status:{' '}
      <span className={`font-medium px-2 py-1 rounded ${statusColor}`}>{status || 'Unknown'}</span>
    </span>
    <span className="text-xs text-gray-500">Last Online: {lastOnline || 'N/A'}</span>
  </div>
);

// Static component: RecommendedProfiles
ProfileActions.Recommended = ({ recommended, statusColor }) => (
  <div className="mt-12 p-6 bg-gray-800 rounded-lg shadow-lg max-w-6xl mx-auto">
    <h3 className="text-xl font-semibold text-pink-500 mb-4">Recommended Tutors</h3>
    {recommended && recommended.length ? (
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommended.map((profile) => (
          <li
            key={profile.id}
            className="bg-gray-700 p-4 rounded-lg shadow hover:bg-gray-600 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold">{profile.name}</h4>
              <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
            </div>
            <p className="text-sm text-gray-400">
              {profile.description?.bio?.slice(0, 80) || 'No bio provided.'}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-400 text-sm">No recommended profiles available.</p>
    )}
  </div>
);

export default ProfileActions;
