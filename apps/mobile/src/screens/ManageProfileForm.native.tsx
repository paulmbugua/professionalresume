/* eslint-disable prettier/prettier */
// apps/mobile/src/screens/ManageProfileForm.native.tsx
import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video'; // ✅ expo-video
import tw from '../../tailwind';

import { useNavigation } from '@react-navigation/native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { ChangeEvent } from 'react';

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

/* ───────────── Region / Country / Grade band (compact, UI-only) ─────────── */
type RegionKey =
  | 'africa'
  | 'europe'
  | 'asia'
  | 'south-america'
  | 'north-america'
  | 'oceania'
  | 'middle-east';

type CountryCode =
  // Africa
  | 'ke' | 'ng' | 'za' | 'gh' | 'ug' | 'tz' | 'eg' | 'ma'
  // Europe
  | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pl' | 'nl' | 'ie' | 'pt'
  // Asia
  | 'in' | 'cn' | 'jp' | 'kr'
  // South America
  | 'br' | 'ar' | 'cl' | 'co'
  // North America
  | 'us' | 'ca' | 'mx'
  // Oceania
  | 'au' | 'nz'
  | 'qa' | 'sa' | 'ae' | 'kw' | 'bh' | 'om' | 'jo' | 'lb';

type BandKey =
  | 'preprimary'
  | 'primary'
  | 'lower-secondary'
  | 'upper-secondary'
  | 'sixth-form'
  | 'tvet'
  | 'tertiary';

type GradeBand = { key: BandKey; label: string };

const COUNTRIES_BY_REGION: Record<RegionKey, { code: CountryCode; label: string }[]> = {
  africa: [
    { code: 'ke', label: 'Kenya' },
    { code: 'ng', label: 'Nigeria' },
    { code: 'za', label: 'South Africa' },
    { code: 'gh', label: 'Ghana' },
    { code: 'ug', label: 'Uganda' },
    { code: 'tz', label: 'Tanzania' },
    { code: 'eg', label: 'Egypt' },
    { code: 'ma', label: 'Morocco' },
  ],
  europe: [
    { code: 'uk', label: 'United Kingdom' },
    { code: 'fr', label: 'France' },
    { code: 'de', label: 'Germany' },
    { code: 'es', label: 'Spain' },
    { code: 'it', label: 'Italy' },
    { code: 'pl', label: 'Poland' },
    { code: 'nl', label: 'Netherlands' },
    { code: 'ie', label: 'Ireland' },
    { code: 'pt', label: 'Portugal' },
  ],
  asia: [
    { code: 'in', label: 'India' },
    { code: 'cn', label: 'China' },
    { code: 'jp', label: 'Japan' },
    { code: 'kr', label: 'South Korea' },
  ],
  'south-america': [
    { code: 'br', label: 'Brazil' },
    { code: 'ar', label: 'Argentina' },
    { code: 'cl', label: 'Chile' },
    { code: 'co', label: 'Colombia' },
  ],
  'north-america': [
    { code: 'us', label: 'United States' },
    { code: 'ca', label: 'Canada' },
    { code: 'mx', label: 'Mexico' },
  ],
  oceania: [
    { code: 'au', label: 'Australia' },
    { code: 'nz', label: 'New Zealand' },
  ],
  'middle-east': [ // 👈 NEW
    { code: 'ae', label: 'United Arab Emirates' },
    { code: 'sa', label: 'Saudi Arabia' },
    { code: 'qa', label: 'Qatar' },
    { code: 'kw', label: 'Kuwait' },
    { code: 'bh', label: 'Bahrain' },
    { code: 'om', label: 'Oman' },
    { code: 'jo', label: 'Jordan' },
    { code: 'lb', label: 'Lebanon' },
  ],
};

const COUNTRY_GRADE_BANDS: Partial<Record<CountryCode, GradeBand[]>> = {
  // Africa
  ke: [
    { key: 'preprimary', label: 'Pre-Primary (PP1–PP2)' },
    { key: 'primary', label: 'Primary (Grades 1–6)' },
    { key: 'lower-secondary', label: 'Junior School (7–9)' },
    { key: 'upper-secondary', label: 'Senior School (10–12)' },
    { key: 'tvet', label: 'TVET' },
    { key: 'tertiary', label: 'University / College' },
  ],
  ng: [
    { key: 'primary', label: 'Primary (Basic 1–6)' },
    { key: 'lower-secondary', label: 'JSS (1–3)' },
    { key: 'upper-secondary', label: 'SSS (1–3)' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  za: [
    { key: 'preprimary', label: 'Grade R (Reception)' },
    { key: 'primary', label: 'Foundation/Intermediate (1–6)' },
    { key: 'lower-secondary', label: 'Senior Phase (7–9)' },
    { key: 'upper-secondary', label: 'FET (10–12)' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  gh: [
    { key: 'primary', label: 'Primary (B1–B6)' },
    { key: 'lower-secondary', label: 'JHS (1–3)' },
    { key: 'upper-secondary', label: 'SHS (1–3)' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  eg: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Preparatory' },
    { key: 'upper-secondary', label: 'Secondary' },
    { key: 'tertiary', label: 'University' },
  ],
  ma: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Lower Secondary (Collège)' },
    { key: 'upper-secondary', label: 'Upper Secondary (Lycée)' },
    { key: 'tertiary', label: 'University' },
  ],
  // Europe
  uk: [
    { key: 'primary', label: 'Primary (KS1–KS2)' },
    { key: 'lower-secondary', label: 'Secondary (KS3–GCSE)' },
    { key: 'sixth-form', label: 'Sixth Form (A-Levels)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  fr: [
    { key: 'primary', label: 'École élémentaire' },
    { key: 'lower-secondary', label: 'Collège' },
    { key: 'upper-secondary', label: 'Lycée' },
    { key: 'tertiary', label: 'Université' },
  ],
  de: [
    { key: 'primary', label: 'Grundschule' },
    { key: 'lower-secondary', label: 'Sekundarstufe I' },
    { key: 'upper-secondary', label: 'Sekundarstufe II' },
    { key: 'tertiary', label: 'Hochschule / Uni' },
  ],
  es: [
    { key: 'primary', label: 'Educación Primaria' },
    { key: 'lower-secondary', label: 'ESO' },
    { key: 'upper-secondary', label: 'Bachillerato' },
    { key: 'tertiary', label: 'Universidad' },
  ],
  it: [
    { key: 'primary', label: 'Primaria' },
    { key: 'lower-secondary', label: 'Secondaria I grado' },
    { key: 'upper-secondary', label: 'Secondaria II grado' },
    { key: 'tertiary', label: 'Università' },
  ],
  nl: [
    { key: 'primary', label: 'Basisonderwijs' },
    { key: 'lower-secondary', label: 'VMBO / Onderbouw' },
    { key: 'upper-secondary', label: 'HAVO / VWO' },
    { key: 'tertiary', label: 'HBO / Universiteit' },
  ],
  ie: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Junior Cycle' },
    { key: 'upper-secondary', label: 'Senior Cycle' },
    { key: 'tertiary', label: 'Higher Education' },
  ],
  pt: [
    { key: 'primary', label: 'Ensino Básico (1º ciclo)' },
    { key: 'lower-secondary', label: 'Ensino Básico (2º/3º)' },
    { key: 'upper-secondary', label: 'Ensino Secundário' },
    { key: 'tertiary', label: 'Ensino Superior' },
  ],
  // Asia
  in: [
    { key: 'primary', label: 'Primary (1–5)' },
    { key: 'lower-secondary', label: 'Middle (6–8)' },
    { key: 'upper-secondary', label: 'Secondary / Higher Sec (9–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  cn: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Junior Secondary' },
    { key: 'upper-secondary', label: 'Senior Secondary' },
    { key: 'tertiary', label: 'University' },
  ],
  jp: [
    { key: 'primary', label: 'Shōgakkō' },
    { key: 'lower-secondary', label: 'Chūgakkō' },
    { key: 'upper-secondary', label: 'Kōtōgakkō' },
    { key: 'tertiary', label: 'Daigaku' },
  ],
  kr: [
    { key: 'primary', label: 'Elementary' },
    { key: 'lower-secondary', label: 'Middle' },
    { key: 'upper-secondary', label: 'High' },
    { key: 'tertiary', label: 'University' },
  ],
  // North/South America & Oceania
  us: [
    { key: 'primary', label: 'Elementary (K–5)' },
    { key: 'lower-secondary', label: 'Middle (6–8)' },
    { key: 'upper-secondary', label: 'High (9–12)' },
    { key: 'tertiary', label: 'College / University' },
  ],
  ca: [
    { key: 'primary', label: 'Elementary' },
    { key: 'lower-secondary', label: 'Middle / Junior High' },
    { key: 'upper-secondary', label: 'High' },
    { key: 'tertiary', label: 'College / University' },
  ],
  mx: [
    { key: 'primary', label: 'Primaria' },
    { key: 'lower-secondary', label: 'Secundaria' },
    { key: 'upper-secondary', label: 'Bachillerato' },
    { key: 'tertiary', label: 'Universidad' },
  ],
  br: [
    { key: 'primary', label: 'Fundamental I (1–5)' },
    { key: 'lower-secondary', label: 'Fundamental II (6–9)' },
    { key: 'upper-secondary', label: 'Médio (10–12)' },
    { key: 'tertiary', label: 'Superior' },
  ],
  au: [
    { key: 'primary', label: 'Primary (F–6)' },
    { key: 'lower-secondary', label: 'Lower Secondary (7–10)' },
    { key: 'upper-secondary', label: 'Senior Secondary (11–12)' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  nz: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Intermediate / Junior Secondary' },
    { key: 'upper-secondary', label: 'Senior Secondary' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  ae: [
    { key: 'primary',          label: 'Primary (1–5)' },
    { key: 'lower-secondary',  label: 'Middle / Preparatory (6–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  sa: [
    { key: 'primary',          label: 'Primary (1–6)' },
    { key: 'lower-secondary',  label: 'Intermediate (7–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  qa: [
    { key: 'primary',          label: 'Primary (1–6)' },
    { key: 'lower-secondary',  label: 'Preparatory (7–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  kw: [
    { key: 'primary',          label: 'Primary (1–5)' },
    { key: 'lower-secondary',  label: 'Intermediate (6–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  bh: [
    { key: 'primary',          label: 'Primary (1–6)' },
    { key: 'lower-secondary',  label: 'Intermediate (7–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  om: [
    { key: 'primary',          label: 'Basic Education (1–10)' },
    { key: 'upper-secondary',  label: 'Post-Basic / Secondary (11–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  jo: [
    { key: 'primary',          label: 'Basic (1–10)' },
    { key: 'upper-secondary',  label: 'Secondary (11–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
  lb: [
    { key: 'primary',          label: 'Elementary (1–6)' },
    { key: 'lower-secondary',  label: 'Intermediate (7–9)' },
    { key: 'upper-secondary',  label: 'Secondary (10–12)' },
    { key: 'tertiary',         label: 'University / College' },
  ],
};

// ---------- helpers ----------
const makeEvent = (value: string): ChangeEvent<any> =>
  ({ target: { value } } as ChangeEvent<any>);

const hasUri = (obj: unknown): obj is { uri: string } =>
  typeof obj === 'object' && obj !== null && 'uri' in obj && typeof (obj as any).uri === 'string';

const resolveAssetUri = (raw: string, backendUrl: string): string =>
  raw?.startsWith('/') ? `${backendUrl}${raw}` : raw;

// Regex (same intent as web)
const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Web-parity token ranges
const TOKEN_RANGES = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },
  lecture:        { min: 5, max: 100 },
  workshop:       { min: 5, max: 100 },
} as const;
type TokenField = keyof typeof TOKEN_RANGES;

// ---------- component ----------
export default function ManageProfileFormNative() {
  const navigation = useNavigation();
  const { backendUrl } = useShopContext();

  const {
    role,
    updatedData,
    availableProfiles,
    searchResults,
    isUploading,

    // generic inputs
    handleInputChange,
    setUpdatedData,

    // toggles / multi-selects
    handleLanguageSelect,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleExpertiseSelect,

    // pricing
    handlePricingChange,

    // search + recommendations
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,

    // media
    handleDeleteImage,
    handleDeleteVideo,

    // notifications
    handleToggleNotifications,

    // final submit
    handleSubmit,
  } = useManageProfileForm(navigation.navigate);

  // ---------- NEW: Region → Country → Grade Band (UI-only, not in payload) ----------
  const [region, setRegion] = React.useState<RegionKey>('africa');
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const [country, setCountry] = React.useState<CountryCode>(countries[0]?.code ?? 'ke');
  const bands = useMemo<GradeBand[]>(
    () => COUNTRY_GRADE_BANDS[country] ?? [
      { key: 'primary', label: 'Primary' },
      { key: 'lower-secondary', label: 'Lower Secondary' },
      { key: 'upper-secondary', label: 'Upper Secondary' },
      { key: 'tertiary', label: 'Tertiary' },
    ],
    [country]
  );
  const [bandKey, setBandKey] = React.useState<BandKey | ''>('');

  useEffect(() => {
    setCountry((prev) => {
      const exists = countries.find((c) => c.code === prev);
      return exists ? prev : (countries[0]?.code ?? prev);
    });
    setBandKey('');
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bands.find((b) => b.key === bandKey)) setBandKey('');
  }, [country, bands]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- pickers ----------
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setUpdatedData(prev => {
      const g = [...prev.gallery];
      g[0] = uri;
      return { ...prev, gallery: g };
    });
  };

  const replaceVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setUpdatedData(prev => ({ ...prev, video: uri as any }));
  };

  // ---------- computed asset URIs ----------
  const gallery0 = updatedData.gallery?.[0];
  const imageUri = useMemo(() => {
    if (typeof gallery0 === 'string') return resolveAssetUri(gallery0, backendUrl);
    if (hasUri(gallery0)) return gallery0.uri;
    return '';
  }, [gallery0, backendUrl]);

  const videoUri = useMemo(() => {
    if (typeof updatedData.video === 'string') return resolveAssetUri(updatedData.video, backendUrl);
    if (hasUri(updatedData.video)) return updatedData.video.uri;
    return '';
  }, [updatedData.video, backendUrl]);

  // ---------- styles ----------
  const section = tw`bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4`;
  const input   = tw`w-full p-3 rounded bg-gray-700 text-white mb-3`;
  const pillOn  = tw`px-3 py-1 mr-2 mb-2 rounded-full border bg-pink-600 border-pink-500`;
  const pillOff = tw`px-3 py-1 mr-2 mb-2 rounded-full border bg-gray-700 border-gray-600`;
  const pickerWrap = tw`overflow-visible z-50 mb-4`;
  const pickerStyle = tw`bg-gray-700 rounded`;
  const placeholderColor = '#9CA3AF';
  const selectedColor = '#fff';

  // ---------- validation (web parity, minimal) ----------
  const validateBeforeSubmit = (): { ok: true } | { ok: false; msg: string } => {
    const minAge = role === 'tutor' ? 18 : 5;

    if (!updatedData.name?.trim()) return { ok: false, msg: 'Please enter your name.' };
    if (!updatedData.age || updatedData.age < minAge)
      return { ok: false, msg: `Please enter a valid age (${minAge}+).` };

    const hasLanguage = Object.values(updatedData.languages || {}).some(Boolean);
    if (!hasLanguage) return { ok: false, msg: 'Select at least one language.' };

    if (role === 'student') {
      if (!updatedData.ageGroup?.length) {
        return { ok: false, msg: 'Choose at least one age group.' };
      }
      return { ok: true };
    }

    if (role === 'tutor') {
      if (!updatedData.category) return { ok: false, msg: 'Please select a category.' };

      for (const key of Object.keys(TOKEN_RANGES) as TokenField[]) {
        const val = updatedData.pricing[key];
        const { min, max } = TOKEN_RANGES[key];
        if (!Number.isFinite(val) || (val as number) < min || (val as number) > max) {
          return { ok: false, msg: `Set a valid rate for ${key} (${min}–${max}).` };
        }
      }

      if (updatedData.payoutMethod === 'wise') {
        if (!updatedData.wiseEmail?.trim() || !EMAIL_REGEX.test(updatedData.wiseEmail)) {
          return { ok: false, msg: 'Enter a valid Wise account email.' };
        }
      } else if (updatedData.payoutMethod === 'mpesa') {
        if (!updatedData.mpesaPhoneNumber?.trim() || !MPESA_REGEX.test(updatedData.mpesaPhoneNumber)) {
          return { ok: false, msg: 'Enter a valid M-Pesa phone number.' };
        }
      } else {
        return { ok: false, msg: 'Choose Wise or M-Pesa as payout method.' };
      }
    }

    return { ok: true };
  };

  // ensure currency derives from method (like web)
  const payoutCurrency = updatedData.payoutMethod === 'mpesa' ? 'KES' : 'USD';

  // ---------- intro video preview (expo-video) ----------
  const previewPlayer = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    (async () => {
      try {
        await previewPlayer.pause();
        await previewPlayer.replace(videoUri || null);
      } catch {
        // ignore
      }
    })();
  }, [videoUri, previewPlayer]);

  // ---------- render ----------
  return (
    <ScrollView style={tw`flex-1 bg-gray-900`} contentContainerStyle={tw`p-4 pb-20`}>
      <Text style={tw`text-gray-400 mb-2`}>Role: {role || 'Loading…'}</Text>

      {/* Personal Info */}
      <View style={section}>
        <TextInput
          placeholder="Name"
          value={updatedData.name}
          onChangeText={(t) => handleInputChange('name', makeEvent(t))}
          placeholderTextColor={placeholderColor}
          style={input}
        />
        <TextInput
          placeholder="Age"
          keyboardType="numeric"
          value={updatedData.age ? String(updatedData.age) : ''}
          onChangeText={(t) => handleInputChange('age', makeEvent(t))}
          placeholderTextColor={placeholderColor}
          style={[input, tw`mb-0`]}
        />
      </View>

      {/* Languages */}
      <View style={section}>
        <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Languages</Text>
        <View style={tw`flex-row flex-wrap`}>
          {Object.keys(updatedData.languages).map((lang) => {
            const on = !!updatedData.languages[lang];
            return (
              <TouchableOpacity key={lang} onPress={() => handleLanguageSelect(lang)} style={on ? pillOn : pillOff}>
                <Text style={on ? tw`text-white` : tw`text-gray-300`}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Student: Age Groups */}
      {role === 'student' && (
        <View style={section}>
          <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Age Groups</Text>
          <View style={tw`flex-row flex-wrap`}>
            {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map((g) => {
              const on = updatedData.ageGroup.includes(g);
              return (
                <TouchableOpacity key={g} onPress={() => handleAgeGroupSelect(g)} style={on ? pillOn : pillOff}>
                  <Text style={on ? tw`text-white` : tw`text-gray-300`}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Tutor-only */}
      {role === 'tutor' && (
        <>
          {/* NEW: Region → Country → Grade Band helper (UI only) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Region</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={region}
                onValueChange={(v) => setRegion(v as RegionKey)}
                style={[pickerStyle, { color: selectedColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Africa" value="africa" />
                              <Picker.Item label="Asia" value="asia" />
                              <Picker.Item label="Europe" value="europe" />
                              <Picker.Item label="Middle East" value="middle-east"/>
                              <Picker.Item label="North America" value="north-america" />
                              <Picker.Item label="South America" value="south-america" />
                              <Picker.Item label="Oceania" value="oceania" />
              </Picker>
            </View>

            <Text style={tw`text-gray-300 font-semibold mb-2`}>Country</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={country}
                onValueChange={(v) => setCountry(v as CountryCode)}
                style={[pickerStyle, { color: selectedColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                {COUNTRIES_BY_REGION[region].map((c) => (
                  <Picker.Item key={c.code} label={c.label} value={c.code} color="#000" />
                ))}
              </Picker>
            </View>

            <Text style={tw`text-gray-300 font-semibold mb-2`}>Grade Band</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={bandKey}
                onValueChange={(v) => setBandKey(v as BandKey)}
                style={[pickerStyle, { color: bandKey ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Select grade band…" value="" color={placeholderColor} />
                {bands.map((b) => (
                  <Picker.Item key={b.key} label={b.label} value={b.key} color="#000" />
                ))}
              </Picker>
            </View>
            <Text style={tw`text-gray-400 text-xs`}>
              This helps align your content with local structures. It doesn’t change your saved profile fields.
            </Text>
          </View>

          {/* Category (now minimal subjects) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Category</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.category}
                onValueChange={(val: string) => handleInputChange('category', makeEvent(val))}
                style={[pickerStyle, { color: updatedData.category ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Select a category…" value="" color={placeholderColor} />
                {SUBJECT_CATEGORIES.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} color="#000" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status (includes "New" like web) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Status</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.status}
                onValueChange={(val: string) => handleInputChange('status', makeEvent(val))}
                style={[pickerStyle, { color: updatedData.status ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                {['Online','Offline','Busy','Free Session','New'].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} color="#000" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Notifications */}
          <View style={[section, tw`flex-row items-center justify-between`]}>
            <Text style={tw`text-gray-300`}>Notifications</Text>
            <Switch
              value={!!updatedData.notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#374151', true: '#ec4899' }}
              thumbColor="#f9fafb"
            />
          </View>

          {/* Bio */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Bio</Text>
            <TextInput
              placeholder="Write a brief introduction…"
              multiline
              value={updatedData.bio}
              onChangeText={(t) => handleInputChange('bio', makeEvent(t))}
              placeholderTextColor={placeholderColor}
              style={[input, tw`h-24`]}
            />
          </View>

          {/* Pricing (web ranges) */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Rates (1 token = $1 USD)</Text>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              {(Object.keys(TOKEN_RANGES) as TokenField[]).map((field) => {
                const { min, max } = TOKEN_RANGES[field];
                const label = field.replace(/([A-Z])/g, ' $1');
                return (
                  <View key={field} style={tw`w-1/2 px-2 mb-3`}>
                    <Text style={tw`text-sm text-gray-400 mb-1`}>
                      {label} (Min {min}, Max {max})
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(updatedData.pricing[field] ?? '')}
                      onChangeText={(t) => handlePricingChange(field, t)}
                      placeholderTextColor={placeholderColor}
                      style={tw`w-full p-2 rounded bg-gray-700 text-gray-200 border border-gray-600`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expertise */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map((opt) => {
                const on = updatedData.expertise.includes(opt);
                return (
                  <TouchableOpacity key={opt} onPress={() => handleExpertiseSelect(opt)} style={on ? pillOn : pillOff}>
                    <Text style={on ? tw`text-white` : tw`text-gray-300`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Experience Level */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Experience Level</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.experienceLevel}
                onValueChange={(val: string) => handleInputChange('experienceLevel', val as any)}
                style={[pickerStyle, { color: updatedData.experienceLevel ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Select experience level…" value="" color={placeholderColor} />
                {['Beginner','Intermediate','Advanced','Expert'].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} color="#000" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Age Groups You Teach */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Age Groups You Teach</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map((g) => {
                const on = updatedData.ageGroup.includes(g);
                return (
                  <TouchableOpacity key={g} onPress={() => handleAgeGroupSelect(g)} style={on ? pillOn : pillOff}>
                    <Text style={on ? tw`text-white` : tw`text-gray-300`}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Teaching Styles */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['One-on-One','Group','Workshop','Lecture'].map((s) => {
                const on = updatedData.teachingStyle.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => handleTeachingStyleSelect(s)} style={on ? pillOn : pillOff}>
                    <Text style={on ? tw`text-white` : tw`text-gray-300`}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Payout Preferences (Wise/M-Pesa, derived currency) */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Payout Preferences</Text>

            {/* Method */}
            <Text style={tw`text-gray-300 mb-2`}>Payout Method</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.payoutMethod ?? 'wise'}
                onValueChange={(method: 'wise' | 'mpesa') =>
                  setUpdatedData(prev => ({
                    ...prev,
                    payoutMethod: method,
                    payoutCurrency: method === 'mpesa' ? 'KES' : 'USD',
                  }))
                }
                style={[pickerStyle, { color: selectedColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Wise (USD)" value="wise" color="#000" />
                <Picker.Item label="M-Pesa (KES)" value="mpesa" color="#000" />
              </Picker>
            </View>

            {/* Derived currency (read-only) */}
            <Text style={tw`text-gray-400 mb-1`}>Payout Currency</Text>
            <View style={tw`flex-row items-center justify-between bg-gray-700 rounded px-3 py-3 mb-3`}>
              <Text style={tw`text-white`}>{payoutCurrency}</Text>
              <Text style={tw`text-gray-400 text-xs`}>Wise → USD • M-Pesa → KES</Text>
            </View>

            {/* Method details */}
            {updatedData.payoutMethod !== 'mpesa' && (
              <TextInput
                placeholder="Wise account email"
                value={updatedData.wiseEmail || ''}
                onChangeText={(t) => setUpdatedData(prev => ({ ...prev, wiseEmail: t }))}
                placeholderTextColor={placeholderColor}
                style={input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {updatedData.payoutMethod === 'mpesa' && (
              <TextInput
                placeholder="+2547XXXXXXXX"
                value={updatedData.mpesaPhoneNumber || ''}
                onChangeText={(t) => setUpdatedData(prev => ({ ...prev, mpesaPhoneNumber: t }))}
                placeholderTextColor={placeholderColor}
                style={input}
                keyboardType="phone-pad"
              />
            )}
          </View>

          {/* Gallery */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Profile Image</Text>
            <View style={tw`w-40 h-40 rounded-lg overflow-hidden bg-gray-700 border border-gray-600`}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={tw`w-full h-full`} resizeMode="cover" />
              ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-gray-400`}>No image</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row mt-3`}>
              {imageUri ? (
                <>
                  <TouchableOpacity onPress={pickImage} style={tw`bg-pink-600 px-3 py-2 rounded mr-2`}>
                    <Text style={tw`text-white`}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteImage(0)} style={tw`bg-gray-700 px-3 py-2 rounded`}>
                    <Text style={tw`text-white`}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={pickImage} style={tw`bg-pink-600 px-3 py-2 rounded`}>
                  <Text style={tw`text-white`}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Video */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Intro Video (≈30s)</Text>
            <View style={tw`rounded-lg overflow-hidden bg-black`}>
              {videoUri ? (
                <VideoView
                  player={previewPlayer}
                  style={tw`w-full h-40`}
                  nativeControls
                  contentFit="contain"
                  allowsFullscreen
                  allowsPictureInPicture
                />
              ) : (
                <View style={tw`w-full h-40 items-center justify-center bg-gray-700`}>
                  <Text style={tw`text-gray-300`}>No video uploaded</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row mt-3`}>
              {videoUri ? (
                <>
                  <TouchableOpacity onPress={async () => await replaceVideo()} style={tw`bg-pink-600 px-3 py-2 rounded mr-2`}>
                    <Text style={tw`text-white`}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteVideo} style={tw`bg-gray-700 px-3 py-2 rounded`}>
                    <Text style={tw`text-white`}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={async () => await replaceVideo()} style={tw`bg-pink-600 px-3 py-2 rounded`}>
                  <Text style={tw`text-white`}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recommendations */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Recommendations</Text>
            <TextInput
              placeholder="Search profiles…"
              onChangeText={(t) => handleSearch(makeEvent(t))}
              placeholderTextColor={placeholderColor}
              style={input}
            />
            {searchResults.length > 0 && (
              <View style={tw`bg-gray-700 rounded p-2 mt-2`}>
                {searchResults.map((p) => (
                  <View key={p._id} style={tw`flex-row items-center justify-between p-2 border-b border-gray-600 last:border-b-0`}>
                    <Text style={tw`text-white`}>{p.name}</Text>
                    <TouchableOpacity onPress={() => handleAddRecommendation(p._id)} style={tw`bg-pink-600 px-3 py-1 rounded`}>
                      <Text style={tw`text-white text-sm`}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={tw`text-gray-300 font-semibold mt-3 mb-2`}>Selected</Text>
            {updatedData.recommended.length > 0 ? (
              updatedData.recommended.map((id) => {
                const prof = availableProfiles.find((x: { _id: string; name?: string }) => x._id === id);
                if (!prof) return null;
                return (
                  <View key={id} style={tw`flex-row items-center justify-between bg-gray-700 p-3 rounded mb-2`}>
                    <Text style={tw`text-white flex-1`}>{prof.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveRecommendation(id)}>
                      <Text style={tw`text-red-400 text-lg`}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={tw`text-gray-500`}>No recommendations.</Text>
            )}
          </View>
        </>
      )}

      {/* Submit */}
      <TouchableOpacity
        disabled={isUploading}
        onPress={() => {
          const v = validateBeforeSubmit();
          if (!v.ok) {
            Alert.alert('Fix required', v.msg);
            return;
          }
          handleSubmit();
        }}
        style={tw`bg-pink-600 py-3 rounded-lg items-center`}
      >
        <Text style={tw`text-white font-semibold`}>{isUploading ? 'Updating…' : 'Update Profile'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
