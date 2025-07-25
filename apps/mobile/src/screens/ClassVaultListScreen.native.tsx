// apps/mobile/src/screens/ClassVaultListScreen.native.tsx

import React, { useState, useCallback } from 'react'
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
import { useClassVault } from '@mytutorapp/shared/hooks'
import type { RecordedVideo } from '@mytutorapp/shared/types'

// 1. Define a clean type for the filters you care about
export interface ClassVaultFilters {
  category?: string[]
  ageGroup?: string[]
  // if you want to support other dims in future, add them here
}

// 2. Props for this screen: filters + optional clearFilters
interface ClassVaultListScreenProps {
  filters: ClassVaultFilters
  clearFilters?: () => void
}

export default function ClassVaultListScreen({
  filters,
  clearFilters,
}: ClassVaultListScreenProps) {
  const navigation = useNavigation<
    StackNavigationProp<MainStackParamList, 'ClassVaultLibrary'>
  >()
  const { role } = useShopContext()

  // 3. Derive the single-subject & single-grade from the arrays
  const chosenSubject = filters.category?.[0] ?? ''
  const chosenGrade   = filters.ageGroup?.[0]  ?? ''

  // 4. Call the filtering hook
  const {
    videos,
    filteredVideos,
    filteredPdfRows,
    purchasedIds,
    loading,
    error,
    refresh,
    purchase,
    remove,
  } = useClassVault(chosenSubject, chosenGrade)

  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'videos' | 'notes'>('videos')

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  // Handlers
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
            onPress: () => navigation.navigate('ClassVaultDetail', { id: video.id }),
          },
        ]
      )
    } catch (err: any) {
      if (err.message?.includes('Insufficient tokens')) {
        Alert.alert(
          'Insufficient Tokens',
          'You don’t have enough tokens to purchase this class. Would you like to buy more tokens?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Buy Tokens', onPress: () => navigation.navigate('BuyTokens') },
          ]
        )
      } else {
        Alert.alert('Purchase failed', err.message || 'Please try again')
      }
    }
  },
  [purchase, navigation]
)


  const handleDownload = useCallback(
    (video: RecordedVideo) =>
      navigation.navigate('ClassVaultDetail', { id: video.id }),
    [navigation]
  )

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

  // Loading & error
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

      {/* Tutor empty message */}
      {role === 'tutor' && videos.length === 0 && (
        <View style={tw`bg-gray-800 p-3 rounded mb-4`}>
          <Text style={tw`text-white font-semibold text-center`}>
            Earn passive income—upload once and get paid every time a student purchases.
          </Text>
        </View>
      )}

      {/* VIDEOS */}
      {tab === 'videos' ? (
        filteredVideos.length > 0 ? (
          filteredVideos.map(video => (
            <View key={video.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
              {/* Title & meta */}
              <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
                {video.title}
              </Text>
              <Text style={tw`text-gray-400 mb-2`} numberOfLines={1}>
                {video.subject} • Grade {video.grade_level}
              </Text>
              <Text style={tw`text-gray-400 mb-2`}>
                Price: {video.price} tokens
              </Text>

              {/* Thumbnail & Preview */}
              {!previewingId && video.thumbnail_url && (
                <View style={tw`relative mt-3`}>
                  <Image
                    source={{ uri: video.thumbnail_url! }}
                    style={tw`w-full h-48 rounded-lg`}
                  />
                  <TouchableOpacity
                    onPress={() => setPreviewingId(video.id)}
                    style={tw`absolute inset-0 items-center justify-center`}
                  >
                    <FontAwesome5 name="play-circle" size={48} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              {previewingId === video.id && video.preview_url && (
                <View style={tw`w-full h-48 rounded-lg overflow-hidden mt-3`}>
                  <Video
                    source={{ uri: video.preview_url! }}
                    style={tw`w-full h-full`}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                  />
                  <TouchableOpacity
                    onPress={() => setPreviewingId(null)}
                    style={tw`absolute top-2 right-2`}
                  >
                    <FontAwesome5 name="times-circle" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Actions */}
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
        // NOTES
        filteredPdfRows.length > 0 ? (
          filteredPdfRows.map((row, idx) => (
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
                  <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
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
                      onPress={() => handleDownload(pdf as RecordedVideo)}
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>
                        Download
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handlePurchase(pdf as RecordedVideo)}
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

      {/* Upload CTA */}
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
