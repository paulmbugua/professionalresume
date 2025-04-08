import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopContext } from '@shared/context';
import { useProfileCard } from '@shared/hooks';
import type { Profile } from '@shared/types';
import TutorReviewsNative from './TutorReviews.native';
import tw from 'twrnc';

interface ProfileCardProps {
  profile: Profile;
}

// Define your navigation parameters for all screens in your app.
type RootStackParamList = {
  Profile: { id: string };
  // Add other routes here as needed.
};

const ProfileCardNative: React.FC<ProfileCardProps> = ({ profile }) => {
  // Use the generic type to inform TypeScript of your routes and parameters.
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { backendUrl, token } = useShopContext();
  const { certification } = useProfileCard(profile, backendUrl, token);

  const statusColor =
    profile.status === 'Online'
      ? 'bg-green-500'
      : profile.status === 'Busy'
      ? 'bg-yellow-500'
      : profile.status === 'New'
      ? 'bg-blue-500'
      : profile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-pink-300'; // Using soft pink as fallback

  const handleCardClick = () => {
    // Now TypeScript recognizes the correct parameter type for 'Profile'
    navigation.navigate('Profile', { id: profile.id });
  };

  const profileImage =
    (profile.gallery ?? []).length > 0 ? profile.gallery[0] : null;

  return (
    <TouchableOpacity
      style={tw`relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden shadow-lg`}
      onPress={handleCardClick}
      activeOpacity={0.8}
    >
      {profileImage ? (
        <Image
          source={{
            uri:
              typeof profileImage === 'string'
                ? profileImage
                : 'https://example.com/fallback.jpg',
          }}
          style={tw`w-full h-full`}
          resizeMode="cover"
        />
      ) : (
        <View style={tw`w-full h-full bg-gray-300 flex items-center justify-center`}>
          <Text style={tw`text-gray-600`}>No Image</Text>
        </View>
      )}

      {profile.role === 'tutor' && certification?.status === 'Verified' && (
        <View style={tw`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center`}>
          <FontAwesome name="certificate" size={24} color="#60A5FA" />
        </View>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={tw`absolute bottom-0 left-0 w-full p-3`}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={tw`text-sm font-semibold text-white`}>
            {profile.name || 'Unnamed'}
          </Text>
        </View>
        {profile.status && (
          <Text style={tw`text-xs px-2 py-1 rounded-full mt-1 ${statusColor}`}>
            {profile.status}
          </Text>
        )}
        {profile.role === 'tutor' && (
          <View style={tw`mt-2`}>
            <TutorReviewsNative tutorId={profile.id} showComments={false} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ProfileCardNative;
