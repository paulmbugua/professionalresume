/* -----------------------------------------------------------------------------
   Shared country / grade-band types & data
   Reuse across web + native (e.g., LoginPage, profile flows)
----------------------------------------------------------------------------- */

export type CountryCode =
  | 'ke' | 'ng' | 'za' | 'gh' | 'ug' | 'tz' | 'eg' | 'ma'
  | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pl' | 'nl' | 'ie' | 'pt'
  | 'in' | 'cn' | 'jp' | 'kr'
  | 'br' | 'ar' | 'cl' | 'co'
  | 'us' | 'ca' | 'mx'
  | 'au' | 'nz'
  | 'qa' | 'sa' | 'ae' | 'kw' | 'bh' | 'om' | 'jo' | 'lb';

export type BandKey =
  | 'preprimary'
  | 'primary'
  | 'lower-secondary'
  | 'upper-secondary'
  | 'sixth-form'
  | 'tvet'
  | 'tertiary'
  | 'adults';

export type GradeBand = { key: BandKey; label: string };

/** Country → available grade bands */
export const COUNTRY_GRADE_BANDS: Partial<Record<CountryCode, GradeBand[]>> = {
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

/** Alphabetical country list (labels used in selects) */
const COUNTRIES_UNSORTED = [
  { code: 'ae', label: 'United Arab Emirates' },
  { code: 'ar', label: 'Argentina' },
  { code: 'au', label: 'Australia' },
  { code: 'bh', label: 'Bahrain' },
  { code: 'br', label: 'Brazil' },
  { code: 'ca', label: 'Canada' },
  { code: 'cl', label: 'Chile' },
  { code: 'cn', label: 'China' },
  { code: 'co', label: 'Colombia' },
  { code: 'de', label: 'Germany' },
  { code: 'eg', label: 'Egypt' },
  { code: 'es', label: 'Spain' },
  { code: 'fr', label: 'France' },
  { code: 'gh', label: 'Ghana' },
  { code: 'ie', label: 'Ireland' },
  { code: 'in', label: 'India' },
  { code: 'it', label: 'Italy' },
  { code: 'jo', label: 'Jordan' },
  { code: 'jp', label: 'Japan' },
  { code: 'ke', label: 'Kenya' },
  { code: 'kr', label: 'South Korea' },
  { code: 'kw', label: 'Kuwait' },
  { code: 'lb', label: 'Lebanon' },
  { code: 'ma', label: 'Morocco' },
  { code: 'mx', label: 'Mexico' },
  { code: 'ng', label: 'Nigeria' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'nz', label: 'New Zealand' },
  { code: 'om', label: 'Oman' },
  { code: 'pl', label: 'Poland' },
  { code: 'pt', label: 'Portugal' },
  { code: 'qa', label: 'Qatar' },
  { code: 'sa', label: 'Saudi Arabia' },
  { code: 'tz', label: 'Tanzania' },
  { code: 'ug', label: 'Uganda' },
  { code: 'uk', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
  { code: 'za', label: 'South Africa' },
] satisfies ReadonlyArray<{ code: CountryCode; label: string }>;

export const COUNTRIES_ALL: { code: CountryCode; label: string }[] = [
  ...COUNTRIES_UNSORTED,
].sort((a, b) => a.label.localeCompare(b.label));