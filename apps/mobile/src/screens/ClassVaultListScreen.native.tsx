// apps/mobile/src/screens/ClassVaultListScreen.native.tsx

import React, { useState, useMemo } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { FontAwesome5 } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import tw from '../../tailwind'
import { useShopContext } from '@mytutorapp/shared/context'
import { deleteVideoById } from '@mytutorapp/shared/api/classVaultApi'
import { useClassVault } from '@mytutorapp/shared/hooks/useClassVault'
import type { RecordedVideo } from '@mytutorapp/shared/types'
import type { MainStackParamList } from '../navigation/types'

// ——— MediaCard —————————————————————————————
interface MediaCardProps {
  thumbnailUrl?: string
  previewUrl?: string
  isPreviewing: boolean
  onPressPlay: () => void
  onPressClose: () => void
}
function MediaCard({
  thumbnailUrl,
  previewUrl,
  isPreviewing,
  onPressPlay,
  onPressClose,
}: MediaCardProps) {
  return (
    <View>
      {!isPreviewing && thumbnailUrl && (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          <TouchableOpacity onPress={onPressPlay} style={styles.playOverlay}>
            <FontAwesome5 name="play-circle" size={48} color={tw.color('softPink')} />
          </TouchableOpacity>
        </View>
      )}
      {isPreviewing && previewUrl && (
        <View style={styles.previewWrapper}>
          <Video
            source={{ uri: previewUrl }}
            style={styles.previewVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
          />
          <TouchableOpacity onPress={onPressClose} style={styles.closeOverlay}>
            <FontAwesome5 name="times-circle" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ——— PdfCard ———————————————————————————————
interface PdfCardProps {
  title: string
  price: number
  onPurchase: () => void
  onDelete?: () => void
  isTutor: boolean
}
function PdfCard({ title, price, onPurchase, onDelete, isTutor }: PdfCardProps) {
  return (
    <View style={styles.cardContainer}>
      <FontAwesome5
        name="file-pdf"
        size={48}
        color={tw.color('softPink')}
        style={tw`mb-2`}
      />
      <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
        {title}
      </Text>
      <Text style={tw`text-softPink mb-2`}>Price: {price} tokens</Text>
      {isTutor ? (
        <TouchableOpacity onPress={onDelete} style={tw`bg-red-600 py-2 rounded-lg`}>
          <Text style={tw`text-white text-center`}>Delete</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onPurchase} style={tw`bg-green-600 py-2 rounded-lg`}>
          <Text style={tw`text-white text-center`}>Purchase</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// —————————————————————————————————————————————

export default function ClassVaultLibraryScreen() {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'ClassVaultLibrary'>>()
  const { role, backendUrl } = useShopContext()
  const { videos, loading, error, purchase, refresh, chunk } = useClassVault()

  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'videos' | 'notes'>('videos')

  // split & chunk into rows of 2
  const videoClasses = useMemo(() => videos.filter((v) => !!v.video_url), [videos])
  const pdfClasses = useMemo(() => videos.filter((v) => !!v.pdf_url), [videos])
  const videoRows = useMemo(() => chunk(videoClasses, 2), [videoClasses, chunk])
  const pdfRows = useMemo(() => chunk(pdfClasses, 2), [pdfClasses, chunk])

  // — Delete (tutor only)
  const handleDelete = (id: number) =>
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class and all files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVideoById(backendUrl, id)
            refresh()
          },
        },
      ]
    )

  // — Purchase (student only)
  const handlePurchase = (video: RecordedVideo) =>
    Alert.alert(
      'Confirm Purchase',
      `Purchase "${video.title}" for ${video.price} tokens?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              const { video_url, pdf_url } = await purchase(video)
              navigation.navigate('ClassVaultDetail', { id: video.id })
            } catch (err: any) {
              Alert.alert('Purchase failed', err.message || String(err))
            }
          },
        },
      ]
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
    <ScrollView contentContainerStyle={tw`p-4 bg-gray-900`}>
      {/* ─── Tab Toggle ─────────────────── */}
      <View
        style={tw`flex-row bg-gray-800 border border-gray-700 rounded-full p-1 mb-4 self-center`}
      >
        <TouchableOpacity
          onPress={() => setTab('videos')}
          style={tw.style('px-4 py-2 rounded-full', tab === 'videos' && 'bg-softPink')}
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
          style={tw.style('px-4 py-2 rounded-full', tab === 'notes' && 'bg-softPink')}
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

      {/* ─── Video Rows ─────────────────── */}
      {tab === 'videos' &&
        (videoRows.length ? (
          videoRows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((video) => {
                const thumb = video.thumbnail_url
                  ? `${backendUrl}${video.thumbnail_url}`
                  : undefined
                const prev = video.preview_url
                  ? `${backendUrl}${video.preview_url}`
                  : undefined

                return (
                  <View key={video.id} style={styles.cardContainer}>
                    <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text style={tw`text-gray-400 mb-2`} numberOfLines={1}>
                      {video.subject} • Grade {video.grade_level}
                    </Text>
                    <Text style={tw`text-softPink mb-2`}>
                      Price: {video.price} tokens
                    </Text>

                    <MediaCard
                      thumbnailUrl={thumb}
                      previewUrl={prev}
                      isPreviewing={previewingId === video.id}
                      onPressPlay={() => setPreviewingId(video.id)}
                      onPressClose={() => setPreviewingId(null)}
                    />

                    {role === 'tutor' ? (
                      <TouchableOpacity
                        onPress={() => handleDelete(video.id)}
                        style={tw`bg-red-600 py-2 rounded-lg mt-3`}
                      >
                        <Text style={tw`text-white text-center`}>Delete</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handlePurchase(video)}
                        style={tw`bg-green-600 py-2 rounded-lg mt-3`}
                      >
                        <Text style={tw`text-white text-center`}>Purchase Access</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })}
              {row.length === 1 && <View style={styles.cardContainer} />}
            </View>
          ))
        ) : (
          <Text style={tw`text-gray-400 text-center mt-8`}>
            {role === 'tutor'
              ? 'No recorded videos yet.'
              : 'No available videos.'}
          </Text>
        ))}

      {/* ─── PDF Rows ───────────────────── */}
      {tab === 'notes' &&
        (pdfRows.length ? (
          pdfRows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((pdf) => (
                <PdfCard
                  key={pdf.id}
                  title={pdf.title}
                  price={pdf.price}
                  isTutor={role === 'tutor'}
                  onDelete={() => handleDelete(pdf.id)}
                  onPurchase={() => handlePurchase(pdf as RecordedVideo)}
                />
              ))}
              {row.length === 1 && <View style={styles.cardContainer} />}
            </View>
          ))
        ) : (
          <Text style={tw`text-gray-400 text-center mt-8`}>
            {role === 'tutor'
              ? 'No class notes uploaded yet.'
              : 'No class notes available.'}
          </Text>
        ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch', // force equal height
    marginBottom: 16,
  },
  cardContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between', // pin button to bottom
    marginHorizontal: 4,
    backgroundColor: '#1F2937', // bg-gray-800
    padding: 16,
    borderRadius: 8,
  },
  mediaContainer: {
    position: 'relative',
    marginTop: 12,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  playOverlay: {
    position: 'absolute',
    top: '45%',
    left: '45%',
  },
  previewWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  closeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
})
