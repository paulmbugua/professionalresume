import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  useRoute,
  useNavigation,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';

import Navbar from '../screens/Navbar.native';
import ProfileActions from '../screens/ProfileActions.native';
import Footer from '../screens/Footer.native';
import TutorReviews from '../screens/TutorReviews.native';
import Spinner from '../screens/Spinner.native';

import useProfileDetail, {
  LocalTutorProfile,
} from '@mytutorapp/shared/hooks/useProfileDetail';
import { useShopContext } from '@mytutorapp/shared/context';
import { useProfileCard } from '@mytutorapp/shared/hooks';
import type { TutorProfile } from '@mytutorapp/shared/types';
import debounce from 'lodash.debounce';

//
// -- navigation types
//
type RootStackParamList = {
  ProfileDetail: { id: string };
};
type ProfileDetailRouteProp = RouteProp<RootStackParamList, 'ProfileDetail'>;

//
// -- helper to convert LocalTutorProfile into fully typed TutorProfile
//
const convertToTutorProfile = (
  profile: LocalTutorProfile
): TutorProfile => ({
  id: profile.id,
  name: profile.name,
  user: profile.user ?? profile.id,
  pricing: {
    privateSession: String(profile.pricing.privateSession),
    groupSession: String(profile.pricing.groupSession),
    lecture: String(profile.pricing.lecture),
    workshop: String(profile.pricing.workshop),
  },
  gallery: profile.gallery ?? [],
  recommended: (profile.recommended ?? []).map((rec) => ({
    id: rec.id,
    name: rec.name,
    user: rec.user ?? rec.id,
    pricing: {
      privateSession: String(rec.pricing.privateSession),
      groupSession: String(rec.pricing.groupSession),
      lecture: String(rec.pricing.lecture),
      workshop: String(rec.pricing.workshop),
    },
    gallery: rec.gallery ?? [],
    rating: 0,
    totalReviews: 0,
    category: rec.category,
    video: rec.video,
    role: rec.role,
    status: rec.status,
    description: rec.description,
    languages: rec.languages ?? [],
  })),
  rating: 0,
  totalReviews: 0,
  category: profile.category,
  video: profile.video,
  role: profile.role,
  status: profile.status,
  description: profile.description,
  languages: profile.languages ?? [],
});

const ProfileDetailPage: React.FC = () => {
  const route = useRoute<ProfileDetailRouteProp>();
  const { id } = route.params;

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { backendUrl, profile: myProfile, token } = useShopContext();

  const {
    tutorProfile,
    showChat,
    newMessage,
    setNewMessage,
    toggleChat,
    handleCreateSession,
    handleSendMessage,
    chatMessages,
    selectedImage,
    handleImageClick,
    closeModal,
  } = useProfileDetail(id, backendUrl);

  // debounce session creation & send-message
  const debouncedCreateSession = useMemo(
    () =>
      debounce(() => {
        handleCreateSession(navigation.navigate);
      }, 300),
    [handleCreateSession, navigation.navigate]
  );
  const debouncedSendMessage = useMemo(
    () => debounce(() => handleSendMessage(), 300),
    [handleSendMessage]
  );
  useEffect(() => {
    return () => {
      debouncedCreateSession.cancel();
      debouncedSendMessage.cancel();
    };
  }, [debouncedCreateSession, debouncedSendMessage]);

  if (!tutorProfile) {
    return (
      <View className="flex-1 justify-center items-center">
        <Spinner />
      </View>
    );
  }

  // fully typed profile
  const numericProfile = useMemo(
    () => convertToTutorProfile(tutorProfile),
    [tutorProfile]
  );

  // track profile views / favorites etc.
  useProfileCard(numericProfile, backendUrl, token);

  // status pill color
  const statusColor =
    tutorProfile.status === 'Online'
      ? 'bg-green-500'
      : tutorProfile.status === 'Busy'
      ? 'bg-yellow-500'
      : tutorProfile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-gray-500';

  // flatten out arrays for rendering
  const langs = numericProfile.languages ?? [];
  const pricingSections: [string, string][] = [
    ['Private Session (60 mins)', numericProfile.pricing.privateSession],
    ['Group Session (90 mins)', numericProfile.pricing.groupSession],
    ['Workshop (120 mins)', numericProfile.pricing.workshop],
    ['Lecture (180 mins)', numericProfile.pricing.lecture],
  ];
  const aboutSections: [string, string[]][] = [
    ['Expertise', tutorProfile.description?.expertise ?? []],
    ['Teaching Style', tutorProfile.description?.teachingStyle ?? []],
  ];

  return (
    <View className="bg-gray-900 flex-1 relative">
      {/* fixed navbar */}
      <View className="absolute top-0 left-0 w-full z-50">
        <Navbar onSearch={(q: string) => console.log(q)} />
      </View>

      <ScrollView contentContainerClassName="pt-24 p-4 mx-auto w-full">
        {/* media & basics */}
        <View className="flex-col gap-8">
          <TouchableOpacity
            onPress={() =>
              handleImageClick(tutorProfile.gallery?.[0] ?? '')
            }
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: tutorProfile.gallery?.[0] ?? '',
              }}
              className="w-full h-64 rounded-lg"
              resizeMode="cover"
            />
          </TouchableOpacity>

          <View className="w-full bg-gray-800 p-6 rounded-lg shadow-lg">
            <View className="flex-row items-center">
              <Image
                source={{
                  uri: tutorProfile.gallery?.[0] ?? '',
                }}
                className="h-16 w-16 rounded-full shadow-lg"
              />
              <View className="ml-4">
                <Text className="text-lg font-bold">
                  <Text className="text-gray-500">Category: </Text>
                  <Text className="text-yellow-400">
                    {tutorProfile.category}
                  </Text>
                </Text>
                <Text className="text-gray-300">
                  Speaks: {langs.join(', ')}
                </Text>
                <Text
                  className={`${statusColor} text-xs px-2 py-1 rounded-full mt-2`}
                >
                  {tutorProfile.status}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => debouncedCreateSession()}
              className="bg-blue-500 py-2 px-4 rounded-lg shadow mt-4 w-full"
            >
              <Text className="text-white text-center font-bold">
                Create Session with {tutorProfile.name}
              </Text>
            </TouchableOpacity>

            <View className="mt-4 space-y-1">
              {pricingSections.map(([label, val]) => (
                <Text
                  key={label}
                  className="text-sm text-gray-300"
                >
                  {label}:{' '}
                  <Text className="font-semibold text-white">
                    {val}{' '}
                    <Text className="text-sm text-gray-300">
                      tokens
                    </Text>
                  </Text>
                </Text>
              ))}
              <Text className="text-yellow-400 mt-2">
                Please Note Session Attendance minutes
              </Text>
            </View>

            <TouchableOpacity
              className={`py-2 px-4 rounded-lg w-full mt-4 font-semibold ${statusColor}`}
            >
              <Text className="text-center text-white">
                {tutorProfile.status === 'Online'
                  ? "I'm available"
                  : "I'm not available"}
              </Text>
            </TouchableOpacity>

            <View className="mt-4">
              <ProfileActions
                recipientId={numericProfile.user}
                onSendMessage={toggleChat}
              />
            </View>
          </View>
        </View>

        {/* about & reviews */}
        <View className="mt-10 w-full px-4 flex-col gap-8">
          <View className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <Text className="text-xl font-semibold text-pink-600 mb-4">
              About Me
            </Text>
            <Text className="text-gray-300 mb-4">
              {tutorProfile.description?.bio ??
                'No bio available.'}
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {aboutSections.map(([title, arr]) => (
                <View key={title} className="w-1/2">
                  <Text className="text-lg font-semibold text-pink-500">
                    {title}
                  </Text>
                  {arr.length > 0 ? (
                    arr.map((item, i) => (
                      <Text
                        key={i}
                        className="text-gray-300 text-sm"
                      >
                        {item}
                      </Text>
                    ))
                  ) : (
                    <Text className="text-gray-300 text-sm">
                      Not specified
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          <TutorReviews tutorId={tutorProfile.id} />
        </View>

        {/* recommendations */}
        <View className="mt-10 w-full px-4">
          <ProfileActions.Recommended
            recommended={numericProfile.recommended}
            statusColor={statusColor}
          />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-4"
          >
            <Text className="text-pink-500 underline">
              &larr; Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {myProfile?.id !== tutorProfile.id && (
        <View className="absolute bottom-20 right-6 z-50">
          <TouchableOpacity
            className="bg-pink-500 p-3 rounded-full shadow-lg"
            onPress={toggleChat}
          >
            <FontAwesome name="smile-o" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {showChat && (
        <View className="absolute bottom-0 right-0 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50 shadow-xl">
          <ScrollView
            className="p-4 h-64"
            contentContainerClassName="space-y-2"
          >
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, i) => (
                <View
                  key={i}
                  className={`p-2 rounded ${
                    msg.sender === 'me'
                      ? 'bg-blue-500'
                      : 'bg-gray-700'
                  }`}
                >
                  <Text>{msg.content}</Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-400">
                Start the conversation!
              </Text>
            )}
          </ScrollView>
          <View className="flex-row items-center p-2 border-t border-gray-600">
            <TextInput
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l"
              placeholder="Type your message"
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity
              onPress={debouncedSendMessage}
              className="bg-pink-500 px-4 py-2 rounded-r"
            >
              <FontAwesome
                name="paper-plane"
                size={16}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Footer />
    </View>
  );
};

export default ProfileDetailPage;
