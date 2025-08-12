// apps/mobile/src/screens/FindTutorScreen.native.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import useProfileCard from '@mytutorapp/shared/hooks/useProfileCard';
import TutorReviewsNative from './TutorReviews.native';
import type { TutorProfile } from '@mytutorapp/shared/types';

type RootStackParamList = {
  Profile: { id: string };
};

export default function FindTutorScreenNative() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { backendUrl, token, http } = useShopContext();

  const [profiles, setProfiles] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');

  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await http.get<TutorProfile[]>('/profiles?role=tutor');
      setProfiles(data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const filteredProfiles = profiles.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCardClick = (id: string) => {
    navigation.navigate('Profile', { id });
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#111418] items-center justify-center`}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#111418]`}>
      {/* Header */}
      <View style={tw`flex-row items-center justify-between p-4 pb-2 bg-[#111418]`}>
        <Text style={tw`text-white text-lg font-bold flex-1 text-center pl-12`}>Find Tutors</Text>
        <View style={tw`w-12 items-center justify-end`}>
          <TouchableOpacity onPress={fetchTutors}>
            <Feather name="refresh-cw" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={tw`px-4 py-3`}>
        <View style={tw`flex-row items-center bg-[#283039] rounded-lg`}>
          <Feather name="search" size={24} color="#9caaba" style={tw`px-4`} />
          <TextInput
            placeholder="Search tutors"
            placeholderTextColor="#9caaba"
            style={tw`flex-1 h-12 text-white text-base`}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tutor List */}
      <ScrollView contentContainerStyle={tw`px-4 pb-6`}>
        {filteredProfiles.length === 0 ? (
          <Text style={tw`text-gray-400 text-center mt-8`}>No tutors found</Text>
        ) : (
          filteredProfiles.map((profile) => {
            const { ratingData, certification, showCertBadge } = useProfileCard(
              profile,
              backendUrl,
              token
            );

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

            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => handleCardClick(profile.id)}
                activeOpacity={0.8}
                style={tw`relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden shadow-lg mb-4`}
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

                {/* Gradient overlay */}
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
                  {profile.role === 'tutor' && (
                    <View style={tw`mt-1`}>
                      <TutorReviewsNative tutorId={profile.id} showComments={false} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
