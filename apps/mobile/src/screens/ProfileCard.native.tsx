/* eslint-disable react/prop-types */
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useShopContext } from '@mytutorapp/shared/context';
import { useProfileCard } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';
import TutorReviewsNative from './TutorReviews.native';

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

  const statusColor =
    profile.status === 'Online'
      ? 'bg-green-500'
      : profile.status === 'Busy'
        ? 'bg-yellow-500'
        : profile.status === 'New'
          ? 'bg-blue-500'
          : profile.status === 'Free'
            ? 'bg-purple-500'
            : 'bg-pink-300';

  const handleCardClick = () => {
    navigation.navigate('Profile', { id: profile.id });
  };

  const profileImage =
    Array.isArray(profile.gallery) && profile.gallery.length > 0 ? profile.gallery[0] : null;

  return (
    <TouchableOpacity
      className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden shadow-lg"
      onPress={handleCardClick}
      activeOpacity={0.8}
    >
      {profileImage ? (
        <Image
          source={{
            uri:
              typeof profileImage === 'string' ? profileImage : 'https://example.com/fallback.jpg',
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-full bg-gray-300 flex items-center justify-center">
          <Text className="text-gray-600">No Image</Text>
        </View>
      )}

      {profile.role === 'tutor' && certification?.status === 'Verified' && (
        <View className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center">
          <FontAwesome name="certificate" size={24} color="#60A5FA" />
        </View>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        className="absolute bottom-0 left-0 w-full p-3"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-white">{profile.name || 'Unnamed'}</Text>
        </View>
        {profile.status && (
          <Text className={`text-xs px-2 py-1 rounded-full mt-1 ${statusColor}`}>
            {profile.status}
          </Text>
        )}
        {profile.role === 'tutor' && (
          <View className="mt-2">
            <TutorReviewsNative tutorId={profile.id} showComments={false} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default ProfileCardNative;
