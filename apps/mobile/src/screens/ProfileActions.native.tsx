/* eslint-disable react/prop-types, react/display-name */
/* eslint-disable prettier/prettier */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useProfileActions } from '@mytutorapp/shared/hooks';
import type { TutorProfile } from '@mytutorapp/shared/types';
import tw from '../../tailwind';

interface ProfileActionsProps {
  recipientId: string;
  onSendMessage: (recipientId: string) => void;
}

interface ProfileActionsStatic {
  Header: React.FC<{ profile: TutorProfile; statusColor: string }>;
  Pricing: React.FC<{ pricing: Record<string, number> }>;
  StatusButton: React.FC<{ status?: string; statusColor: string; lastOnline?: string }>;
  Recommended: React.FC<{ recommended?: TutorProfile[]; statusColor: string }>;
}

const ProfileActions: React.FC<ProfileActionsProps> & ProfileActionsStatic = ({
  recipientId,
  onSendMessage,
}) => {
  const { handleAddToFavorites } = useProfileActions();

  return (
    <View>
      <TouchableOpacity
        onPress={() => onSendMessage(recipientId)}
        style={tw`flex-row items-center justify-center w-full bg-pink-600 py-2 rounded-lg shadow-lg mb-3`}
      >
        <FontAwesome name="envelope" size={16} color="white" style={tw`mr-2`} />
        <Text style={tw`text-white`}>Send Message</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleAddToFavorites(recipientId)}
        style={tw`flex-row items-center justify-center w-full bg-gray-600 py-2 rounded-lg shadow-lg`}
      >
        <FontAwesome name="heart" size={16} color="white" style={tw`mr-2`} />
        <Text style={tw`text-white`}>Add to Favorites</Text>
      </TouchableOpacity>
    </View>
  );
};

ProfileActions.Header = ({ profile, statusColor }) => (
  <View style={tw`flex-row items-center justify-between`}>
    <Text style={tw`text-2xl font-bold`}>{profile.name}</Text>
    <View style={tw`${statusColor} w-3 h-3 rounded-full`} />
  </View>
);

ProfileActions.Pricing = ({ pricing }) => (
  <View>
    <Text style={tw`text-lg font-semibold text-gray-300 mb-2`}>Session Pricing</Text>
    {Object.entries(pricing).map(([key, value], index, arr) => (
      <Text
        key={key}
        style={tw`text-sm text-gray-400 ${index !== arr.length - 1 ? 'mb-1' : ''}`}
      >
        {key.replace(/([A-Z])/g, ' $1')}: <Text style={tw`text-pink-400`}>{value} Tokens</Text>
      </Text>
    ))}
  </View>
);

ProfileActions.StatusButton = ({ status, statusColor, lastOnline }) => (
  <View style={tw`flex-row items-center justify-between mt-2`}>
    <Text style={tw`text-sm text-gray-400`}>
      Status:{' '}
      <Text style={tw`${statusColor} font-medium px-2 py-1 rounded`}>
        {status || 'Unknown'}
      </Text>
    </Text>
    <Text style={tw`text-xs text-gray-500`}>Last Online: {lastOnline || 'N/A'}</Text>
  </View>
);

ProfileActions.Recommended = ({ recommended, statusColor }) => (
  <View style={tw`mt-12 p-6 bg-gray-800 rounded-lg shadow-lg mx-auto w-full`}>
    <Text style={tw`text-xl font-semibold text-pink-500 mb-4`}>Recommended Tutors</Text>
    {recommended && recommended.length ? (
      <View style={tw`flex-row flex-wrap justify-between`}>
        {recommended.map((profile) => (
          <View
            key={profile.id}
            style={tw`bg-gray-700 p-4 rounded-lg shadow mb-4 w-48`}
          >
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <Text style={tw`text-white font-semibold`}>{profile.name}</Text>
              <View style={tw`${statusColor} w-3 h-3 rounded-full`} />
            </View>
            <Text style={tw`text-sm text-gray-400`}>
              {profile.description?.bio?.slice(0, 80) || 'No bio provided.'}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={tw`text-gray-400 text-sm`}>No recommended profiles available.</Text>
    )}
  </View>
);

export default ProfileActions;
