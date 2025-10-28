/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  findNodeHandle,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfileForm } from '@mytutorapp/shared/hooks';
import type { UploadAsset } from '@mytutorapp/shared/types';
import { COUNTRIES } from '@mytutorapp/shared/utils/countries';

import tw from '../../tailwind';

type RootStackParamList = { Home: undefined };
type ViewRef = React.MutableRefObject<View | null>;

type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

/** Match web min/max ranges (tokens == USD) */
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },
  workshop:       { min: 5, max: 100 },
  lecture:        { min: 5, max: 100 },
};

function isUploadAsset(obj: unknown): obj is UploadAsset {
  return !!obj && typeof (obj as UploadAsset).uri === 'string';
}

/** Category options to mirror web (while keeping native styling) */
const CATEGORIES: string[] = [
  'Mathematics',
  'Sciences',
  'Programming',
  'Art & Design',
  'Languages',
  'Wellness',
];

/* ───────────────────────────── helpers ───────────────────────────── */
const toSeconds = (raw?: number | null) => {
  const n = Number(raw ?? 0);
  return n > 1000 ? n / 1000 : n;
};
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);
const isMpesaLike = (s: string) => /^\+?2547\d{8}$/.test(s) || /^07\d{8}$/.test(s);

/** Error labels to build banner exactly like web */
type Errors = Record<string, string>;
const labelFor: Record<string, string> = {
  role: 'Your Role',
  name: 'Name',
  age: 'Age',
  country: 'Country',
  schoolGrade: 'School Grade / Year / Level',
  languages: 'Languages',
  category: 'Subject/Skill Category',
  payoutMethod: 'Payout Method',
  payoutCurrency: 'Payout Currency',
  wiseEmail: 'Wise Email',
  mpesaPhoneNumber: 'M-Pesa Phone Number',
  privateSession: 'Private session rate',
  groupSession: 'Group session rate',
  workshop: 'Workshop rate',
  lecture: 'Lecture rate',
};

export default function CreateProfileFormNative() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // ScrollView + section refs
  const scrollRef = useRef<ScrollView>(null);
  const nameWrapRef = useRef<View>(null);
  const ageWrapRef = useRef<View>(null);
  const countryWrapRef = useRef<View>(null);
  const schoolGradeWrapRef = useRef<View>(null);
  const languagesWrapRef = useRef<View>(null);
  const categoryWrapRef = useRef<View>(null);
  const wiseWrapRef = useRef<View>(null);
  const mpesaWrapRef = useRef<View>(null);
  const pricingRefs: Record<PricingKeys, ViewRef> = {
  privateSession: useRef<View>(null),
  groupSession:   useRef<View>(null),
  workshop:       useRef<View>(null),
  lecture:        useRef<View>(null),
};


  const refsMap: Record<string, ViewRef> = {
  name: nameWrapRef,
  age: ageWrapRef,
  country: countryWrapRef,
  schoolGrade: schoolGradeWrapRef,
  languages: languagesWrapRef,
  category: categoryWrapRef,
  wiseEmail: wiseWrapRef,
  mpesaPhoneNumber: mpesaWrapRef,
  privateSession: pricingRefs.privateSession,
  groupSession: pricingRefs.groupSession,
  workshop: pricingRefs.workshop,
  lecture: pricingRefs.lecture,
};


  const {
    role,

    // basics
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,

    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,

    pricing, handlePricingChange,

    // media
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,

    // payout (currency comes from the hook)
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // geo + grade
    country, setCountry,
    schoolGrade, setSchoolGrade,

    // submit + step
    loading, handleSubmit, step,
  } = useProfileForm({ onSuccess: () => navigation.navigate('Home') });

  // Banner + inline error state (parity with web)
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string>('');

  const setFieldError = (key: string, message: string) => {
    setErrors(prev => ({ ...prev, [key]: message }));
  };
  const clearFieldError = (key: string) => {
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };
  const buildBannerFromErrors = (errs: Errors) => {
    const keys = Object.keys(errs);
    if (!keys.length) return '';
    const items = keys.map(k => labelFor[k] || k);
    return `Please complete: ${items.join(' • ')}.`;
  };

  // Ask once for perms (camera + library)
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cam.status !== 'granted' || lib.status !== 'granted') {
          Alert.alert('Permissions required', 'Camera and media library access are needed for photos & video.');
        }
      }
    })();
  }, []);

  /* ---------------------- Media pickers (images) ---------------------- */
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required','We need access to your photos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (res.canceled) return;
    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
    };
    setImages([upload]);
  };

  /* ---------------------- Media pickers (video) ---------------------- */
  const pickVideo = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
    });
    if (res.canceled) return;

    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const durSec = toSeconds(a.duration ?? undefined);
    if (durSec > 30) {
      Alert.alert('Too long', `Your clip is ${durSec.toFixed(1)}s. Please select ≤ 30s.`);
      return;
    }

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
      duration: typeof a.duration === 'number' ? a.duration : undefined,
    };
    try {
      handleVideoChange(upload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', msg);
    }
  };

  const recordVideo = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'We need access to your camera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (res.canceled) return;

    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const durSec = toSeconds(a.duration ?? undefined);
    if (durSec > 30) {
      Alert.alert('Too long', `Your recording is ${durSec.toFixed(1)}s. Please record ≤ 30s.`);
      return;
    }

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
      duration: typeof a.duration === 'number' ? a.duration : undefined,
    };
    try {
      handleVideoChange(upload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', msg);
    }
  };

  /* ---------------------- Derived & validation ---------------------- */
  const languagesSelected = useMemo(
    () => Object.values(languages).some(Boolean),
    [languages]
  );

  // Parity with web: do not clamp into range while typing; validate on submit
  const onPriceChange = useCallback(
    (field: PricingKeys, raw: string) => {
      const clean = raw.replace(/[^\d]/g, '');
      handlePricingChange(field, clean);
      clearFieldError(field);
    },
    [handlePricingChange]
  );

  const scrollToField = (key: string | undefined) => {
    if (!key) return;
    const ref = refsMap[key];
    const view = ref?.current;
    const scrollNode = findNodeHandle(scrollRef.current as any);
    if (!view || !scrollNode) {
      // fallback: show banner at top
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // Measure relative to the ScrollView and scroll slightly above the field
    (view as any).measureLayout(
      scrollNode,
      (_x: number, y: number) => {
        const offset = Math.max(y - 24, 0);
        scrollRef.current?.scrollTo({ y: offset, animated: true });
      },
      () => {
        // measurement failed — just go to top so the banner is visible
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    );
  };

  const validateForm = (): { ok: boolean; firstKey?: string } => {
    const next: Errors = {};

    // Basic requireds
    if (!name?.trim()) next.name = 'Name is required.';
    const ageNum = Number(age);
    const minAge = role === 'tutor' ? 18 : 5;
    if (!age?.trim()) {
      next.age = 'Age is required.';
    } else if (!Number.isFinite(ageNum) || ageNum < minAge) {
      next.age = `Age must be at least ${minAge}.`;
    }

    // Country
    if (!country) next.country = 'Select your country.';

    // School grade
    if (!schoolGrade?.trim()) next.schoolGrade = 'Enter your grade / year / level.';

    // Languages
    if (!languagesSelected) next.languages = 'Select at least one language.';

    if (role === 'tutor') {
      // Category
      if (!category) next.category = 'Select a subject/skill category.';

      // Payout
      if (payoutMethod === 'mpesa') {
        if (!mpesaPhoneNumber?.trim()) {
          next.mpesaPhoneNumber = 'Enter your M-Pesa phone number.';
        } else if (!isMpesaLike(mpesaPhoneNumber.trim())) {
          next.mpesaPhoneNumber = 'Use format +2547XXXXXXXX or 07XXXXXXXX.';
        }
      } else if (payoutMethod === 'wise') {
        if (!wiseEmail?.trim()) {
          next.wiseEmail = 'Enter your Wise account email.';
        } else if (!isEmail(wiseEmail.trim())) {
          next.wiseEmail = 'Enter a valid email address.';
        }
      }

      // Pricing
      pricingFields.forEach((field) => {
        const raw = (pricing as Record<PricingKeys, string>)[field];
        const { min, max } = tokenRanges[field];
        const n = Number(raw);
        if (raw == null || raw === '') {
          next[field] = `Enter ${labelFor[field]}.`;
        } else if (!Number.isFinite(n)) {
          next[field] = `${labelFor[field]} must be a number.`;
        } else if (n < min || n > max) {
          next[field] = `${labelFor[field]} must be between ${min} and ${max}.`;
        }
      });
    }

    setErrors(next);
    const bannerText = buildBannerFromErrors(next);
    setBanner(bannerText);

    const order: string[] = [
      'name',
      'age',
      'country',
      'schoolGrade',
      'languages',
      ...(role === 'tutor'
        ? [
            'category',
            ...(payoutMethod === 'wise' ? ['wiseEmail'] : ['mpesaPhoneNumber']),
            'privateSession',
            'groupSession',
            'workshop',
            'lecture',
          ]
        : []),
    ];
    const firstKey = order.find((k) => k in next);

    // Always reveal the banner; if a field exists, jump to it.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (firstKey) setTimeout(() => scrollToField(firstKey), 60);

    return { ok: Object.keys(next).length === 0, firstKey };
  };

  const onSubmitPress = () => {
    setErrors({});
    setBanner('');
    const { ok } = validateForm();
    if (!ok) return;
    handleSubmit({} as React.FormEvent);
  };

  /* ---------------------- Intro video preview (expo-video) ---------------------- */
  const previewPlayer = useVideoPlayer(null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    (async () => {
      try {
        await previewPlayer.pause();
        await previewPlayer.replace(videoPreview || null);
      } catch {
        // ignore
      }
    })();
  }, [videoPreview, previewPlayer]);

  /* ------------------------------- UI ------------------------------- */
  const inputBase = tw`w-full p-3 rounded bg-gray-800 text-white text-base border border-gray-700`;
  const invalidBorder = tw`border-red-500`;

  return (
    <SafeAreaView
      style={tw`flex-1 bg-gray-900`}
      edges={['top','left','right','bottom']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
      <ScrollView
        ref={scrollRef}
        style={tw`flex-1`}
        contentContainerStyle={[
          tw`p-4 gap-6`,
          { paddingBottom: Math.max(insets.bottom + 32, 32) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
          Create Your Profile
        </Text>

        {/* Top error banner (parity with web) */}
        {!!banner && (
          <View style={tw`rounded-lg border border-red-700 bg-red-900/30 p-3`}>
            <Text style={tw`text-red-200`}>{banner}</Text>
          </View>
        )}

        {step === 'bg-video' && (
          <Text style={tw`text-sm text-gray-400`}>
            Uploading your intro video in the background… you can continue using the app.
          </Text>
        )}

        {/* Role display */}
        {role ? (
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Your Role</Text>
            <Text style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}>{role}</Text>
          </View>
        ) : (
          <Text style={tw`text-gray-400`}>Fetching your role…</Text>
        )}

        {/* Name */}
        <View ref={nameWrapRef} style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Your Name</Text>
          <TextInput
            placeholder="Enter your name"
            value={name}
            onChangeText={(v) => { setName(v); clearFieldError('name'); }}
            placeholderTextColor="#9CA3AF"
            style={[inputBase, errors.name ? invalidBorder : null]}
          />
          {!!errors.name && <Text style={tw`text-sm text-red-400`}>{errors.name}</Text>}
        </View>

        {/* Age */}
        <View ref={ageWrapRef} style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Age</Text>
          <TextInput
            placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
            value={age}
            onChangeText={(v) => { setAge(v); clearFieldError('age'); }}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            style={[inputBase, errors.age ? invalidBorder : null]}
          />
          {!!errors.age && <Text style={tw`text-sm text-red-400`}>{errors.age}</Text>}
        </View>

        {/* Country */}
        <View ref={countryWrapRef} style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Country</Text>
          <View style={[tw`rounded`, errors.country ? invalidBorder : tw`border border-gray-700`]}>
            <Picker
              selectedValue={country}
              onValueChange={(v) => { setCountry(v); clearFieldError('country'); }}
              style={tw`bg-gray-800 rounded text-white`}
            >
              <Picker.Item label="Select your country" value="" />
              {COUNTRIES.map((c) => (
                <Picker.Item key={c.code} label={c.name} value={c.code} />
              ))}
            </Picker>
          </View>
          {!!errors.country && <Text style={tw`text-sm text-red-400`}>{errors.country}</Text>}
        </View>

        {/* School Grade / Year / Level */}
        <View ref={schoolGradeWrapRef} style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>School Grade / Year / Level - You Teach</Text>
          <TextInput
            placeholder="e.g., Grade 7, Form 2, Year 10, Freshman …"
            value={schoolGrade}
            onChangeText={(v) => { setSchoolGrade(v); clearFieldError('schoolGrade'); }}
            placeholderTextColor="#9CA3AF"
            style={[inputBase, errors.schoolGrade ? invalidBorder : null]}
          />
          {!!errors.schoolGrade && <Text style={tw`text-sm text-red-400`}>{errors.schoolGrade}</Text>}
        </View>

        {/* Language chips */}
        <View ref={languagesWrapRef} style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
          <View style={[
            tw`flex-row flex-wrap gap-2 rounded`,
            errors.languages ? tw`border border-red-500 p-2` : null
          ]}>
            {Object.keys(languages).map((lang) => {
              const on = languages[lang];
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => { handleLanguageSelect(lang); clearFieldError('languages'); }}
                  style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                >
                  <Text style={on ? tw`text-white` : tw`text-gray-400`}>{lang}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!errors.languages && <Text style={tw`text-sm text-red-400`}>{errors.languages}</Text>}
        </View>

        {/* Tutor-only extras */}
        {role === 'tutor' && (
          <View style={tw`gap-4`}>
            {/* Category */}
            <View ref={categoryWrapRef} style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Subject / Skill Category</Text>
              <View style={[tw`rounded`, errors.category ? invalidBorder : tw`border border-gray-700`]}>
                <Picker
                  selectedValue={category}
                  onValueChange={(v) => { setCategory(v); clearFieldError('category'); }}
                  style={tw`bg-gray-800 rounded text-white`}
                >
                  <Picker.Item label="Select a category…" value="" />
                  {CATEGORIES.map((c) => (
                    <Picker.Item key={c} label={c} value={c} />
                  ))}
                </Picker>
              </View>
              {!!errors.category && <Text style={tw`text-sm text-red-400`}>{errors.category}</Text>}
            </View>

            {/* Payout Preferences */}
            <View style={tw`gap-3`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Payout Preferences</Text>

              <View>
                <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Method</Text>
                <View style={tw`border border-gray-700 rounded`}>
                  <Picker
                    selectedValue={payoutMethod}
                    onValueChange={(v) => {
                      setPayoutMethod(v);
                      clearFieldError('wiseEmail');
                      clearFieldError('mpesaPhoneNumber');
                    }}
                    style={tw`bg-gray-800 rounded text-white`}
                  >
                    <Picker.Item label="Wise (USD)" value="wise" />
                    <Picker.Item label="M-Pesa (KES)" value="mpesa" />
                  </Picker>
                </View>
              </View>

              <View>
                <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Currency</Text>
                <Text style={tw`w-full p-3 rounded bg-gray-800 text-white border border-gray-700`}>{payoutCurrency}</Text>
                <Text style={tw`text-xs text-gray-400 mt-1`}>
                  Wise pays in USD to your Wise account. M-Pesa payouts settle in KES.
                </Text>
              </View>

              {payoutMethod === 'wise' && (
                <View ref={wiseWrapRef}>
                  <Text style={tw`text-sm text-gray-400 mb-1`}>Wise account email</Text>
                  <TextInput
                    placeholder="you@yourdomain.com"
                    value={wiseEmail}
                    onChangeText={(v) => { setWiseEmail(v); clearFieldError('wiseEmail'); }}
                    placeholderTextColor="#9CA3AF"
                    style={[inputBase, errors.wiseEmail ? invalidBorder : null]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {!!errors.wiseEmail && <Text style={tw`text-sm text-red-400 mt-1`}>{errors.wiseEmail}</Text>}
                </View>
              )}

              {payoutMethod === 'mpesa' && (
                <View ref={mpesaWrapRef} style={tw`gap-1`}>
                  <Text style={tw`text-base text-gray-400`}>M-Pesa Phone Number</Text>
                  <TextInput
                    placeholder="+2547XXXXXXXX"
                    value={mpesaPhoneNumber}
                    onChangeText={(v) => { setMpesaPhoneNumber(v); clearFieldError('mpesaPhoneNumber'); }}
                    placeholderTextColor="#9CA3AF"
                    style={[inputBase, errors.mpesaPhoneNumber ? invalidBorder : null]}
                    keyboardType="phone-pad"
                  />
                  {!!errors.mpesaPhoneNumber && <Text style={tw`text-sm text-red-400`}>{errors.mpesaPhoneNumber}</Text>}
                </View>
              )}
            </View>

            {/* Teaching styles */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Teaching Styles</Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {['One-on-One','Group','Workshop','Lecture'].map((s) => {
                  const on = teachingStyle.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() =>
                        setTeachingStyle((prev) => (on ? prev.filter((i) => i !== s) : [...prev, s]))
                      }
                      style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                    >
                      <Text style={on ? tw`text-white` : tw`text-gray-400`}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bio */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400 mb-1`}>Bio</Text>
              <TextInput
                placeholder="A short bio about yourself…"
                value={bio}
                onChangeText={setBio}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={tw`w-full h-24 p-3 rounded bg-gray-800 text-white text-base border border-gray-700`}
              />
            </View>

            {/* Expertise */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Expertise</Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map((skill) => {
                  const on = expertise.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      onPress={() =>
                        setExpertise((prev) => (on ? prev.filter((i) => i !== skill) : [...prev, skill]))
                      }
                      style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                    >
                      <Text style={on ? tw`text-white` : tw`text-gray-400`}>{skill}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pricing */}
            <View style={tw`gap-4`}>
              <Text style={tw`text-base text-gray-400`}>Set Your Rates (1 token = $1 USD)</Text>
              <View style={tw`flex-row flex-wrap -mx-2`}>
                {pricingFields.map((field) => {
                  const { min, max } = tokenRanges[field];
                  const value = (pricing as Record<PricingKeys, string>)[field] || '';
                  return (
                    <View ref={pricingRefs[field]} key={field} style={tw`w-1/2 px-2 mb-4`}>
                      <Text style={tw`text-sm text-gray-300`}>
                        {field.replace(/([A-Z])/g,' $1')} (Min: {min} | Max: {max})
                      </Text>
                      <TextInput
                        placeholder={`Enter ${field.replace(/([A-Z])/g,' $1')} Tokens`}
                        value={value}
                        onChangeText={(t) => onPriceChange(field, t)}
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                        style={[tw`w-full p-2 rounded-lg bg-gray-800 text-gray-300 border text-sm`, errors[field] ? tw`border-red-500` : tw`border-gray-700`]}
                      />
                      {!!errors[field] && <Text style={tw`text-xs text-red-400 mt-1`}>{errors[field]}</Text>}
                    </View>
                  );
                })}
              </View>
              <Text style={tw`text-xs text-gray-400`}>
                Tip: For group pricing, enter the price <Text style={tw`font-bold`}>per learner</Text>.
              </Text>
            </View>

            {/* Profile image */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Upload Profile Image</Text>
              <TouchableOpacity
                onPress={pickImage}
                style={tw`w-24 h-24 border border-gray-700 items-center justify-center rounded bg-gray-800`}
              >
                {images[0] && isUploadAsset(images[0]) ? (
                  <Image source={{ uri: images[0].uri }} style={tw`w-full h-full rounded`} />
                ) : (
                  <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Video record/upload + preview */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Introduction Video (30s max)</Text>
              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity onPress={recordVideo} style={tw`bg-pink-500 px-4 py-2 rounded`}>
                  <Text style={tw`text-white`}>Record</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickVideo} style={tw`bg-gray-800 px-4 py-2 rounded`}>
                  <Text style={tw`text-gray-200`}>Upload</Text>
                </TouchableOpacity>
              </View>

              {videoPreview && (
                <View style={tw`gap-2`}>
                  <Text style={tw`text-base text-gray-400`}>Preview</Text>
                  <View style={tw`w-24 h-24 border border-gray-700 items-center justify-center rounded bg-gray-800 overflow-hidden`}>
                    <VideoView
                      player={previewPlayer}
                      style={tw`w-full h-full rounded`}
                      nativeControls
                      contentFit="cover"
                      allowsFullscreen
                      allowsPictureInPicture
                    />
                    <TouchableOpacity
                      onPress={handleRemoveVideo}
                      style={tw`absolute top-1 right-1 bg-red-500 rounded-full p-1`}
                    >
                      <Text style={tw`text-white text-xs`}>X</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmitPress}
          disabled={loading}
          style={tw`w-full bg-pink-500 py-3 rounded-lg ${loading ? 'opacity-70' : ''}`}
        >
          <Text style={tw`text-white text-center text-base`}>
            {loading
              ? (step === 'uploading' ? 'Uploading images…'
                : step === 'creating' ? 'Creating profile…'
                : 'Creating profile…')
              : 'Create Profile'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
