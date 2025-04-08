import React, { useMemo, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import Navbar from '../screens/Navbar.native';
import ProfileActions from '../screens/ProfileActions.native';
import Footer from '../screens/Footer.native';
import TutorReviews from '../screens/TutorReviews.native';
import Spinner from '../screens/Spinner.native';
import { FontAwesome } from '@expo/vector-icons';
import useProfileDetail, { LocalTutorProfile } from '@shared/hooks/useProfileDetail';
import { useShopContext } from '@shared/context';
import type { TutorProfile } from '@shared/types';
import debounce from 'lodash.debounce';
import { useProfileCard } from '@shared/hooks';

// Define route params type
type RootStackParamList = {
  ProfileDetail: { id: string };
  // add other routes if necessary
};

type ProfileDetailRouteProp = RouteProp<RootStackParamList, 'ProfileDetail'>;

// Extend the LocalTutorProfile with optional rating properties
interface LocalTutorProfileWithReview extends LocalTutorProfile {
  rating?: number;
  totalReviews?: number;
}

// Conversion function: explicitly build a TutorProfile object
const convertToTutorProfile = (profile: LocalTutorProfileWithReview): TutorProfile => ({
  id: profile.id,
  name: profile.name,
  user: profile.user ? profile.user : profile.id,
  pricing: {
    privateSession: String(profile.pricing.privateSession),
    groupSession: String(profile.pricing.groupSession),
    lecture: String(profile.pricing.lecture),
    workshop: String(profile.pricing.workshop),
  },
  gallery: profile.gallery ?? [],
  recommended: (profile.recommended ?? []).map((rec: LocalTutorProfileWithReview) => ({
    id: rec.id,
    name: rec.name,
    user: rec.user ? rec.user : rec.id,
    pricing: {
      privateSession: String(rec.pricing.privateSession),
      groupSession: String(rec.pricing.groupSession),
      lecture: String(rec.pricing.lecture),
      workshop: String(rec.pricing.workshop),
    },
    gallery: rec.gallery ?? [],
    rating: rec.rating ?? 0,
    totalReviews: rec.totalReviews ?? 0,
    category: rec.category,
    video: rec.video,
    role: rec.role,
    status: rec.status,
    description: rec.description,
    languages: rec.languages ?? [],
  })),
  rating: profile.rating ?? 0,
  totalReviews: profile.totalReviews ?? 0,
  category: profile.category,
  video: profile.video,
  role: profile.role,
  status: profile.status,
  description: profile.description,
  languages: profile.languages ?? [],
});

const ProfileDetailPage = () => {
  const route = useRoute<ProfileDetailRouteProp>();
  const { id } = route.params;
  const navigation = useNavigation();
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

  // Create debounced functions to limit rapid calls.
  const debouncedCreateSession = useMemo(
    () => debounce(() => handleCreateSession(navigation.navigate), 300),
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

  // Compute a numeric profile unconditionally.
  const numericProfile = useMemo(() => {
    return tutorProfile
      ? convertToTutorProfile(tutorProfile)
      : {
          id: '',
          name: '',
          user: '',
          pricing: { privateSession: '', groupSession: '', lecture: '', workshop: '' },
          gallery: [] as string[],
          recommended: [],
          rating: 0,
          totalReviews: 0,
          category: '',
          video: '',
          role: '',
          status: '',
          description: undefined,
          languages: [],
        } as TutorProfile;
  }, [tutorProfile]);

  // Call useProfileCard (removed unused ratingData)
  useProfileCard(numericProfile, backendUrl, token);

  if (!tutorProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    );
  }

  const statusColor =
    tutorProfile.status === 'Online'
      ? 'bg-green-500'
      : tutorProfile.status === 'Busy'
      ? 'bg-yellow-500'
      : tutorProfile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-gray-500';

  return (
    <View style={tw`bg-gray-900 flex-1 relative`}>
      {/* Navbar */}
      <View style={tw`absolute top-0 left-0 w-full z-50`}>
        <Navbar onSearch={(query: string) => console.log(query)} />
      </View>

      {/* Main Layout */}
      <ScrollView contentContainerStyle={tw`pt-24 p-4 mx-auto w-full`}>
        <View style={tw`flex-col gap-8`}>
          {/* Left: Media */}
          <View style={tw`w-full flex-col`}>
            <TouchableOpacity
              onPress={() =>
                handleImageClick(tutorProfile.gallery?.[0] || 'default-image-url')
              }
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: tutorProfile.gallery?.[0] || 'default-image-url' }}
                style={tw`w-full h-64 rounded-lg`}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {tutorProfile.video && (
              <View style={tw`mt-4`}>
                {/* For video playback, consider using expo-av's Video component */}
                <Text style={tw`text-white`}>Video Placeholder</Text>
              </View>
            )}
          </View>

          {/* Right: Profile Info */}
          <View style={tw`w-full bg-gray-800 p-6 rounded-lg shadow-lg`}>
            <View style={tw`flex-row items-center`}>
              <Image
                source={{ uri: tutorProfile.gallery?.[0] || 'default-avatar-url' }}
                style={tw`h-16 w-16 rounded-full shadow-lg`}
              />
              <View style={tw`ml-4`}>
                <Text style={tw`text-lg font-bold`}>
                  <Text style={tw`text-gray-500`}>Tutor Category: </Text>
                  <Text style={tw`text-yellow-400`}>
                    {tutorProfile.category || 'Not specified'}
                  </Text>
                </Text>
                <Text style={tw`text-gray-300`}>
                  Speaks:{' '}
                  {numericProfile.languages && numericProfile.languages.length > 0
                    ? numericProfile.languages.join(', ')
                    : 'Not specified'}
                </Text>
                {tutorProfile.status && (
                  <Text style={tw`${statusColor} text-xs px-2 py-1 rounded-full mt-2`}>
                    {tutorProfile.status}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => debouncedCreateSession()}
              style={tw`bg-blue-500 py-2 px-4 rounded-lg shadow mt-4 w-full`}
            >
              <Text style={tw`text-white text-center font-bold`}>
                Create Session with Tutor {tutorProfile.name}
              </Text>
            </TouchableOpacity>
            <View style={tw`mt-4`}>
              <Text style={tw`text-sm text-gray-300`}>
                Private Session (60mins):{' '}
                <Text style={tw`font-semibold text-white`}>
                  {tutorProfile.pricing.privateSession || 'N/A'}{' '}
                  <Text style={tw`text-sm text-gray-300`}>tokens</Text>
                </Text>
              </Text>
              <Text style={tw`text-sm text-gray-300`}>
                Group Session (90mins):{' '}
                <Text style={tw`font-semibold text-white`}>
                  {tutorProfile.pricing.groupSession || 'N/A'}{' '}
                  <Text style={tw`text-sm text-gray-300`}>tokens</Text>
                </Text>
              </Text>
              <Text style={tw`text-sm text-gray-300`}>
                Workshop (120mins):{' '}
                <Text style={tw`font-semibold text-white`}>
                  {tutorProfile.pricing.workshop || 'N/A'}{' '}
                  <Text style={tw`text-sm text-gray-300`}>tokens</Text>
                </Text>
              </Text>
              <Text style={tw`text-sm text-gray-300`}>
                Lecture (180mins):{' '}
                <Text style={tw`font-semibold text-white`}>
                  {tutorProfile.pricing.lecture || 'N/A'}{' '}
                  <Text style={tw`text-sm text-gray-300`}>tokens</Text>
                </Text>
              </Text>
              <Text style={tw`text-yellow-400 mt-2`}>
                Please Note Session Attendance minutes
              </Text>
            </View>
            <TouchableOpacity
              style={tw`py-2 px-4 rounded-lg w-full mt-4 font-semibold ${statusColor} text-white`}
            >
              <Text style={tw`text-center`}>
                {tutorProfile.status === 'Online'
                  ? "I'm available"
                  : "I'm not available"}
              </Text>
            </TouchableOpacity>
            <View style={tw`mt-4`}>
              <ProfileActions recipientId={numericProfile.user} onSendMessage={toggleChat} />
            </View>
          </View>
        </View>

        {/* Details: About Me & Tutor Reviews */}
        <View style={tw`mt-10 w-full px-4 flex-col gap-8`}>
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg`}>
            <Text style={tw`text-xl font-semibold text-pink-600 mb-4`}>About Me</Text>
            <Text style={tw`text-gray-300 mb-4`}>
              {tutorProfile.description?.bio || 'No bio available.'}
            </Text>
            <View style={tw`flex-row flex-wrap gap-4`}>
              <View style={tw`w-1/2`}>
                <Text style={tw`text-lg font-semibold text-pink-500`}>Expertise</Text>
                {Array.isArray(tutorProfile.description?.expertise) &&
                tutorProfile.description.expertise.length > 0 ? (
                  <View style={tw`mt-2`}>
                    {tutorProfile.description.expertise.map((skill, index) => (
                      <Text key={index} style={tw`text-gray-300 text-sm`}>
                        {skill}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={tw`text-gray-300 text-sm`}>Not specified</Text>
                )}
              </View>
              <View style={tw`w-1/2`}>
                <Text style={tw`text-lg font-semibold text-pink-500`}>Teaching Style</Text>
                {Array.isArray(tutorProfile.description?.teachingStyle) &&
                tutorProfile.description.teachingStyle.length > 0 ? (
                  <View style={tw`mt-2`}>
                    {tutorProfile.description.teachingStyle.map((style, index) => (
                      <Text key={index} style={tw`text-gray-300 text-sm`}>
                        {style}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={tw`text-gray-300 text-sm`}>Not specified</Text>
                )}
              </View>
            </View>
          </View>
          <View>
            <TutorReviews tutorId={tutorProfile.id} />
          </View>
        </View>

        {/* Recommended Tutors */}
        <View style={tw`mt-10 w-full px-4`}>
          <ProfileActions.Recommended
            recommended={numericProfile.recommended}
            statusColor={statusColor}
          />
          <View style={tw`mt-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={tw`text-pink-500 underline`}>&larr; Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Chat Toggle Button */}
      {myProfile?.id !== tutorProfile.id && (
        <View style={tw`absolute bottom-20 right-6 z-50`}>
          <TouchableOpacity
            style={tw`bg-pink-500 p-3 rounded-full shadow-lg`}
            onPress={toggleChat}
          >
            <FontAwesome name="smile-o" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat Box */}
      {showChat && (
        <View style={tw`absolute bottom-0 right-0 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50 shadow-xl`}>
          <ScrollView style={tw`p-4 h-64`} contentContainerStyle={tw`space-y-2`}>
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <View
                  key={index}
                  style={tw`p-2 rounded ${msg.sender === 'me' ? 'bg-blue-500' : 'bg-gray-700'}`}
                >
                  <Text style={msg.sender === 'me' ? tw`text-white` : tw`text-gray-200`}>{msg.content}</Text>
                </View>
              ))
            ) : (
              <Text style={tw`text-gray-400`}>Start the conversation!</Text>
            )}
          </ScrollView>
          <View style={tw`flex-row items-center p-2 border-t border-gray-600`}>
            <TextInput
              style={tw`flex-1 bg-gray-700 text-white px-3 py-2 rounded-l`}
              placeholder="Type your message"
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity onPress={() => debouncedSendMessage()} style={tw`bg-pink-500 px-4 py-2 rounded-r`}>
              <FontAwesome name="paper-plane" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Image Modal Viewer */}
      {selectedImage && (
        <TouchableOpacity
          style={tw`absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center`}
          onPress={closeModal}
        >
          <Image
            source={{ uri: selectedImage }}
            style={tw`max-h-[90vh] max-w-[90vw] rounded-lg`}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      <Footer />
    </View>
  );
};

export default ProfileDetailPage;
