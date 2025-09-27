// apps/mobile/src/screens/CreateProfileForm.native.tsx
/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useVideoPlayer, VideoView } from 'expo-video'; // ✅ expo-video
import { useProfileForm } from '@mytutorapp/shared/hooks';
import type { UploadAsset } from '@mytutorapp/shared/types';
import tw from '../../tailwind';

type RootStackParamList = { Home: undefined };
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

/** Match web min/max ranges (tokens == USD) */
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },   // per learner
  workshop:       { min: 5, max: 100 },
  lecture:        { min: 5, max: 100 },
};

function isUploadAsset(obj: unknown): obj is UploadAsset {
  return !!obj && typeof (obj as UploadAsset).uri === 'string';
}

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

/* ───────────────── Region / Country / Grade band (compact) ──────────────── */
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
  // Middle East
  | 'qa' | 'sa' | 'ae' | 'kw' | 'bh' | 'om' | 'jo' | 'lb';

type BandKey =
  | 'preprimary'
  | 'primary'
  | 'lower-secondary'
  | 'upper-secondary'
  | 'sixth-form'
  | 'tvet'
  | 'tertiary'
  | 'adults';

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
    { key: 'lower-secondary', label: 'Junior School (Grades 7–9)' },
    { key: 'upper-secondary', label: 'Senior School (Grades 10–12)' },
    { key: 'tvet', label: 'TVET' },
    { key: 'tertiary', label: 'University / College' },
  ],
  ng: [
    { key: 'primary', label: 'Primary (Basic 1–6)' },
    { key: 'lower-secondary', label: 'JSS (JSS 1–3)' },
    { key: 'upper-secondary', label: 'SSS (SS 1–3)' },
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
    { key: 'upper-secondary', label: 'Sekundarstufe II (Gymnasium)' },
    { key: 'tertiary', label: 'Hochschule / Universität' },
  ],
  es: [
    { key: 'primary', label: 'Educación Primaria' },
    { key: 'lower-secondary', label: 'ESO' },
    { key: 'upper-secondary', label: 'Bachillerato' },
    { key: 'tertiary', label: 'Universidad' },
  ],
  it: [
    { key: 'primary', label: 'Primaria' },
    { key: 'lower-secondary', label: 'Secondaria di I grado' },
    { key: 'upper-secondary', label: 'Secondaria di II grado' },
    { key: 'tertiary', label: 'Università' },
  ],
  pl: [
    { key: 'primary', label: 'Szkoła podstawowa' },
    { key: 'upper-secondary', label: 'Liceum / Technikum' },
    { key: 'tertiary', label: 'Uniwersytet' },
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
    { key: 'upper-secondary', label: 'Senior Cycle (Leaving Cert)' },
    { key: 'tertiary', label: 'Higher Education' },
  ],
  pt: [
    { key: 'primary', label: 'Ensino Básico (1º ciclo)' },
    { key: 'lower-secondary', label: 'Ensino Básico (2º/3º ciclos)' },
    { key: 'upper-secondary', label: 'Ensino Secundário' },
    { key: 'tertiary', label: 'Ensino Superior' },
  ],
  // Asia
  in: [
    { key: 'primary', label: 'Primary (Classes 1–5)' },
    { key: 'lower-secondary', label: 'Upper Primary / Middle (6–8)' },
    { key: 'upper-secondary', label: 'Secondary / Higher Secondary (9–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  cn: [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Junior Secondary' },
    { key: 'upper-secondary', label: 'Senior Secondary' },
    { key: 'tertiary', label: 'University' },
  ],
  jp: [
    { key: 'primary', label: 'Shōgakkō (Elementary)' },
    { key: 'lower-secondary', label: 'Chūgakkō (Lower Secondary)' },
    { key: 'upper-secondary', label: 'Kōtōgakkō (Upper Secondary)' },
    { key: 'tertiary', label: 'Daigaku (University)' },
  ],
  kr: [
    { key: 'primary', label: 'Elementary' },
    { key: 'lower-secondary', label: 'Middle' },
    { key: 'upper-secondary', label: 'High' },
    { key: 'tertiary', label: 'University' },
  ],
  // South America
  br: [
    { key: 'primary', label: 'Ensino Fundamental I (1–5)' },
    { key: 'lower-secondary', label: 'Ensino Fundamental II (6–9)' },
    { key: 'upper-secondary', label: 'Ensino Médio (10–12)' },
    { key: 'tertiary', label: 'Ensino Superior' },
  ],
  ar: [
    { key: 'primary', label: 'Primaria' },
    { key: 'upper-secondary', label: 'Secundaria' },
    { key: 'tertiary', label: 'Universidad' },
  ],
  cl: [
    { key: 'primary', label: 'Educación Básica' },
    { key: 'upper-secondary', label: 'Educación Media' },
    { key: 'tertiary', label: 'Educación Superior' },
  ],
  co: [
    { key: 'primary', label: 'Básica Primaria' },
    { key: 'lower-secondary', label: 'Básica Secundaria' },
    { key: 'upper-secondary', label: 'Media' },
    { key: 'tertiary', label: 'Superior' },
  ],
  // North America
  us: [
    { key: 'primary', label: 'Elementary (K–5)' },
    { key: 'lower-secondary', label: 'Middle (6–8)' },
    { key: 'upper-secondary', label: 'High (9–12)' },
    { key: 'tertiary', label: 'Community College / University' },
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
  // Oceania
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

export default function CreateProfileFormNative() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const {
    role,
    // basics
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,

    // media
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,

    // payout (parity with web)
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // submit + step (to show background upload notice like web)
    loading, handleSubmit, step,
  } = useProfileForm({ onSuccess: () => navigation.navigate('Home') });

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

  // ---------- NEW: Region → Country → Grade Band (tutor UX helper) ----------
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

  // keep things coherent when region/country changes
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

  // ---------- Media pickers (images) ----------
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

  // ---------- Media pickers (video) ----------
  const toSeconds = (raw?: number | null) => {
    const n = Number(raw ?? 0);
    return n > 1000 ? n / 1000 : n;
  };

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

  // -------- Native validations to mirror web --------
  const languagesSelected = useMemo(
    () => Object.values(languages).some(Boolean),
    [languages]
  );

  const onSubmitPress = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }
    if (!age.trim()) {
      Alert.alert('Missing age', 'Please enter your age.');
      return;
    }
    if (!languagesSelected) {
      Alert.alert('Languages', 'Select at least one language you speak.');
      return;
    }
    if (role === 'tutor') {
      if (!category) {
        Alert.alert('Category', 'Select your subject/skill category.');
        return;
      }
      if (payoutMethod === 'mpesa' && !mpesaPhoneNumber.trim()) {
        Alert.alert('M-Pesa', 'Enter your M-Pesa phone number.');
        return;
      }
      if (payoutMethod === 'wise' && !wiseEmail.trim()) {
        Alert.alert('Wise', 'Enter your Wise account email.');
        return;
      }
    }

    // parity with web: pass a dummy event shape
    handleSubmit({} as React.FormEvent);
  };

  // -------- Intro video preview (expo-video) --------
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

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`p-4 pb-10 gap-6`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
        Create Your Profile
      </Text>

      {/* Background upload notice parity */}
      {step === 'bg-video' && (
        <Text style={tw`text-sm text-gray-400`}>
          Uploading your intro video in the background… you can continue using the app.
        </Text>
      )}

      {/* Role display */}
      {role ? (
        <View style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Your Role</Text>
          <Text style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}>
            {role}
          </Text>
        </View>
      ) : (
        <Text style={tw`text-gray-400`}>Fetching your role…</Text>
      )}

      {/* Name */}
      <View style={tw`gap-2`}>
        <Text style={tw`text-base text-gray-400`}>Your Name</Text>
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9CA3AF"
          style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
        />
      </View>

      {/* Age */}
      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
      />

      {/* Language chips */}
      <View style={tw`gap-2`}>
        <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {Object.keys(languages).map(lang => {
            const on = languages[lang];
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageSelect(lang)}
                style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
              >
                <Text style={on ? tw`text-white` : tw`text-gray-400`}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Student-only: Age group */}
      {role === 'student' && (
        <View style={tw`gap-2`}>
          <Text style={tw`text-base font-semibold text-gray-400`}>Age Group</Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(g => {
              const on = ageGroup.includes(g);
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => handleAgeGroupChange(g)}
                  style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                >
                  <Text style={on ? tw`text-white` : tw`text-gray-400`}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Tutor-only */}
      {role === 'tutor' && (
        <View style={tw`gap-4`}>
          {/* NEW: Region → Country → Grade Band helper */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Region</Text>
            <Picker selectedValue={region} onValueChange={(v) => setRegion(v as RegionKey)} style={tw`bg-gray-800 rounded`}>
              <Picker.Item label="Africa" value="africa" />
              <Picker.Item label="Asia" value="asia" />
              <Picker.Item label="Europe" value="europe" />
              <Picker.Item label="Middle East" value="middle-east"/>
              <Picker.Item label="North America" value="north-america" />
              <Picker.Item label="South America" value="south-america" />
              <Picker.Item label="Oceania" value="oceania" />
              
            </Picker>
          </View>

          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Country</Text>
            <Picker selectedValue={country} onValueChange={(v) => setCountry(v as CountryCode)} style={tw`bg-gray-800 rounded`}>
              {COUNTRIES_BY_REGION[region].map((c) => (
                <Picker.Item key={c.code} label={c.label} value={c.code} />
              ))}
            </Picker>
          </View>

          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Grade Band</Text>
            <Picker selectedValue={bandKey} onValueChange={(v) => setBandKey(v as BandKey)} style={tw`bg-gray-800 rounded`}>
              <Picker.Item label="Select grade band…" value="" />
              {bands.map((b) => (
                <Picker.Item key={b.key} label={b.label} value={b.key} />
              ))}
            </Picker>
            <Text style={tw`text-xs text-gray-400`}>
              Tip: This helps you think in the local structure. You’ll still control your “Age Groups You Teach” below.
            </Text>
          </View>

          {/* Category (subject category minimal) */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Subject / Skill Category</Text>
            <Picker
              selectedValue={category}
              onValueChange={(v) => setCategory(v)}
              style={tw`bg-gray-800 rounded`}
            >
              <Picker.Item label="Select a category…" value="" />
              {SUBJECT_CATEGORIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>

          {/* Payout Preferences (Wise/M-Pesa) */}
          <View style={tw`gap-3`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Payout Preferences</Text>

            <View>
              <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Method</Text>
              <Picker
                selectedValue={payoutMethod}
                onValueChange={v => setPayoutMethod(v)}
                style={tw`bg-gray-800 rounded`}
              >
                <Picker.Item label="Wise (USD)" value="wise" />
                <Picker.Item label="M-Pesa (KES)" value="mpesa" />
              </Picker>
            </View>

            <View>
              <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Currency</Text>
              <Text style={tw`w-full p-3 rounded bg-gray-800 text-white`}>{payoutCurrency}</Text>
              <Text style={tw`text-xs text-gray-400 mt-1`}>
                Wise pays out in USD to your Wise account. M-Pesa payouts settle in KES; FX conversion happens at payout time.
              </Text>
            </View>

            {payoutMethod === 'wise' && (
              <View>
                <Text style={tw`text-sm text-gray-400 mb-1`}>Wise account email</Text>
                <TextInput
                  placeholder="you@yourdomain.com"
                  value={wiseEmail}
                  onChangeText={setWiseEmail}
                  placeholderTextColor="#9CA3AF"
                  style={tw`w-full p-3 rounded bg-gray-800 text-white`}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {payoutMethod === 'mpesa' && (
              <View style={tw`gap-1`}>
                <Text style={tw`text-base text-gray-400`}>M-Pesa Phone Number</Text>
                <TextInput
                  placeholder="+2547XXXXXXXX"
                  value={mpesaPhoneNumber}
                  onChangeText={setMpesaPhoneNumber}
                  placeholderTextColor="#9CA3AF"
                  style={tw`w-full p-3 rounded bg-gray-800 text-white`}
                  keyboardType="phone-pad"
                />
              </View>
            )}
          </View>

          {/* Age groups you teach */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Age Groups You Teach</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(group => {
                const on = ageGroup.includes(group);
                return (
                  <TouchableOpacity
                    key={group}
                    onPress={() => handleAgeGroupChange(group)}
                    style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                  >
                    <Text style={on ? tw`text-white` : tw`text-gray-400`}>{group}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Teaching styles */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['One-on-One','Group','Workshop','Lecture'].map(s => {
                const on = teachingStyle.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() =>
                      setTeachingStyle(prev => (on ? prev.filter(i => i !== s) : [...prev, s]))
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
              style={tw`w-full h-24 p-3 rounded bg-gray-800 text-white text-base`}
            />
          </View>

          {/* Expertise */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(skill => {
                const on = expertise.includes(skill);
                return (
                  <TouchableOpacity
                    key={skill}
                    onPress={() =>
                      setExpertise(prev => (on ? prev.filter(i => i !== skill) : [...prev, skill]))
                    }
                    style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                  >
                    <Text style={on ? tw`text-white` : tw`text-gray-400`}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Pricing (same copy as web) */}
          <View style={tw`gap-4`}>
            <Text style={tw`text-base text-gray-400`}>Set Your Rates (1 token = $1 USD)</Text>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              {pricingFields.map(field => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`w-1/2 px-2 mb-4`}>
                    <Text style={tw`text-sm text-gray-300`}>
                      {field.replace(/([A-Z])/g,' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g,' $1')} Tokens`}
                      value={pricing[field]}
                      onChangeText={t => handlePricingChange(field, t)}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      style={tw`w-full p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                    />
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
              style={tw`w-24 h-24 border items-center justify-center rounded bg-gray-800`}
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
                <View style={tw`w-24 h-24 border items-center justify-center rounded bg-gray-800 overflow-hidden`}>
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
  );
}
