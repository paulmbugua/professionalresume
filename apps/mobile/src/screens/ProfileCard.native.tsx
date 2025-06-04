// apps/mobile/src/components/ProfileCard.native.tsx

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopContext } from '@mytutorapp/shared/context';
import { useProfileCard } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';
import TutorReviewsNative from './TutorReviews.native';
import tw from '../../tailwind';

interface ProfileCardProps {
  profile: Profile;
}

type RootStackParamList = {
  Profile: { id: string };
};

const ProfileCardNative: React.FC<ProfileCardProps> = ({ profile }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { backendUrl, token } = useShopContext();
  const { certification } = useProfileCard(profile, backendUrl, token);

  // Decide background color for “status”
  const statusBgClass =
    profile.status === 'Online'
      ? 'bg-green-400'
      : profile.status === 'Busy'
      ? 'bg-yellow-500'
      : profile.status === 'New'
      ? 'bg-blue-500'
      : profile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-pink-300';

  const handleCardClick = () =>
    navigation.navigate('Profile', { id: profile.id });

  // Pick the first image (if any)
  const profileImage =
    Array.isArray(profile.gallery) && profile.gallery.length > 0
      ? profile.gallery[0]
      : null;

  // If profileImage starts with “/”, prepend backendUrl; otherwise assume it's already full.
  const resolvedImageUri =
    typeof profileImage === 'string' && profileImage.startsWith('/')
      ? `${backendUrl}${profileImage}`
      : profileImage;

  return (
    <TouchableOpacity
      onPress={handleCardClick}
      activeOpacity={0.8}
      style={tw`relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden shadow-lg`}
    >
      {resolvedImageUri ? (
        <Image
          source={{ uri: resolvedImageUri }}
          resizeMode="cover"
          style={tw`w-full h-full`}
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

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={[0, 1]}
        end={[0, 0]}
        style={tw`absolute bottom-0 left-0 w-full h-16 px-3 py-2`}
      >
        {/* Name and status */}
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-sm font-semibold text-white`}>
            {profile.name || 'Unnamed'}
          </Text>
          {profile.status && (
            <View style={[tw`rounded-full self-start`, tw`${statusBgClass}`]}>
              <Text style={tw`text-xs px-2 py-1 text-white`}>
                {profile.status}
              </Text>
            </View>
          )}
        </View>

        {/* If this is a tutor, show category beneath */}
        {profile.role === 'tutor' && profile.category && (
          <Text style={tw`text-xs text-gray-200 mt-1`}>
            {profile.category}
          </Text>
        )}

        {/* If this is a tutor, show star‐rating (no comments) */}
        {profile.role === 'tutor' && (
          <View style={tw`mt-1`}>
            <TutorReviewsNative tutorId={profile.id} showComments={false} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ProfileCardNative;
