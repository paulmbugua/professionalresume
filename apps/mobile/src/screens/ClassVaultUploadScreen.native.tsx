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
import useUploadClassVault, {
  CreateRecordedVideoPayload,
} from '@mytutorapp/shared/hooks/useUploadClassVault'

type MainStackParamList = { ClassVaultList: undefined }

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
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList>>()
  const { role, uploading, handleFileUpload, handleSubmitMetadata } =
    useUploadClassVault()

  // which type we're uploading
  const [fileType, setFileType] = useState<'video' | 'pdf'>('video')
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [progress, setProgress] = useState(0)

  // metadata fields
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [tags, setTags] = useState('')

  if (!role) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-gray-400`}>Checking permissions…</Text>
      </View>
    )
  }
  if (role !== 'tutor') {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
        <Text style={tw`text-white text-xl text-center`}>
          Access Denied{'\n'}Only tutors can upload content.
        </Text>
      </View>
    )
  }

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      })
      if (res.canceled) return
      const asset = res.assets[0]
      if (!asset) {
        Alert.alert('Upload failed', 'No file selected')
        return
      }
      const { uri, name, mimeType } = asset
      const { url } = await handleFileUpload(
        fileType,
        { uri, name, type: mimeType ?? 'application/octet-stream' },
        pct => setProgress(pct)
      )
      setUploadedUrl(url)
      setProgress(0)
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || String(err))
    }
  }

  const onSubmit = async () => {
    if (!title || !subject || !gradeLevel || !price || !uploadedUrl) {
      Alert.alert('Incomplete', 'Fill all fields and select your file.')
      return
    }
    const payload: CreateRecordedVideoPayload = {
      title,
      subject,
      grade_level: gradeLevel,
      price: Number(price),
      duration: duration ? Number(duration) : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      // always strings, never undefined:
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url:   fileType === 'pdf'   ? uploadedUrl : '',
    }

    try {
      await handleSubmitMetadata(payload)
      Alert.alert('Success', 'Content uploaded!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Submission failed', err.message || String(err))
    }
  }

  return (
    <ScrollView contentContainerStyle={tw`p-4 bg-gray-900`}>
      <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>
        Upload To Earn!
      </Text>

      {uploading && (
        <Text style={tw`text-center text-gray-300 mb-2`}>
          Uploading… {progress}%
        </Text>
      )}

      {/* Metadata */}
      <TextInput
        placeholder="Title"
        placeholderTextColor="#aaa"
        value={title}
        onChangeText={setTitle}
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker
          selectedValue={subject}
          onValueChange={setSubject}
          dropdownIconColor="#fff"
          style={tw`text-white`}
        >
          <Picker.Item label="Select Subject…" value="" />
          {SUBJECT_OPTIONS.map(s => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker
          selectedValue={gradeLevel}
          onValueChange={setGradeLevel}
          dropdownIconColor="#fff"
          style={tw`text-white`}
        >
          <Picker.Item label="Select Grade Level…" value="" />
          {GRADE_OPTIONS.map(g => (
            <Picker.Item key={g} label={g} value={g} />
          ))}
        </Picker>
      </View>

      <TextInput
        placeholder="Price in Tokens"
        placeholderTextColor="#aaa"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

      <TextInput
        placeholder="Duration (mins) — optional"
        placeholderTextColor="#aaa"
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

       {/* Tags */}
      <View style={tw`mb-3`}>
        <TextInput
          placeholder="Tags (comma-separated)"
          placeholderTextColor="#aaa"
          value={tags}
          onChangeText={setTags}
          style={tw`bg-gray-800 p-3 rounded text-white`}
        />
        <Text style={tw`text-gray-400 text-xs mt-1`}>
          Add keywords to help students find your class. For example:{' '}
          <Text style={tw`text-pink-400`}>fractions, addition, grade1</Text>
        </Text>
      </View>

      {/* Toggle: Video or Class Notes */}
      <View style={tw`flex-row items-center justify-center mb-4`}>
        <TouchableOpacity
          onPress={() => {
            setFileType('video')
            setUploadedUrl('')
          }}
          style={tw.style(
            'px-4 py-2 rounded',
            'bg-gray-700',
            fileType === 'video' && 'bg-pink-400'
          )}
        >
          <Text style={tw.style(
            'font-medium',
            fileType === 'video' ? 'text-white' : 'text-gray-300'
          )}>
            Video
          </Text>
        </TouchableOpacity>

        <Text style={tw`mx-3 text-gray-400 font-medium`}>or</Text>

        <TouchableOpacity
          onPress={() => {
            setFileType('pdf')
            setUploadedUrl('')
          }}
          style={tw.style(
            'px-4 py-2 rounded',
            'bg-gray-700',
            fileType === 'pdf' && 'bg-pink-400'
          )}
        >
          <Text style={tw.style(
            'font-medium',
            fileType === 'pdf' ? 'text-white' : 'text-gray-300'
          )}>
            Class Notes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        onPress={pickFile}
        disabled={uploading}
        style={tw`bg-gray-800 p-3 rounded flex-row items-center mb-4`}
      >
        <FontAwesome5
          name="cloud-upload-alt"
          size={18}
          color="white"
          style={tw`mr-2`}
        />
        <Text style={tw`text-white`}>
          {uploadedUrl
            ? `✅ ${fileType === 'video' ? 'Video Selected' : 'PDF Selected'}`
            : `Select ${fileType === 'video' ? 'Video' : 'PDF'}`}
        </Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={uploading}
        style={tw`bg-pink-500 p-4 rounded`}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-center font-semibold`}>
            Submit ClassVault
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}
