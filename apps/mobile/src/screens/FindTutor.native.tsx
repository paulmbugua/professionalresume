/* eslint-disable prettier/prettier */
// apps/mobile/src/screens/FindTutor.native.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';
import tw from '../../tailwind';
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';

/* ───────── Constants ───────── */
const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e7edf4&color=0d141c`;

const SUBJECTS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages', 'English', 'History'] as const;
const RATINGS = [5, 4.5, 4, 3.5, 3] as const;
const PRICES = ['any', '0-20', '20-40', '40-60', '60+'] as const;
const LANGS_COMMON = ['English', 'Spanish', 'French', 'Arabic', 'Chinese', 'German'] as const;

type PriceRangeKey = (typeof PRICES)[number];
const PRICE_RANGES: Record<PriceRangeKey, (n: number) => boolean> = {
  any: () => true,
  '0-20': (n) => n >= 0 && n < 20,
  '20-40': (n) => n >= 20 && n < 40,
  '40-60': (n) => n >= 40 && n < 60,
  '60+': (n) => n >= 60,
};

/** ── NEW: Regions/Countries (simple & extensible) ────────────────────────── */
type BandKey = 'US' | 'UK' | 'KE' | 'IN' | 'AE' | 'SA' | 'QA'; // keep minimal
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

const REGIONS = Object.keys(COUNTRIES_BY_REGION) as (keyof typeof COUNTRIES_BY_REGION)[];

/* ───────── Utils ───────── */
const normalize = (s?: string) => (s || '').toLowerCase().trim();
const getRating = (p: Partial<Profile> & Record<string, any>) =>
  Number((p?.avgRating ?? (p as any)?.rating) ?? 0);
const getHourly = (p: Partial<Profile> & Record<string, any>): number | undefined =>
  typeof p?.pricing?.hourly === 'number'
    ? p.pricing.hourly
    : typeof p?.pricing?.price === 'number'
    ? p.pricing.price
    : undefined;

const tutorMatchesSubject = (p: Profile, subject: string) => {
  if (!subject) return true;
  const cat = normalize((p as any).category);
  const subj = normalize(subject);
  if (cat.includes(subj)) return true;
  if (Array.isArray((p as any).expertise)) {
    return (p as any).expertise.some((e: any) => normalize(String(e)).includes(subj));
  }
  return false;
};
const hasLanguage = (p: any, lang: string) => {
  if (!lang) return true;
  const list = p?.languages;
  if (Array.isArray(list)) {
    return list.map((x) => normalize(String(x))).includes(normalize(lang));
  }
  return true;
};
const resolveImage = (p: any, backendUrl?: string, fallbackName?: string) => {
  const g0 = Array.isArray(p?.gallery) ? p.gallery[0] : undefined;
  if (typeof g0 === 'string' && g0.length > 0) {
    if (/^https?:\/\//i.test(g0)) return g0;
    if (g0.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${g0}`;
  }
  return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
};
const getDescriptionObj = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      // if plain text, ignore
    }
  }
  return {};
};

/* ───────── Small UI bits ───────── */
const Chip: React.FC<{ label: string; active?: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw.style(
      'px-3 h-9 rounded-full items-center justify-center mr-2 mb-2',
      active ? 'bg-primary' : 'bg-[#e7edf4] dark:bg-[#172534]',
    )}
  >
    <Text style={tw.style('text-sm', active ? 'text-white font-semibold' : 'text-[#0d141c] dark:text-white/90')}>
      {label}
    </Text>
  </Pressable>
);

const TutorRow = React.memo(function TutorRow({
  item,
  onPress,
  backendUrl,
}: {
  item: Profile & Record<string, any>;
  onPress: (id?: string | number) => void;
  backendUrl?: string;
}) {
  const rating = getRating(item);
  const hourly = getHourly(item);
  const img = resolveImage(item, backendUrl, item.name);
  const sub = (item as any).category ?? 'Subject';
  const desc =
    typeof (item as any).description === 'string' && (item as any).description.length > 0
      ? (item as any).description.slice(0, 140)
      : 'Highly rated tutor ready to help you reach your goals.';

  return (
    <View style={tw`mb-4`}>
      <View style={tw`flex-row items-stretch justify-between gap-4`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-xs font-medium text-[#49739c] dark:text-white/70`}>{sub}</Text>
          <Pressable onPress={() => onPress(item.user_id)} style={tw`mt-0.5`}>
            <Text style={tw`text-base font-extrabold text-[#0d141c] dark:text-white`}>{item.name ?? 'Tutor'}</Text>
          </Pressable>

          <View style={tw`flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-1`}>
            <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>
              {rating ? `${rating.toFixed(1)}★` : 'No rating'}
            </Text>
            <Text style={tw`text-sm text-[#0d141c] dark:text-white/80`}>•</Text>
            <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>
              {typeof hourly === 'number' ? `$${hourly}/hr` : 'Ask for price'}
            </Text>
            {Array.isArray((item as any).languages) && (item as any).languages.length > 0 && (
              <>
                <Text style={tw`text-sm text-[#0d141c] dark:text-white/80`}>•</Text>
                <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>
                  {(item as any).languages.slice(0, 3).join(', ')}
                  {(item as any).languages.length > 3 ? '…' : ''}
                </Text>
              </>
            )}
          </View>

          <Text style={tw`text-sm mt-1 text-[#0d141c] dark:text-white/90`}>{desc}</Text>
        </View>

        <Pressable onPress={() => onPress(item.user_id)} style={tw`w-36 rounded-xl overflow-hidden`}>
          <Image source={{ uri: img }} style={tw`w-full aspect-video`} resizeMode="cover" />
        </Pressable>
      </View>
    </View>
  );
});

/* ───────── Screen ───────── */
const PER_CHUNK = 12;

const FindTutorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { filteredProfiles, loading, handleSearch } = useHomePage();
  const backendUrl = undefined as unknown as string | undefined;

  // Core search (debounced)
  const [query, setQuery] = useState<string>('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chips
  const [subject, setSubject] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<PriceRangeKey>('any');
  const [language, setLanguage] = useState<string>('');

  // NEW: Region & Country
  const [region, setRegion] = useState<string>('');     // e.g., "Middle East"
  const [country, setCountry] = useState<string>('');   // e.g., "Qatar"
  const countriesForRegion = useMemo(
    () => (region ? COUNTRIES_BY_REGION[region] ?? [] : []),
    [region]
  );

  // Progressive render
  const [visible, setVisible] = useState<number>(PER_CHUNK);
  const [loadingMore, setLoadingMore] = useState(false);

  // Tutors only
  const tutors = useMemo<Profile[]>(
    () => (filteredProfiles as Profile[]).filter((p: Profile) => p.role === 'tutor'),
    [filteredProfiles]
  );

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleSearch?.(query);
    }, 250);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, handleSearch]);

  // Languages from data + common
  const languages = useMemo(() => {
    const set = new Set<string>(LANGS_COMMON as unknown as string[]);
    tutors.forEach((t) => Array.isArray((t as any).languages) && (t as any).languages.forEach((l: any) => set.add(String(l).trim())));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [tutors]);

  // Filtering
  const filtered = useMemo(() => {
    const q = normalize(query);
    return tutors.filter((pp: Profile & Record<string, any>) => {
      const p = pp as any;

      // free text
      if (q) {
        const inName = normalize(p?.name).includes(q);
        const inCat = normalize(p?.category).includes(q);
        const inDesc = normalize(p?.description).includes(q);
        const inExpertise =
          Array.isArray(p?.expertise) && p.expertise.some((e: any) => normalize(String(e)).includes(q));
        if (!inName && !inCat && !inDesc && !inExpertise) return false;
      }

      // subject
      if (subject && !tutorMatchesSubject(p, subject)) return false;

      // rating
      if (minRating > 0 && getRating(p) < minRating) return false;

      // price
      const hourly = getHourly(p);
      if (priceKey !== 'any' && typeof hourly === 'number' && !PRICE_RANGES[priceKey](hourly)) return false;

      // language
      if (language && !hasLanguage(p, language)) return false;

      // NEW: region/country from description (supports string or object)
      const desc = getDescriptionObj(p.description);
      const profRegion = normalize(desc.region);
      const profCountry = normalize(desc.country);

      if (region) {
        const regionMatch =
          profRegion === normalize(region) ||
          (profCountry &&
            (COUNTRIES_BY_REGION[region] || []).map(normalize).includes(profCountry));
        if (!regionMatch) return false;
      }
      if (country) {
        if (profCountry !== normalize(country)) return false;
      }

      return true;
    });
  }, [tutors, query, subject, minRating, priceKey, language, region, country]);

  const data = filtered.slice(0, visible);

  // Scroll-triggered "load more"
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const pad = 160;
      const reachedBottom = contentOffset.y + layoutMeasurement.height + pad >= contentSize.height;

      if (reachedBottom && !loadingMore && data.length < filtered.length) {
        setLoadingMore(true);
        requestAnimationFrame(() => {
          setVisible((v) => Math.min(filtered.length, v + PER_CHUNK));
          setLoadingMore(false);
        });
      }
    },
    [data.length, filtered.length, loadingMore]
  );

  const onReset = () => {
    setQuery('');
    setSubject('');
    setMinRating(0);
    setPriceKey('any');
    setLanguage('');
    setRegion('');
    setCountry('');
    setVisible(PER_CHUNK);
  };

  const goProfile = (userId?: string | number) =>
    userId && navigation.navigate('Profile', { id: String(userId) });

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
          <Text style={tw`mt-2 text-[#49739c] dark:text-white/70`}>Loading tutors…</Text>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-6`}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title / Reset */}
          <View style={tw`px-4 pt-4 pb-2`}>
            <View style={tw`flex-row items-end justify-between`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>Find a tutor</Text>
                <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mt-1`}>
                  Explore our community of expert tutors ready to help you achieve your goals.
                </Text>
              </View>
              <Pressable onPress={onReset} style={tw`rounded-xl h-9 px-4 bg-[#e7edf4] dark:bg-[#172534] justify-center`}>
                <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>Reset</Text>
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={tw`mt-3 rounded-xl overflow-hidden`}>
              <View style={tw`flex-row items-center bg-[#e7edf4] dark:bg-[#172534] h-12 px-3`}>
                <Text style={tw`text-base mr-2`}>🔎</Text>
                <TextInput
                  placeholder="Search subject or tutor"
                  placeholderTextColor="#49739c"
                  value={query}
                  onChangeText={(t) => { setQuery(t); setVisible(PER_CHUNK); }}
                  style={tw`flex-1 text-[#0d141c] dark:text-white`}
                  returnKeyType="search"
                />
              </View>
            </View>
          </View>

          {/* Quick filters */}
          <View style={tw`px-4`}>
            <Text style={tw`text-[18px] font-bold text-[#0d141c] dark:text-white`}>Quick filters</Text>

            {/* Subjects */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-2 pr-2`}>
              <Chip label={subject ? `Subject: ${subject}` : 'Any subject'} active={!!subject} onPress={() => { setSubject(''); setVisible(PER_CHUNK); }} />
              {SUBJECTS.map((s) => (
                <Chip key={s} label={s} active={subject === s} onPress={() => { setSubject(s); setVisible(PER_CHUNK); }} />
              ))}
            </ScrollView>

            {/* Ratings */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
              <Chip label={minRating ? `≥ ${minRating}★` : 'Any rating'} active={!!minRating} onPress={() => { setMinRating(0); setVisible(PER_CHUNK); }} />
              {RATINGS.map((r) => (
                <Chip key={String(r)} label={`${r}★ & up`} active={minRating === r} onPress={() => { setMinRating(r); setVisible(PER_CHUNK); }} />
              ))}
            </ScrollView>

            {/* Price */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
              {PRICES.map((p) => (
                <Chip
                  key={p}
                  label={p === 'any' ? 'Any price' : (p === '60+' ? '$60+/hr' : `$${p}/hr`)}
                  active={priceKey === p}
                  onPress={() => { setPriceKey(p); setVisible(PER_CHUNK); }}
                />
              ))}
            </ScrollView>

            {/* Language */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
              <Chip label={language || 'Any language'} active={!!language} onPress={() => { setLanguage(''); setVisible(PER_CHUNK); }} />
              {languages.slice(0, 12).map((l) => (
                <Chip key={l} label={l} active={language === l} onPress={() => { setLanguage(l); setVisible(PER_CHUNK); }} />
              ))}
            </ScrollView>

            {/* NEW: Region */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
              <Chip
                label={region || 'Any region'}
                active={!!region}
                onPress={() => { setRegion(''); setCountry(''); setVisible(PER_CHUNK); }}
              />
              {REGIONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  active={region === r}
                  onPress={() => { setRegion(r); setCountry(''); setVisible(PER_CHUNK); }}
                />
              ))}
            </ScrollView>

            {/* NEW: Country (depends on Region if set; otherwise show a few common + ME majors) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
              <Chip
                label={country || 'Any country'}
                active={!!country}
                onPress={() => { setCountry(''); setVisible(PER_CHUNK); }}
              />
              {(region
                ? countriesForRegion
                : ['United States','United Kingdom','Kenya','India','United Arab Emirates','Saudi Arabia','Qatar']
              ).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={country === c}
                  onPress={() => { setCountry(c); setVisible(PER_CHUNK); }}
                />
              ))}
            </ScrollView>
          </View>

          {/* Tutors */}
          <View style={tw`px-4 pt-3 pb-1`}>
            <Text style={tw`text-[18px] font-bold text-[#0d141c] dark:text-white`}>Tutors</Text>
          </View>

          <View style={tw`px-4`}>
            {data.length === 0 ? (
              <Text style={tw`text-[#49739c] dark:text-white/70`}>No tutors match your filters.</Text>
            ) : (
              data.map((item) => (
                <TutorRow key={String((item as any)?.user_id ?? (item as any)?.id)} item={item as any} onPress={goProfile} backendUrl={backendUrl} />
              ))
            )}

            {/* Load more indicator */}
            {data.length < filtered.length && (
              <View style={tw`py-4 items-center`}>
                <ActivityIndicator />
                <Text style={tw`mt-2 text-[#49739c] dark:text-white/70`}>Loading more…</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FindTutorScreen;
