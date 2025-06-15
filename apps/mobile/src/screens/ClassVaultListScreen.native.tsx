// apps/mobile/src/screens/ClassVaultListScreen.native.tsx

import React, { useState, useMemo, useCallback } from 'react'
import {
  Alert,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { FontAwesome5 } from '@expo/vector-icons'
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { MainStackParamList } from '../navigation/types'
import tw from '../../tailwind'
import { useShopContext } from '@mytutorapp/shared/context'
import { useClassVault } from '@mytutorapp/shared/hooks/useClassVault'
import type { RecordedVideo } from '@mytutorapp/shared/types'

export default function ClassVaultListScreen() {
  const navigation = useNavigation<
    StackNavigationProp<MainStackParamList, 'ClassVaultLibrary'>
  >()
  const { role, backendUrl } = useShopContext()
  const {
    videos,
    purchasedIds,
    loading,
    error,
    refresh,
    purchase,
    remove,
    chunk,
  } = useClassVault()

  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'videos' | 'notes'>('videos')

  // Refresh list & purchasedIds on focus
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  // Two-column grid for notes
  const pdfRows = useMemo(
    () => chunk(videos.filter(v => !!v.pdf_url), 2),
    [videos, chunk]
  )

  // Purchase handler
  const handlePurchase = useCallback(
    async (video: RecordedVideo) => {
      try {
        await purchase(video)
        Alert.alert(
          'Purchase successful',
          `You can now access "${video.title}".`,
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.navigate('ClassVaultDetail', { id: video.id }),
            },
          ]
        )
      } catch (err: any) {
        Alert.alert('Purchase failed', err.message || 'Please try again')
      }
    },
    [purchase, navigation]
  )

  // Download handler
  const handleDownload = useCallback(
    (video: RecordedVideo) =>
      navigation.navigate('ClassVaultDetail', { id: video.id }),
    [navigation]
  )

  // Delete handler (tutor only)
  const handleDelete = useCallback(
    (id: number) => {
      if (role !== 'tutor') return
      Alert.alert(
        'Delete Video',
        'Are you sure you want to delete this video and all files?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await remove(id)
              } catch {
                Alert.alert('Deletion failed')
              }
            },
          },
        ]
      )
    },
    [remove, role]
  )

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color={tw.color('softPink')} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <Text style={tw`text-red-500`}>{error}</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={tw`bg-gray-900 p-4`}>
      {/* Title */}
      <Text style={tw`text-2xl text-white font-bold mb-4 text-center`}>
        {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
      </Text>

      {/* Tabs */}
      <View
        style={tw`flex-row bg-gray-800 border border-gray-700 rounded-full p-1 mb-4 self-center`}
      >
        <TouchableOpacity
          onPress={() => setTab('videos')}
          style={tw.style(
            'px-4 py-2 rounded-full',
            tab === 'videos' && 'bg-gray-700'
          )}
        >
          <Text
            style={tw.style(
              'text-sm font-medium',
              tab === 'videos' ? 'text-white' : 'text-gray-400'
            )}
          >
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('notes')}
          style={tw.style(
            'px-4 py-2 rounded-full',
            tab === 'notes' && 'bg-gray-700'
          )}
        >
          <Text
            style={tw.style(
              'text-sm font-medium',
              tab === 'notes' ? 'text-white' : 'text-gray-400'
            )}
          >
            Class Notes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tutor empty state */}
      {role === 'tutor' && videos.length === 0 && (
        <View style={tw`bg-gray-800 p-3 rounded mb-4`}>
          <Text style={tw`text-white font-semibold text-center`}>
            Earn passive income—upload once and get paid every time a student purchases.
          </Text>
        </View>
      )}

      {/* VIDEOS: one per row */}
      {tab === 'videos' ? (
        videos.filter(v => !!v.video_url).length > 0 ? (
          videos
            .filter(v => !!v.video_url)
            .map(video => (
              <View key={video.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                {/* Title & meta */}
                <Text
                  style={tw`text-white font-semibold mb-1`}
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
                <Text style={tw`text-gray-400 mb-2`} numberOfLines={1}>
                  {video.subject} • Grade {video.grade_level}
                </Text>
                <Text style={tw`text-gray-400 mb-2`}>
                  Price: {video.price} tokens
                </Text>

                {/* Thumbnail & Play */}
                {!previewingId && video.thumbnail_url && (
                  <View style={tw`relative mt-3`}>
                    <Image
                      source={{ uri: `${backendUrl}${video.thumbnail_url}` }}
                      style={tw`w-full h-48 rounded-lg`}
                    />
                    <TouchableOpacity
                      onPress={() => setPreviewingId(video.id)}
                      style={tw`absolute inset-0 items-center justify-center`}
                    >
                      <FontAwesome5
                        name="play-circle"
                        size={48}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {previewingId === video.id && video.preview_url && (
                  <View style={tw`w-full h-48 rounded-lg overflow-hidden mt-3`}>
                    <Video
                      source={{ uri: `${backendUrl}${video.preview_url}` }}
                      style={tw`w-full h-full`}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                    />
                    <TouchableOpacity
                      onPress={() => setPreviewingId(null)}
                      style={tw`absolute top-2 right-2`}
                    >
                      <FontAwesome5
                        name="times-circle"
                        size={24}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action Button */}
                {role === 'tutor' ? (
                  <TouchableOpacity
                    onPress={() => handleDelete(video.id)}
                    style={tw`bg-red-600 py-2 rounded-lg mt-3`}
                  >
                    <Text style={tw`text-white text-center`}>Delete</Text>
                  </TouchableOpacity>
                ) : purchasedIds.has(video.id) ? (
                  <TouchableOpacity
                    onPress={() => handleDownload(video)}
                    style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                  >
                    <Text style={tw`text-white text-center font-medium`}>
                      Download
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handlePurchase(video)}
                    style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                  >
                    <Text style={tw`text-white text-center font-medium`}>
                      Purchase Access
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
        ) : (
          <View style={tw`items-center mt-8`}>
            <Text style={tw`text-gray-400 text-center mb-4`}>
              {role === 'tutor'
                ? 'No recorded videos yet.'
                : 'No available videos.'}
            </Text>
            {role === 'tutor' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClassVaultUpload')}
                style={tw`bg-gray-700 px-6 py-3 rounded-full`}
              >
                <Text style={tw`text-white font-semibold`}>
                  Upload Your First Class
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )
      ) : (
        // NOTES: two-column grid
        pdfRows.length > 0 ? (
          pdfRows.map((row, idx) => (
            <View key={idx} style={tw`flex-row justify-between mb-4`}>
              {row.map(pdf => (
                <View
                  key={pdf.id}
                  style={tw`flex-1 mx-1 bg-gray-800 p-4 rounded-lg`}
                >
                  <FontAwesome5
                    name="file-pdf"
                    size={48}
                    color="white"
                    style={tw`mb-2`}
                  />
                  <Text
                    style={tw`text-white font-semibold mb-1`}
                    numberOfLines={2}
                  >
                    {pdf.title}
                  </Text>
                  <Text style={tw`text-gray-400 mb-2`}>
                    Price: {pdf.price} tokens
                  </Text>

                  {role === 'tutor' ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(pdf.id)}
                      style={tw`bg-red-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center`}>Delete</Text>
                    </TouchableOpacity>
                  ) : purchasedIds.has(pdf.id) ? (
                    <TouchableOpacity
                      onPress={() =>
                        handleDownload(pdf as RecordedVideo)
                      }
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>
                        Download
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        handlePurchase(pdf as RecordedVideo)
                      }
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>
                        Purchase Access
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {row.length === 1 && <View style={tw`flex-1 mx-1`} />}
            </View>
          ))
        ) : (
          <View style={tw`items-center mt-8`}>
            <Text style={tw`text-gray-400 text-center mb-4`}>
              {role === 'tutor'
                ? 'No class notes uploaded yet.'
                : 'No class notes available.'}
            </Text>
            {role === 'tutor' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClassVaultUpload')}
                style={tw`bg-gray-700 px-6 py-3 rounded-full`}
              >
                <Text style={tw`text-white font-semibold`}>
                  Upload Your First Notes
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )
      )}

      {/* Always allow tutors to add another */}
      {role === 'tutor' && videos.length > 0 && (
        <View style={tw`items-center my-6`}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ClassVaultUpload')}
            style={tw`bg-gray-700 px-6 py-3 rounded-full`}
          >
            <Text style={tw`text-white font-semibold`}>Upload New Class</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}
