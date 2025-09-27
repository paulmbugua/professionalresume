// apps/web/src/components/ClassVaultUpload.tsx
import React, { useState, ChangeEvent, FormEvent, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { uploadClassVaultAsset, UploadResult } from '@mytutorapp/shared/api/classVaultUploadApi';
import useUploadClassVault, { CreateRecordedVideoPayload } from '@mytutorapp/shared/hooks/useUploadClassVault';

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

/* ───────────────────────── Region / Country ───────────────────────── */
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

/* ───────────────────────── Country-specific grade bands ─────────────────────────
   Keep it to 3–5 bands per country. Each band has a short internal key to power tags. */
type BandKey =
  | 'preprimary'
  | 'primary'
  | 'lower-secondary'
  | 'upper-secondary'
  | 'sixth-form'        // UK style
  | 'tvet'
  | 'tertiary'
  | 'adults';

type GradeBand = { key: BandKey; label: string };

const COUNTRY_GRADE_BANDS: Partial<Record<CountryCode, GradeBand[]>> = {
  // Africa
  ke: [
    { key: 'preprimary', label: 'Pre-Primary (PP1–PP2)' },
    { key: 'primary', label: 'Primary (Grades 1–6)' },
    { key: 'lower-secondary', label: 'Junior School (Grades 7–9)' },
    { key: 'upper-secondary', label: 'Senior School (Grades 10–12)' },
    { key: 'tvet', label: 'TVET' },
    { key: 'tertiary', label: 'University / College' },
    { key: 'adults', label: 'Adults' },
  ],
  ng: [
    { key: 'primary', label: 'Primary (Basic 1–6)' },
    { key: 'lower-secondary', label: 'JSS (JSS 1–3)' },
    { key: 'upper-secondary', label: 'SSS (SS 1–3)' },
    { key: 'tertiary', label: 'Tertiary' },
    { key: 'adults', label: 'Adults' },
  ],
  za: [
    { key: 'preprimary', label: 'Grade R (Reception)' },
    { key: 'primary', label: 'Foundation/Intermediate (Grades 1–6)' },
    { key: 'lower-secondary', label: 'Senior Phase (Grades 7–9)' },
    { key: 'upper-secondary', label: 'FET (Grades 10–12)' },
    { key: 'tertiary', label: 'Tertiary' },
  ],
  gh: [
    { key: 'primary', label: 'Primary (B1–B6)' },
    { key: 'lower-secondary', label: 'JHS (JHS 1–3)' },
    { key: 'upper-secondary', label: 'SHS (SHS 1–3)' },
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
    { key: 'adults', label: 'Adults' },
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
    { key: 'adults', label: 'Adults' },
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

/* ───────────────────────── Exam tags for Upper Secondary ───────────────────────── */
const UPPER_SEC_EXAM_BY_COUNTRY: Partial<Record<CountryCode, string>> = {
  // Africa
  ke: 'kcse',
  ng: 'waec',
  za: 'nsc',
  gh: 'wassce',
  ug: 'uace',
  tz: 'acsee',
  eg: 'thanaweya-amma',
  ma: 'baccalaureat',

  // Europe
  uk: 'a-levels',
  fr: 'baccalaureat',
  de: 'abitur',
  es: 'ebau',
  it: 'maturita',
  pl: 'matura',
  nl: 'havo-vwo',
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
  mx: 'bachillerato',

  // Oceania
  au: 'atar',
  nz: 'ncea',
};

/* ───────────────────────── Local storage helpers ───────────────────────── */
const REGION_KEY = 'classvault:region';
const COUNTRY_KEY = 'classvault:country';

function loadRegion(): RegionKey {
  try { return (localStorage.getItem(REGION_KEY) as RegionKey) || 'africa'; } catch { return 'africa'; }
}
function saveRegion(r: RegionKey) { try { localStorage.setItem(REGION_KEY, r); } catch {} }
function loadCountry(): CountryCode | null {
  try { return (localStorage.getItem(COUNTRY_KEY) as CountryCode) || null; } catch { return null; }
}
function saveCountry(c: CountryCode) { try { localStorage.setItem(COUNTRY_KEY, c); } catch {} }

/* ───────────────────────── Component ───────────────────────── */
export default function ClassVaultUpload() {
  const navigate = useNavigate();
  const { role, backendUrl, token } = useShopContext();
  const { uploading: uploadingMeta, handleSubmitMetadata } = useUploadClassVault();

  // Region & country
  const [region, setRegion] = useState<RegionKey>(() => loadRegion());
  const [country, setCountry] = useState<CountryCode>(() => loadCountry() || 'ke'); // default Kenya

  // File-upload
  const [fileType, setFileType] = useState<'video' | 'pdf'>('video');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Metadata
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectCategory | ''>('');
  const [gradeBandKey, setGradeBandKey] = useState<BandKey | ''>('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [tags, setTags] = useState('');

  // Derived
  const countries = useMemo(() => COUNTRIES_BY_REGION[region], [region]);
  const bands = useMemo<GradeBand[]>(() => {
    const list = COUNTRY_GRADE_BANDS[country];
    // Fallback (rare): generic banding
    return list ?? [
      { key: 'primary', label: 'Primary' },
      { key: 'lower-secondary', label: 'Lower Secondary' },
      { key: 'upper-secondary', label: 'Upper Secondary' },
      { key: 'tertiary', label: 'Tertiary' },
      { key: 'adults', label: 'Adults' },
    ];
  }, [country]);

  // Persist
  useEffect(() => { saveRegion(region); }, [region]);
  useEffect(() => {
    // Ensure chosen country belongs to the region; if not, pick first
    if (!countries.find(c => c.code === country)) {
      setCountry(countries[0]?.code ?? 'ke');
    }
    saveCountry(country);
  }, [region, countries, country]);

  // Reset dependent fields when country changes
  useEffect(() => {
    setGradeBandKey('');
  }, [country]);

  /* ── Styles ── */
  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';
  const labelTone = 'text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary';
  const subtleTone = 'text-sm text-[#49739c] dark:text-darkTextSecondary';
  const headingTone = 'text-2xl font-bold text-center text-pink-600';
  const toggleBtn = (active: boolean) =>
    `px-4 py-2 rounded focus:outline-none transition ring-1 ${
      active
        ? 'bg-pink-600 text-white ring-pink-500'
        : 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary ring-transparent hover:opacity-90'
    }`;

  /* ── Upload handlers ── */
  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !backendUrl || !token) return;
    try {
      setProgress(0); setUploadedUrl(''); setUploadingFile(true);
      const { url }: UploadResult = await uploadClassVaultAsset(
        backendUrl, token, file, fileType, (pct) => setProgress(pct)
      );
      setProgress(100); setUploadedUrl(url);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
      setProgress(0); setUploadedUrl('');
    } finally { setUploadingFile(false); }
  };

  /* ── Auto-tags ── */
  function deriveAutoTags(): string[] {
    const t: string[] = [];
    t.push(`region:${region}`);
    if (country) t.push(`country:${country}`);
    if (gradeBandKey) t.push(`band:${gradeBandKey}`);
    if (subject) t.push(`subject:${subject}`);

    // Upper secondary exam tag (if applicable)
    if (gradeBandKey === 'upper-secondary' || gradeBandKey === 'sixth-form') {
      const exam = UPPER_SEC_EXAM_BY_COUNTRY[country];
      if (exam) t.push(`exam:${exam}`);
    }
    return t;
  }

  /* ── Submit ── */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !gradeBandKey || !price || !uploadedUrl) {
      alert('Please fill all required fields and select a file.');
      return;
    }

    const userTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const hidden = deriveAutoTags();
    const allTags = Array.from(new Set([...userTags, ...hidden]));

    // Store the human-friendly band label for display/search
    const bandLabel = bands.find(b => b.key === gradeBandKey)?.label ?? gradeBandKey;

    const payload: CreateRecordedVideoPayload = {
      title,
      subject,                     // major category
      grade_level: bandLabel,      // human label
      price: Number(price),
      duration: duration ? Number(duration) : undefined,
      tags: allTags,
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url: fileType === 'pdf' ? uploadedUrl : '',
    };

    try {
      await handleSubmitMetadata(payload);
      alert('Success! Your content is now uploaded.');
      setProgress(0); setUploadedUrl(''); navigate(-1);
    } catch (err: any) {
      alert('Submission failed: ' + (err.message || err));
    }
  };

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-darkBg">
        <p className="text-[#49739c] dark:text-darkTextSecondary">Checking permissions…</p>
      </div>
    );
  }
  if (role !== 'tutor') {
    return (
      <div className="flex items-center justify-center h-64 p-4 bg-slate-50 dark:bg-darkBg">
        <p className="text-red-600 dark:text-red-400 text-center text-lg">
          Access Denied<br />Only tutors can upload content.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
      <form
        onSubmit={onSubmit}
        className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 rounded-2xl border border-[#cedbe8]
                   dark:border-darkCard bg-white dark:bg-[#0f1821] shadow-sm
                   text-[#0d141c] dark:text-darkTextPrimary"
      >
        <h2 className={headingTone}>Upload To Earn!</h2>

        {/* Region */}
        <div>
          <label className={`${labelTone} block mb-1`}>Region *</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as RegionKey)}
            className={inputBase}
            required
          >
            <option value="africa">Africa</option>
            <option value="asia">Asia</option>
            <option value="europe">Europe</option>
            <option value="middle-east">Middle East</option>
            <option value="north-america">North America</option>
            <option value="oceania">Oceania</option>
            <option value="south-america">South America</option>
           </select>
        </div>

        {/* Country */}
        <div>
          <label className={`${labelTone} block mb-1`}>Country *</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className={inputBase}
            required
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className={`${labelTone} block mb-1`}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputBase}
            placeholder="Enter class title"
            required
          />
        </div>

        {/* Subject (major category) */}
        <div>
          <label className={`${labelTone} block mb-1`}>Subject Category *</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as SubjectCategory)}
            className={inputBase}
            required
          >
            <option value="" disabled>Select category…</option>
            {SUBJECT_CATEGORIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className={`${subtleTone} mt-1`}>
            Keep it broad—specific topics can go in tags (e.g., <span className="text-pink-600">algebra, optics, essay</span>).
          </p>
        </div>

        {/* Grade Band (country-specific, 3–5 items) */}
        <div>
          <label className={`${labelTone} block mb-1`}>Grade Band *</label>
          <select
            value={gradeBandKey}
            onChange={(e) => setGradeBandKey(e.target.value as BandKey)}
            className={inputBase}
            required
          >
            <option value="" disabled>Select grade band…</option>
            {bands.map((b) => (
              <option key={b.key} value={b.key}>{b.label}</option>
            ))}
          </select>
          <p className={`${subtleTone} mt-1`}>
            You’ll get auto-tags like <span className="text-pink-600">band:{gradeBandKey || '...'}</span>
            {gradeBandKey === 'upper-secondary' || gradeBandKey === 'sixth-form'
              ? <> and a country exam tag (e.g., <span className="text-pink-600">exam:{UPPER_SEC_EXAM_BY_COUNTRY[country]}</span>).</>
              : '.'}
          </p>
        </div>

        {/* Price */}
        <div>
          <label className={`${labelTone} block mb-1`}>Price in Tokens (1 Token = $1) *</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputBase}
            placeholder="e.g. 5"
            min={1}
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className={`${labelTone} block mb-1`}>Duration (mins)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputBase}
            placeholder="Optional"
            min={0}
          />
        </div>

        {/* Tags (free text) */}
        <div>
          <label className={`${labelTone} block mb-1`}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputBase}
            placeholder="comma-separated keywords (e.g., algebra, photosynthesis, essay)"
          />
          <p className={`${subtleTone} mt-1`}>
            We’ll auto-add: <span className="text-pink-600">region:{region}</span>,{' '}
            <span className="text-pink-600">country:{country}</span>,{' '}
            {gradeBandKey && <span className="text-pink-600">band:{gradeBandKey}</span>}
            {subject && <> , <span className="text-pink-600">subject:{subject}</span></>}
          </p>
        </div>

        {/* File Type Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setFileType('video'); setUploadedUrl(''); setProgress(0); }}
            className={toggleBtn(fileType === 'video')}
          >
            Video
          </button>
          <span className="text-[#49739c] dark:text-darkTextSecondary font-medium">or</span>
          <button
            type="button"
            onClick={() => { setFileType('pdf'); setUploadedUrl(''); setProgress(0); }}
            className={toggleBtn(fileType === 'pdf')}
          >
            Class Notes
          </button>
        </div>

        {/* File Picker */}
        <div>
          <label className={`${labelTone} block mb-1`}>
            {uploadingFile
              ? 'Uploading…'
              : uploadedUrl
              ? `✅ ${fileType === 'video' ? 'Video uploaded' : 'PDF selected'}`
              : `Select ${fileType === 'video' ? 'Video' : 'PDF'} *`}
          </label>

          <div className="flex items-center mb-2">
            <FontAwesomeIcon
              icon={faCloudUploadAlt as IconProp}
              className="mr-2 text-[#49739c] dark:text-darkTextSecondary"
            />
            <input
              type="file"
              accept={fileType === 'video' ? 'video/*' : 'application/pdf'}
              onChange={onFileChange}
              disabled={uploadingFile}
              className="focus:outline-none text-[#0d141c] dark:text-darkTextPrimary"
              required={!uploadedUrl}
            />
          </div>

          {/* Progress Bar */}
          {uploadingFile && (
            <div className="space-y-1">
              <div className="w-full h-2 rounded overflow-hidden bg-[#e7edf4] dark:bg-[#172534]">
                <div
                  className="h-full bg-pink-600 transition-all duration-300 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-sm text-[#49739c] dark:text-darkTextSecondary">
                {progress}%
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploadingMeta}
          className="w-full py-3 rounded-lg text-white bg-[#3d99f5] hover:brightness-110 transition disabled:opacity-50"
        >
          {uploadingMeta ? 'Submitting…' : 'Submit ClassVault'}
        </button>

        {/* Dev-only: Auto-tags preview */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-xs text-[#49739c] dark:text-darkTextSecondary pt-2">
            <strong>Auto-tags preview:</strong>{' '}
            {[...new Set([...deriveAutoTags(), ...tags.split(',').map(t=>t.trim()).filter(Boolean)])].join(', ') || '(none)'}
          </div>
        )}
      </form>
    </div>
  );
}
