// apps/mobile/src/screens/ClassVaultUploadScreen.native.tsx

import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
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

const SUBJECT_OPTIONS = [ 'Maths','Science','Programming','Art & Design','Languages','Wellness', ] as const
const GRADE_OPTIONS   = [ 'Pre-Primary','Lower Primary','Upper Primary','High School','University/College','Adults', ] as const

export default function ClassVaultUploadScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>()
  const {
    role,
    uploading: uploadingMeta,
    handleFileUpload,
    handleSubmitMetadata,
  } = useUploadClassVault()

  // file-upload state
  const [fileType,      setFileType]      = useState<'video'|'pdf'>('video')
  const [uploadedUrl,   setUploadedUrl]   = useState('')
  const [progress,      setProgress]      = useState(0)
  const [uploadingFile, setUploadingFile] = useState(false)

  // animated value for bar width
  const animatedProgress = useRef(new Animated.Value(0)).current

  // metadata fields
  const [title,      setTitle]      = useState('')
  const [subject,    setSubject]    = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [price,      setPrice]      = useState('')
  const [duration,   setDuration]   = useState('')
  const [tags,       setTags]       = useState('')

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
      const asset = res.assets[0]!
      const { uri, name, mimeType } = asset

      // reset
      setProgress(0)
      animatedProgress.setValue(0)
      setUploadedUrl('')
      setUploadingFile(true)

      const { url } = await handleFileUpload(
        fileType,
        { uri, name, type: mimeType ?? 'application/octet-stream' },
        pct => {
          setProgress(pct)
          // animate to new pct over 200ms
          Animated.timing(animatedProgress, {
            toValue: pct,
            duration: 200,
            useNativeDriver: false,
          }).start()
        }
      )

      setProgress(100)
      Animated.timing(animatedProgress, {
        toValue: 100,
        duration: 200,
        useNativeDriver: false,
      }).start()
      setUploadedUrl(url)
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || String(err))
      setProgress(0)
      animatedProgress.setValue(0)
      setUploadedUrl('')
    } finally {
      setUploadingFile(false)
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
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url:   fileType === 'pdf'   ? uploadedUrl : '',
    }

    try {
      await handleSubmitMetadata(payload)
      Alert.alert('Success', 'Content uploaded!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
      // reset
      setProgress(0)
      animatedProgress.setValue(0)
      setUploadedUrl('')
    } catch (err: any) {
      Alert.alert('Submission failed', err.message || String(err))
    }
  }

  const widthInterpolate = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  })

  return (
    <ScrollView contentContainerStyle={tw`p-4 bg-gray-900`}>
      {/* Header */}
      <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>
        Upload To Earn!
      </Text>

      {/* Metadata Inputs */}
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
        placeholder="Price in Tokens (1 Token=10Kshs)"
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
      <View style={tw`mb-3`}>
        <TextInput
          placeholder="Tags (comma-separated)"
          placeholderTextColor="#aaa"
          value={tags}
          onChangeText={setTags}
          style={tw`bg-gray-800 p-3 rounded text-white`}
        />
        <Text style={tw`text-gray-400 text-xs mt-1`}>
          Add keywords… <Text style={tw`text-pink-400`}>fractions, addition, grade1</Text>
        </Text>
      </View>

      {/* File Type Toggle */}
      <View style={tw`flex-row items-center justify-center mb-4`}>
        <TouchableOpacity
          onPress={() => { setFileType('video'); setUploadedUrl(''); setProgress(0); animatedProgress.setValue(0) }}
          style={tw.style('px-4 py-2 rounded','bg-gray-700',fileType==='video'&&'bg-pink-400')}
        >
          <Text style={tw.style('font-medium', fileType==='video'?'text-white':'text-gray-300')}>
            Video
          </Text>
        </TouchableOpacity>
        <Text style={tw`mx-3 text-gray-400 font-medium`}>or</Text>
        <TouchableOpacity
          onPress={() => { setFileType('pdf'); setUploadedUrl(''); setProgress(0); animatedProgress.setValue(0) }}
          style={tw.style('px-4 py-2 rounded','bg-gray-700',fileType==='pdf'&&'bg-pink-400')}
        >
          <Text style={tw.style('font-medium', fileType==='pdf'?'text-white':'text-gray-300')}>
            Class Notes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Select File Button */}
      <TouchableOpacity
        onPress={pickFile}
        disabled={uploadingFile}
        style={tw`bg-gray-800 p-3 rounded flex-row items-center mb-2`}
      >
        <FontAwesome5 name="cloud-upload-alt" size={18} color="white" style={tw`mr-2`} />
        <Text style={tw`text-white`}>
          {uploadedUrl
            ? `✅ ${fileType==='video'?'Video Selected':'PDF Selected'}`
            : `Select ${fileType==='video'?'Video':'PDF'}`}
        </Text>
      </TouchableOpacity>

      {/* Animated Progress Bar */}
      {uploadingFile && (
        <View style={tw`mb-4`}>
          <Text style={tw`text-center text-gray-300 mb-1`}>
            Uploading… {progress}%
          </Text>
          <View style={[{ height: 6, width: '100%', backgroundColor: '#444', borderRadius: 3 }]}>
            <Animated.View
              style={{
                height: '100%',
                backgroundColor: '#F472B6',
                borderRadius: 3,
                width: widthInterpolate,
              }}
            />
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={onSubmit}
        disabled={uploadingMeta}
        style={tw`bg-pink-500 p-4 rounded`}
      >
        {uploadingMeta ? (
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
