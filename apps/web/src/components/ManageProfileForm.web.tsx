// apps/web/src/components/ManageProfileForm.web.tsx
import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import useManageProfileForm from '@mytutorapp/shared/hooks/useManageProfileForm';
import { toast } from 'react-toastify';

/* ───────────────────────── Status / Pricing Config ───────────────────────── */
const STATUS_OPTIONS = [
  { value: 'Online',  label: 'Online' },
  { value: 'Offline', label: 'Offline' },
  { value: 'Busy',    label: 'Busy' },
  { value: 'Free',    label: 'Free Session' },
  { value: 'New',     label: 'New' },
];

type PricingKey = 'privateSession' | 'groupSession' | 'lecture' | 'workshop';
const PRICING_KEYS: PricingKey[] = ['privateSession', 'groupSession', 'lecture', 'workshop'];

// 1 token = $1
const TOKEN_RANGES: Record<PricingKey, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50  },
  lecture:        { min: 5, max: 100 },
  workshop:       { min: 5, max: 100 },
};

const AGE_GROUPS = [
  'Pre-Primary',
  'Lower Primary',
  'Upper Primary',
  'University/College',
  'Adults',
];

const LANGUAGES = ['English', 'Swahili', 'French', 'Spanish', 'German'];

// same regex you use in the hook/backend
const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ───────────────────────── Subject categories (minimal) ───────────────────────── */
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
type SubjectCategory = typeof SUBJECT_CATEGORIES[number];

/* ───────────────────────── Region / Country / Bands (compact) ───────────────────────── */
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

/* ───────────────────────── LocalStorage helpers ───────────────────────── */
const REGION_LS = 'manageprofile:region';
const COUNTRY_LS = 'manageprofile:country';
const loadRegion = (): RegionKey => {
  try { return (localStorage.getItem(REGION_LS) as RegionKey) || 'africa'; } catch { return 'africa'; }
};
const loadCountry = (): CountryCode | null => {
  try { return (localStorage.getItem(COUNTRY_LS) as CountryCode) || null; } catch { return null; }
};
const saveRegion = (r: RegionKey) => { try { localStorage.setItem(REGION_LS, r); } catch {} };
const saveCountry = (c: CountryCode) => { try { localStorage.setItem(COUNTRY_LS, c); } catch {} };

/* ───────────────────────── Component ───────────────────────── */
const ManageProfileForm: FC = () => {
  const navigate = useNavigate();
  const { backendUrl } = useShopContext();

  // Refs for UX “scroll to error”
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const languagesRef = useRef<HTMLDivElement>(null);
  const ageGroupRef = useRef<HTMLDivElement>(null);

  const categoryRef = useRef<HTMLSelectElement>(null);
  const pricingRefs = useRef<Record<PricingKey, HTMLInputElement | null>>({
    privateSession: null,
    groupSession: null,
    lecture: null,
    workshop: null,
  });

  const payoutMethodRef = useRef<HTMLSelectElement>(null);
  const payoutCurrencyRef = useRef<HTMLInputElement>(null);
  const wiseEmailRef = useRef<HTMLInputElement>(null);
  const mpesaPhoneRef = useRef<HTMLInputElement>(null);

  const {
    role,
    updatedData,
    setUpdatedData,
    availableProfiles,
    searchResults,
    isUploading,

    handleInputChange,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange, // expects primitive (string|number)
    // no handleFileChange in the hook
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleExpertiseSelect,

    handleSubmit,
  } = useManageProfileForm(navigate);

  // Prefill payout defaults for tutors (and derive currency from method)
  useEffect(() => {
    if (role === 'tutor') {
      setUpdatedData(prev => {
        const next = { ...prev };
        if (next.payoutMethod !== 'wise' && next.payoutMethod !== 'mpesa') {
          next.payoutMethod = 'wise';
        }
        next.payoutCurrency = next.payoutMethod === 'mpesa' ? 'KES' : 'USD';
        return next;
      });
    }
  }, [role, setUpdatedData]);

  /* ── Local Region/Country/Band state (UI only; not in UpdatedProfileData) ── */
  const [region, setRegion] = useState<RegionKey>(() => loadRegion());
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const [country, setCountry] = useState<CountryCode>(() => {
    const fromLS = loadCountry();
    return fromLS || countries[0]?.code || 'ke';
  });

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

  // Persist region/country to LS; ensure valid country per region
  useEffect(() => { saveRegion(region); }, [region]);
  useEffect(() => {
    if (!countries.find(c => c.code === country)) {
      setCountry(countries[0]?.code ?? 'ke');
      return;
    }
    saveCountry(country);
  }, [region, countries, country]);
  // Clear band if not in current country bands
  useEffect(() => { if (!bands.find(b => b.key === bandKey)) setBandKey(''); }, [bands, bandKey]);

  const getFullUrl = (path: string) =>
    path?.startsWith('/') ? `${backendUrl}${path}` : path;

  /* ── UI Helpers ── */
  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';
  const chipOn  = 'bg-pink-500 text-white border-pink-500';
  const chipOff = 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary border-transparent';

  const scrollToEl = (el?: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).focus?.();
    el.classList.add('ring-2', 'ring-red-500');
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-red-500'), 2000);
  };

  /* ── Validation (uses local region/country/band) ── */
  const validateBeforeSubmit = (): true | { el?: HTMLElement | null; msg: string } => {
    if (!updatedData.name?.trim()) return { el: nameRef.current, msg: 'Please enter your name.' };

    const minAge = role === 'tutor' ? 18 : 5;
    if (!updatedData.age || updatedData.age < minAge) {
      return { el: ageRef.current, msg: `Please enter a valid age (${minAge}+).` };
    }

    const hasLang = Object.values(updatedData.languages || {}).some(Boolean);
    if (!hasLang) return { el: languagesRef.current, msg: 'Select at least one language.' };

    if (role === 'student') {
      if (!updatedData.ageGroup?.length) return { el: ageGroupRef.current, msg: 'Choose at least one age group.' };
      return true;
    }

    if (role === 'tutor') {
      if (!updatedData.category) return { el: categoryRef.current, msg: 'Please select a subject category.' };
      if (!region) return { msg: 'Please select a region.' };
      if (!country) return { msg: 'Please select a country.' };
      if (!bandKey) return { msg: 'Please select a grade band.' };

      for (const key of PRICING_KEYS) {
        const val = updatedData.pricing[key];
        const { min, max } = TOKEN_RANGES[key];
        if (!Number.isFinite(val) || val < min || val > max) {
          return { el: pricingRefs.current[key], msg: `Set a valid rate for ${key} (${min}-${max}).` };
        }
      }

      if (updatedData.payoutMethod === 'wise') {
        if (!updatedData.wiseEmail?.trim() || !EMAIL_REGEX.test(updatedData.wiseEmail)) {
          return { el: wiseEmailRef.current, msg: 'Enter a valid Wise account email.' };
        }
      } else if (updatedData.payoutMethod === 'mpesa') {
        if (!updatedData.mpesaPhoneNumber?.trim() || !MPESA_REGEX.test(updatedData.mpesaPhoneNumber)) {
          return { el: mpesaPhoneRef.current, msg: 'Enter a valid M-Pesa phone number.' };
        }
      } else {
        return { el: payoutMethodRef.current, msg: 'Choose Wise or M-Pesa as payout method.' };
      }
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = validateBeforeSubmit();
          if (result !== true) {
            toast.error(result.msg);
            scrollToEl(result.el);
            return;
          }
          handleSubmit(e);
        }}
        className="space-y-6 px-4 sm:px-6 pt-10 pb-16 sm:pt-12 sm:pb-20
                 rounded-2xl border border-[#cedbe8] dark:border-darkCard
                 bg-white dark:bg-[#0f1821] shadow-sm max-w-2xl mx-auto
                 text-[#0d141c] dark:text-darkTextPrimary"
      >
        {/* Role */}
        <p className="text-[#49739c] dark:text-darkTextSecondary">Role: {role || 'Loading…'}</p>

        {/* Name */}
        <input
          ref={nameRef}
          name="name"
          type="text"
          placeholder="Name"
          value={updatedData.name}
          onChange={e => handleInputChange('name', e)}
          className={inputBase}
        />

        {/* Age */}
        <input
          ref={ageRef}
          name="age"
          type="number"
          placeholder="Age"
          min={role === 'tutor' ? 18 : 5}
          value={updatedData.age?.toString() || ''}
          onChange={e => handleInputChange('age', e)}
          className={inputBase}
        />

        {/* Languages */}
        <div ref={languagesRef}>
          <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageSelect(lang)}
                className={`px-3 py-1 rounded-full border text-sm ${updatedData.languages[lang] ? chipOn : chipOff}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Student-only: Age Groups */}
        {role === 'student' && (
          <div ref={ageGroupRef}>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Age Groups</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleAgeGroupSelect(g)}
                  className={`px-3 py-1 rounded-full border text-sm ${updatedData.ageGroup.includes(g) ? chipOn : chipOff}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tutor Section */}
        {role === 'tutor' && (
          <>
            {/* Region → Country */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Region *</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionKey)}
                  className={inputBase}
                >
                  <option value="africa">Africa</option>
                  <option value="asia">Asia</option>
                  <option value="europe">Europe</option>
                       
                  <option value="middle-east">Middle East</option>
                  <option value="north-america">North America</option>
                  <option value="south-america">South America</option>
                  <option value="oceania">Oceania</option>
                </select>
              </div>
              <div>
                <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Country *</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className={inputBase}
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Category (minimal) */}
            <div>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Subject Category *</label>
              <select
                ref={categoryRef}
                name="category"
                value={updatedData.category}
                onChange={e => handleInputChange('category', e)}
                className={inputBase}
              >
                <option value="" disabled>Select category</option>
                {SUBJECT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary mt-1">
                Keep it broad—topics can go in your bio or tags (e.g., algebra, essay writing, optics).
              </p>
            </div>

            {/* Grade Band (country-specific) */}
            <div>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Primary Grade Band *</label>
              <select
                value={bandKey}
                onChange={(e) => setBandKey(e.target.value as BandKey)}
                className={inputBase}
              >
                <option value="" disabled>Select grade band…</option>
                {bands.map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary mt-1">
                Helps learners find you by country and level (e.g., “Kenya · Junior School”, “UK · Sixth Form”).
              </p>
            </div>

            {/* Status */}
            <select
              name="status"
              value={updatedData.status}
              onChange={e => handleInputChange('status', e)}
              className={inputBase}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Notifications */}
            <div className="flex items-center">
              <label className="text-[#49739c] dark:text-darkTextSecondary mr-2">Notifications</label>
              <input
                type="checkbox"
                checked={!!updatedData.notifications}
                onChange={() => handleToggleNotifications()}
                className="w-5 h-5 accent-pink-500"
              />
            </div>

            {/* Bio */}
            <textarea
              name="bio"
              rows={3}
              placeholder="Write a brief introduction…"
              value={updatedData.bio}
              onChange={e => handleInputChange('bio', e)}
              className={`${inputBase} !min-h-[96px]`}
            />

            {/* Pricing */}
            <div>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">
                Rates (1 token = $1 USD)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRICING_KEYS.map((field) => {
                  const { min, max } = TOKEN_RANGES[field];
                  return (
                    <div key={field}>
                      <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block">
                        {field.replace(/([A-Z])/g,' $1')} (Min {min} | Max {max})
                      </label>
                      <input
                        ref={el => { pricingRefs.current[field] = el; }}
                        type="number"
                        min={min}
                        max={max}
                        value={(updatedData.pricing[field] ?? '').toString()}
                        onChange={e => handlePricingChange(field, Number(e.target.value))}
                        className={`${inputBase} !p-2`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expertise */}
            <div>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Expertise</label>
              <div className="flex flex-wrap gap-2">
                {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleExpertiseSelect(opt)}
                    className={`px-3 py-1 rounded-full border text-sm ${updatedData.expertise.includes(opt) ? chipOn : chipOff}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Teaching Styles */}
            <div>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Teaching Styles</label>
              <div className="flex flex-wrap gap-2">
                {['One-on-One','Group','Workshop','Lecture'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => handleTeachingStyleSelect(style)}
                    className={`px-3 py-1 rounded-full border text-sm ${updatedData.teachingStyle.includes(style) ? chipOn : chipOff}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Groups You Teach */}
            <div ref={ageGroupRef}>
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Age Groups You Teach</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleAgeGroupSelect(g)}
                    className={`px-3 py-1 rounded-full border text-sm ${updatedData.ageGroup.includes(g) ? chipOn : chipOff}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Preferences */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
                Payout Preferences
              </h3>

              {/* Method */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Method
                </label>
                <select
                  ref={payoutMethodRef}
                  name="payoutMethod"
                  value={updatedData.payoutMethod}
                  onChange={(e) => {
                    const method = e.target.value as 'wise' | 'mpesa';
                    setUpdatedData(prev => ({
                      ...prev,
                      payoutMethod: method,
                      payoutCurrency: method === 'mpesa' ? 'KES' : 'USD',
                    }));
                  }}
                  className={inputBase}
                >
                  <option value="wise">Wise (USD)</option>
                  <option value="mpesa">M-Pesa (KES)</option>
                </select>
              </div>

              {/* Currency (derived, read-only) */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Currency
                </label>
                <input
                  ref={payoutCurrencyRef}
                  className={inputBase}
                  value={updatedData.payoutMethod === 'mpesa' ? 'KES' : 'USD'}
                  readOnly
                />
                <p className="text-xs mt-1 text-[#49739c] dark:text-darkTextSecondary">
                  Wise pays out in USD to your Wise account. M-Pesa payouts settle in KES.
                </p>
              </div>

              {/* Method details */}
              {updatedData.payoutMethod === 'wise' && (
                <div>
                  <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                    Wise account email
                  </label>
                  <input
                    ref={wiseEmailRef}
                    type="email"
                    placeholder="you@yourdomain.com"
                    value={updatedData.wiseEmail || ''}
                    onChange={e => setUpdatedData(prev => ({ ...prev, wiseEmail: e.target.value }))}
                    className={inputBase}
                  />
                </div>
              )}

              {updatedData.payoutMethod === 'mpesa' && (
                <div>
                  <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                    M-Pesa Phone Number
                  </label>
                  <input
                    ref={mpesaPhoneRef}
                    name="mpesaPhoneNumber"
                    placeholder="+2547XXXXXXXX"
                    value={updatedData.mpesaPhoneNumber || ''}
                    onChange={e => setUpdatedData(prev => ({ ...prev, mpesaPhoneNumber: e.target.value }))}
                    className={`${inputBase} mb-2`}
                  />
                </div>
              )}
            </div>

            {/* Gallery */}
            <div className="gallery-section mb-4">
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Upload Profile Image</label>
              <div className="w-40 h-40 border border-[#cedbe8] dark:border-darkCard rounded-lg overflow-hidden relative group bg-slate-50 dark:bg-[#0f1821]">
                <img
                  src={
                    updatedData.gallery[0] instanceof File
                      ? URL.createObjectURL(updatedData.gallery[0] as File)
                      : updatedData.gallery[0]
                      ? getFullUrl(updatedData.gallery[0] as string)
                      : '/upload_placeholder.png'
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {updatedData.gallery[0] && (
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(0)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      title="Delete Image"
                    >
                      &times;
                    </button>
                  )}
                  {/* Upload / Replace */}
                  <label className="p-2 bg-[#3d99f5] text-white rounded cursor-pointer">
                    {updatedData.gallery[0] ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          setUpdatedData(prev => {
                            const g = [...prev.gallery];
                            g[0] = dataUrl;
                            return { ...prev, gallery: g };
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Video */}
            <div className="video-section mb-4">
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Uploaded Video</label>
              <div className="relative rounded-lg overflow-hidden">
                {updatedData.video instanceof File ? (
                  <video
                    src={URL.createObjectURL(updatedData.video as File)}
                    controls
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : updatedData.video ? (
                  <video
                    src={getFullUrl(updatedData.video as string)}
                    controls
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-40 bg-[#e7edf4] dark:bg-[#172534] flex items-center justify-center text-[#49739c] dark:text-darkTextSecondary rounded-lg">
                    No video uploaded
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                  {updatedData.video && (
                    <button
                      type="button"
                      onClick={handleDeleteVideo}
                      className="p-2 bg-red-600 text-white rounded-full mr-2"
                    >
                      &times;
                    </button>
                  )}
                  <label className="p-2 bg-[#3d99f5] text-white rounded cursor-pointer">
                    {updatedData.video ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // UpdatedProfileData.video: string | File | ''
                        setUpdatedData(prev => ({ ...prev, video: file }));
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="recommendations-section mb-4">
              <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Recommendations</label>
              <input
                type="text"
                placeholder="Search profiles…"
                onChange={e => handleSearch(e)}
                className={`${inputBase} !p-2 mb-2`}
              />
              {searchResults.length > 0 && (
                <div className="bg-slate-50 dark:bg-[#0f1821] p-2 rounded mb-2 max-h-40 overflow-y-auto border border-[#cedbe8] dark:border-darkCard">
                  {searchResults.map(p => (
                    <div key={p._id} className="flex justify-between items-center p-2 even:bg-[#f6f9fc] dark:even:bg-[#101a27] rounded">
                      <span className="">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => handleAddRecommendation(p._id)}
                        className="bg-pink-500 px-3 py-1 rounded text-white"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {updatedData.recommended.length > 0 ? (
                  updatedData.recommended.map(id => {
                    const prof = availableProfiles.find(x => x._id === id);
                    return prof ? (
                      <div
                        key={id}
                        className="flex justify-between items-center p-2 bg-slate-50 dark:bg-[#0f1821] border border-[#cedbe8] dark:border-darkCard rounded hover:bg-[#f6f9fc] dark:hover:bg-[#101a27] transition-colors"
                      >
                        <span className="flex-1 truncate">{prof.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecommendation(id)}
                          className="text-[#49739c] hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-[#49739c] dark:text-darkTextSecondary">No recommendations yet.</p>
                )}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-[#3d99f5] hover:brightness-110 text-white py-3 rounded-lg transition-all duration-300 disabled:opacity-60"
        >
          {isUploading ? 'Updating Profile…' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default ManageProfileForm;
