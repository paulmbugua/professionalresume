// packages/shared/hooks/useManageProfileForm.ts
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  UpdatedProfileData,
  AvailableProfile,
  MappedProfile,
  GalleryImage,
  UpdateProfilePayload,
  PayoutCurrency,
  PayoutMethod,
} from '@mytutorapp/shared/types';
import {
  fetchMyProfile,
  fetchAvailableProfiles,
  updateProfile as apiUpdateProfile,
  deleteGalleryImage as apiDeleteGalleryImage,
  deleteVideo as apiDeleteVideo,
} from '@mytutorapp/shared/api';
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset';
import { useShopContext } from '@mytutorapp/shared/context';
import useAppQuery from '@mytutorapp/shared/hooks/useAppQuery';

/* -------------------------- Notifier (DI) -------------------------- */
export type Notifier = {
  success?: (msg: string) => void;
  error?: (msg: string) => void;
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
};

export type UseManageProfileFormOptions = {
  notify?: Notifier;
};

const NOOP_NOTIFY: Required<Notifier> = {
  success: (m) => console.log('[success]', m),
  error:   (m) => console.error('[error]', m),
  info:    (m) => console.log('[info]', m),
  warn:    (m) => console.warn('[warn]', m),
};

/* ---------------------------- Helpers ----------------------------- */
const short = (s?: string | null) => (s ? `${s.slice(0, 12)}…` : '—');
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FileLike = unknown;
function isString(v: unknown): v is string { return typeof v === 'string'; }
function toBool(v: unknown): boolean { return v === true || v === 'true'; }
function valOf(input: unknown): string {
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return String(input);
  if (input && typeof input === 'object' && 'target' in (input as any)) {
    const t = (input as any).target;
    if (t && typeof t.value !== 'undefined') return String(t.value);
  }
  return '';
}

/* ------------------------ Geo/Bands source ------------------------ */
export type RegionKey =
  | 'africa' | 'europe' | 'asia' | 'south-america'
  | 'north-america' | 'oceania' | 'middle-east';

export type CountryCode =
  | 'ke' | 'ng' | 'za' | 'gh' | 'ug' | 'tz' | 'eg' | 'ma'
  | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pl' | 'nl' | 'ie' | 'pt'
  | 'in' | 'cn' | 'jp' | 'kr'
  | 'br' | 'ar' | 'cl' | 'co'
  | 'us' | 'ca' | 'mx'
  | 'au' | 'nz'
  | 'qa' | 'sa' | 'ae' | 'kw' | 'bh' | 'om' | 'jo' | 'lb';

export type BandKey =
  | 'preprimary' | 'primary' | 'lower-secondary' | 'upper-secondary'
  | 'sixth-form' | 'tvet' | 'tertiary' | 'adults';

type GradeBand = { key: BandKey; label: string };

const REGION_OPTIONS: { label: string; value: RegionKey }[] = [
  { label: 'Africa', value: 'africa' },
  { label: 'Asia', value: 'asia' },
  { label: 'Europe', value: 'europe' },
  { label: 'Middle East', value: 'middle-east' },
  { label: 'North America', value: 'north-america' },
  { label: 'South America', value: 'south-america' },
  { label: 'Oceania', value: 'oceania' },
];

const COUNTRIES_BY_REGION: Record<RegionKey, { code: CountryCode; label: string }[]> = {
  africa: [
    { code: 'ke', label: 'Kenya' }, { code: 'ng', label: 'Nigeria' },
    { code: 'za', label: 'South Africa' }, { code: 'gh', label: 'Ghana' },
    { code: 'ug', label: 'Uganda' }, { code: 'tz', label: 'Tanzania' },
    { code: 'eg', label: 'Egypt' }, { code: 'ma', label: 'Morocco' },
  ],
  europe: [
    { code: 'uk', label: 'United Kingdom' }, { code: 'fr', label: 'France' },
    { code: 'de', label: 'Germany' }, { code: 'es', label: 'Spain' },
    { code: 'it', label: 'Italy' }, { code: 'pl', label: 'Poland' },
    { code: 'nl', label: 'Netherlands' }, { code: 'ie', label: 'Ireland' },
    { code: 'pt', label: 'Portugal' },
  ],
  asia: [
    { code: 'in', label: 'India' }, { code: 'cn', label: 'China' },
    { code: 'jp', label: 'Japan' }, { code: 'kr', label: 'South Korea' },
  ],
  'south-america': [
    { code: 'br', label: 'Brazil' }, { code: 'ar', label: 'Argentina' },
    { code: 'cl', label: 'Chile' }, { code: 'co', label: 'Colombia' },
  ],
  'north-america': [
    { code: 'us', label: 'United States' }, { code: 'ca', label: 'Canada' },
    { code: 'mx', label: 'Mexico' },
  ],
  oceania: [
    { code: 'au', label: 'Australia' }, { code: 'nz', label: 'New Zealand' },
  ],
  'middle-east': [
    { code: 'ae', label: 'United Arab Emirates' }, { code: 'sa', label: 'Saudi Arabia' },
    { code: 'qa', label: 'Qatar' }, { code: 'kw', label: 'Kuwait' },
    { code: 'bh', label: 'Bahrain' }, { code: 'om', label: 'Oman' },
    { code: 'jo', label: 'Jordan' }, { code: 'lb', label: 'Lebanon' },
  ],
};

const COUNTRY_GRADE_BANDS: Partial<Record<CountryCode, GradeBand[]>> = {
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
    { key: 'primary', label: 'Primary (1–5)' },
    { key: 'lower-secondary', label: 'Middle / Preparatory (6–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  sa: [
    { key: 'primary', label: 'Primary (1–6)' },
    { key: 'lower-secondary', label: 'Intermediate (7–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  qa: [
    { key: 'primary', label: 'Primary (1–6)' },
    { key: 'lower-secondary', label: 'Preparatory (7–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  kw: [
    { key: 'primary', label: 'Primary (1–5)' },
    { key: 'lower-secondary', label: 'Intermediate (6–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  bh: [
    { key: 'primary', label: 'Primary (1–6)' },
    { key: 'lower-secondary', label: 'Intermediate (7–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  om: [
    { key: 'primary', label: 'Basic Education (1–10)' },
    { key: 'upper-secondary', label: 'Post-Basic / Secondary (11–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  jo: [
    { key: 'primary', label: 'Basic (1–10)' },
    { key: 'upper-secondary', label: 'Secondary (11–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
  lb: [
    { key: 'primary', label: 'Elementary (1–6)' },
    { key: 'lower-secondary', label: 'Intermediate (7–9)' },
    { key: 'upper-secondary', label: 'Secondary (10–12)' },
    { key: 'tertiary', label: 'University / College' },
  ],
};

/* -------------------- Initial profile defaults -------------------- */
const initialProfileData: UpdatedProfileData = {
  name: '',
  age: 0,
  bio: '',
  expertise: [],
  teachingStyle: [],
  status: 'Offline',
  notifications: false,
  gallery: [null, null, null, null],
  video: '',
  languages: { English: false, Swahili: false, French: false, Spanish: false, German: false },
  pricing: { privateSession: 0, groupSession: 0, lecture: 0, workshop: 0 },
  experienceLevel: '',
  ageGroup: [],
  category: '',
  recommended: [],
  mpesaPhoneNumber: '',
  wiseEmail: '',
  payoutCurrency: 'USD',
  payoutMethod: 'wise',
};

/* ------------------------------- Hook ------------------------------ */
const useManageProfileForm = (
  navigate: (path: string) => void,
  options?: UseManageProfileFormOptions
) => {
  const notify = { ...NOOP_NOTIFY, ...(options?.notify ?? {}) };
  const { token, backendUrl, refreshProfile } = useShopContext();
  const queryClient = useQueryClient();

  // 🌍 geo state (shared across web/native)
  const [region, setRegion] = useState<RegionKey>('africa');
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const [country, setCountry] = useState<CountryCode>(countries[0]?.code ?? 'ke');
  const bands = useMemo<GradeBand[]>(
    () =>
      COUNTRY_GRADE_BANDS[country] ?? [
        { key: 'primary', label: 'Primary' },
        { key: 'lower-secondary', label: 'Lower Secondary' },
        { key: 'upper-secondary', label: 'Upper Secondary' },
        { key: 'tertiary', label: 'Tertiary' },
      ],
    [country]
  );
  const [bandKey, setBandKey] = useState<BandKey | ''>('');

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

  const {
    data: rawProfileResponse,
    isLoading: isProfileLoading,
    error: profileError,
  } = useAppQuery<{ profileExists: boolean; profile: any }, Error>(
    ['myProfile', token],
    () => fetchMyProfile(backendUrl!, token!),
    { enabled: Boolean(token) }
  );

  const {
    data: availableProfiles = [],
    isLoading: isAvailableLoading,
    error: availableError,
  } = useAppQuery<AvailableProfile[], Error>(
    ['availableProfiles', token],
    () => fetchAvailableProfiles(backendUrl!, token!).then((r) => r.profiles),
    { enabled: Boolean(token) }
  );

  const [role, setRole] = useState<'tutor' | 'student' | ''>('');
  const [profile, setProfile] = useState<MappedProfile | null>(null);
  const [initialData, setInitialData] = useState<UpdatedProfileData | null>(null);
  const [updatedData, setUpdatedData] = useState<UpdatedProfileData>(initialProfileData);
  const [searchResults, setSearchResults] = useState<AvailableProfile[]>([]);

  useEffect(() => {
    if (!token) {
      notify.error('Please log in to manage your profile.');
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // hydrate from API
  useEffect(() => {
    if (!rawProfileResponse || !rawProfileResponse.profileExists) return;
    const raw = rawProfileResponse.profile;

    const galleryArray = Array.isArray(raw.gallery) ? raw.gallery : [];
    const normalizedStatus = raw.status === 'Free Session' ? 'Free' : raw.status;
    const gallery: GalleryImage[] = galleryArray
      .slice(0, 4)
      .concat(Array(Math.max(0, 4 - galleryArray.length)).fill(null));

    const {
      age_group,
      mpesa_phone_number,
      wise_email,
      experience_level,
      recommended,
      pricing,
      description,
      payout_currency,
      payout_method,
      region: rawRegion,
      country: rawCountry,
      gradeBands: rawGradeBands,
      ...rest
    } = raw;

    setRole(raw.role);
    setProfile(rest as MappedProfile);

    const languages: Record<string, boolean> = {
      English: false, Swahili: false, French: false, Spanish: false, German: false,
    };
    if (Array.isArray(raw.languages)) {
      raw.languages.forEach((lang: string) => {
        if (lang in languages) languages[lang] = true;
      });
    }

    const resolvedMethod: PayoutMethod =
      ((payout_method as PayoutMethod) || (mpesa_phone_number ? 'mpesa' : 'wise')) as PayoutMethod;

    const resolvedCurrency: PayoutCurrency =
      (payout_currency as PayoutCurrency) || (resolvedMethod === 'mpesa' ? 'KES' : 'USD');

    // 🌍 seed geo state from server if present
    const countryFromServer = (rawCountry as CountryCode) || 'ke';
    const regionFromServer =
      (rawRegion as RegionKey) ||
      (Object.keys(COUNTRIES_BY_REGION) as RegionKey[]).find((rk) =>
        COUNTRIES_BY_REGION[rk].some((c) => c.code === countryFromServer)
      ) ||
      'africa';
    setRegion(regionFromServer);
    setCountry(countryFromServer);
    const firstBand = Array.isArray(rawGradeBands) && rawGradeBands.length ? (rawGradeBands[0] as BandKey) : '';
    setBandKey(firstBand);

    const finalData: UpdatedProfileData = {
      ...initialProfileData,
      ...rest,
      gallery,
      status: normalizedStatus,
      video: raw.video || '',
      languages,
      pricing: pricing || initialProfileData.pricing,
      experienceLevel: experience_level || '',
      teachingStyle: description?.teachingStyle || [],
      ageGroup: age_group || [],
      bio: description?.bio || '',
      expertise: description?.expertise || [],
      category: raw.category || '',
      recommended: recommended || [],
      payoutCurrency: resolvedCurrency,
      payoutMethod: resolvedMethod,
      mpesaPhoneNumber: mpesa_phone_number || '',
      wiseEmail: wise_email || raw.wiseEmail || '',
    };

    setInitialData(finalData);
    setUpdatedData(finalData);
  }, [rawProfileResponse]);

  useEffect(() => {
    if (profileError) notify.error('Failed to load profile.');
    if (availableError) notify.error('Failed to load profiles.');
  }, [profileError, availableError, notify]);

  const isDataChanged = (a: UpdatedProfileData, b: UpdatedProfileData | null) =>
    JSON.stringify(a) !== JSON.stringify(b);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!initialData) throw new Error('No initial data');

      // Payout validation (tutor-only quick check)
      if (role === 'tutor') {
        if (updatedData.payoutMethod === 'mpesa') {
          if (!updatedData.mpesaPhoneNumber || !MPESA_REGEX.test(updatedData.mpesaPhoneNumber)) {
            throw new Error('Valid M-Pesa phone number is required for KES payouts.');
          }
        } else if (updatedData.payoutMethod === 'wise') {
          if (!updatedData.wiseEmail || !EMAIL_REGEX.test(updatedData.wiseEmail)) {
            throw new Error('A valid Wise account email is required for USD payouts.');
          }
        } else {
          throw new Error('Choose Wise or M-Pesa as your payout method.');
        }
      }

      // Uploads
      if (isDev) {
        console.debug('🧩 useManageProfileForm → starting upload prep', {
          hasToken: !!token,
          backendUrl,
          gallerySlots: updatedData.gallery.length,
          hasVideoFile: !isString(updatedData.video) && !!updatedData.video,
          hasVideoUrl: isString(updatedData.video) && !!updatedData.video,
        });
      }

      const rawGalleryResults = await Promise.all(
        updatedData.gallery.map(async (img, idx) => {
          if (!img) return null;
          if (isString(img)) {
            if (/^https?:\/\//i.test(img)) {
              if (isDev) console.debug(`📸 gallery[${idx}] kept as URL`, img);
              return img;
            }
            if (isDev) console.debug(`⬆️ gallery[${idx}] uploading dataURL/string…`);
            return uploadAsset(backendUrl!, token!, img, 'image');
          }
          if (isDev) console.debug(`⬆️ gallery[${idx}] uploading file-like…`);
          return uploadAsset(backendUrl!, token!, img as any, 'image');
        })
      );

      const finalGallery = rawGalleryResults.filter((u): u is string => !!u);
      if (isDev) console.debug('📦 gallery upload done → count:', finalGallery.length);

      // Prefer undefined (not null) when no video
      let finalVideo: string | undefined;
      if (!updatedData.video) {
        finalVideo = undefined;
      } else if (isString(updatedData.video)) {
        finalVideo = updatedData.video || undefined;
      } else {
        finalVideo = await uploadAsset(backendUrl!, token!, updatedData.video as any, 'video');
      }

      const computedCurrency: PayoutCurrency =
        updatedData.payoutMethod === 'mpesa' ? 'KES' : 'USD';

      // include geo + bands in tutor payload
      const payload: (UpdateProfilePayload & {
        region?: RegionKey;
        country?: CountryCode;
        gradeBands?: BandKey[];
      }) = {
        name: updatedData.name ?? '',
        age: updatedData.age > 0 ? String(updatedData.age) : '',
        languages: Object.keys(updatedData.languages).filter(
          (l) => updatedData.languages[l as keyof typeof updatedData.languages]
        ),
        ageGroup: updatedData.ageGroup,
        pricing: updatedData.pricing,
        recommended: updatedData.recommended,
        ...(role === 'tutor'
          ? {
              gallery: finalGallery,
              video: finalVideo,
              status: updatedData.status,
              notifications: updatedData.notifications,
              experienceLevel: updatedData.experienceLevel,
              category: updatedData.category,
              payoutCurrency: computedCurrency,
              payoutMethod: updatedData.payoutMethod,
              mpesaPhoneNumber:
                updatedData.payoutMethod === 'mpesa' ? updatedData.mpesaPhoneNumber : undefined,
              wiseEmail:
                updatedData.payoutMethod === 'wise' ? updatedData.wiseEmail?.trim() : undefined,
              description: {
                bio: updatedData.bio ?? '',
                expertise: updatedData.expertise,
                teachingStyle: updatedData.teachingStyle,
              },
              region,
              country,
              gradeBands: bandKey ? [bandKey] : [],
            }
          : {}),
      };

      if (isDev) {
        console.debug('🔗 useManageProfileForm → backendUrl:', backendUrl);
        console.debug('🔐 useManageProfileForm → token(short):', short(token));
        console.debug('📤 useManageProfileForm → payload being sent:', JSON.stringify(payload, null, 2));
      }

      const res = await apiUpdateProfile(backendUrl!, token!, payload);

      if (isDev) {
        console.debug('📥 response status:', res?.status);
        try { console.debug('📥 response data keys:', Object.keys(res?.data ?? {})); } catch {}
      }

      if (res.status !== 200) throw new Error('Failed to update profile');
      return res.data;
    },
    onSuccess: async (data: any) => {
      const serverMsg = (data && (data.message || data.msg)) || 'Profile updated successfully!';
      notify.success(serverMsg);

      setInitialData(updatedData);
      refreshProfile?.();

      await queryClient.invalidateQueries({ queryKey: ['myProfile', token] });
      await queryClient.refetchQueries({ queryKey: ['myProfile', token] });

      navigate('/profile/me');
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { status?: number; data?: any }; message?: string };
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        'Failed to update profile.';
      if (isDev) {
        console.error('❌ useManageProfileForm → API error:', {
          status: anyErr?.response?.status,
          data: anyErr?.response?.data,
        });
      }
      notify.error(msg);
    },
  });

  /* ----------------------------- Handlers ---------------------------- */
  const handleInputChange = (
    field: keyof UpdatedProfileData,
    input: string | number | boolean | { target?: { value?: unknown } } | undefined
  ) => {
    const valueRaw = valOf(input);
    const next =
      typeof (updatedData as any)[field] === 'boolean'
        ? toBool(valueRaw)
        : typeof (updatedData as any)[field] === 'number'
        ? Number(valueRaw) || 0
        : valueRaw;
    setUpdatedData((prev) => ({ ...prev, [field]: next as any }));
  };

  const handleSearch = (input: string | { target?: { value?: unknown } }) => {
    const term = valOf(input).toLowerCase();
    setSearchResults(availableProfiles.filter((p) => p.name.toLowerCase().includes(term)));
  };

  const handlePricingChange = (
    field: keyof UpdatedProfileData['pricing'],
    value: string | number
  ) => {
    const num = typeof value === 'number' ? value : Number(valOf(value));
    setUpdatedData((prev) => ({ ...prev, pricing: { ...prev.pricing, [field]: num || 0 } }));
  };

  const handleLanguageSelect = (language: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      languages: { ...prev.languages, [language]: !prev.languages[language] },
    }));
  };

  const handleAddRecommendation = (id: string) => {
    setUpdatedData((prev) => ({ ...prev, recommended: [...prev.recommended, id] }));
  };
  const handleRemoveRecommendation = (id: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      recommended: prev.recommended.filter((pid) => pid !== id),
    }));
  };

  const handleExpertiseSelect = (opt: string) => {
    setUpdatedData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(opt)
        ? prev.expertise.filter(e => e !== opt)
        : [...prev.expertise, opt],
    }));
  };

  const handleAgeGroupSelect = (group: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      ageGroup: prev.ageGroup.includes(group)
        ? prev.ageGroup.filter((g) => g !== group)
        : [...prev.ageGroup, group],
    }));
  };

  const handleTeachingStyleSelect = (style: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      teachingStyle: prev.teachingStyle.includes(style)
        ? prev.teachingStyle.filter((s) => s !== style)
        : [...prev.teachingStyle, style],
    }));
  };

  const setGalleryItem = (index: number, value: string | FileLike | null) => {
    setUpdatedData((prev) => {
      const g = [...prev.gallery];
      g[index] = value as any;
      return { ...prev, gallery: g };
    });
  };

  const setVideo = async (value: string | FileLike | null) => {
    setUpdatedData((prev) => ({ ...prev, video: (value as any) ?? '' }));
  };

  const handleDeleteImage = (index: number) => {
    if (!profile?.id) return;
    const url = updatedData.gallery[index];
    if (typeof url !== 'string') return;
    apiDeleteGalleryImage(backendUrl!, token!, profile.id, url)
      .then(() => {
        setUpdatedData((prev) => {
          const g = [...prev.gallery];
          g[index] = null;
          return { ...prev, gallery: g };
        });
        notify.success('Image deleted successfully.');
      })
      .catch(() => notify.error('Failed to delete image.'));
  };

  const handleDeleteVideo = () => {
    if (!profile?.id || typeof updatedData.video !== 'string') return;
    apiDeleteVideo(backendUrl!, token!, profile.id, updatedData.video)
      .then(() => {
        setUpdatedData((prev) => ({ ...prev, video: '' }));
        notify.success('Video deleted successfully.');
      })
      .catch(() => notify.error('Failed to delete video.'));
  };

  const handleToggleNotifications = () => {
    setUpdatedData((prev) => ({ ...prev, notifications: !prev.notifications }));
  };

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!isDataChanged(updatedData, initialData)) {
      notify.info('No changes detected');
      return;
    }
    // light client-side guard for tutor geo
    if (role === 'tutor' && !bandKey) {
      notify.error('Please choose your primary Grade Band.');
      return;
    }
    updateMutation.mutate();
  };

  return {
    role,
    updatedData,
    setUpdatedData,
    availableProfiles,
    searchResults,

    // helpful flags for UI
    isProfileLoading,
    isAvailableLoading,
    isUploading: updateMutation.isPending,

    // field handlers (agnostic)
    handleInputChange,
    handleExpertiseSelect,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange,
    handleToggleNotifications,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,

    // media handlers
    setGalleryItem,
    setVideo,

    // destructive ops
    handleDeleteImage,
    handleDeleteVideo,

    // submit
    handleSubmit,

    // 🌍 geo exports for UI
    region, setRegion,
    country, setCountry,
    bandKey, setBandKey,
    countries,
    bands,
    regionOptions: REGION_OPTIONS,
  };
};

export default useManageProfileForm;
