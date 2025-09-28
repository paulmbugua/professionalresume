/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import axios from 'axios';
import {
  ProfilePayload, Role, UploadAsset,
  PayoutCurrency, PayoutMethod,
} from '@mytutorapp/shared/types';
import { fetchUserRole, createProfileJson } from '@mytutorapp/shared/api/profileApi';
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset';
import { getDirectSignature, directUploadToCloudinary } from '@mytutorapp/shared/api/cloudinaryDirect';
import { useShopContext } from '@mytutorapp/shared/context';

export interface UseProfileFormOptions {
  onSuccess?: () => void;
  token?: string;
  notify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/* ───────────────────────── Local validation ───────────────────────── */
const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ───────────────────────── Region / Country / Bands ───────────────────────── */
type RegionKey =
  | 'africa'
  | 'europe'
  | 'asia'
  | 'south-america'
  | 'north-america'
  | 'oceania'
  | 'middle-east';

type CountryCode =
  | 'ke' | 'ng' | 'za' | 'gh' | 'ug' | 'tz' | 'eg' | 'ma'
  | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pl' | 'nl' | 'ie' | 'pt'
  | 'in' | 'cn' | 'jp' | 'kr'
  | 'br' | 'ar' | 'cl' | 'co'
  | 'us' | 'ca' | 'mx'
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

const REGION_KEY = 'profile:region';
const COUNTRY_KEY = 'profile:country';

const loadRegion = (): RegionKey => {
  try { return (localStorage.getItem(REGION_KEY) as RegionKey) || 'africa'; } catch { return 'africa'; }
};
const saveRegion = (r: RegionKey) => { try { localStorage.setItem(REGION_KEY, r); } catch {} };
const loadCountry = (): CountryCode | null => {
  try { return (localStorage.getItem(COUNTRY_KEY) as CountryCode) || null; } catch { return null; }
};
const saveCountry = (c: CountryCode) => { try { localStorage.setItem(COUNTRY_KEY, c); } catch {} };

// Regions → Countries
const COUNTRIES_BY_REGION: Record<RegionKey, { code: CountryCode; label: string }[]> = {
  africa: [
    { code: 'ke', label: 'Kenya' }, { code: 'ng', label: 'Nigeria' }, { code: 'za', label: 'South Africa' },
    { code: 'gh', label: 'Ghana' }, { code: 'ug', label: 'Uganda' }, { code: 'tz', label: 'Tanzania' },
    { code: 'eg', label: 'Egypt' }, { code: 'ma', label: 'Morocco' },
  ],
  europe: [
    { code: 'uk', label: 'United Kingdom' }, { code: 'fr', label: 'France' }, { code: 'de', label: 'Germany' },
    { code: 'es', label: 'Spain' }, { code: 'it', label: 'Italy' }, { code: 'pl', label: 'Poland' },
    { code: 'nl', label: 'Netherlands' }, { code: 'ie', label: 'Ireland' }, { code: 'pt', label: 'Portugal' },
  ],
  asia: [
    { code: 'in', label: 'India' }, { code: 'cn', label: 'China' }, { code: 'jp', label: 'Japan' }, { code: 'kr', label: 'South Korea' },
  ],
  'south-america': [
    { code: 'br', label: 'Brazil' }, { code: 'ar', label: 'Argentina' }, { code: 'cl', label: 'Chile' }, { code: 'co', label: 'Colombia' },
  ],
  'north-america': [
    { code: 'us', label: 'United States' }, { code: 'ca', label: 'Canada' }, { code: 'mx', label: 'Mexico' },
  ],
  oceania: [
    { code: 'au', label: 'Australia' }, { code: 'nz', label: 'New Zealand' },
  ],
  'middle-east': [
    { code: 'ae', label: 'United Arab Emirates' }, { code: 'sa', label: 'Saudi Arabia' }, { code: 'qa', label: 'Qatar' },
    { code: 'kw', label: 'Kuwait' }, { code: 'bh', label: 'Bahrain' }, { code: 'om', label: 'Oman' },
    { code: 'jo', label: 'Jordan' }, { code: 'lb', label: 'Lebanon' },
  ],
};

// Country → Grade Bands
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
  // Middle East
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

/* ───────────────────────── Hook ───────────────────────── */
const useProfileForm = (options?: UseProfileFormOptions) => {
  const { onSuccess, token: tokenProp, notify } = options ?? {};
  const { token: contextToken, refreshProfile, backendUrl } = useShopContext();
  const token = tokenProp ?? contextToken ?? '';

  // role
  const {
    data: role,
    isLoading: isRoleLoading,
    error: roleError,
  } = useAppQuery<Role, Error>(
    ['userRole', token],
    async () => {
      const r = await fetchUserRole(backendUrl, token);
      return r as Role;
    },
    { enabled: Boolean(token) }
  );

  useEffect(() => {
    if (roleError) {
      console.error('useProfileForm → roleError:', roleError);
      notify?.('Error fetching user role', 'error');
    }
  }, [roleError, notify]);

  // form state...
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState<Record<string, boolean>>({
    English: false, Swahili: false, French: false, Spanish: false, German: false,
  });

  // Student-only age group (tutors won’t send it)
  const [ageGroup, setAgeGroup] = useState<string[]>([]);

  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [teachingStyle, setTeachingStyle] = useState<string[]>([]);
  const [pricing, setPricing] = useState({
    privateSession: '', groupSession: '', lecture: '', workshop: '',
  });

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('wise');
  const payoutCurrency: PayoutCurrency = payoutMethod === 'mpesa' ? 'KES' : 'USD';

  const [images, setImages] = useState<(UploadAsset | File | null)[]>([null, null, null, null]);
  const [video, setVideo] = useState<UploadAsset | File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [step, setStep] =
    useState<'idle' | 'uploading' | 'creating' | 'done' | 'bg-video'>('idle');

  // NEW: Region / Country / Grade Band state (owned by the hook)
  const [region, setRegion] = useState<RegionKey>(() => loadRegion());
  const countries = COUNTRIES_BY_REGION[region] ?? [];
  const [country, setCountry] = useState<CountryCode>(() => loadCountry() || (countries[0]?.code ?? 'ke'));
  useEffect(() => { saveRegion(region); }, [region]);
  useEffect(() => {
    // keep country within region
    if (!countries.find(c => c.code === country)) {
      setCountry(countries[0]?.code ?? 'ke');
    }
    saveCountry(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, country]);

  const bands: GradeBand[] = COUNTRY_GRADE_BANDS[country] ?? [
    { key: 'primary', label: 'Primary' },
    { key: 'lower-secondary', label: 'Lower Secondary' },
    { key: 'upper-secondary', label: 'Upper Secondary' },
    { key: 'tertiary', label: 'Tertiary' },
  ];
  const [bandKey, setBandKey] = useState<BandKey | ''>('');
  useEffect(() => { setBandKey(''); }, [country]);

  const handleLanguageSelect = (language: string) =>
    setLanguages(prev => ({ ...prev, [language]: !prev[language] }));

  const handleAgeGroupChange = (value: string) =>
    setAgeGroup(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));

  const handlePricingChange = (field: keyof typeof pricing, value: string) =>
    setPricing(prev => ({ ...prev, [field]: value }));

  const handleVideoChange = (asset: UploadAsset | File) => {
    if ('duration' in asset && asset.duration != null) {
      const raw = asset.duration as number;
      const durSec = raw > 1000 ? raw / 1000 : raw;
      if (durSec > 30) throw new Error('Video must be 30 seconds or shorter');
    }
    setVideo(asset);
    if ('uri' in asset) setVideoPreview((asset as any).uri);
    else if (typeof window !== 'undefined' && 'createObjectURL' in URL) {
      setVideoPreview(URL.createObjectURL(asset as File));
    } else {
      setVideoPreview(null);
    }
  };

  const handleRemoveVideo = () => { setVideo(null); setVideoPreview(null); };

  const mutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!role) throw new Error('Role not loaded');

      const selectedLanguages = Object.keys(languages).filter(l => languages[l]);

      const uploadImages = async (): Promise<string[]> => {
        if (role !== 'tutor') return [];
        const valid = images.filter((i): i is UploadAsset | File => i !== null);
        if (valid.length === 0) throw new Error('At least one profile image is required.');
        return Promise.all(valid.map(async (file) => {
          const uri = file instanceof File ? file : (file as any).uri ?? (file as any).url;
          if (!uri) throw new Error('Invalid image asset.');
          return uploadAsset(backendUrl, token, uri, 'image');
        }));
      };

      setStep('uploading');
      const gallery = await uploadImages();

      if (role === 'tutor') {
        if (payoutMethod === 'mpesa') {
          if (!MPESA_REGEX.test(mpesaPhoneNumber)) {
            throw new Error('Valid M-Pesa phone number is required for KES payouts.');
          }
        } else if (payoutMethod === 'wise') {
          if (!EMAIL_REGEX.test(wiseEmail)) {
            throw new Error('A valid Wise account email is required for USD payouts.');
          }
        }
      }

      const toNumber = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
        };

      const payload: ProfilePayload = {
        role: role as Role,
        name: name.trim(),
        age: Number(age),
        languages: selectedLanguages,
        // ⬇️ Only students send ageGroup now
        ...(role === 'student' && { ageGroup }),
        ...(role === 'tutor' && {
          category,
          description: { bio, expertise, teachingStyle },
          pricing: {
            privateSession: toNumber(pricing.privateSession),
            groupSession: toNumber(pricing.groupSession),
            lecture: toNumber(pricing.lecture),
            workshop: toNumber(pricing.workshop),
          },
          payoutCurrency,
          payoutMethod,
          ...(payoutMethod === 'mpesa' && { mpesaPhoneNumber }),
          ...(payoutMethod === 'wise' && { wiseEmail: wiseEmail.trim() }),
          gallery,
          // NEW geo + grade bands
          region,
          country, // 2-letter (lowercase here; backend uppercases)
          gradeBands: (() => {
            const chosen = bands.find(b => b.key === bandKey);
            return chosen ? [chosen.label] : [];
          })(),
        }),
      };

      if (process.env.NODE_ENV !== 'production') {
        try { console.log('🔎 useProfileForm → payload (no video):', JSON.stringify(payload, null, 2)); } catch {}
      }

      setStep('creating');
      let res;
      try {
        res = await createProfileJson(backendUrl, token, payload);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('❌ useProfileForm → error response:', err.response.data);
          }
          throw new Error(err.response.data.message);
        }
        throw err;
      }

      if (res.status !== 201) throw new Error(`Unexpected status: ${res.status}`);

      // Background video upload (unchanged)
      if (role === 'tutor' && video) {
        setStep('bg-video');
        (async () => {
          try {
            let blobOrFile: File | Blob | null = null;
            if (video instanceof File) blobOrFile = video;
            else {
              const src = (video as any).uri || (video as any).url;
              if (src) {
                const resp = await fetch(src);
                blobOrFile = await resp.blob();
              }
            }
            if (!blobOrFile) return;

            const sig = await getDirectSignature(backendUrl, token, {
              resourceType: 'video', folder: 'class_vault',
            });

            const videoUrl = await directUploadToCloudinary(blobOrFile, {
              cloudName: sig.cloudName,
              apiKey: sig.apiKey,
              signature: sig.signature,
              timestamp: sig.timestamp,
              folder: sig.folder,
              resourceType: 'video',
            });

            await axios.patch(
              `${backendUrl}/api/profile/video`,
              { video: videoUrl },
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            notify?.('Your intro video has been processed.', 'success');
          } catch (bgErr: any) {
            console.error('Background video upload failed:', bgErr);
            notify?.('Video upload failed in background. You can re-upload from your profile.', 'error');
          } finally {
            setStep('done');
          }
        })();
      } else {
        setStep('done');
      }

      return res.data;
    },

    onSuccess: () => {
      notify?.('Profile created successfully!', 'success');
      refreshProfile?.();
      onSuccess?.();
      setTimeout(() => { if (step !== 'bg-video') setStep('idle'); }, 600);
    },

    onError: (err: Error) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message || err.message) : err.message;
      console.error('useProfileForm error:', msg);
      notify?.(msg, 'error');
      setStep('idle');
    },
  });

  const [wiseEmail, setWiseEmail] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');

  const handleSubmit = (e?: React.FormEvent) => { e?.preventDefault?.(); mutation.mutate(); };

  return {
    role, isRoleLoading, roleError,
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange, // student only; component guards visibility
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    images, setImages,
    video, videoPreview, handleVideoChange, handleRemoveVideo,
    loading: mutation.isPending,
    step,
    submitError: mutation.error,
    handleSubmit,

    // NEW exposed geo/band state
    region, setRegion,
    country, setCountry,
    bandKey, setBandKey,
    bands, countries,
  };
};

export default useProfileForm;
export { useProfileForm };
