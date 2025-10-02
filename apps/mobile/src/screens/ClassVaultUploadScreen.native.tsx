// apps/mobile/src/screens/ClassVaultUploadScreen.native.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../../tailwind';
import useUploadClassVault, {
  CreateRecordedVideoPayload,
} from '@mytutorapp/shared/hooks/useUploadClassVault';
import { COUNTRIES } from '@mytutorapp/shared/utils/countries';

import type { MainStackParamList } from '../navigation/types';

/* ────────────────────── Subject categories (minimal) ────────────────────── */
const SUBJECT_CATEGORIES = [
  'Mathematics',
  'Sciences',
  'Languages',
  'Arts',
  'Social Studies',
  'Technology & Computing',
  'Business & Economics',
  'Wellness & PE',
] as const;

type FileKind = 'video' | 'pdf';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message as string;
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function deriveAutoTags(country: string, subject: string, gradeLevel: string): string[] {
  const tags: string[] = [];
  if (country) tags.push(`country:${country}`);
  if (subject) tags.push(`subject:${subject}`);
  if (gradeLevel.trim()) {
    const g = slugify(gradeLevel);
    if (g) tags.push(`grade:${g}`);
  }
  return tags;
}

export default function ClassVaultUploadScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { role, uploading: uploadingMeta, handleFileUpload, handleSubmitMetadata } = useUploadClassVault();

  // file-upload
  const [fileType, setFileType] = useState<FileKind>('video');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  // metadata (simplified)
  const [country, setCountry] = useState<string>('');              // iso2 lower-case
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<(typeof SUBJECT_CATEGORIES)[number] | ''>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');        // manual text
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('');            // optional minutes
  const [tags, setTags] = useState<string>('');                    // user tags

  // Countries from shared util
  const countries = useMemo(
  () =>
    (Array.isArray(COUNTRIES) ? COUNTRIES : [])
      .map((c: any) => {
        const raw = String(c?.code ?? c?.iso2 ?? c?.alpha2 ?? c?.id ?? '').trim();
        const name = String(c?.name ?? c?.label ?? c?.country ?? c?.title ?? '').trim();
        return { code: raw.toLowerCase(), label: name };
      })
      .filter(c => c.code && c.label),
  []
);


  useEffect(() => {
  if (!country && countries.length > 0) {
    setCountry(countries[0]?.code ?? '');
  }
}, [countries, country]);


  if (role === null) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-900 items-center justify-center`}>
        <Text style={tw`text-gray-400`}>Checking permissions…</Text>
      </SafeAreaView>
    );
  }
  if (role !== 'tutor') {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-900 items-center justify-center p-4`}>
        <Text style={tw`text-white text-xl text-center`}>
          Access Denied{'\n'}Only tutors can upload content.
        </Text>
      </SafeAreaView>
    );
  }

  const pickFile = async (): Promise<void> => {
    try {
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

      setProgress(1); // start indicator

      const { url } = await handleFileUpload({
        fileType,
        file: {
          uri,
          name,
          type: mimeType ?? (fileType === 'video' ? 'video/*' : 'application/pdf'),
        },
        onProgress: (pct: number) => setProgress(Math.max(1, Math.min(99, Math.floor(pct)))),
      });

      setUploadedUrl(url);
      setProgress(100);
    } catch (err: unknown) {
      Alert.alert('Upload failed', getErrorMessage(err));
      setProgress(0);
      setUploadedUrl('');
    }
  };

  const onSubmit = async (): Promise<void> => {
    if (!country || !title || !subject || !gradeLevel.trim() || !price || !uploadedUrl) {
      Alert.alert('Incomplete', 'Fill all required fields (Country, Title, Subject, Grade/Level, Price, File).');
      return;
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      Alert.alert('Invalid price', 'Price should be a positive number (tokens).');
      return;
    }

    const durationNum = duration ? Number(duration) : undefined;
    if (duration && (!Number.isFinite(durationNum!) || durationNum! < 0)) {
      Alert.alert('Invalid duration', 'Duration must be a non-negative number of minutes.');
      return;
    }

    const userTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const auto = deriveAutoTags(country, subject || '', gradeLevel);
    const tagSet = Array.from(new Set([...userTags, ...auto]));

    const payload: CreateRecordedVideoPayload = {
      title,
      subject,
      grade_level: gradeLevel, // manual human label
      price: priceNum,
      duration: durationNum,
      tags: tagSet,
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url: fileType === 'pdf' ? uploadedUrl : '',
    };

    try {
      await handleSubmitMetadata(payload);
      Alert.alert('Success', 'Content uploaded!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      setProgress(0);
      setUploadedUrl('');
    } catch (err: unknown) {
      Alert.alert('Submission failed', getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-900`}>
      <ScrollView
        contentContainerStyle={[
          tw`px-4 pt-4`,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 }, // comfy gap above home bar
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.select({ ios: 'on-drag', android: 'none' })}
      >
        <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>
          Upload To Earn!
        </Text>

        {/* Uploading indicator */}
        {progress > 0 && progress < 100 && (
          <Text style={tw`text-center text-gray-300 mb-2`}>Uploading… {progress}%</Text>
        )}

        {/* Country */}
        <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
          <Picker
          selectedValue={country}
          onValueChange={(v) => setCountry(String(v))}
          dropdownIconColor="#fff"
          style={tw`text-white`}
        >
          {countries.length === 0 && <Picker.Item label="Loading countries…" value="" />}
          {countries.length > 0 && <Picker.Item label="Select Country…" value="" />}
          {countries.map((c) => (
            <Picker.Item key={c.code} label={c.label} value={c.code} />
          ))}
        </Picker>

        </View>

        {/* Title */}
        <TextInput
          placeholder="Title *"
          placeholderTextColor="#aaa"
          value={title}
          onChangeText={setTitle}
          style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
        />

        {/* Subject Category */}
        <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
          <Picker
            selectedValue={subject}
            onValueChange={(v) => setSubject(v as (typeof SUBJECT_CATEGORIES)[number])}
            dropdownIconColor="#fff"
            style={tw`text-white`}
          >
            <Picker.Item label="Select Subject Category…" value="" />
            {SUBJECT_CATEGORIES.map((s) => (
              <Picker.Item key={s} label={s} value={s} />
            ))}
          </Picker>
        </View>

        {/* Grade / Level (manual) */}
        <TextInput
          placeholder="Grade / Level *  (e.g., Primary 5, Year 10, A-Levels, University)"
          placeholderTextColor="#aaa"
          value={gradeLevel}
          onChangeText={setGradeLevel}
          style={tw`bg-gray-800 p-3 rounded text-white mb-1`}
        />
        <Text style={tw`text-gray-400 text-xs mb-3`}>
          We’ll auto-add a tag like <Text style={tw`text-pink-400`}>grade:{slugify(gradeLevel) || '…'}</Text>
        </Text>

        {/* Price */}
        <TextInput
          placeholder="Price in Tokens (1 Token = $1) *"
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

        {/* Tags (user) */}
        <View style={tw`mb-3`}>
          <TextInput
            placeholder="Tags (comma-separated)"
            placeholderTextColor="#aaa"
            value={tags}
            onChangeText={setTags}
            style={tw`bg-gray-800 p-3 rounded text-white`}
          />
          <Text style={tw`text-gray-400 text-xs mt-1`}>
            Auto-tags:{' '}
            <Text style={tw`text-pink-400`}>country:{country || '…'}</Text>
            {subject ? <Text style={tw`text-pink-400`}> , subject:{subject}</Text> : null}
            {gradeLevel.trim() ? <Text style={tw`text-pink-400`}> , grade:{slugify(gradeLevel)}</Text> : null}
          </Text>
        </View>

        {/* File kind toggle */}
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
        <TouchableOpacity
          onPress={pickFile}
          disabled={uploadingMeta}
          style={tw`bg-gray-800 p-3 rounded flex-row items-center mb-4`}
        >
          <FontAwesome5 name="cloud-upload-alt" size={18} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white`}>
            {uploadedUrl
              ? `✅ ${fileType === 'video' ? 'Video Selected' : 'PDF Selected'}`
              : `Select ${fileType === 'video' ? 'Video' : 'PDF'}`}
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          disabled={uploadingMeta}
          style={[
            tw`bg-pink-500 p-4 rounded mb-2`,
            uploadingMeta && tw`opacity-60`,
          ]}
        >
          {uploadingMeta ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-center font-semibold`}>Submit ClassVault</Text>
          )}
        </TouchableOpacity>

        {/* Bottom safe-area spacer (extra cushion) */}
        <View style={{ height: Math.max(insets.bottom, 16) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
