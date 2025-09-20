// apps/mobile/src/screens/ClassVaultUploadScreen.native.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import tw from '../../tailwind';
import useUploadClassVault, {
  CreateRecordedVideoPayload,
} from '@mytutorapp/shared/hooks/useUploadClassVault';

import type { MainStackParamList } from '../navigation/types';

// Match web SUBJECT_OPTIONS exactly
const SUBJECT_OPTIONS = [
  'Math',
  'Science',
  'English',
  'History',
  'Programming',
  'Art & Design',
  'Languages',
  'Wellness',
] as const;

const GRADE_OPTIONS = [
  'Pre-Primary',
  'Lower Primary',
  'Upper Primary',
  'High School',
  'University/College',
  'Adults',
] as const;

type FileKind = 'video' | 'pdf';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default function ClassVaultUploadScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { role, uploading: uploadingMeta, handleFileUpload, handleSubmitMetadata } = useUploadClassVault();

  const [fileType, setFileType] = useState<FileKind>('video');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  // metadata fields
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [tags, setTags] = useState<string>('');

  if (role === null) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-gray-400`}>Checking permissions…</Text>
      </View>
    );
  }
  if (role !== 'tutor') {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
        <Text style={tw`text-white text-xl text-center`}>
          Access Denied{'\n'}Only tutors can upload content.
        </Text>
      </View>
    );
  }

  const pickFile = async (): Promise<void> => {
    try {
      // Restrict to the selected kind (parity with web accept attr)
      const typeFilter = fileType === 'video' ? ['video/*'] : ['application/pdf'];
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: typeFilter,
        multiple: false,
      });

      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) {
        Alert.alert('Upload failed', 'No file selected');
        return;
      }

      const { uri, name, mimeType } = asset;
      const { url } = await handleFileUpload(
        fileType,
        { uri, name, type: mimeType ?? (fileType === 'video' ? 'video/*' : 'application/pdf') },
        (pct: number) => setProgress(pct)
      );

      setUploadedUrl(url);
      setProgress(100);
      // Optional: small delay to show 100% before resetting to 0 on field changes
    } catch (err: unknown) {
      Alert.alert('Upload failed', getErrorMessage(err));
      setProgress(0);
      setUploadedUrl('');
    }
  };

  const onSubmit = async (): Promise<void> => {
    if (!title || !subject || !gradeLevel || !price || !uploadedUrl) {
      Alert.alert('Incomplete', 'Fill all required fields and select your file.');
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      Alert.alert('Invalid price', 'Price should be a positive number.');
      return;
    }
    const durationNum = duration ? Number(duration) : undefined;
    if (duration && (!Number.isFinite(durationNum!) || durationNum! < 0)) {
      Alert.alert('Invalid duration', 'Duration must be a non-negative number.');
      return;
    }

    const payload: CreateRecordedVideoPayload = {
      title,
      subject,
      grade_level: gradeLevel,
      price: priceNum,
      duration: durationNum,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url: fileType === 'pdf' ? uploadedUrl : '',
    };

    try {
      await handleSubmitMetadata(payload);
      Alert.alert('Success', 'Content uploaded!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setProgress(0);
      setUploadedUrl('');
    } catch (err: unknown) {
      Alert.alert('Submission failed', getErrorMessage(err));
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`p-4 bg-gray-900`}>
      <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>
        Upload To Earn!
      </Text>

      {progress > 0 && progress < 100 && (
        <Text style={tw`text-center text-gray-300 mb-2`}>Uploading… {progress}%</Text>
      )}

      {/* Title */}
      <TextInput
        placeholder="Title"
        placeholderTextColor="#aaa"
        value={title}
        onChangeText={setTitle}
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

      {/* Subject */}
      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker selectedValue={subject} onValueChange={setSubject} dropdownIconColor="#fff" style={tw`text-white`}>
          <Picker.Item label="Select Subject…" value="" />
          {SUBJECT_OPTIONS.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      {/* Grade Level */}
      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker selectedValue={gradeLevel} onValueChange={setGradeLevel} dropdownIconColor="#fff" style={tw`text-white`}>
          <Picker.Item label="Select Grade Level…" value="" />
          {GRADE_OPTIONS.map((g) => (
            <Picker.Item key={g} label={g} value={g} />
          ))}
        </Picker>
      </View>

      {/* Price */}
      <TextInput
        placeholder="Price in Tokens (1 Token = $1)"
        placeholderTextColor="#aaa"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

      {/* Duration */}
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
          onPress={() => { setFileType('video'); setUploadedUrl(''); setProgress(0); }}
          style={tw.style('px-4 py-2 rounded', 'bg-gray-700', fileType === 'video' && 'bg-pink-400')}
        >
          <Text style={tw.style('font-medium', fileType === 'video' ? 'text-white' : 'text-gray-300')}>Video</Text>
        </TouchableOpacity>

        <Text style={tw`mx-3 text-gray-400 font-medium`}>or</Text>

        <TouchableOpacity
          onPress={() => { setFileType('pdf'); setUploadedUrl(''); setProgress(0); }}
          style={tw.style('px-4 py-2 rounded', 'bg-gray-700', fileType === 'pdf' && 'bg-pink-400')}
        >
          <Text style={tw.style('font-medium', fileType === 'pdf' ? 'text-white' : 'text-gray-300')}>Class Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Upload Button */}
      <TouchableOpacity onPress={pickFile} disabled={uploadingMeta} style={tw`bg-gray-800 p-3 rounded flex-row items-center mb-4`}>
        <FontAwesome5 name="cloud-upload-alt" size={18} color="white" style={tw`mr-2`} />
        <Text style={tw`text-white`}>
          {uploadedUrl
            ? `✅ ${fileType === 'video' ? 'Video Selected' : 'PDF Selected'}`
            : `Select ${fileType === 'video' ? 'Video' : 'PDF'}`}
        </Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity onPress={onSubmit} disabled={uploadingMeta} style={tw`bg-pink-500 p-4 rounded`}>
        {uploadingMeta ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-center font-semibold`}>Submit ClassVault</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
