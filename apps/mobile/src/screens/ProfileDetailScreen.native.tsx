// /apps/mobile/src/screens/ProfileDetailScreen.native.tsx
import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useProfileDetail } from '@shared/hooks/useProfileDetail';
import { useSafeNavigate } from "@shared/utils/navigation";
import tw from 'twrnc';

// A simplified TutorRating component for mobile
const TutorRating = ({ rating, totalReviews }: { rating: number; totalReviews: number }) => {
  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(roundedRating >= i ? '★' : '☆');
  }
  return (
    <View style={tw`flex-row items-center`}>
      <Text>{stars.join(' ')}</Text>
      <Text style={tw`ml-2 text-xs text-gray-200`}>
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </Text>
    </View>
  );
};

const ProfileDetailScreen = () => {
  const navigate = useSafeNavigate();
  const {
    tutorProfile,
    showChat,
    toggleChat,
    newMessage,
    setNewMessage,
    handleSendMessage,
    handleCreateSession,
    selectedImage,
    handleImageClick,
    closeModal,
    myProfile,
  } = useProfileDetail();

  if (!tutorProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Compute status color for mobile header
  const headerStatusColor =
    tutorProfile.status === 'Online'
      ? 'bg-green-500'
      : tutorProfile.status === 'Busy'
      ? 'bg-yellow-500'
      : tutorProfile.status === 'Free'
      ? 'bg-purple-500'
      : 'bg-gray-500';

  return (
    <ScrollView contentContainerStyle={tw`bg-gray-900 min-h-screen p-4`}>
      {/* Navbar placeholder */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-white text-center text-xl`}>Profile Detail</Text>
      </View>
      
      {/* Profile Image & Video */}
      <View style={tw`mb-6`}>
        <TouchableOpacity onPress={() => handleImageClick(tutorProfile.gallery?.[0] || '/default-image.jpg')}>
          <Image
            source={{ uri: tutorProfile.gallery?.[0] || 'https://example.com/default-image.jpg' }}
            style={tw`w-full h-64 rounded-lg`}
            resizeMode="cover"
          />
        </TouchableOpacity>
        {tutorProfile.video && (
          // Video component can be integrated via expo-av or similar
          <View style={tw`mt-4`}>
            <Text style={tw`text-white`}>[Video Player Placeholder]</Text>
          </View>
        )}
      </View>

      {/* Profile Info & Actions */}
      <View style={tw`bg-gray-800 p-4 rounded-lg mb-6`}>
        <View style={tw`flex-row items-center mb-4`}>
          <Image
            source={{ uri: tutorProfile.gallery?.[0] || 'https://example.com/default-avatar.jpg' }}
            style={tw`w-16 h-16 rounded-full`}
          />
          <View style={tw`ml-4`}>
            <Text style={tw`text-white text-lg font-bold`}>{tutorProfile.name}</Text>
            <Text style={tw`text-gray-300`}>Category: {tutorProfile.category || 'Not specified'}</Text>
            <View style={tw`mt-1`}>
              <TutorRating rating={tutorProfile.rating || 0} totalReviews={tutorProfile.totalReviews || 0} />
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleCreateSession}
          style={tw`bg-blue-500 py-2 rounded-lg mb-4`}
        >
          <Text style={tw`text-center text-white`}>Create Session with Tutor {tutorProfile.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleChat}
          style={tw`bg-pink-500 py-2 rounded-lg`}
        >
          <Text style={tw`text-center text-white`}>Message Tutor</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Section */}
      {showChat && (
        <View style={tw`bg-gray-800 p-4 rounded-lg mb-6`}>
          <Text style={tw`text-gray-300 mb-2`}>Start a new conversation</Text>
          <TextInput
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            style={tw`border border-gray-700 p-2 rounded-lg bg-white text-black mb-2`}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={tw`bg-pink-500 py-2 rounded-lg`}
          >
            <Text style={tw`text-center text-white`}>Send Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Details Section */}
      <View style={tw`bg-gray-800 p-4 rounded-lg mb-6`}>
        <Text style={tw`text-xl text-pink-300 font-bold mb-2`}>About Me</Text>
        <Text style={tw`text-gray-300 mb-4`}>{tutorProfile.description?.bio || 'No bio available.'}</Text>
        {/* Additional details (Expertise, Teaching Style) can be rendered similarly */}
      </View>

      {/* Recommended Profiles Section */}
      <View style={tw`mb-6`}>
        <Text style={tw`text-xl text-pink-300 font-bold mb-2`}>Recommended Tutors</Text>
        {/* Recommended profiles list placeholder */}
        <Text style={tw`text-gray-300`}>[Recommended Profiles Placeholder]</Text>
      </View>

      {/* Image Modal */}
      {selectedImage && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableOpacity style={tw`flex-1 bg-black bg-opacity-75 justify-center items-center`} onPress={closeModal}>
            <View style={tw`p-4 bg-black rounded-lg`}>
              <Image
                source={{ uri: selectedImage }}
                style={tw`w-full h-80 rounded-lg`}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </ScrollView>
  );
};

export default ProfileDetailScreen;
