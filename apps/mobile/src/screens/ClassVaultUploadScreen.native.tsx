// apps/mobile/src/screens/ClassVaultUploadScreen.native.tsx
import React, { useMemo, useState } from 'react';
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

/** Country-level exam tag to auto-attach for upper-secondary */
const EXAM_TAG_BY_COUNTRY_UPPER: Partial<Record<CountryCode, string>> = {
  // Africa
  ke: 'kcse',
  ng: 'waec',
  za: 'nsc',
  gh: 'wassce',
  eg: 'thanaweya-amma',
  ma: 'baccalaureat',

  // Europe
  uk: 'a-levels',
  fr: 'baccalaureat',
  de: 'abitur',
  es: 'ebau',
  it: 'maturita',
  pl: 'matura',
  nl: 'vwo-havo',
  ie: 'leaving-certificate',
  pt: 'exame-secundario',

  // Asia
  in: 'aissce',
  cn: 'gaokao',
  jp: 'common-test',
  kr: 'suneung',

  // South America
  br: 'enem',
  ar: 'bachillerato',
  cl: 'paes',
  co: 'saber-11',

  // North America
  us: 'hs-diploma',
  ca: 'osddiploma',
  mx: 'bachillerato',

  // Oceania
  au: 'atar',
  nz: 'ncea',
};

/* ───────────────────────── Helpers ───────────────────────── */
type FileKind = 'video' | 'pdf';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

function deriveHiddenTags(
  region: RegionKey,
  country: CountryCode | '',
  bandKey: BandKey | '',
  subject: string,
  ects?: string
): string[] {
  const tags: string[] = [];
  if (region) tags.push(`region:${region}`);
  if (country) tags.push(`country:${country}`);
  if (bandKey) tags.push(`band:${bandKey}`);
  if (subject) tags.push(`subject:${subject}`);
  if (bandKey === 'upper-secondary' || bandKey === 'sixth-form') {
    const ex = country ? EXAM_TAG_BY_COUNTRY_UPPER[country] : undefined;
    if (ex) tags.push(`exam:${ex}`);
  }
  if (region === 'europe' && ects && /^\d+(\.\d+)?$/.test(String(ects).trim())) {
    tags.push(`ects:${String(ects).trim()}`);
  }
  return tags;
}

/* ───────────────────────── Component ───────────────────────── */
export default function ClassVaultUploadScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { role, uploading: uploadingMeta, handleFileUpload, handleSubmitMetadata } = useUploadClassVault();

  // file-upload
  const [fileType, setFileType] = useState<FileKind>('video');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  // region/country/band
  const [region, setRegion] = useState<RegionKey>('africa');
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const [country, setCountry] = useState<CountryCode>(countries[0]?.code ?? 'ke');
  const bands = useMemo<GradeBand[]>(
    () => COUNTRY_GRADE_BANDS[country] ?? [
      { key: 'primary', label: 'Primary' },
      { key: 'lower-secondary', label: 'Lower Secondary' },
      { key: 'upper-secondary', label: 'Upper Secondary' },
      { key: 'tertiary', label: 'Tertiary' },
    ],
    [country]
  );
  const [bandKey, setBandKey] = useState<BandKey | ''>('');

  // metadata
  const [title, setTitle] = useState<string>('');
  const [subject, setSubject] = useState<(typeof SUBJECT_CATEGORIES)[number] | ''>('');
  const [price, setPrice] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [ects, setEcts] = useState<string>(''); // optional for EU + tertiary

  // keep selections consistent when parent changes
  React.useEffect(() => {
    // reset country to first in list when region changes
    setCountry((prev) => {
      const exists = countries.find((c) => c.code === prev);
      return exists ? prev : (countries[0]?.code ?? prev);
    });
    // clear ECTS if leaving Europe
    if (region !== 'europe') setEcts('');
    // reset band when region changes
    setBandKey('');
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    // ensure band still valid for new country
    if (!bands.find((b) => b.key === bandKey)) setBandKey('');
  }, [country, bands]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!title || !subject || !bandKey || !price || !uploadedUrl) {
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

    // Title-friendly grade_level uses the selected band label
    const bandLabel = bands.find((b) => b.key === bandKey)?.label ?? '';

    // Merge user-provided tags + hidden smart tags
    const userTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const hidden = deriveHiddenTags(region, country, bandKey, subject || '', ects);
    const tagSet = Array.from(new Set([...userTags, ...hidden]));

    const payload: CreateRecordedVideoPayload = {
      title,
      subject,
      grade_level: bandLabel, // human-friendly label
      price: priceNum,
      duration: durationNum,
      tags: tagSet,
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

      {/* Uploading indicator */}
      {progress > 0 && progress < 100 && (
        <Text style={tw`text-center text-gray-300 mb-2`}>Uploading… {progress}%</Text>
      )}

      {/* Region → Country */}
      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker
          selectedValue={region}
          onValueChange={(v) => setRegion(v as RegionKey)}
          dropdownIconColor="#fff"
          style={tw`text-white`}
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

      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker
          selectedValue={country}
          onValueChange={(v) => setCountry(v as CountryCode)}
          dropdownIconColor="#fff"
          enabled={!!region}
          style={tw`text-white`}
        >
          <Picker.Item label="Select Country…" value="" />
          {countries.map((c) => (
            <Picker.Item key={c.code} label={c.label} value={c.code} />
          ))}
        </Picker>
      </View>

      {/* ECTS (Europe only, usually for tertiary) */}
      {region === 'europe' && (
        <TextInput
          placeholder="ECTS credits (optional)"
          placeholderTextColor="#aaa"
          value={ects}
          onChangeText={setEcts}
          keyboardType="numeric"
          style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
        />
      )}

      {/* Title */}
      <TextInput
        placeholder="Title *"
        placeholderTextColor="#aaa"
        value={title}
        onChangeText={setTitle}
        style={tw`bg-gray-800 p-3 rounded text-white mb-3`}
      />

      {/* Subject Category (minimal) */}
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

      {/* Grade Band (country-specific) */}
      <View style={tw`bg-gray-800 rounded mb-3 overflow-hidden`}>
        <Picker
          selectedValue={bandKey}
          onValueChange={(v) => setBandKey(v as BandKey)}
          dropdownIconColor="#fff"
          enabled={!!country}
          style={tw`text-white`}
        >
          <Picker.Item label="Select Grade Band…" value="" />
          {bands.map((b) => (
            <Picker.Item key={b.key} label={b.label} value={b.key} />
          ))}
        </Picker>
      </View>

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
          We’ll also add smart tags like{' '}
          <Text style={tw`text-pink-400`}>region:{region || '…'}</Text>
          {country ? <Text style={tw`text-pink-400`}> , country:{country}</Text> : null}
          {bandKey ? <Text style={tw`text-pink-400`}> , band:{bandKey}</Text> : null}
          {subject ? <Text style={tw`text-pink-400`}> , subject:{subject}</Text> : null}
          {region === 'europe' && ects ? <Text style={tw`text-pink-400`}> , ects:{ects}</Text> : null}
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
