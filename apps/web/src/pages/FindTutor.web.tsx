import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faMagnifyingGlass, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';

const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e7edf4&color=0d141c`;

const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages', 'English', 'History'] as const;
const RATINGS = [5, 4.5, 4, 3.5, 3] as const;
const AVAILABILITY = ['Weekdays', 'Weekends', 'Evenings', 'Mornings'] as const;
const LANGS_COMMON = ['English', 'Spanish', 'French', 'Arabic', 'Chinese', 'German'] as const;

type PriceRangeKey = 'any' | '0-20' | '20-40' | '40-60' | '60+';
const PRICE_RANGES: Record<PriceRangeKey, (n: number) => boolean> = {
  any: () => true,
  '0-20': (n) => n >= 0 && n < 20,
  '20-40': (n) => n >= 20 && n < 40,
  '40-60': (n) => n >= 40 && n < 60,
  '60+': (n) => n >= 60,
};

/** ── NEW: Regions/Countries (simple & extensible) ────────────────────────── */
type BandKey = 'US' | 'UK' | 'KE' | 'IN' | 'AE' | 'SA' | 'QA';
export const COUNTRIES_BY_REGION: Record<string, string[]> = {
  'Middle East': ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Egypt'],
  Africa: ['Kenya', 'Nigeria', 'South Africa', 'Ghana', 'Egypt'],
  Europe: ['United Kingdom', 'Germany', 'France', 'Spain', 'Italy'],
  Asia: ['India', 'Pakistan', 'Bangladesh', 'China', 'Japan', 'Philippines', 'Indonesia', 'Singapore'],
  Americas: ['United States', 'Canada', 'Brazil', 'Mexico'],
};
export const COUNTRY_GRADE_BANDS: Record<string, BandKey> = {
  'United States': 'US',
  'United Kingdom': 'UK',
  Kenya: 'KE',
  India: 'IN',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  Qatar: 'QA',
};
const REGIONS = Object.keys(COUNTRIES_BY_REGION);

/* utils */
const getRating = (p: any) => Number((p?.avgRating ?? p?.rating) ?? 0);
const getHourly = (p: any) =>
  typeof p?.pricing?.hourly === 'number'
    ? p.pricing.hourly
    : typeof p?.pricing?.price === 'number'
    ? p.pricing.price
    : undefined;

const normalizeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v.toLowerCase().trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).toLowerCase().trim();
  if (Array.isArray(v)) return v.map(normalizeStr).join(' ').trim();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const preferred = o.bio ?? o.overview ?? o.summary ?? o.title ?? o.name ?? o.label ?? o.text;
    return preferred ? normalizeStr(preferred) : Object.values(o).map(normalizeStr).join(' ').trim();
  }
  return '';
};

const getDescriptionText = (p: any): string => {
  const d = p?.description;
  if (typeof d === 'string') {
    // try to parse JSON-encoded description to pull bio if present
    try {
      const asObj = JSON.parse(d);
      if (asObj && typeof asObj === 'object' && typeof asObj.bio === 'string') return asObj.bio;
    } catch {
      /* plain string, fall through */
    }
    return d;
  }
  if (d && typeof d === 'object') {
    const bio = (d as any).bio ?? (d as any).overview ?? (d as any).summary;
    if (bio) return String(bio);
  }
  return '';
};

const tutorMatchesSubject = (p: Profile, subject: string) => {
  const cat = normalizeStr((p as any).category);
  const subj = normalizeStr(subject);
  if (cat.includes(subj)) return true;
  if (Array.isArray((p as any).expertise)) {
    return (p as any).expertise.some((e: any) => normalizeStr(String(e)).includes(subj));
  }
  return false;
};

const hasAvailability = (p: any, option: string) => {
  const opt = normalizeStr(option);
  const a = p?.availability;
  if (typeof a === 'string') return normalizeStr(a).includes(opt);
  if (Array.isArray(a)) return a.some((x) => normalizeStr(String(x)).includes(opt));
  const slots = p?.availableSlots;
  if (Array.isArray(slots)) return slots.some((x: any) => normalizeStr(String(x)).includes(opt));
  return true;
};

const hasLanguage = (p: any, lang: string) => {
  if (!lang) return true;
  const list = p?.languages;
  if (Array.isArray(list)) {
    return list.map((x) => normalizeStr(String(x))).includes(normalizeStr(lang));
  }
  return true;
};

const resolveImage = (p: any, backendUrl?: string, fallbackName?: string) => {
  const g0 = Array.isArray(p?.gallery) ? p.gallery[0] : undefined;
  if (typeof g0 === 'string' && g0.length > 0) {
    if (g0.startsWith('http://') || g0.startsWith('https://')) return g0;
    if (g0.startsWith('/') && backendUrl) {
      return `${backendUrl.replace(/\/+$/, '')}${g0}`;
    }
  }
  return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
};

const getDescriptionObj = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return {};
};

const PER_PAGE = 6;

const FindTutor: React.FC = () => {
  const { filteredProfiles, loading, handleSearch } = useHomePage();
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

  // Filters
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<PriceRangeKey>('any');
  const [language, setLanguage] = useState<string>('');

  // NEW: Region/Country
  const [region, setRegion] = useState<string>('');   // e.g., "Middle East"
  const [country, setCountry] = useState<string>(''); // e.g., "Qatar"
  const countriesForRegion = useMemo(
    () => (region ? COUNTRIES_BY_REGION[region] ?? [] : []),
    [region]
  );

  const [page, setPage] = useState(1);

  // Derived tutors
  const tutors = useMemo(
    () => (filteredProfiles.filter((p) => p.role === 'tutor') as unknown as Profile[]),
    [filteredProfiles]
  );

  // All available languages from data (merge with common list)
  const languagesSet = useMemo(() => {
    const set = new Set<string>();
    LANGS_COMMON.forEach((l) => set.add(l));
    tutors.forEach((t: any) => {
      if (Array.isArray(t?.languages)) {
        t.languages.forEach((l: any) => {
          const s = String(l).trim();
          if (s) set.add(s);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tutors]);

  const filtered = useMemo(() => {
    const q = normalizeStr(query);

    return tutors.filter((pp: any) => {
      const p = pp as any;

      if (q) {
        const inName = normalizeStr(p?.name).includes(q);
        const inCat = normalizeStr(p?.category).includes(q);
        const inDesc = normalizeStr(getDescriptionText(p)).includes(q);
        const inExpertise =
          Array.isArray(p?.expertise) &&
          p.expertise.some((e: any) => normalizeStr(String(e)).includes(q));
        if (!inName && !inCat && !inDesc && !inExpertise) return false;
      }
      if (subject && !tutorMatchesSubject(p, subject)) return false;
      if (availability && !hasAvailability(p, availability)) return false;
      if (minRating > 0 && getRating(p) < minRating) return false;

      const hourly = getHourly(p);
      if (priceKey !== 'any' && typeof hourly === 'number' && !PRICE_RANGES[priceKey](hourly)) {
        return false;
      }
      if (language && !hasLanguage(p, language)) return false;

      // NEW: region/country from description
      const desc = getDescriptionObj(p.description);
      const profRegion = normalizeStr(desc.region);
      const profCountry = normalizeStr(desc.country);

      if (region) {
        const regionMatch =
          profRegion === normalizeStr(region) ||
          (profCountry &&
            (COUNTRIES_BY_REGION[region] || []).map(normalizeStr).includes(profCountry));
        if (!regionMatch) return false;
      }
      if (country) {
        if (profCountry !== normalizeStr(country)) return false;
      }

      return true;
    });
  }, [tutors, query, subject, availability, minRating, priceKey, language, region, country]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);

  const onReset = () => {
    setQuery('');
    setSubject('');
    setAvailability('');
    setMinRating(0);
    setPriceKey('any');
    setLanguage('');
    setRegion('');
    setCountry('');
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary">
        Loading tutors…
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="flex-1 flex justify-center py-5 px-4 lg:px-10">
        <div className="flex flex-col w-full max-w-[960px]">

          {/* Header */}
          <section className="px-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex min-w-72 flex-col gap-3">
                <h1 className="text-[32px] font-bold leading-tight">Find a tutor</h1>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-sm">
                  Explore our community of expert tutors ready to help you achieve your learning goals.
                </p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={onReset}
                  className="rounded-xl h-9 px-4 bg-[#e7edf4] dark:bg-[#172534] text-sm"
                >
                  Reset filters
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-3">
              <label className="flex h-12 w-full">
                <div className="flex items-stretch rounded-xl h-full w-full">
                  <div className="text-[#49739c] flex bg-[#e7edf4] dark:bg-[#172534] items-center justify-center pl-4 rounded-l-xl">
                    <FontAwesomeIcon icon={faMagnifyingGlass as IconProp} />
                  </div>
                  <input
                    placeholder="Search for a subject or tutor"
                    className="form-input w-full rounded-r-xl h-full px-4 bg-[#e7edf4] dark:bg-[#172534] text-[#0d141c] dark:text-darkTextPrimary outline-none border-0 placeholder:text-[#49739c]"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                      handleSearch?.(e.target.value);
                    }}
                  />
                </div>
              </label>
            </div>
          </section>

          {/* Sticky Filters */}
          <div className="sticky top-0 z-10 mt-4 px-4 py-3 bg-slate-50/90 dark:bg-darkBg/80 backdrop-blur border-y border-[#e7edf4] dark:border-darkCard">
            <div className="flex gap-3 flex-wrap">
              {/* Subject */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setPage(1); }}
              >
                <option value="">Subject</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Availability */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={availability}
                onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
              >
                <option value="">Availability</option>
                {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* Price */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={priceKey}
                onChange={(e) => { setPriceKey(e.target.value as PriceRangeKey); setPage(1); }}
              >
                <option value="any">Price</option>
                <option value="0-20">$0–$20/hr</option>
                <option value="20-40">$20–$40/hr</option>
                <option value="40-60">$40–$60/hr</option>
                <option value="60+">$60+/hr</option>
              </select>

              {/* Language */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={language}
                onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
              >
                <option value="">Language</option>
                {languagesSet.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* Rating */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={String(minRating || '')}
                onChange={(e) => { setMinRating(Number(e.target.value || 0)); setPage(1); }}
              >
                <option value="">Rating</option>
                {RATINGS.map((r) => <option key={r} value={r}>{r}★ & up</option>)}
              </select>

              {/* NEW: Region */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={region}
                onChange={(e) => { setRegion(e.target.value); setCountry(''); setPage(1); }}
              >
                <option value="">Region</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              {/* NEW: Country */}
              <select
                className="h-9 rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-3 text-sm"
                value={country}
                onChange={(e) => { setCountry(e.target.value); setPage(1); }}
                disabled={!region && false}
              >
                <option value="">Country</option>
                {(region
                  ? countriesForRegion
                  : ['United States','United Kingdom','Kenya','India','United Arab Emirates','Saudi Arabia','Qatar']
                ).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Results header */}
          <h2 className="text-[22px] font-bold tracking-tight px-4 pb-3 pt-5">Tutors</h2>

          {/* Results */}
          <div className="p-4 space-y-4">
            {pageItems.length === 0 && (
              <p className="text-[#49739c] dark:text-darkTextSecondary px-1">No tutors match your filters.</p>
            )}

            {pageItems.map((t) => {
              const rating = getRating(t);
              const hourly = getHourly(t);
              const img = resolveImage(t, backendUrl, t.name);
              const sub = (t as any).category ?? 'Subject';

              // ⬇️ Use the tutor's bio from description; remove static fallback
              const bioRaw = getDescriptionText(t);
              const desc = bioRaw ? String(bioRaw).slice(0, 140) : '';

              return (
                <div
                  key={(t as any).user_id ?? t.name}
                  className="flex flex-col md:flex-row items-stretch justify-between gap-4 rounded-xl"
                >
                  <div className="flex flex-col gap-1 flex-[2_2_0px]">
                    <p className="text-darkText dark:text-darkTextPrimary text-sm font-medium">{sub}</p>

                    <Link
                      to={`/profile/${(t as any).user_id}`}
                      className="text-base font-bold leading-tight text-darkText dark:text-darkTextPrimary hover:underline"
                    >
                      {t.name ?? 'Tutor'}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-darkText dark:text-darkTextPrimary">
                      <span className="font-semibold">
                        {rating ? `${rating.toFixed(1)}★` : 'No rating'}
                      </span>
                      <span>•</span>
                      <span className="font-semibold">
                        {typeof hourly === 'number' ? `$${hourly}/hr` : 'Ask for price'}
                      </span>
                      {Array.isArray((t as any).languages) && (t as any).languages.length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            Languages: {(t as any).languages.slice(0, 3).join(', ')}
                            {(t as any).languages.length > 3 ? '…' : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {desc && (
                      <p className="text-darkText dark:text-darkTextPrimary text-sm mt-1">
                        {desc}
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/profile/${(t as any).user_id}`}
                    className="w-full md:flex-1 rounded-xl overflow-hidden ring-1 ring-[#e7edf4] dark:ring-darkCard"
                  >
                    <div
                      className="w-full bg-center bg-no-repeat aspect-video bg-cover"
                      style={{ backgroundImage: `url("${img}")` }}
                    />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center p-4 gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]"
                aria-label="Previous page"
              >
                <FontAwesomeIcon icon={faChevronLeft as IconProp} />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const active = n === pageSafe;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={
                      'flex size-10 items-center justify-center rounded-full text-sm ' +
                      (active ? 'font-bold bg-[#e7edf4] dark:bg-[#172534]' : 'font-normal')
                    }
                    aria-current={active ? 'page' : undefined}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex size-10 items-center justify-center rounded-full hover:bg-[#e7edf4] dark:hover:bg-[#172534]"
                aria-label="Next page"
              >
                <FontAwesomeIcon icon={faChevronRight as IconProp} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FindTutor;
