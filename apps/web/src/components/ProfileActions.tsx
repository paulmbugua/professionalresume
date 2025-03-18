// /apps/web/src/components/ProfileActions.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faHeart } from '@fortawesome/free-solid-svg-icons';
import { useProfileActions } from '@shared/hooks/useProfileActions';

interface ProfileActionsProps {
  recipientId: string;
  onSendMessage: (recipientId: string) => void;
}

const ProfileActions: React.FC<ProfileActionsProps> = ({ recipientId, onSendMessage }) => {
  const { handleAddToFavorites } = useProfileActions();

  return (
    <div className="space-y-2">
      <button
        onClick={() => onSendMessage(recipientId)}
        className="flex items-center justify-center w-full bg-pink-600 py-2 rounded-lg shadow-lg hover:bg-pink-700 transition"
      >
        <FontAwesomeIcon icon={faEnvelope} className="mr-2" /> Send Message
      </button>
      <button
        onClick={() => handleAddToFavorites(recipientId)}
        className="flex items-center justify-center w-full bg-gray-600 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition"
      >
        <FontAwesomeIcon icon={faHeart} className="mr-2" /> Add to Favorites
      </button>
    </div>
  );
};

export default ProfileActions;
