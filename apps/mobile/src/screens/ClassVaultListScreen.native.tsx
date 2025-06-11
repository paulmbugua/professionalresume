// apps/mobile/src/screens/ClassVaultListScreen.native.tsx

import React, { useState, useEffect } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { MainStackParamList } from '../navigation/types'
import { FontAwesome5 } from '@expo/vector-icons'
import { useShopContext } from '@mytutorapp/shared/context'
import { fetchAllVideos, deleteVideoById } from '@mytutorapp/shared/api/classVaultApi'
import type { RecordedVideo } from '@mytutorapp/shared/types'
import { Video, ResizeMode } from 'expo-av'
import tw from '../../tailwind'

export default function ClassVaultListScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>()
  const { role } = useShopContext()

  const [videos, setVideos] = useState<RecordedVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadVideos = async () => {
    setLoading(true)
    try {
      setVideos(await fetchAllVideos())
    } catch {
      setError('Failed to load videos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVideos() }, [])

  const handleDelete = (id: number) => {
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
            try { await deleteVideoById(id); loadVideos() }
            catch { Alert.alert('Deletion failed') }
          },
        },
      ],
    )
  }

  const handlePurchase = (video: RecordedVideo) => {
    Alert.alert(
      'Purchase Video',
      `Purchase "${video.title}" for ${video.price} tokens?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => {/* purchase logic */} },
      ]
    )
  }

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#f472b6" />
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

  // Empty state
  if (videos.length === 0) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900 p-4`}>
        <Text style={tw`text-gray-400 text-center`}>
          {role === 'tutor'
            ? 'No recorded videos found.'
            : 'No available classes at the moment.'}
        </Text>

        {role === 'tutor' && (
          <>
            <Text style={tw`text-white text-center mt-4`}>
              Upload once, earn forever—start building your passive income.
            </Text>
            <TouchableOpacity
              style={tw`bg-pink-500 p-3 mt-4 rounded`}
              onPress={() => navigation.navigate('ClassVaultUpload')}
            >
              <Text style={tw`text-white text-center`}>
                Upload Your First Class
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={tw`p-4 gap-4 bg-gray-900`}>
      {/* Screen Title */}
      <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
        {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
      </Text>

      {/* Persuasive Banners */}
      {role === 'tutor' && (
        <View style={tw`bg-blue-800 p-3 rounded mb-4`}>
          <Text style={tw`text-white font-semibold text-center`}>
            Earn passive income—upload once and get paid every time a student purchases.
          </Text>
        </View>
      )}
      {role !== 'tutor' && (
        <View style={tw`bg-green-800 p-3 rounded mb-4`}>
          <Text style={tw`text-white font-semibold text-center`}>
            Boost your learning—purchase on-demand classes and master new topics at your pace.
          </Text>
        </View>
      )}

      {/* Video Cards */}
      {videos.map((video) => (
        <View key={video.id} style={tw`bg-gray-800 rounded-lg p-4 gap-2`}>
          <Text style={tw`text-white text-lg font-semibold}`}>
            {video.title}
          </Text>
          <Text style={tw`text-gray-400`}>
            {video.subject} • Grade {video.grade_level}
          </Text>
          <Text style={tw`text-pink-400`}>Price: {video.price} tokens</Text>

          {video.thumbnail_url && (
            <Image
              source={{ uri: video.thumbnail_url }}
              style={tw`w-full h-40 rounded mt-2`}
              resizeMode="cover"
            />
          )}

          {video.preview_url && (
            <Video
              source={{ uri: video.preview_url }}
              style={tw`w-full h-40 mt-2 rounded`}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}

          {role === 'tutor' ? (
            <TouchableOpacity
              onPress={() => handleDelete(video.id)}
              style={tw`bg-red-600 p-3 mt-3 rounded`}
            >
              <Text style={tw`text-white text-center`}>Delete</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handlePurchase(video)}
              style={tw`bg-green-600 p-3 mt-3 rounded`}
            >
              <Text style={tw`text-white text-center`}>Purchase Access</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  )
}
