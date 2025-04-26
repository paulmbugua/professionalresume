/* eslint-disable react/prop-types, react/display-name */
/* eslint-disable prettier/prettier */
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useProfileActions } from '@mytutorapp/shared/hooks';
import type { TutorProfile } from '@mytutorapp/shared/types';

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
    <View className="space-y-2">
      <TouchableOpacity
        onPress={() => onSendMessage(recipientId)}
        className="flex-row items-center justify-center w-full bg-pink-600 py-2 rounded-lg shadow-lg"
      >
        <FontAwesome name="envelope" size={16} color="white" className="mr-2" />
        <Text className="text-white">Send Message</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleAddToFavorites(recipientId)}
        className="flex-row items-center justify-center w-full bg-gray-600 py-2 rounded-lg shadow-lg"
      >
        <FontAwesome name="heart" size={16} color="white" className="mr-2" />
        <Text className="text-white">Add to Favorites</Text>
      </TouchableOpacity>
    </View>
  );
};

ProfileActions.Header = ({ profile, statusColor }) => (
  <View className="flex-row items-center justify-between">
    <Text className="text-2xl font-bold">{profile.name}</Text>
    <View className={`${statusColor} w-3 h-3 rounded-full`} />
  </View>
);

ProfileActions.Pricing = ({ pricing }) => (
  <View>
    <Text className="text-lg font-semibold text-gray-300 mb-2">Session Pricing</Text>
    <View className="space-y-1">
      {Object.entries(pricing).map(([key, value]) => (
        <Text key={key} className="text-sm text-gray-400">
          {key.replace(/([A-Z])/g, ' $1')}: <Text className="text-pink-400">{value} Tokens</Text>
        </Text>
      ))}
    </View>
  </View>
);

ProfileActions.StatusButton = ({ status, statusColor, lastOnline }) => (
  <View className="flex-row items-center justify-between mt-2">
    <Text className="text-sm text-gray-400">
      Status:{' '}
      <Text className={`${statusColor} font-medium px-2 py-1 rounded`}>{status || 'Unknown'}</Text>
    </Text>
    <Text className="text-xs text-gray-500">Last Online: {lastOnline || 'N/A'}</Text>
  </View>
);

ProfileActions.Recommended = ({ recommended, statusColor }) => (
  <View className="mt-12 p-6 bg-gray-800 rounded-lg shadow-lg mx-auto w-full">
    <Text className="text-xl font-semibold text-pink-500 mb-4">Recommended Tutors</Text>
    {recommended && recommended.length ? (
      <View className="flex-row flex-wrap justify-between">
        {recommended.map((profile) => (
          <View
            key={profile.id}
            className="bg-gray-700 p-4 rounded-lg shadow transition duration-300 mb-4 w-48"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-semibold">{profile.name}</Text>
              <View className={`${statusColor} w-3 h-3 rounded-full`} />
            </View>
            <Text className="text-sm text-gray-400">
              {profile.description?.bio?.slice(0, 80) || 'No bio provided.'}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text className="text-gray-400 text-sm">No recommended profiles available.</Text>
    )}
  </View>
);

export default ProfileActions;
