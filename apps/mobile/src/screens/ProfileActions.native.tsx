// /apps/mobile/src/screens/ProfileActions.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useProfileActions } from '@shared/hooks/useProfileActions';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faHeart } from '@fortawesome/free-solid-svg-icons';

interface ProfileActionsProps {
  recipientId: string;
  onSendMessage: (recipientId: string) => void;
}

const ProfileActions: React.FC<ProfileActionsProps> = ({ recipientId, onSendMessage }) => {
  const { handleAddToFavorites } = useProfileActions();

  return (
    <View style={{ marginVertical: 8 }}>
      <TouchableOpacity
        onPress={() => onSendMessage(recipientId)}
        style={{
          backgroundColor: '#ec4899', // Tailwind pink-600
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FontAwesomeIcon icon={faEnvelope} size={16} color="white" style={{ marginRight: 8 }} />
        <Text style={{ color: 'white', fontSize: 16 }}>Send Message</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleAddToFavorites(recipientId)}
        style={{
          backgroundColor: '#4b5563', // Tailwind gray-600
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <FontAwesomeIcon icon={faHeart} size={16} color="white" style={{ marginRight: 8 }} />
        <Text style={{ color: 'white', fontSize: 16 }}>Add to Favorites</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProfileActions;
