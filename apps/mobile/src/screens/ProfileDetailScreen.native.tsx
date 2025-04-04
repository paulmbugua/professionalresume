import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import useProfileDetail from '@shared/hooks/useProfileDetail';
import Spinner from '../components/Spinner.'; 

const ProfileDetailScreen = () => {
  // Retrieve tutor ID from route parameters.
  const route = useRoute();
  const navigation = useNavigation();
  const { id: tutorId } = route.params as { id: string };
  const backendUrl = process.env.BACKEND_URL || ''; // Adjust as needed

  // Use the shared, platform-agnostic hook.
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
  } = useProfileDetail(tutorId, backendUrl);

  if (!tutorProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Spinner />
      </View>
    );
  }

  // Determine a status color based on tutorProfile.status.
  const statusColor =
    tutorProfile.status === 'Online'
      ? '#4CAF50'
      : tutorProfile.status === 'Busy'
      ? '#FFC107'
      : tutorProfile.status === 'Free'
      ? '#9C27B0'
      : '#9E9E9E';

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      <ScrollView contentContainerStyle={tw`pb-10`}>
        {/* Header with Back Button */}
        <View style={tw`flex-row items-center justify-between p-4`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={tw`text-white text-lg`}>Back</Text>
          </TouchableOpacity>
          <Text style={tw`text-white text-xl font-bold`}>Profile Details</Text>
          <View style={tw`w-16`} /> {/* Spacer */}
        </View>

        {/* Top Section: Profile Image & Info */}
        <View style={tw`items-center px-4`}>
          <Image
            source={{
              uri:
                tutorProfile.gallery?.[0] ||
                'https://via.placeholder.com/200',
            }}
            style={tw`w-48 h-48 rounded-full shadow-xl`}
          />
          <Text style={tw`mt-4 text-2xl font-bold text-white`}>
            {tutorProfile.name}
          </Text>
          {tutorProfile.category && (
            <Text style={tw`mt-1 text-gray-300`}>
              Category: {tutorProfile.category}
            </Text>
          )}
          {tutorProfile.languages && (
            <Text style={tw`mt-1 text-gray-300`}>
              Speaks: {tutorProfile.languages.join(', ')}
            </Text>
          )}
          {tutorProfile.status && (
            <View
              style={[
                tw`mt-2 px-3 py-1 rounded-full`,
                { backgroundColor: statusColor },
              ]}
            >
              <Text style={tw`text-xs text-white`}>
                {tutorProfile.status}
              </Text>
            </View>
          )}
        </View>

        {/* Create Session Button */}
        <TouchableOpacity
          style={tw`bg-blue-500 py-3 px-6 rounded-lg mx-4 my-4`}
          onPress={() =>
            handleCreateSession((dest: string) =>
              navigation.navigate(dest as never)
            )
          }
        >
          <Text style={tw`text-white text-center`}>
            Create Session with {tutorProfile.name}
          </Text>
        </TouchableOpacity>

        {/* Pricing Section */}
        <View style={tw`bg-gray-800 rounded-lg p-4 mx-4 my-2`}>
          <Text style={tw`text-lg font-semibold text-pink-600 mb-2`}>
            Session Pricing
          </Text>
          <Text style={tw`text-gray-300`}>
            Private Session: {tutorProfile.pricing.privateSession || 'N/A'} tokens
          </Text>
          <Text style={tw`text-gray-300`}>
            Group Session: {tutorProfile.pricing.groupSession || 'N/A'} tokens
          </Text>
          <Text style={tw`text-gray-300`}>
            Workshop: {tutorProfile.pricing.workshop || 'N/A'} tokens
          </Text>
          <Text style={tw`text-gray-300`}>
            Lecture: {tutorProfile.pricing.lecture || 'N/A'} tokens
          </Text>
          <Text style={tw`text-yellow-400 mt-2`}>
            Please Note Session Attendance minutes
          </Text>
        </View>

        {/* Status Button */}
        <TouchableOpacity
          style={[tw`py-2 px-4 rounded-lg mx-4 my-2`, { backgroundColor: statusColor }]}
        >
          <Text style={tw`text-white text-center`}>
            {tutorProfile.status === 'Online'
              ? "I'm available"
              : "I'm not available"}
          </Text>
        </TouchableOpacity>

        {/* Chat Toggle Button */}
        <TouchableOpacity
          style={tw`bg-gray-700 py-3 px-6 rounded-lg mx-4 mb-4`}
          onPress={toggleChat}
        >
          <Text style={tw`text-white text-center`}>
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </Text>
        </TouchableOpacity>

        {/* About Section */}
        <View style={tw`bg-gray-800 rounded-lg p-4 mx-4 my-2`}>
          <Text style={tw`text-xl font-bold text-pink-600 mb-2`}>
            About Me
          </Text>
          <Text style={tw`text-gray-300 mb-4`}>
            {tutorProfile.description?.bio || 'No bio available.'}
          </Text>
          <View style={tw`flex-row justify-between`}>
            <View style={tw`w-1/2`}>
              <Text style={tw`text-lg font-semibold text-pink-500 mb-1`}>
                Expertise
              </Text>
              {tutorProfile.description?.expertise &&
              tutorProfile.description.expertise.length > 0 ? (
                tutorProfile.description.expertise.map((skill, idx) => (
                  <Text key={idx} style={tw`text-gray-300 text-sm`}>
                    • {skill}
                  </Text>
                ))
              ) : (
                <Text style={tw`text-gray-300 text-sm`}>
                  Not specified
                </Text>
              )}
            </View>
            <View style={tw`w-1/2`}>
              <Text style={tw`text-lg font-semibold text-pink-500 mb-1`}>
                Teaching Style
              </Text>
              {tutorProfile.description?.teachingStyle &&
              tutorProfile.description.teachingStyle.length > 0 ? (
                tutorProfile.description.teachingStyle.map((style, idx) => (
                  <Text key={idx} style={tw`text-gray-300 text-sm`}>
                    • {style}
                  </Text>
                ))
              ) : (
                <Text style={tw`text-gray-300 text-sm`}>
                  Not specified
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Tutor Reviews Section (if role is tutor) */}
        {tutorProfile.role === 'tutor' && (
          <View style={tw`mx-4 my-4`}>
            <Text style={tw`text-xl font-bold text-pink-600 mb-2`}>
              Tutor Reviews
            </Text>
            {/* Placeholder for TutorReviews component */}
            <Text style={tw`text-gray-300`}>
              [Tutor reviews component goes here]
            </Text>
          </View>
        )}

        {/* Recommended Tutors Section */}
        <View style={tw`mx-4 my-4`}>
          <Text style={tw`text-xl font-bold text-pink-600 mb-2`}>
            Recommended Tutors
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tutorProfile.recommended && tutorProfile.recommended.length > 0 ? (
              tutorProfile.recommended.map((rec) => (
                <TouchableOpacity
                  key={rec.id}
                  style={tw`mr-4`}
                  onPress={() =>
                    navigation.navigate('ProfileDetail', { id: rec.id })
                  }
                >
                  <Image
                    source={{
                      uri:
                        rec.gallery?.[0] ||
                        'https://via.placeholder.com/150',
                    }}
                    style={tw`w-24 h-32 rounded-lg`}
                  />
                  <Text style={tw`text-center text-white mt-1 text-sm`}>
                    {rec.name}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={tw`text-gray-400`}>
                No recommended tutors available.
              </Text>
            )}
          </ScrollView>
          {/* Back Button at End */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`mt-4`}
          >
            <Text style={tw`text-pink-500 text-center`}>↤ Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Chat Modal */}
      <Modal visible={showChat} animationType="slide" transparent>
        <View style={tw`flex-1 justify-end`}>
          <View style={tw`bg-gray-800 p-4 rounded-t-lg max-h-96`}>
            <ScrollView style={tw`mb-4`}>
              {chatMessages.map((msg, idx) => {
                const isSender =
                  String(msg.sender_id) === String(tutorProfile.id);
                return (
                  <View
                    key={idx}
                    style={tw.style('mb-2 p-2 rounded-lg', {
                      alignSelf: isSender ? 'flex-end' : 'flex-start',
                      backgroundColor: isSender ? '#4CAF50' : '#757575',
                    })}
                  >
                    <Text style={tw`text-white`}>{msg.content}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={tw`flex-row items-center`}>
              <TextInput
                placeholder="Type a message..."
                placeholderTextColor="#888"
                value={newMessage}
                onChangeText={setNewMessage}
                style={tw`flex-1 border border-gray-600 rounded-lg p-2 text-white`}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={tw`bg-blue-500 p-3 rounded-lg ml-2`}
              >
                <Text style={tw`text-white`}>Send</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={toggleChat} style={tw`mt-4`}>
              <Text style={tw`text-center text-gray-300`}>Close Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={!!selectedImage} animationType="fade" transparent>
        <TouchableOpacity
          style={tw`flex-1 bg-black bg-opacity-80 justify-center items-center`}
          onPress={closeModal}
        >
          <View style={tw`w-11/12 h-3/4`}>
            <Image
              source={{
                uri:
                  selectedImage || 'https://via.placeholder.com/300',
              }}
              style={tw`w-full h-full rounded-lg`}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity onPress={closeModal} style={tw`mt-4`}>
            <Text style={tw`text-white text-lg`}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default ProfileDetailScreen;
