// apps/mobile/src/screens/ClassVaultDetailScreen.native.tsx

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { Video, ResizeMode } from 'expo-av'
import tw from '../../tailwind'
import { useShopContext } from '@mytutorapp/shared/context'
import { useClassVaultDetail } from '@mytutorapp/shared/hooks/useClassVault'
import type { MainStackParamList } from '../navigation/types'

type DetailRoute = RouteProp<MainStackParamList, 'ClassVaultDetail'>

export default function ClassVaultDetailScreen() {
  const { backendUrl } = useShopContext()
  const {
    params: { id: videoId },
  } = useRoute<DetailRoute>()

  const { video, resources, unlockContent, error } =
    useClassVaultDetail(videoId)
  const [unlockError, setUnlockError] = useState<string>('')

  // fetch protected URLs on mount
  useEffect(() => {
    unlockContent().catch(err => setUnlockError(err.message || ''))
  }, [videoId, unlockContent])

  // loading / error
  if (error) {
    return (
      <View style={tw`flex-1 bg-gray-900 justify-center items-center p-4`}>
        <Text style={tw`text-red-500 text-center`}>{error}</Text>
      </View>
    )
  }
  if (!video) {
    return (
      <View style={tw`flex-1 bg-gray-900 justify-center items-center`}>
        <ActivityIndicator size="large" color={tw.color('pink-500')} />
      </View>
    )
  }

  // always returns string (never undefined)
  const resolveUrl = (maybeUrl?: string): string => {
    if (!maybeUrl) return ''
    if (
      maybeUrl.startsWith('http://') ||
      maybeUrl.startsWith('https://')
    ) {
      return maybeUrl
    }
    return `${backendUrl}${maybeUrl}`
  }

  const fullVideoUrl = resolveUrl(resources?.video_url)
  const previewUri   = resolveUrl(video.preview_url)
  const videoUri     = fullVideoUrl || previewUri
  const pdfUri       = resolveUrl(resources?.pdf_url)

  // safe link opener
  const openLink = (url: string, label: string) => {
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) return Linking.openURL(url)
        throw new Error()
      })
      .catch(() => Alert.alert('Error', `Could not open ${label}.`))
  }

  return (
    <ScrollView
      contentContainerStyle={tw`bg-gray-900 p-4`}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <Text style={tw`text-2xl text-white font-bold mb-4 text-center`}>
        {video.title}
      </Text>

      {/* Video / Preview */}
      {videoUri !== '' && (
        <View
          style={tw`w-full h-56 mb-6 bg-black rounded-lg overflow-hidden`}
        >
          <Video
            source={{ uri: videoUri }}
            style={tw`w-full h-full`}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={!!fullVideoUrl}
          />
        </View>
      )}

      {/* Metadata */}
      <View style={tw`mb-6`}>
        <Text style={tw`text-gray-400 mb-1`}>Subject</Text>
        <Text style={tw`text-white mb-3`}>{video.subject}</Text>

        <Text style={tw`text-gray-400 mb-1`}>Grade Level</Text>
        <Text style={tw`text-white mb-3`}>{video.grade_level}</Text>

        {video.description && (
          <>
            <Text style={tw`text-gray-400 mb-1`}>Description</Text>
            <Text style={tw`text-white mb-3`}>{video.description}</Text>
          </>
        )}

        {video.tags?.length ? (
          <>
            <Text style={tw`text-gray-400 mb-1`}>Tags</Text>
            <View style={tw`flex-row flex-wrap mb-3`}>
              {video.tags.map(tag => (
                <Text
                  key={tag}
                  style={tw`text-sm text-white bg-gray-800 px-2 py-1 rounded mr-2 mb-2`}
                >
                  {tag}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </View>

      {/* ——— Download / Purchase Buttons ——— */}

      {/* PDF Button */}
      {video.pdf_url && (
        <TouchableOpacity
          onPress={() => {
            if (!pdfUri) {
              Alert.alert('Locked', 'Please purchase to access the PDF.')
              return
            }
            openLink(pdfUri, 'PDF')
          }}
          style={tw`w-full py-3 mb-4 rounded-lg ${
            pdfUri ? 'bg-gray-800' : 'bg-gray-700'
          }`}
        >
          <Text style={tw`text-center text-white font-medium`}>
            {pdfUri
              ? 'Download Class Notes (PDF)'
              : 'Purchase to Access PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Full Video Button */}
      <TouchableOpacity
        onPress={() =>
          fullVideoUrl
            ? openLink(fullVideoUrl, 'Video')
            : Alert.alert(
                'Locked',
                'Please purchase to access the full video.'
              )
        }
        style={tw`w-full py-3 rounded-lg ${
          fullVideoUrl ? 'bg-gray-800' : 'bg-gray-700'
        }`}
      >
        <Text style={tw`text-center text-white font-medium`}>
          {fullVideoUrl
            ? 'Download Full Video'
            : 'Purchase to Access Video'}
        </Text>
      </TouchableOpacity>

      {/* Unlock error */}
      {unlockError ? (
        <Text style={tw`mt-4 text-sm text-yellow-400 text-center`}>
          {unlockError}
        </Text>
      ) : null}
    </ScrollView>
  )
}
