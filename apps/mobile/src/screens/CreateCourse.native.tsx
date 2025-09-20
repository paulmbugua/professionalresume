/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import tw from '../../tailwind';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ⬇️ switch to Expo's picker (works out of the box with Expo)
import * as DocumentPicker from 'expo-document-picker';

import { useCourses } from '@mytutorapp/shared/hooks/useCourses';
import { useShopContext } from '@mytutorapp/shared/context';
import type { CoursePayload, SyllabusItem } from '@mytutorapp/shared/types';
import { uploadClassVaultAsset } from '@mytutorapp/shared/api/classVaultUploadApi';

/* ------------------------------- constants ------------------------------- */

const steps = ['Basic Info', 'Details', 'Syllabus', 'Review'] as const;
const DRAFT_KEY = 'mt_create_course_draft_v1_native';

/* ------------------------------- helpers -------------------------------- */

function parseWeeks(input: string): number {
  const m = String(input || '').match(/(\d{1,2})/);
  const n = m ? Number(m[1]) : 0;
  return Math.max(1, Math.min(52, Number.isFinite(n) ? n : 1));
}

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

type CreateCourseDraft = {
  step: number;
  priceInput: string;
  formData: CoursePayload;
  freeCourse?: boolean;
};
const isDraft = (obj: unknown): obj is CreateCourseDraft => {
  if (!obj || typeof obj !== 'object') return false;
  const d = obj as any;
  return typeof d.step === 'number' && typeof d.priceInput === 'string' && d.formData && typeof d.formData === 'object';
};

type EditableSyllabusField = 'topic' | 'assignment' | 'videoUrl' | 'notesUrl';

/* --------------------------- small UI bits --------------------------- */

const SectionCard: React.FC<{ title?: string; children?: React.ReactNode; pad?: boolean }> = ({ title, children, pad = true }) => (
  <View style={tw`rounded-2xl border border-gray-200 bg-white ${pad ? 'p-4' : ''}`}>
    {!!title && <Text style={tw`text-base font-semibold mb-2`}>{title}</Text>}
    {children}
  </View>
);

const Row: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[tw`flex-row items-center`, style]}>{children}</View>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={tw`text-sm font-medium text-gray-800`}>{children}</Text>
);

const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor="#8aa0b6"
    {...props}
    style={[
      tw`w-full rounded-xl border border-gray-200 bg-[#f6f8fb] px-3 py-3 text-gray-900`,
      props.style,
    ]}
  />
);

/* ----------------------------- main screen ---------------------------- */

const CreateCourseNative: React.FC = () => {
  const { backendUrl, token, profile } = useShopContext() as any;
  const { addCourse, loading, error } = useCourses({ backendUrl, token });

  const [uploadPct, setUploadPct] = useState<Record<string, number>>({});
  const [step, setStep] = useState<number>(0);

  const [priceInput, setPriceInput] = useState<string>('');
  const [freeCourse, setFreeCourse] = useState<boolean>(false);

  const [formData, setFormData] = useState<CoursePayload>({
    tutorId: deriveTutorId(profile),
    title: '',
    description: '',
    level: 'Beginner',
    duration: '',
    price: 0, // tokens
    prerequisites: '',
    syllabus: [],
  });

  /* ------------------------- upload progress helpers ------------------------- */
  const setCappedPct = (key: string, pct: number) =>
    setUploadPct((prev) => ({
      ...prev,
      [key]: Math.min(95, Math.max(prev[key] ?? 0, Math.round(pct))),
    }));

  const markUploadDone = (key: string) => {
    setUploadPct((prev) => ({ ...prev, [key]: 100 }));
    setTimeout(() => setUploadPct((prev) => ({ ...prev, [key]: 0 })), 600);
  };

  /* ---------------------------- load draft (mount) --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!isDraft(parsed)) return;

        const resolvedTutorId = deriveTutorId(profile);
        const fd = parsed.formData as CoursePayload;
        const mergedForm: CoursePayload = {
          ...fd,
          tutorId: resolvedTutorId || fd.tutorId || 0,
          syllabus: Array.isArray(fd.syllabus) ? fd.syllabus : [],
        };

        setFormData(mergedForm);
        setPriceInput(parsed.priceInput);
        setStep(Number.isFinite(parsed.step) ? parsed.step : 0);
        setFreeCourse(Boolean(parsed.freeCourse));
      } catch {
        // ignore corrupt draft
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------- keep tutorId in sync -------------------------- */
  useEffect(() => {
    const tid = deriveTutorId(profile);
    if (tid && tid !== formData.tutorId) {
      setFormData((prev) => ({ ...prev, tutorId: tid }));
    }
  }, [profile, formData.tutorId]);

  /* ------------------------- auto-size syllabus weeks ------------------------ */
  useEffect(() => {
    const weeks = parseWeeks(formData.duration ?? '');
    setFormData((prev) => {
      const current = prev.syllabus ?? [];
      const trimmed = current.slice(0, weeks).map((s, i) => ({ ...s, week: i + 1 }));
      const next: SyllabusItem[] = [...trimmed];
      for (let i = trimmed.length; i < weeks; i++) next.push({ week: i + 1, topic: '', assignment: '' });
      return { ...prev, syllabus: next };
    });
  }, [formData.duration]);

  /* ------------------------------ persist draft ----------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const draft: CreateCourseDraft = { step, priceInput, formData, freeCourse };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // storage may be full/blocked
      }
    })();
  }, [step, priceInput, formData, freeCourse]);

  /* -------------------------------- handlers -------------------------------- */

  const handleField = (key: 'title' | 'description' | 'level' | 'duration' | 'prerequisites', val: string) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSyllabusChange = (index: number, field: EditableSyllabusField, value: string) => {
    setFormData((prev) => {
      const base = prev.syllabus ?? [];
      const next = base.map((w, i) => (i === index ? { ...w, [field]: value } : w));
      return { ...prev, syllabus: next };
    });
  };

  const guardUpload = () => {
    if (!backendUrl || !token) {
      Alert.alert('Upload blocked', 'Missing backend URL or auth token.');
      return false;
    }
    return true;
  };

  // Normalize Expo document picker result → RN upload object
  const toRNFile = (asset: {
    uri: string;
    name?: string | null;
    size?: number | null;
    mimeType?: string | null;
  }) => {
    const name = asset.name || `upload${asset.size ? `-${asset.size}` : ''}`;
    const type = asset.mimeType || 'application/octet-stream';
    return { uri: asset.uri, name, type } as any;
  };

  // Generic single-file picker
  const pickOne = async (kind: 'video' | 'pdf') => {
    const res = await DocumentPicker.getDocumentAsync({
      type: kind === 'video' ? 'video/*' : 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
      // iOS/Android supported; presentationStyle ignored on Android
      // Note: no need for Platform check here
    });
    if (res.canceled) return null;
    // SDKs differ slightly; prefer first asset if present, else the object itself
    const asset = Array.isArray((res as any).assets) ? (res as any).assets[0] : (res as any);
    if (!asset?.uri) return null;
    return asset as { uri: string; name?: string; size?: number; mimeType?: string };
  };

  const pickAndUploadVideo = async (index: number) => {
    if (!guardUpload()) return;
    try {
      const asset = await pickOne('video');
      if (!asset) return; // user canceled
      const key = `v-${index}`;
      const onProgress = (p: number) => setCappedPct(key, p);
      const rnFile = toRNFile(asset);
      const { url } = await uploadClassVaultAsset(backendUrl!, token!, rnFile, 'video', onProgress, { folder: 'courses' });
      setFormData((prev) => {
        const base = prev.syllabus ?? [];
        const next = base.map((w, i) => (i === index ? { ...w, videoUrl: url } : w));
        return { ...prev, syllabus: next };
      });
      markUploadDone(key);
    } catch (e: any) {
      console.warn('[CreateCourse.native] video upload failed', e);
      Alert.alert('Upload failed', 'Video upload failed. Please try again.');
      setUploadPct((prev) => ({ ...prev, [`v-${index}`]: 0 }));
    }
  };

  const pickAndUploadPdf = async (index: number) => {
    if (!guardUpload()) return;
    try {
      const asset = await pickOne('pdf');
      if (!asset) return; // user canceled
      const key = `n-${index}`;
      const onProgress = (p: number) => setCappedPct(key, p);
      const rnFile = toRNFile(asset);
      const { url } = await uploadClassVaultAsset(backendUrl!, token!, rnFile, 'pdf', onProgress, { folder: 'courses' });
      setFormData((prev) => {
        const base = prev.syllabus ?? [];
        const next = base.map((w, i) => (i === index ? { ...w, notesUrl: url } : w));
        return { ...prev, syllabus: next };
      });
      markUploadDone(key);
    } catch (e: any) {
      console.warn('[CreateCourse.native] notes upload failed', e);
      Alert.alert('Upload failed', 'Notes upload failed. Please try again.');
      setUploadPct((prev) => ({ ...prev, [`n-${index}`]: 0 }));
    }
  };

  /* --------------------------- upload indicators ---------------------------- */

  const fileUploading = useMemo(
    () => Object.values(uploadPct).some((p) => (p ?? 0) > 0 && (p ?? 0) < 100),
    [uploadPct]
  );

  const overallUploadPct = useMemo(() => {
    const vals = Object.values(uploadPct)
      .map((p) => p ?? 0)
      .filter((p) => p > 0 && p <= 100);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [uploadPct]);

  /* --------------------------------- submit -------------------------------- */

  const handleSubmit = async () => {
    if (!formData.tutorId) {
      Alert.alert('Missing tutor', 'Please sign in again.');
      return;
    }

    let tokensToSend = 0;
    if (!freeCourse) {
      const trimmed = priceInput.trim();
      const parsed = trimmed === '' ? NaN : Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        Alert.alert('Invalid price', 'Enter a non-negative whole number of tokens, or mark the course as Free.');
        return;
      }
      tokensToSend = parsed;
    }

    const cleanSyllabus = (formData.syllabus ?? [])
      .filter(
        (s) =>
          (s.topic?.trim().length ?? 0) > 0 ||
          (s.assignment?.trim().length ?? 0) > 0 ||
          (s.videoUrl?.trim().length ?? 0) > 0 ||
          (s.notesUrl?.trim().length ?? 0) > 0
      )
      .map((s, i) => ({ ...s, week: i + 1 }));

    const payload: CoursePayload = {
      ...formData,
      price: tokensToSend,
      syllabus: cleanSyllabus,
    };

    try {
      await addCourse(payload);
      try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
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
      setFreeCourse(false);
      setPriceInput('');
      setUploadPct({});
      setStep(0);
      Alert.alert('Success', 'Course created successfully!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create course.';
      console.error('[CreateCourse.native] submit error', err);
      Alert.alert('Error', msg);
    }
  };

  /* ------------------------------ validation ------------------------------- */

  const canNext = useMemo(() => {
    if (step === 0) {
      return formData.title.trim().length > 3 && !!formData.description?.trim();
    }
    if (step === 1) {
      const weeksOk = parseWeeks(formData.duration ?? '') >= 1;
      if (freeCourse) return weeksOk;
      const trimmed = priceInput.trim();
      const parsed = trimmed === '' ? NaN : Number(trimmed);
      const priceOk = Number.isFinite(parsed) && parsed >= 0 && Number.isInteger(parsed);
      return weeksOk && priceOk;
    }
    if (step === 2) {
      return (formData.syllabus ?? []).some(
        (w) =>
          (w.topic?.trim().length ?? 0) > 0 ||
          (w.assignment?.trim().length ?? 0) > 0 ||
          (w.videoUrl?.trim().length ?? 0) > 0 ||
          (w.notesUrl?.trim().length ?? 0) > 0
      );
    }
    return true;
  }, [step, formData, priceInput, freeCourse]);

  const tokensForDisplay =
    freeCourse
      ? 0
      : priceInput.trim() !== '' && Number.isFinite(Number(priceInput))
      ? Number(priceInput)
      : formData.price;

  const priceFmtTokens = `${Number(tokensForDisplay || 0)} Tokens (≈ $${Number(tokensForDisplay || 0)} USD)`;
  const progressPct = ((step + 1) / steps.length) * 100;

  const clearDraft = async () => {
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
    setPriceInput('');
    setFreeCourse(false);
    setFormData((prev) => ({
      ...prev,
      title: '',
      description: '',
      level: 'Beginner',
      duration: '',
      prerequisites: '',
      syllabus: [],
    }));
    setStep(0);
  };

  /* --------------------------------- render -------------------------------- */

  return (
    <View style={tw`flex-1 bg-[#f1f5f9]`}>
      {/* Header */}
      <View style={tw`px-4 py-3 border-b border-gray-200 bg-white`}>
        <Row style={tw`justify-between`}>
          <Row style={tw`gap-3`}>
            <View style={tw`h-9 w-9 rounded-xl bg-blue-600 items-center justify-center`}>
              <Text style={tw`text-white font-bold`}>📘</Text>
            </View>
            <View>
              <Text style={tw`text-lg font-extrabold text-gray-900`}>Create a New Course</Text>
              <Text style={tw`text-xs text-gray-500`}>
                Autosaves locally •{' '}
                <Text onPress={clearDraft} style={tw`underline`}>
                  Clear draft
                </Text>
              </Text>
            </View>
          </Row>

          {/* Tiny stepper badges */}
          <Row style={tw`gap-2`}>
            {steps.map((_, idx) => {
              const active = idx === step;
              const done = idx < step;
              return (
                <View
                  key={idx}
                  style={tw.style(
                    'h-7 w-7 rounded-full items-center justify-center',
                    done ? 'bg-emerald-600' : active ? 'bg-blue-600' : 'bg-gray-300'
                  )}
                >
                  <Text style={tw`text-white text-xs font-bold`}>{idx + 1}</Text>
                </View>
              );
            })}
          </Row>
        </Row>

        {/* Progress bar */}
        <View style={tw`mt-3 h-1 rounded bg-gray-200 overflow-hidden`}>
          <View style={[tw`h-full bg-blue-600`, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={tw`px-4 py-6 gap-6`}>
        <SectionCard pad>
          {/* Mobile step label */}
          <Text style={tw`mb-3 text-sm font-medium text-gray-700`}>{steps[step]}</Text>

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <View style={tw`gap-4`}>
              <View>
                <Label>Course Title</Label>
                <Input
                  value={formData.title}
                  onChangeText={(t) => handleField('title', t)}
                  placeholder="e.g., Calculus I: Limits to Derivatives"
                />
              </View>

              <View>
                <Label>Description</Label>
                <Input
                  value={formData.description ?? ''}
                  onChangeText={(t) => handleField('description', t)}
                  placeholder="What will learners achieve? Who is it for?"
                  multiline
                  numberOfLines={5}
                  style={tw`min-h-28`}
                />
              </View>

              <View>
                <Label>Level</Label>
                <Input
                  value={formData.level}
                  onChangeText={(t) => handleField('level', t)}
                  placeholder="Beginner | Intermediate | Advanced | All Levels"
                />
              </View>
            </View>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <View style={tw`gap-4`}>
              <View>
                <Label>Duration</Label>
                <Input
                  value={formData.duration ?? ''}
                  onChangeText={(t) => handleField('duration', t)}
                  placeholder="e.g., 8 weeks"
                />
                <Text style={tw`text-xs text-gray-500 mt-1`}>
                  Tip: type “8 weeks”, “8weeks”, or “8w”. We’ll size the syllabus automatically.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  const next = !freeCourse;
                  setFreeCourse(next);
                  if (next) setPriceInput('');
                }}
                style={tw`flex-row items-start gap-3 rounded-xl border border-gray-200 bg-[#f6f8fb] p-3`}
              >
                <View style={tw.style('h-5 w-5 rounded-md', freeCourse ? 'bg-emerald-600' : 'bg-white border border-gray-300')} />
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-medium text-gray-900`}>This is a free course</Text>
                  <Text style={tw`text-xs text-gray-600`}>
                    Learners enroll at no cost. Price will be saved as <Text style={tw`font-semibold`}>0 Tokens</Text>.
                  </Text>
                </View>
              </TouchableOpacity>

              <View>
                <Label>
                  Price (Tokens) {freeCourse ? <Text style={tw`text-xs`}> (disabled for Free)</Text> : null}
                </Label>
                <Input
                  value={freeCourse ? '' : priceInput}
                  onChangeText={setPriceInput}
                  placeholder={freeCourse ? 'Free course selected' : 'e.g., 5 (Tokens)'}
                  editable={!freeCourse}
                  keyboardType="number-pad"
                />
                <Text style={tw`text-xs text-gray-500 mt-1`}>1 Token = 1 USD (whole numbers).</Text>
              </View>

              <View>
                <Label>Prerequisites (optional)</Label>
                <Input
                  value={formData.prerequisites ?? ''}
                  onChangeText={(t) => handleField('prerequisites', t)}
                  placeholder="e.g., Basic algebra, comfort with functions"
                  multiline
                  numberOfLines={4}
                  style={tw`min-h-24`}
                />
              </View>
            </View>
          )}

          {/* Step 2: Syllabus */}
          {step === 2 && (
            <View style={tw`gap-4`}>
              <View style={tw`rounded-xl border border-gray-200 bg-[#f6f8fb] p-3`}>
                <Text style={tw`text-sm text-gray-700`}>
                  Syllabus for <Text style={tw`font-semibold`}>{parseWeeks(formData.duration ?? '')}</Text> week
                  {parseWeeks(formData.duration ?? '') === 1 ? '' : 's'} (auto-sized)
                </Text>
              </View>

              <View style={tw`gap-4`}>
                {(formData.syllabus ?? []).map((item, index) => {
                  const vKey = `v-${index}`;
                  const nKey = `n-${index}`;
                  const vPct = Math.round(uploadPct[vKey] ?? 0);
                  const nPct = Math.round(uploadPct[nKey] ?? 0);

                  return (
                    <SectionCard key={index} pad>
                      <Row style={tw`justify-between mb-2`}>
                        <Row style={tw`gap-2`}>
                          <View style={tw`h-6 w-6 rounded-lg bg-blue-600/10 items-center justify-center`}>
                            <Text style={tw`text-blue-700 font-semibold text-xs`}>{item.week}</Text>
                          </View>
                          <Text style={tw`text-sm font-semibold`}>
                            {item.topic?.trim() ? item.topic : `Week ${item.week}`}
                          </Text>
                        </Row>
                      </Row>

                      <View style={tw`gap-3`}>
                        <Input
                          value={item.topic ?? ''}
                          onChangeText={(t) => handleSyllabusChange(index, 'topic', t)}
                          placeholder="Topic (e.g., Limits & Continuity)"
                        />
                        <Input
                          value={item.assignment ?? ''}
                          onChangeText={(t) => handleSyllabusChange(index, 'assignment', t)}
                          placeholder="Notes / Assignment"
                          multiline
                          numberOfLines={4}
                          style={tw`min-h-24`}
                        />

                        {/* URLs */}
                        <Input
                          value={item.videoUrl ?? ''}
                          onChangeText={(t) => handleSyllabusChange(index, 'videoUrl', t)}
                          placeholder="Optional: Video URL (YouTube/Vimeo/MP4)"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <Row style={tw`justify-between`}>
                          <Text style={tw`text-xs text-gray-600`}>Or upload video file</Text>
                          {vPct > 0 && vPct < 100 && (
                            <Text style={tw`text-xs text-gray-600`}>Uploading… {vPct}%</Text>
                          )}
                        </Row>
                        <TouchableOpacity
                          onPress={() => pickAndUploadVideo(index)}
                          style={tw`rounded-lg border border-dashed border-gray-300 bg-[#f6f8fb] p-3`}
                        >
                          <Text style={tw`text-sm`}>Pick video</Text>
                          {!!item.videoUrl && (
                            <Text style={tw`text-xs text-blue-600 mt-1`} numberOfLines={1}>
                              {item.videoUrl}
                            </Text>
                          )}
                        </TouchableOpacity>

                        <Input
                          value={item.notesUrl ?? ''}
                          onChangeText={(t) => handleSyllabusChange(index, 'notesUrl', t)}
                          placeholder="Optional: Notes URL (PDF/Doc)"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <Row style={tw`justify-between`}>
                          <Text style={tw`text-xs text-gray-600`}>Or upload notes (PDF)</Text>
                          {nPct > 0 && nPct < 100 && (
                            <Text style={tw`text-xs text-gray-600`}>Uploading… {nPct}%</Text>
                          )}
                        </Row>
                        <TouchableOpacity
                          onPress={() => pickAndUploadPdf(index)}
                          style={tw`rounded-lg border border-dashed border-gray-300 bg-[#f6f8fb] p-3`}
                        >
                          <Text style={tw`text-sm`}>Pick PDF</Text>
                          {!!item.notesUrl && (
                            <Text style={tw`text-xs text-blue-600 mt-1`} numberOfLines={1}>
                              {item.notesUrl}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </SectionCard>
                  );
                })}
              </View>
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

            return (
              <View style={tw`gap-4`}>
                <View style={tw`flex-row gap-4`}>
                  <SectionCard pad>
                    <Text style={tw`text-xs text-gray-500`}>Title</Text>
                    <Text style={tw`font-semibold`}>{formData.title || '—'}</Text>
                  </SectionCard>
                  <SectionCard pad>
                    <Text style={tw`text-xs text-gray-500`}>Level</Text>
                    <Text style={tw`font-semibold`}>{formData.level}</Text>
                  </SectionCard>
                </View>

                <View style={tw`flex-row gap-4`}>
                  <SectionCard pad>
                    <Text style={tw`text-xs text-gray-500`}>Duration</Text>
                    <Text style={tw`font-semibold`}>{formData.duration || '—'}</Text>
                  </SectionCard>
                  <SectionCard pad>
                    <Text style={tw`text-xs text-gray-500`}>Price</Text>
                    {freeCourse ? (
                      <Row style={tw`gap-2`}>
                        <Text style={tw`px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-600/10 text-emerald-700`}>Free</Text>
                        <Text style={tw`text-xs text-gray-500`}>(saved as 0 Tokens)</Text>
                      </Row>
                    ) : (
                      <Text style={tw`font-semibold`}>{priceFmtTokens}</Text>
                    )}
                  </SectionCard>
                </View>

                <SectionCard pad>
                  <Text style={tw`text-xs text-gray-500 mb-1`}>Prerequisites</Text>
                  <Text>{formData.prerequisites || '—'}</Text>
                </SectionCard>

                <SectionCard pad>
                  <Text style={tw`text-xs text-gray-500 mb-2`}>
                    Syllabus ({cleanSyllabus.length} week{cleanSyllabus.length === 1 ? '' : 's'})
                  </Text>
                  {cleanSyllabus.length === 0 ? (
                    <Text>—</Text>
                  ) : (
                    <View style={tw`gap-3`}>
                      {cleanSyllabus.map((w) => (
                        <View key={w.week} style={tw`gap-1`}>
                          <Text style={tw`font-medium`}>{w.topic || 'Untitled topic'}</Text>
                          {!!w.assignment && (
                            <Text style={tw`text-sm`}><Text style={tw`font-medium`}>Assignment:</Text> {w.assignment}</Text>
                          )}
                          {!!w.videoUrl && (
                            <Text style={tw`text-sm`} numberOfLines={1}><Text style={tw`font-medium`}>Video:</Text> {w.videoUrl}</Text>
                          )}
                          {!!w.notesUrl && (
                            <Text style={tw`text-sm`} numberOfLines={1}><Text style={tw`font-medium`}>Notes:</Text> {w.notesUrl}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </SectionCard>
              </View>
            );
          })()}
        </SectionCard>

        {error ? (
          <Text style={tw`text-red-600 text-sm`} accessibilityRole="alert">
            {String(error)}
          </Text>
        ) : null}

        {/* Global upload banner */}
        {fileUploading && (
          <View style={tw`rounded-2xl border border-yellow-200 bg-yellow-50 p-3`}>
            <Text style={tw`text-sm text-yellow-900 mb-2`}>Uploading files… {overallUploadPct}%</Text>
            <View style={tw`w-full h-2 rounded bg-gray-200 overflow-hidden`}>
              <View style={[tw`h-full bg-blue-600`, { width: `${overallUploadPct}%` }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={tw`px-4 py-3 border-t border-gray-200 bg-white`}>
        <Row style={tw`justify-between`}>
          <Text style={tw`text-xs text-gray-500`}>
            Step {step + 1} of {steps.length} • {steps[step]}
          </Text>
          <Row style={tw`gap-8`}>
            {step > 0 && (
              <TouchableOpacity
                onPress={() => setStep(step - 1)}
                style={tw`rounded-xl px-4 py-2 border border-gray-300`}
              >
                <Text>Back</Text>
              </TouchableOpacity>
            )}

            {step < steps.length - 1 ? (
              <TouchableOpacity
                onPress={() => canNext && !fileUploading && setStep(step + 1)}
                disabled={!canNext || fileUploading}
                style={tw.style(
                  'rounded-xl px-4 py-2',
                  canNext && !fileUploading ? 'bg-blue-600' : 'bg-gray-400'
                )}
              >
                <Text style={tw`text-white font-semibold`}>
                  {fileUploading ? 'Uploading…' : 'Next'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || fileUploading || !formData.tutorId}
                style={tw.style(
                  'rounded-xl px-4 py-2',
                  loading || fileUploading || !formData.tutorId ? 'bg-gray-400' : 'bg-emerald-600'
                )}
              >
                {loading ? (
                  <Row style={tw`gap-2`}>
                    <ActivityIndicator color="white" />
                    <Text style={tw`text-white font-semibold`}>Saving…</Text>
                  </Row>
                ) : (
                  <Text style={tw`text-white font-semibold`}>
                    {fileUploading ? 'Uploading…' : 'Create Course'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </Row>
        </Row>
      </View>
    </View>
  );
};

export default CreateCourseNative;
