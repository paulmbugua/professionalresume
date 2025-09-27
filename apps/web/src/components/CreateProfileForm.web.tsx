// apps/web/src/components/CreateProfileForm.web.tsx
import React, { FC, useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileForm } from '@mytutorapp/shared/hooks';

/* ───────────────────────── Minimal subjects (major categories) ───────────────────────── */
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

/* ───────────────────────── Regions / Countries / Bands (compact) ───────────────────────── */
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

/* ───────────────────────── Pricing config (unchanged) ───────────────────────── */
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },
  workshop:       { min: 5, max: 100 },
  lecture:        { min: 5, max: 100 },
};
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

/* ───────────────────────── Local storage for region/country ───────────────────────── */
const REGION_KEY = 'profile:region';
const COUNTRY_KEY = 'profile:country';
function loadRegion(): RegionKey {
  try { return (localStorage.getItem(REGION_KEY) as RegionKey) || 'africa'; } catch { return 'africa'; }
}
function saveRegion(r: RegionKey) { try { localStorage.setItem(REGION_KEY, r); } catch {} }
function loadCountry(): CountryCode | null {
  try { return (localStorage.getItem(COUNTRY_KEY) as CountryCode) || null; } catch { return null; }
}
function saveCountry(c: CountryCode) { try { localStorage.setItem(COUNTRY_KEY, c); } catch {} }

/* ───────────────────────── Form Component ───────────────────────── */
const CreateProfileForm: FC = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // refs used by your existing validation
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const langSectionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const mpesaRef = useRef<HTMLInputElement>(null);
  const wiseRef = useRef<HTMLInputElement>(null);

  const {
    role,
    // basics
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,                 // we’ll reuse this for Subject Category
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,

    // media
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,

    // payout prefs
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // submit
    loading, handleSubmit, step,
  } = useProfileForm({
    onSuccess: () => navigate('/'),
  });

  /* ── New tutor geography+band state ── */
  const [region, setRegion] = useState<RegionKey>(() => loadRegion());
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const [country, setCountry] = useState<CountryCode>(() => loadCountry() || countries[0]?.code || 'ke');
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

  // Persist region/country; ensure country fits region
  useEffect(() => { saveRegion(region); }, [region]);
  useEffect(() => {
    if (!countries.find(c => c.code === country)) {
      setCountry(countries[0]?.code ?? 'ke');
    }
    saveCountry(country);
  }, [region, countries, country]);

  // When country changes, reset band selection
  useEffect(() => { setBandKey(''); }, [country]);

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const form = formRef.current;
    if (form && !form.checkValidity()) {
      const firstInvalid = form.querySelector(':invalid') as HTMLElement & {
        reportValidity?: () => boolean;
      };
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
        firstInvalid.reportValidity?.();
      }
      return;
    }

    // custom checks from your original code
    if (Object.values(languages).every(v => !v)) {
      langSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (role === 'tutor' && !category) {           // category is our Subject Category
      categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      categoryRef.current?.focus();
      return;
    }
    if (role === 'tutor' && !bandKey) {
      // light guard: must pick a grade band
      alert('Please choose your primary Grade Band.');
      return;
    }
    if (role === 'tutor' && payoutMethod === 'mpesa' && !mpesaPhoneNumber) {
      mpesaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mpesaRef.current?.focus();
      return;
    }
    if (role === 'tutor' && payoutMethod === 'wise' && !wiseEmail) {
      wiseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      wiseRef.current?.focus();
      return;
    }

    // Inject region/country/band into the underlying submit (if your hook reads from the form)
    // Hidden inputs provide these extra fields without changing the hook’s API.
    const hiddenRegion = document.createElement('input');
    hiddenRegion.type = 'hidden';
    hiddenRegion.name = 'region';
    hiddenRegion.value = region;

    const hiddenCountry = document.createElement('input');
    hiddenCountry.type = 'hidden';
    hiddenCountry.name = 'country';
    hiddenCountry.value = country;

    const hiddenBandKey = document.createElement('input');
    hiddenBandKey.type = 'hidden';
    hiddenBandKey.name = 'gradeBandKey';
    hiddenBandKey.value = bandKey;

    const hiddenBandLabel = document.createElement('input');
    hiddenBandLabel.type = 'hidden';
    hiddenBandLabel.name = 'gradeBandLabel';
    hiddenBandLabel.value = bands.find(b => b.key === bandKey)?.label || '';

    form?.appendChild(hiddenRegion);
    form?.appendChild(hiddenCountry);
    form?.appendChild(hiddenBandKey);
    form?.appendChild(hiddenBandLabel);

    handleSubmit(e);
  };

  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';

  const chipOn = 'bg-pink-500 text-white border-pink-500';
  const chipOff = 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary border-transparent';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
      <form
        ref={formRef}
        onSubmit={onFormSubmit}
        className="space-y-6 p-4 sm:p-6 rounded-2xl border border-[#cedbe8] 
                   dark:border-darkCard bg-white dark:bg-[#0f1821] shadow-sm 
                   max-w-2xl mx-auto text-[#0d141c] dark:text-darkTextPrimary"
      >
        <h2 className="text-2xl font-bold text-center">Create Your Profile</h2>

        {/* Background video upload notice */}
        {step === 'bg-video' && (
          <div className="text-sm text-[#49739c] dark:text-darkTextSecondary">
            Uploading your intro video in the background… you can continue using the app.
          </div>
        )}

        {/* Role display */}
        {role ? (
          <div className="space-y-2">
            <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">Your Role</label>
            <p className={inputBase}>{role}</p>
          </div>
        ) : (
          <p className="text-[#49739c] dark:text-darkTextSecondary">Fetching your role...</p>
        )}

        {/* Name */}
        <input
          ref={nameRef}
          name="name"
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputBase}
          required
        />

        {/* Age */}
        <input
          ref={ageRef}
          name="age"
          type="number"
          placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
          value={age}
          onChange={e => setAge(e.target.value)}
          className={inputBase}
          min={role === 'tutor' ? 18 : 5}
          required
        />

        {/* Language Selection */}
        <div ref={langSectionRef} className="space-y-2 mt-4">
          <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
            Select Languages You Speak
          </label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(languages).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageSelect(lang)}
                className={`p-2 rounded border text-sm sm:text-base ${languages[lang] ? chipOn : chipOff}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Student-only */}
        {role === 'student' && (
          <>
            <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mt-4">
              Age Group
            </h3>
            <div className="flex flex-wrap gap-3">
              {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(group => (
                <button
                  key={group}
                  type="button"
                  className={`p-2 rounded-lg text-sm sm:text-base ${ageGroup.includes(group) ? chipOn : chipOff}`}
                  onClick={() => handleAgeGroupChange(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tutor-only */}
        {role === 'tutor' && (
          <>
            {/* Geography (Region → Country) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionKey)}
                  className={inputBase}
                  required
                >
                  <option value="africa">Africa</option>
                  <option value="europe">Europe</option>
                  <option value="asia">Asia</option>
                  <option value="middle-east">Middle East</option>
                  <option value="north-america">North America</option>
                  <option value="south-america">South America</option>
                  <option value="oceania">Oceania</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                  Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className={inputBase}
                  required
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Category (reuses existing `category`) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Subject Category *
              </label>
              <select
                ref={categoryRef}
                name="category"
                value={category}
                onChange={e => setCategory(e.target.value as SubjectCategory)}
                className={inputBase}
                required
              >
                <option value="" disabled>Select a category</option>
                {SUBJECT_CATEGORIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Primary Grade Band (country-specific, compact) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Primary Grade Band *
              </label>
              <select
                value={bandKey}
                onChange={e => setBandKey(e.target.value as BandKey)}
                className={inputBase}
                required
              >
                <option value="" disabled>Select grade band…</option>
                {bands.map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                This helps learners find you by country and level (e.g., “Kenya · Junior School” or “UK · Sixth Form”).
              </p>
            </div>

            {/* Payout Preferences (unchanged) */}
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
                  name="payoutMethod"
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value as 'wise' | 'mpesa')}
                  className={inputBase}
                  required
                >
                  <option value="wise">Wise (USD)</option>
                  <option value="mpesa">M-Pesa (KES)</option>
                </select>
              </div>

              {/* Currency (read-only) */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Currency
                </label>
                <input className={inputBase} value={payoutCurrency} readOnly />
                <p className="text-xs mt-1 text-[#49739c] dark:text-darkTextSecondary">
                  Wise pays in USD to your Wise account. M-Pesa payouts settle in KES.
                </p>
              </div>

              {/* Method details */}
              {payoutMethod === 'wise' && (
                <div>
                  <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                    Wise account email
                  </label>
                  <input
                    ref={wiseRef}
                    type="email"
                    placeholder="you@yourdomain.com"
                    value={wiseEmail}
                    onChange={e => setWiseEmail(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>
              )}

              {payoutMethod === 'mpesa' && (
                <div className="space-y-2">
                  <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                    M-Pesa Phone Number
                  </label>
                  <input
                    ref={mpesaRef}
                    name="mpesaPhoneNumber"
                    type="text"
                    placeholder="+2547XXXXXXXX"
                    value={mpesaPhoneNumber}
                    onChange={e => setMpesaPhoneNumber(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>
              )}
            </div>

            {/* Age Groups You Teach (kept) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
                Age Groups You Teach
              </label>
              <div className="flex flex-wrap gap-3">
                {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(group => (
                  <button
                    key={group}
                    type="button"
                    className={`p-2 rounded-lg text-sm sm:text-base ${ageGroup.includes(group) ? chipOn : chipOff}`}
                    onClick={() => handleAgeGroupChange(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Teaching Styles (kept) */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mb-2">
                Teaching Styles
              </h3>
              <div className="flex flex-wrap gap-3">
                {['One-on-One', 'Group', 'Workshop', 'Lecture'].map(style => (
                  <button
                    key={style}
                    type="button"
                    className={`p-2 rounded-lg text-sm sm:text-base ${teachingStyle.includes(style) ? chipOn : chipOff}`}
                    onClick={() =>
                      setTeachingStyle(prev =>
                        prev.includes(style) ? prev.filter(item => item !== style) : [...prev, style]
                      )
                    }
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio (kept) */}
            <textarea
              name="bio"
              placeholder="A short bio about yourself..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className={`${inputBase} !min-h-[96px]`}
              rows={3}
            />

            {/* Expertise (kept) */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mb-2">
                Expertise
              </h3>
              <div className="flex flex-wrap gap-3">
                {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(skill => (
                  <button
                    key={skill}
                    type="button"
                    className={`p-2 rounded-lg text-sm sm:text-base ${expertise.includes(skill) ? chipOn : chipOff}`}
                    onClick={() =>
                      setExpertise(prev =>
                        prev.includes(skill) ? prev.filter(item => item !== skill) : [...prev, skill]
                      )
                    }
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing (kept) */}
            <div className="space-y-4">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Set Your Rates (1 token = $1 USD)
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {pricingFields.map(field => {
                  const { min, max } = tokenRanges[field];
                  return (
                    <div key={field} className="flex flex-col">
                      <label className="text-sm sm:text-base text-[#49739c] dark:text-darkTextSecondary">
                        {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                      </label>
                      <input
                        name={field}
                        type="number"
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                        value={(pricing as Record<PricingKeys, string>)[field] || ''}
                        onChange={e => handlePricingChange(field, e.target.value)}
                        className={`${inputBase} focus:outline-none focus:ring-2 focus:ring-pink-500`}
                        min={min}
                        max={max}
                        required
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                Tip: For group pricing, use price <strong>per learner</strong>.
              </p>
            </div>

            {/* Profile Image (kept) */}
            <label htmlFor="image1" className="space-y-2 cursor-pointer">
              <span className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Upload Profile Image
              </span>
              <div className="w-20 h-20 sm:w-24 sm:h-24 border border-[#cedbe8] dark:border-darkCard rounded-lg overflow-hidden bg-slate-50 dark:bg-[#0f1821] flex items-center justify-center">
                {(() => {
                  const first = (images as any[])[0];
                  let src: string;
                  if (first instanceof File) src = URL.createObjectURL(first);
                  else if (typeof first === 'string') src = first;
                  else if (first && typeof first === 'object' && 'url' in first) src = (first as any).url;
                  else src = '/upload_placeholder.png';
                  return <img src={src} alt="" className="w-full h-full object-cover" />;
                })()}
              </div>
              <input
                id="image1"
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) (setImages as any)([file]);
                }}
              />
            </label>

            {/* Intro Video (kept) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Introduction Video
              </label>
              <div className="flex items-center justify-center sm:justify-start gap-4">
                {videoPreview ? (
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-slate-50 dark:bg-[#0f1821] rounded-lg overflow-hidden">
                    <video src={videoPreview} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remove video"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="video-upload"
                    className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 bg-[#e7edf4] dark:bg-[#172534] rounded-lg cursor-pointer hover:opacity-90"
                    title="Upload video"
                  >
                    <span>Upload Video</span>
                  </label>
                )}
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      (handleVideoChange as any)(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-[#3d99f5] hover:brightness-110 text-white py-3 rounded-lg text-base sm:text-lg"
          disabled={loading}
        >
          {loading
            ? (step === 'uploading' ? 'Uploading images…'
              : step === 'creating' ? 'Creating profile…'
              : 'Creating profile…')
            : 'Create Profile'}
        </button>
      </form>
    </div>
  );
};

export default CreateProfileForm;
