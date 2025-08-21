// apps/mobile/src/screens/CreateCourse.native.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import tw from '../../tailwind';

import { useCourses } from '@mytutorapp/shared/hooks/useCourses';
import { useShopContext } from '@mytutorapp/shared/context';
import useUploadClassVault from '@mytutorapp/shared/hooks/useUploadClassVault';
import type { CoursePayload, SyllabusItem } from '@mytutorapp/shared/types';

const steps = ['Basic Info', 'Details', 'Syllabus', 'Review'] as const;

// Parse "8 weeks", "8w", "8" → clamp 1..52
function parseWeeks(input: string): number {
  const m = String(input || '').match(/(\d{1,2})/);
  const n = m ? Number(m[1]) : 0;
  return Math.max(1, Math.min(52, Number.isFinite(n) ? n : 1));
}

// Safe tutorId extractor (supports user_id | userId | id)
function deriveTutorId(profile: unknown): number {
  if (profile && typeof profile === 'object') {
    const p = profile as { user_id?: unknown; userId?: unknown; id?: unknown };
    const tryNum = (v: unknown) => (typeof v === 'number' ? v : undefined);
    const tryStr = (v: unknown) =>
      typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined;

    return (
      tryNum(p.user_id) ??
      tryNum(p.userId) ??
      tryNum(p.id) ??
      tryStr(p.user_id) ??
      tryStr(p.userId) ??
      tryStr(p.id) ??
      0
    );
  }
  return 0;
}

// Map picked file to the uploader shape
function toClassVaultFile(uri: string, name: string, mimeType?: string | null) {
  const lower = name.toLowerCase();
  return {
    uri,
    name,
    type: mimeType || (lower.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
  };
}

export default function CreateCourseScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { backendUrl, token, profile } = useShopContext();
  const { addCourse, loading, error } = useCourses({ backendUrl, token });
  const { handleFileUpload, uploading } = useUploadClassVault();

  // Per-upload progress keyed as "v-<index>" or "n-<index>"
  const [uploadPct, setUploadPct] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);

  // Keep a concrete syllabus array to avoid "possibly undefined"
  const [formData, setFormData] = useState<CoursePayload>({
    tutorId: deriveTutorId(profile),
    title: '',
    description: '',
    level: 'Beginner',
    duration: '',
    price: 0,
    prerequisites: '',
    syllabus: [],
  });

  // Sync tutorId if profile loads later
  useEffect(() => {
    const tid = deriveTutorId(profile);
    if (tid && tid !== formData.tutorId) {
      setFormData((prev) => ({ ...prev, tutorId: tid }));
    }
  }, [profile, formData.tutorId]);

  // Keep syllabus length in sync with duration
  useEffect(() => {
    const weeks = parseWeeks(formData.duration ?? '');
    setFormData((prev) => {
      const current = prev.syllabus ?? [];
      const trimmed = current.slice(0, weeks).map((s, i) => ({ ...s, week: i + 1 }));
      const next: SyllabusItem[] = [...trimmed];
      for (let i = trimmed.length; i < weeks; i++) {
        next.push({ week: i + 1, topic: '', assignment: '' });
      }
      return { ...prev, syllabus: next };
    });
  }, [formData.duration]);

  // Helpers
  const setField = (field: keyof CoursePayload, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChange = (field: keyof CoursePayload, value: string) => {
    if (field === 'price') {
      const n = Number(value);
      setField('price', Number.isFinite(n) ? n : 0);
      return;
    }
    setField(field, value);
  };

  const handleSyllabusChange = (index: number, field: keyof SyllabusItem, value: string) => {
    setFormData((prev) => {
      const base = prev.syllabus ?? [];
      const next = base.map((w, i) => (i === index ? { ...w, [field]: value } : w));
      return { ...prev, syllabus: next };
    });
  };

  // Pick & upload helpers
  const pickFile = async (
    type: 'video' | 'pdf'
  ): Promise<{ uri: string; name: string; mimeType?: string | null } | null> => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: type === 'video' ? 'video/*' : 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return null;
      const asset = res.assets?.[0];
      if (!asset) return null;
      return { uri: asset.uri, name: asset.name ?? 'file', mimeType: asset.mimeType };
    } catch {
      Alert.alert('File picker error', 'Unable to select a file.');
      return null;
    }
  };

  // Smoothed percentage for UI (avoid flashing 100% before link appears)
  const displayPctFor = (key: string) => {
    const raw = uploadPct[key] ?? 0;
    if (raw > 0 && raw < 100) return Math.min(Math.round(raw), 97);
    return Math.round(raw);
  };

  const handleVideoPickAndUpload = async (index: number) => {
    const picked = await pickFile('video');
    if (!picked) return;
    try {
      const onProgress = (p: number) =>
        setUploadPct((prev) => ({ ...prev, [`v-${index}`]: p }));
      const result = await handleFileUpload({
        fileType: 'video',
        file: toClassVaultFile(picked.uri, picked.name, picked.mimeType),
        onProgress,
      });
      setFormData((prev) => {
        const base = prev.syllabus ?? [];
        const next = base.map((w, i) => (i === index ? { ...w, videoUrl: result.url } : w));
        return { ...prev, syllabus: next };
      });
    } catch {
      Alert.alert('Upload failed', 'Video upload failed. Please try again.');
    } finally {
      setUploadPct((prev) => ({ ...prev, [`v-${index}`]: 0 }));
    }
  };

  const handleNotesPickAndUpload = async (index: number) => {
    const picked = await pickFile('pdf');
    if (!picked) return;
    try {
      const onProgress = (p: number) =>
        setUploadPct((prev) => ({ ...prev, [`n-${index}`]: p }));
      const result = await handleFileUpload({
        fileType: 'pdf',
        file: toClassVaultFile(picked.uri, picked.name, picked.mimeType),
        onProgress,
      });
      setFormData((prev) => {
        const base = prev.syllabus ?? [];
        const next = base.map((w, i) => (i === index ? { ...w, notesUrl: result.url } : w));
        return { ...prev, syllabus: next };
      });
    } catch {
      Alert.alert('Upload failed', 'Notes upload failed. Please try again.');
    } finally {
      setUploadPct((prev) => ({ ...prev, [`n-${index}`]: 0 }));
    }
  };

  // Global file upload aggregation (disable nav/submit while any upload in progress)
  const inProgressKeys = Object.keys(uploadPct).filter((k) => (uploadPct[k] ?? 0) > 0);
  const overallUploadPct =
    inProgressKeys.length === 0
      ? 0
      : Math.round(
          inProgressKeys.reduce((acc, k) => acc + Math.min(uploadPct[k] ?? 0, 100), 0) /
            inProgressKeys.length
        );
  const fileUploading = uploading || inProgressKeys.length > 0;

  // Submit
  const handleSubmit = async () => {
    try {
      const payload: CoursePayload = {
        ...formData,
        tutorId: formData.tutorId || deriveTutorId(profile),
        syllabus: (formData.syllabus ?? []).map((s, i) => ({ ...s, week: i + 1 })),
      };
      await addCourse(payload);

      // reset to Step 0 so tutor can add another course quickly
      setFormData({
        tutorId: deriveTutorId(profile),
        title: '',
        description: '',
        level: 'Beginner',
        duration: '',
        price: 0,
        prerequisites: '',
        syllabus: [],
      });
      setUploadPct({});
      setStep(0);

      Alert.alert('Success', 'Course created successfully!');
    } catch {
      Alert.alert('Error', 'Failed to create course');
    }
  };

  const canNext = useMemo(() => {
    if (step === 0) return formData.title.trim().length > 3 && !!formData.description?.trim();
    if (step === 1) return parseWeeks(formData.duration ?? '') >= 1 && formData.price >= 0;
    if (step === 2)
      return (formData.syllabus ?? []).some(
        (w) =>
          (w.topic?.trim().length ?? 0) > 0 ||
          (w.assignment?.trim().length ?? 0) > 0 ||
          (w.videoUrl?.trim().length ?? 0) > 0 ||
          (w.notesUrl?.trim().length ?? 0) > 0
      );
    return true;
  }, [step, formData]);

  // UI helpers
  const inputBase = 'border rounded px-3 py-2 mb-3';
  const input = tw`${inputBase} ${
    isDark ? 'bg-[#172534] text-white border-[#2b3a4a]' : 'bg-white text-black border-gray-300'
  }`;
  const sectionCard = tw`rounded-lg ${
    isDark ? 'bg-[#0f1821] border-[#2b3a4a]' : 'bg-white border-gray-200'
  } border p-3 mb-3`;
  const pill = (active: boolean) =>
    tw`px-3 py-1 rounded-full ${active ? 'bg-blue-600' : isDark ? 'bg-[#1c2a3b]' : 'bg-gray-200'}`;

  return (
    <ScrollView style={tw`p-4 ${isDark ? 'bg-[#0b121a]' : 'bg-slate-50'}`}>
      {/* Header */}
      <Text style={tw`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
        Create a New Course
      </Text>

      {/* Global upload bar */}
      {fileUploading && (
        <View
          style={tw`rounded border p-3 mb-3 ${
            isDark ? 'bg-[#1b2a3a] border-[#2b3a4a]' : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text
              style={tw`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}
              accessibilityLiveRegion="polite"
            >
              Uploading files… {overallUploadPct}%
            </Text>
            <ActivityIndicator size="small" color={isDark ? '#eab308' : '#2563eb'} />
          </View>
          <View style={tw`w-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded overflow-hidden`}>
            <View
              style={[
                tw`h-full`,
                { backgroundColor: '#2563eb', width: `${overallUploadPct}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Step indicators */}
      <View style={tw`flex-row justify-between mb-4`}>
        {steps.map((label, idx) => (
          <View key={label} style={tw`flex-1 items-center`}>
            <View style={pill(idx <= step)}>
              <Text style={tw`${isDark || idx <= step ? 'text-white' : 'text-black'} text-xs`}>
                {label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <View>
          <TextInput
            placeholder="Course Title"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            value={formData.title}
            onChangeText={(v) => handleChange('title', v)}
            style={input}
          />
          <TextInput
            placeholder="Description"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            value={formData.description ?? ''}
            onChangeText={(v) => handleChange('description', v)}
            style={input}
            multiline
            textAlignVertical="top"
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <TextInput
            placeholder="Level (Beginner / Intermediate / Advanced / All Levels)"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            value={formData.level}
            onChangeText={(v) => handleChange('level', v)}
            style={input}
          />
        </View>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <View>
          <TextInput
            placeholder="Duration (e.g., 8 weeks)"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            value={formData.duration ?? ''}
            onChangeText={(v) => handleChange('duration', v)}
            style={input}
          />
          <TextInput
            placeholder="Price"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            keyboardType="numeric"
            value={String(formData.price)}
            onChangeText={(v) => handleChange('price', v)}
            style={input}
          />
          <TextInput
            placeholder="Prerequisites"
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            value={formData.prerequisites ?? ''}
            onChangeText={(v) => handleChange('prerequisites', v)}
            style={input}
            multiline
            textAlignVertical="top"
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Tip: type “8 weeks”, “8weeks”, or “8w”. The syllabus will auto-size.
          </Text>
        </View>
      )}

      {/* Step 2: Syllabus */}
      {step === 2 && (
        <View>
          <Text style={tw`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Syllabus for <Text style={tw`font-semibold`}>{parseWeeks(formData.duration ?? '')}</Text>{' '}
            week{parseWeeks(formData.duration ?? '') === 1 ? '' : 's'} (auto-sized from duration)
          </Text>

          {(formData.syllabus ?? []).map((item, index) => (
            <View key={index} style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Week {item.week}
              </Text>

              <TextInput
                placeholder="Topic (e.g., Limits & Continuity)"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={item.topic ?? ''}
                onChangeText={(v) => handleSyllabusChange(index, 'topic', v)}
                style={input}
              />

              <TextInput
                placeholder="Assignment (e.g., Problem Set 1)"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={item.assignment ?? ''}
                onChangeText={(v) => handleSyllabusChange(index, 'assignment', v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
                style={[input, tw`min-h-28`]}
              />

              {/* Video: URL or Upload */}
              <TextInput
                placeholder="Optional: Video URL (YouTube/Vimeo/MP4)"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={item.videoUrl ?? ''}
                onChangeText={(v) => handleSyllabusChange(index, 'videoUrl', v)}
                style={input}
              />
              <TouchableOpacity
                onPress={() => handleVideoPickAndUpload(index)}
                disabled={fileUploading}
                style={tw`px-3 py-2 rounded ${fileUploading ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                <Text style={tw`text-white text-center`}>
                  {fileUploading ? 'Uploading…' : 'Upload Video'}
                </Text>
              </TouchableOpacity>
              {(uploadPct[`v-${index}`] ?? 0) > 0 && (
                <Text style={tw`mt-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Uploading… {displayPctFor(`v-${index}`)}%
                </Text>
              )}
              {!!item.videoUrl && (
                <Text style={tw`mt-1 text-xs text-blue-600`}>Video set ✓</Text>
              )}

              {/* Notes: URL or Upload PDF */}
              <TextInput
                placeholder="Optional: Notes URL (PDF/Doc)"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={item.notesUrl ?? ''}
                onChangeText={(v) => handleSyllabusChange(index, 'notesUrl', v)}
                style={input}
              />
              <TouchableOpacity
                onPress={() => handleNotesPickAndUpload(index)}
                disabled={fileUploading}
                style={tw`px-3 py-2 rounded ${fileUploading ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                <Text style={tw`text-white text-center`}>
                  {fileUploading ? 'Uploading…' : 'Upload Notes (PDF)'}
                </Text>
              </TouchableOpacity>
              {(uploadPct[`n-${index}`] ?? 0) > 0 && (
                <Text style={tw`mt-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Uploading… {displayPctFor(`n-${index}`)}%
                </Text>
              )}
              {!!item.notesUrl && (
                <Text style={tw`mt-1 text-xs text-blue-600`}>Notes set ✓</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Step 3: Review */}
      {step === 3 && (() => {
        const cleanSyllabus = (formData.syllabus ?? [])
          .filter(
            (s) =>
              (s.topic?.trim().length ?? 0) > 0 ||
              (s.assignment?.trim().length ?? 0) > 0 ||
              (s.videoUrl?.trim().length ?? 0) > 0 ||
              (s.notesUrl?.trim().length ?? 0) > 0
          )
          .map((s, i) => ({ ...s, week: i + 1 }));

        const priceFmt = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'USD',
        }).format(Number(formData.price || 0));

        return (
          <View>
            <Text style={tw`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
              Review
            </Text>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Title</Text>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'} font-medium`}>
                {formData.title || '—'}
              </Text>
            </View>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Level</Text>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'} font-medium`}>
                {formData.level}
              </Text>
            </View>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Duration</Text>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'} font-medium`}>
                {formData.duration || '—'}
              </Text>
            </View>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Price in USD
              </Text>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'} font-medium`}>{priceFmt}</Text>
            </View>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Prerequisites
              </Text>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'}`}>
                {formData.prerequisites || '—'}
              </Text>
            </View>

            <View style={sectionCard}>
              <Text style={tw`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                Syllabus ({cleanSyllabus.length} week{cleanSyllabus.length === 1 ? '' : 's'})
              </Text>

              {cleanSyllabus.length === 0 ? (
                <Text style={tw`${isDark ? 'text-white' : 'text-black'}`}>—</Text>
              ) : (
                cleanSyllabus.map((w) => (
                  <View key={w.week} style={tw`mb-2`}>
                    <Text style={tw`${isDark ? 'text-white' : 'text-black'} font-medium`}>
                      {w.topic || 'Untitled topic'}
                    </Text>
                    {!!w.assignment && (
                      <Text style={tw`${isDark ? 'text-gray-300' : 'text-gray-700'} text-xs`}>
                        Assignment: {w.assignment}
                      </Text>
                    )}
                    {!!w.videoUrl && (
                      <Text style={tw`${isDark ? 'text-gray-300' : 'text-gray-700'} text-xs`}>
                        Video: {w.videoUrl}
                      </Text>
                    )}
                    {!!w.notesUrl && (
                      <Text style={tw`${isDark ? 'text-gray-300' : 'text-gray-700'} text-xs`}>
                        Notes: {w.notesUrl}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        );
      })()}

      {/* Navigation */}
      <View style={tw`flex-row justify-between mt-4`}>
        {step > 0 ? (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={tw`px-4 py-2 rounded ${isDark ? 'bg-[#1c2a3b]' : 'bg-gray-200'}`}
          >
            <Text style={tw`${isDark ? 'text-white' : 'text-black'}`}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {step < steps.length - 1 ? (
          <TouchableOpacity
            onPress={() => canNext && setStep(step + 1)}
            disabled={!canNext || fileUploading}
            style={tw`px-4 py-2 rounded ${canNext && !fileUploading ? 'bg-blue-600' : 'bg-gray-400'}`}
          >
            <Text style={tw`text-white`}>{fileUploading ? 'Uploading…' : 'Next'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || fileUploading || !formData.tutorId}
            style={tw`px-4 py-2 rounded ${
              loading || fileUploading || !formData.tutorId ? 'bg-gray-400' : 'bg-green-600'
            }`}
          >
            <Text style={tw`text-white`}>
              {fileUploading ? 'Uploading…' : loading ? 'Saving…' : 'Create Course'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={tw`mt-3 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{String(error)}</Text>
      )}
    </ScrollView>
  );
}
