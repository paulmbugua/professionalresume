/// <reference path="../declarations.d.ts" />

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
import {
  useRoute,
  useNavigation,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native'
import type { MainStackParamList } from '../navigation/types'
import { FontAwesome } from '@expo/vector-icons'
import ProfileActions from '../screens/ProfileActions.native'
import TutorReviews from '../screens/TutorReviews.native'
import Spinner from '../screens/Spinner.native'
import useProfileDetail, { LocalTutorProfile } from '@mytutorapp/shared/hooks/useProfileDetail'
import { useShopContext } from '@mytutorapp/shared/context'
import { useProfileCard } from '@mytutorapp/shared/hooks'
import type { TutorProfile, Role } from '@mytutorapp/shared/types'
import debounce from 'lodash.debounce'
import tw from '../../tailwind'
import { Video } from 'expo-av'

// ── Adapter: LocalTutorProfile → TutorProfile ──
const convertToTutorProfile = (profile: LocalTutorProfile): TutorProfile => {
  const expertise    = profile.description?.expertise    ?? []
  const teachingStyle= profile.description?.teachingStyle ?? []
  const roleValue: Role | undefined =
  ['tutor','student'].includes(profile.role ?? '')
    ? (profile.role as Role)
    : undefined

  return {
    id:            profile.id,
    user_id:       profile.user ?? profile.id,
    name:          profile.name,
    category:      profile.category ?? '',
    gallery:       profile.gallery ?? [],
    expertise,
    teachingStyle,
    role:          roleValue,
    status:        profile.status,
    certified:     false,

    // extras
    user:          profile.user ?? profile.id,
    pricing: {
      privateSession: String(profile.pricing.privateSession),
      groupSession:   String(profile.pricing.groupSession),
      lecture:        String(profile.pricing.lecture),
      workshop:       String(profile.pricing.workshop),
    },
    video:         profile.video,
    lastOnline:    undefined,
    description: {
      bio:           profile.description?.bio,
      expertise,
      teachingStyle,
    },
    recommended:   (profile.recommended ?? []).map(convertToTutorProfile),
    languages:     profile.languages ?? [],
    rating:        0,
    totalReviews:  0,
  }
}

const defaultTutorProfile: TutorProfile = {
  id:            '',
  user_id:       '',
  name:          '',
  category:      '',
  gallery:       [],
  expertise:     [],
  teachingStyle: [],
  role:          undefined,
  status:        undefined,
  certified:     false,
  user:          '',
  pricing:       { privateSession: '0', groupSession: '0', lecture: '0', workshop: '0' },
  video:         '',
  lastOnline:    undefined,
  description:   {},
  recommended:   [],
  languages:     [],
  rating:        0,
  totalReviews:  0,
}

type ProfileRouteProp = RouteProp<MainStackParamList, 'Profile'>

const ProfileDetailPage: React.FC = () => {
  const route     = useRoute<ProfileRouteProp>()
  const { id }    = route.params
  const navigation= useNavigation<NavigationProp<MainStackParamList>>()
  const { backendUrl, profile: myProfile, token } = useShopContext()

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
  } = useProfileDetail(id, backendUrl)

  const debouncedSendMessage = useMemo(
    () => debounce(handleSendMessage, 300),
    [handleSendMessage]
  )
  useEffect(() => () => debouncedSendMessage.cancel(), [debouncedSendMessage])

  const numericProfile = useMemo(
    () => tutorProfile
      ? convertToTutorProfile(tutorProfile)
      : defaultTutorProfile,
    [tutorProfile]
  )
  useProfileCard(numericProfile, backendUrl, token)

  const onCreateSession = useCallback(() => {
    handleCreateSession(navigation.navigate)
  }, [handleCreateSession, navigation.navigate])

  if (!tutorProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    )
  }

  // ── Helper: only prefix backendUrl on relative paths
  const resolveUri = (raw: string) =>
    raw.startsWith('http') ? raw : `${backendUrl}${raw}`

  // ── Hero image URI
  const firstImage = numericProfile.gallery[0] ?? ''
  const heroUri    = resolveUri(firstImage)

  // ── Intro video URI
  const rawVideo     = numericProfile.video ?? ''
  const videoUri     = resolveUri(rawVideo)

  const statusColor =
    numericProfile.status === 'Online' ? 'bg-green-500'
  : numericProfile.status === 'Busy'   ? 'bg-yellow-500'
  : numericProfile.status === 'Free'   ? 'bg-purple-500'
                                     : 'bg-gray-500'

  const langs = numericProfile.languages ?? []

  const pricingSections: [string,string][] = [
    ['Private Session (60 mins)', numericProfile.pricing.privateSession],
    ['Group Session (90 mins)' , numericProfile.pricing.groupSession],
    ['Workshop (120 mins)'      , numericProfile.pricing.workshop],
    ['Lecture (180 mins)'       , numericProfile.pricing.lecture],
  ]
  const aboutSections: [string,string[]][] = [
    ['Expertise'     , numericProfile.expertise],
    ['Teaching Style', numericProfile.teachingStyle],
  ]

  return (
    <View style={tw`bg-gray-900 flex-1 relative`}>
      <ScrollView contentContainerStyle={tw`pt-24 p-4 mx-auto w-full`}>

        {/* Hero Image */}
        <TouchableOpacity
          onPress={() => handleImageClick(heroUri)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: heroUri }}
            resizeMode="cover"
            style={tw`w-full h-92 rounded-lg`}
          />
        </TouchableOpacity>

        {/* Intro Video */}
        {numericProfile.video ? (
          <View style={tw`overflow-hidden rounded-lg shadow-xl mt-4`}>
            <Video
              source={{ uri: videoUri }}
              useNativeControls
              style={tw`w-full h-48 rounded-lg`}
            />
          </View>
        ) : null}

        {/* Info Card */}
        <View style={tw`w-full bg-gray-800 p-6 rounded-lg shadow-lg mt-6`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`h-16 w-16 rounded-full overflow-hidden shadow-lg`}>
              <Image
                source={{ uri: heroUri }}
                style={tw`h-full w-full`}
                resizeMode="cover"
              />
            </View>
            <View style={tw`ml-4`}>
              <Text style={tw`text-lg font-bold`}>
                <Text style={tw`text-gray-500`}>Category: </Text>
                <Text style={tw`text-yellow-400`}>{numericProfile.category}</Text>
              </Text>
              <Text style={tw`text-gray-300`}>Speaks: {langs.join(', ')}</Text>
              <Text style={tw`self-start text-xs px-2 py-1 rounded-full mt-2 ${statusColor}`}>
                {numericProfile.status}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onCreateSession}
            style={tw`bg-blue-500 py-2 px-4 rounded-lg shadow mt-4 w-full`}
          >
            <Text style={tw`text-white text-center font-bold`}>
              Create Session with {numericProfile.name}
            </Text>
          </TouchableOpacity>

          <View style={tw`mt-4`}>
            {pricingSections.map(([label,val]) => (
              <Text key={label} style={tw`text-sm text-gray-300`}>
                {label}: <Text style={tw`font-semibold text-white`}>{val} tokens</Text>
              </Text>
            ))}
          </View>

          <TouchableOpacity style={tw`py-2 px-4 rounded-lg w-full mt-4 font-semibold ${statusColor}`}>
            <Text style={tw`text-center text-white`}>
              {numericProfile.status === 'Online' ? "I'm available" : "I'm not available"}
            </Text>
          </TouchableOpacity>

          <View style={tw`mt-4`}>
            <ProfileActions recipientId={numericProfile.user} onSendMessage={toggleChat} />
          </View>
        </View>

        {/* About & Reviews */}
        <View style={tw`mt-10 w-full px-4 flex-col gap-8`}>
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg`}>
            <Text style={tw`text-xl font-semibold text-pink-600 mb-4`}>About Me</Text>
            <Text style={tw`text-gray-300 mb-4`}>
              {numericProfile.description?.bio ?? 'No bio available.'}
            </Text>
            <View style={tw`flex-row flex-wrap gap-4`}>
              {aboutSections.map(([title, arr]) => (
                <View key={title} style={tw`w-1/2`}>
                  <Text style={tw`text-lg font-semibold text-pink-500`}>{title}</Text>
                  {arr.length > 0
                    ? arr.map((item,i) => (
                        <Text key={i} style={tw`text-gray-300 text-sm`}>{item}</Text>
                      ))
                    : <Text style={tw`text-gray-300 text-sm`}>Not specified</Text>}
                </View>
              ))}
            </View>
          </View>
          <TutorReviews tutorId={numericProfile.user} />
        </View>

        {/* Recommended */}
        <View style={tw`mt-10 w-full px-4`}>
          <ProfileActions.Recommended recommended={numericProfile.recommended} statusColor={statusColor}/>
        </View>
      </ScrollView>

      {/* Selected Image Modal */}
      {selectedImage ? (
        <Modal transparent animationType="fade" onRequestClose={closeModal}>
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
      ) : null}

      {/* Chat Overlay */}
      {myProfile?.id !== tutorProfile.id && (
        <View style={tw`absolute bottom-20 right-6 z-50`}>
          <TouchableOpacity onPress={toggleChat} style={tw`bg-pink-500 p-3 rounded-full shadow-lg`}>
            <FontAwesome name="smile-o" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
      {showChat && (
        <View style={tw`absolute bottom-0 right-0 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50 shadow-xl`}>
          {/* ... chat UI ... */}
        </View>
      )}
    </View>
  )
}

export default ProfileDetailPage
