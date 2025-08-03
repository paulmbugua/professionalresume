// apps/mobile/src/screens/ProfileDetailPage.native.tsx

import React, { useMemo, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp, NavigationProp } from '@react-navigation/native'
import type { TutorProfile } from '@mytutorapp/shared/types'
import useProfileDetail from '@mytutorapp/shared/hooks/useProfileDetail'
import { useShopContext } from '@mytutorapp/shared/context'
import useProfileCard from '@mytutorapp/shared/hooks/useProfileCard'
import ProfileActions from '../screens/ProfileActions.native'
import TutorReviews from '../screens/TutorReviews.native'
import Spinner from '../screens/Spinner.native'
import { FontAwesome } from '@expo/vector-icons'
import debounce from 'lodash.debounce'
import tw from '../../tailwind'
import { Video } from 'expo-av'

// Fallback in case tutorProfile is null
const defaultTutorProfile: TutorProfile = {
  id:            '',
  user:          '',
  name:          '',
  category:      '',
  gallery:       [],
  video:         '',
  role:          undefined,
  status:        undefined,
  lastOnline:    undefined,
  description:   {},
  recommended:   [],
  languages:     [],
  pricing:       { privateSession: '0', groupSession: '0', lecture: '0', workshop: '0' },
  rating:        0,
  totalReviews:  0,
}

type ProfileRouteProp = RouteProp<{ Profile: { id: string } }, 'Profile'>

const ProfileDetailPage: React.FC = () => {
  // 1) grab route, nav, context
  const { params: { id } } = useRoute<ProfileRouteProp>()
  const navigation = useNavigation<NavigationProp<any>>()
  const { backendUrl, profile: myProfile, token } = useShopContext()

  // 2) pull in your detail‐hook
  const {
    tutorProfile,
    loading,
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
  } = useProfileDetail(id, backendUrl)

  // 3) derive a stable tutor object
  const tutor: TutorProfile = useMemo(
    () => tutorProfile ?? defaultTutorProfile,
    [tutorProfile]
  )

  // 4) keep your card‐hook in the same spot every render
  useProfileCard(tutor, backendUrl, token)

  // 5) debounce sendMessage
  const debouncedSendMessage = useMemo(
    () => debounce(handleSendMessage, 300),
    [handleSendMessage]
  )
  useEffect(() => () => debouncedSendMessage.cancel(), [debouncedSendMessage])

  // 6) **move this** useCallback *above* your loading‐return
  const onCreateSession = useCallback(() => {
    handleCreateSession(navigation.navigate)
  }, [handleCreateSession, navigation.navigate])

  // 7) NOW do your loading / missing‐profile bail‐out
  if (loading || !tutorProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Spinner />
      </View>
    )
  }
  // 6) Safe URL resolver
  const resolveUri = (raw?: string | null) => {
    if (!raw) return ''
    return raw.startsWith('http') ? raw : `${backendUrl}${raw}`
  }

  const heroUri = resolveUri(tutor.gallery[0])

  // 7) Guarded arrays
  const languages     = tutor.languages ?? []
  const expertise     = tutor.description?.expertise    ?? []
  const teachingStyle = tutor.description?.teachingStyle ?? []

  const statusColor =
    tutor.status === 'Online' ? 'bg-green-500'
  : tutor.status === 'Busy'   ? 'bg-yellow-500'
  : tutor.status === 'Free'   ? 'bg-purple-500'
                              : 'bg-gray-500'

  const pricingSections: [string,string][] = [
    ['Private Session (60 mins)', tutor.pricing.privateSession],
    ['Group Session (90 mins)',   tutor.pricing.groupSession],
    ['Workshop (120 mins)',       tutor.pricing.workshop],
    ['Lecture (180 mins)',        tutor.pricing.lecture],
  ]
  const aboutSections: [string,string[]][] = [
    ['Expertise',      expertise],
    ['Teaching Style', teachingStyle],
  ]

  

  // 9) Render
  return (
    <View style={tw`bg-gray-900 flex-1`}>
      <ScrollView contentContainerStyle={tw`pt-24 p-4`}>
        {/* Hero Image */}
        {heroUri ? (
          <TouchableOpacity onPress={() => handleImageClick(heroUri)} activeOpacity={0.8}>
            <Image
              source={{ uri: heroUri }}
              style={tw`w-full h-80 rounded-lg`}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}

        {/* Intro Video */}
        {tutor.video ? (
          <View style={tw`overflow-hidden rounded-lg shadow-xl mt-4`}>
            <Video
              source={{ uri: resolveUri(tutor.video) }}
              useNativeControls
              style={tw`w-full h-48 rounded-lg`}
            />
          </View>
        ) : null}

        {/* Info Card */}
        <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg mt-6`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`h-16 w-16 rounded-full overflow-hidden shadow-lg`}>
              {heroUri ? (
                <Image
                  source={{ uri: heroUri }}
                  style={tw`h-full w-full`}
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <View style={tw`ml-4`}>
              <Text style={tw`text-xl font-bold text-white`}>{tutor.name}</Text>
              <Text style={tw`text-gray-300`}>
                Category: <Text style={tw`text-yellow-400`}>{tutor.category || 'N/A'}</Text>
              </Text>
              <Text style={tw`text-gray-300`}>Speaks: {languages.join(', ') || 'N/A'}</Text>
              <Text style={tw`${statusColor} self-start mt-2 px-2 py-1 text-xs rounded-full text-white`}>
                {tutor.status}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onCreateSession} style={tw`bg-blue-500 py-3 rounded-lg mt-4`}>
            <Text style={tw`text-center text-white font-semibold`}>
              Create Session with {tutor.name}
            </Text>
          </TouchableOpacity>

          <View style={tw`mt-4`}>
            {pricingSections.map(([label,val]) => (
              <Text key={label} style={tw`text-gray-300`}>
                {label}: <Text style={tw`text-white font-semibold`}>{val} tokens</Text>
              </Text>
            ))}
          </View>

          <TouchableOpacity style={tw`${statusColor} py-2 rounded-lg mt-4`}>
            <Text style={tw`text-center text-white font-semibold`}>
              {tutor.status === 'Online' ? "I'm available" : "I'm not available"}
            </Text>
          </TouchableOpacity>

          <View style={tw`mt-4`}>
            <ProfileActions recipientId={tutor.user} onSendMessage={toggleChat} />
          </View>
        </View>

        {/* About & Reviews */}
        <View style={tw`mt-8`}>
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg mb-6`}>
            <Text style={tw`text-xl font-semibold text-pink-600 mb-4`}>About Me</Text>
            <Text style={tw`text-gray-300 mb-4`}>
              {tutor.description?.bio ?? 'No bio available.'}
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {aboutSections.map(([title, items]) => (
                <View key={title} style={tw`w-1/2 mb-4`}>
                  <Text style={tw`text-lg font-semibold text-pink-500 mb-2`}>{title}</Text>
                  {items.length > 0 ? (
                    items.map((it,i) => (
                      <Text key={i} style={tw`text-gray-300 text-sm`}>{it}</Text>
                    ))
                  ) : (
                    <Text style={tw`text-gray-300 text-sm`}>Not specified</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          <TutorReviews tutorId={tutor.user} />
        </View>

        {/* Recommended */}
        <View style={tw`mt-8`}>
          <ProfileActions.Recommended recommended={tutor.recommended} statusColor={statusColor} />
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal transparent visible={!!selectedImage} animationType="fade" onRequestClose={closeModal}>
        <View style={tw`absolute inset-0 bg-black bg-opacity-75 justify-center items-center`}>
          <TouchableOpacity style={tw`absolute top-6 right-6`} onPress={closeModal}>
            <FontAwesome name="close" size={24} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: resolveUri(selectedImage) }}
            style={tw`w-full h-full`}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* Chat Button */}
      {myProfile?.id !== tutor.id && (
        <View style={tw`absolute bottom-20 right-6`}>
          <TouchableOpacity onPress={toggleChat} style={tw`bg-pink-500 p-3 rounded-full`}>
            <FontAwesome name="smile-o" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat Overlay */}
      {showChat && (
        <View style={tw`absolute bottom-0 right-0 w-full bg-gray-800 border-t border-gray-700`}>
          <ScrollView contentContainerStyle={tw`p-4`}>
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, i) => (
                <View
                  key={i}
                  style={tw`p-2 rounded ${msg.sender === 'me' ? 'bg-blue-500 self-end' : 'bg-gray-700 self-start'}`}
                >
                  <Text style={tw`text-white`}>{msg.content}</Text>
                </View>
              ))
            ) : (
              <Text style={tw`text-gray-400`}>Start the conversation!</Text>
            )}
          </ScrollView>
          <View style={tw`flex-row items-center border-t border-gray-600 p-2`}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message"
              placeholderTextColor="#9CA3AF"
              style={tw`flex-1 bg-gray-700 text-white px-3 py-2 rounded-l`}
            />
            <TouchableOpacity onPress={debouncedSendMessage} style={tw`bg-pink-500 px-4 py-2 rounded-r`}>
              <FontAwesome name="paper-plane" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

export default ProfileDetailPage
