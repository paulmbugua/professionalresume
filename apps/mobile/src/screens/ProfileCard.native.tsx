// apps/mobile/src/screens/ProfileCard.native.tsx

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopContext } from '@mytutorapp/shared/context';
import { useProfileCard } from '@mytutorapp/shared/hooks';
import type { Profile, TutorProfile } from '@mytutorapp/shared/types';
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

  const tutorLike = React.useMemo<TutorProfile>(() => {
    const p = profile as any;
    return {
      ...p,
      // provide required pricing if missing
      pricing: p?.pricing ?? {
        privateSession: 0,
        groupSession: 0,
        lecture: 0,
        workshop: 0,
      },
    } as TutorProfile;
  }, [profile]);

  // Pull both reviews and certification
   const { ratingData, certification } = useProfileCard(tutorLike, backendUrl, token);

  // Mirror web’s badge logic
  const showCertBadge =
    profile.role === 'tutor' &&
    (profile.certified === true || certification?.status === 'Verified');

  // Decide background color for status badge
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
    navigation.navigate('Profile', { id: profile.user_id });

  // Pick first gallery image
  const profileImage =
    Array.isArray(profile.gallery) && profile.gallery.length > 0
      ? profile.gallery[0]
      : null;

  // Resolve full URI
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

      {/* Certificate badge */}
      {showCertBadge && (
        <View style={tw`absolute top-2 left-2 w-8 h-8 rounded-full items-center justify-center`}>
          <FontAwesome name="certificate" size={24} style={tw`text-yellow-500`} />
          <View style={tw`absolute inset-0 items-center justify-center`}>
            <FontAwesome name="check" size={12} style={tw`text-white`} />
          </View>
        </View>
      )}

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={[0, 1]}
        end={[0, 0]}
        style={tw`absolute bottom-0 left-0 w-full h-20 px-3 py-2`}
      >
        {/* Name and status */}
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-sm font-semibold text-white`}>
            {profile.name || 'Unnamed'}
          </Text>
          {profile.status && (
            <View style={[tw`rounded-full self-start`, tw`${statusBgClass}`]}>
              <Text style={tw`text-xs px-2 py-1 text-white`}>{profile.status}</Text>
            </View>
          )}
        </View>

        {/* Category */}
        {profile.role === 'tutor' && profile.category && (
          <Text style={tw`text-xs text-gray-200 mt-1`}>{profile.category}</Text>
        )}

        {/* Star‐rating (no comments) */}
        {profile.role === 'tutor' && profile.user_id && (
          <View style={tw`mt-1`}>
            <TutorReviewsNative tutorId={profile.user_id} showComments={false} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ProfileCardNative;
