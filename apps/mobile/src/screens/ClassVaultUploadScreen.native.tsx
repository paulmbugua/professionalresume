// apps/mobile/src/screens/ClassVaultUploadScreen.native.tsx

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Picker } from '@react-native-picker/picker'
import { FontAwesome5 } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import tw from '../../tailwind'
import { useShopContext } from '@mytutorapp/shared/context'
import { uploadClassVaultAsset } from '@mytutorapp/shared/api/classVaultUploadApi'
import { createVideoJson } from '@mytutorapp/shared/api/classVaultApi'
import type { MainStackParamList } from '../navigation/types'
import type { ClassVaultMetadata } from '@mytutorapp/shared/hooks/useUploadClassVault'

type UploadResult = { url: string }

interface SelectedFile {
  uri: string
  name: string
  type: string
}

const SUBJECT_OPTIONS = [
  'Math',
  'Science',
  'English',
  'History',
  'Programming',
  'Art & Design',
  'Languages',
  'Wellness',
] as const

const GRADE_OPTIONS = [
  'Pre-Primary',
  'Lower Primary',
  'Upper Primary',
  'High School',
  'University/College',
  'Adults',
] as const

export default function ClassVaultUploadScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>()
  const { role } = useShopContext()

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [tags, setTags] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')

  if (role !== 'tutor') {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
        <Text style={tw`text-white text-xl text-center`}>
          Access Denied{'\n'}Only tutors can upload class videos.
        </Text>
      </View>
    )
  }

  const uploadHandler = async (fileType: 'video' | 'pdf') => {
    setUploading(true)
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      })

      if (res.canceled) {
        return
      }

      const asset = res.assets[0]
      if (!asset) {
        Alert.alert('Upload failed', 'No file selected')
        return
      }

      const file: SelectedFile = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      }

      const { url }: UploadResult = await uploadClassVaultAsset(
        file,
        fileType,
        (pct) => setProgress(pct),
      )

      if (fileType === 'video') {
        setVideoUrl(url)
      } else {
        setPdfUrl(url)
      }

      setProgress(0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      Alert.alert('Upload failed', message)
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async () => {
    if (!title || !subject || !gradeLevel || !price || !videoUrl) {
      Alert.alert('Incomplete', 'Please fill required fields and upload the video.')
      return
    }

    const metadata: ClassVaultMetadata = {
      title,
      subject,
      grade_level: gradeLevel,
      price,
      duration: duration || undefined,
      tags: tags.split(',').map((t) => t.trim()),
      video_url: videoUrl,
      pdf_url: pdfUrl || undefined,
    }

    setUploading(true)
    try {
      await createVideoJson(metadata)
      Alert.alert('Success', 'ClassVault video created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      Alert.alert('Submission failed', message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={tw`p-4 gap-4 bg-gray-900`}>
      <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>
        Upload To Earn!
      </Text>

      {uploading && (
        <Text style={tw`text-center text-gray-300`}>
          Uploading… {progress}%
        </Text>
      )}

      {/* Title */}
      <TextInput
        placeholder="Title"
        placeholderTextColor="#aaa"
        value={title}
        onChangeText={setTitle}
        style={tw`bg-gray-800 p-3 rounded text-white`}
      />

      {/* Subject Picker */}
      <View style={tw`bg-gray-800 rounded`}>
        <Picker
          selectedValue={subject}
          onValueChange={setSubject}
          dropdownIconColor="#fff"
          style={tw`text-white`}
        >
          <Picker.Item label="Select Subject…" value="" />
          {SUBJECT_OPTIONS.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      {/* Grade Level Picker */}
      <View style={tw`bg-gray-800 rounded`}>
        <Picker
          selectedValue={gradeLevel}
          onValueChange={setGradeLevel}
          dropdownIconColor="#fff"
          style={tw`text-white`}
        >
          <Picker.Item label="Select Grade Level…" value="" />
          {GRADE_OPTIONS.map((g) => (
            <Picker.Item key={g} label={g} value={g} />
          ))}
        </Picker>
      </View>

      {/* Price */}
      <View>
        <Text style={tw`text-gray-400 text-sm mb-1`}>
          Enter tokens (1 token = Ksh 10)
        </Text>
        <TextInput
          placeholder="Price in Tokens"
          placeholderTextColor="#aaa"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={tw`bg-gray-800 p-3 rounded text-white`}
        />
      </View>

      {/* Duration & Tags */}
      <TextInput
        placeholder="Duration (mins)"
        placeholderTextColor="#aaa"
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        style={tw`bg-gray-800 p-3 rounded text-white`}
      />
      <TextInput
        placeholder="Tags (comma-separated)"
        placeholderTextColor="#aaa"
        value={tags}
        onChangeText={setTags}
        style={tw`bg-gray-800 p-3 rounded text-white`}
      />

      {/* Upload Buttons */}
      {(['video', 'pdf'] as const).map((t) => {
        const url = t === 'video' ? videoUrl : pdfUrl
        const label = t === 'video' ? 'Upload Video File' : 'Upload Class Notes (PDF)'
        return (
          <TouchableOpacity
            key={t}
            onPress={() => uploadHandler(t)}
            disabled={uploading}
            style={tw`bg-gray-800 p-3 rounded`}
          >
            <View style={tw`flex-row items-center`}>
              <FontAwesome5
                name="cloud-upload-alt"
                size={18}
                color="white"
                style={tw`mr-2`}
              />
              <Text style={tw`text-white`}>{url ? `✅ ${label}` : label}</Text>
            </View>
          </TouchableOpacity>
        )
      })}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={uploading}
        style={tw`bg-pink-500 p-4 rounded mt-4`}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-center`}>Submit ClassVault</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}
