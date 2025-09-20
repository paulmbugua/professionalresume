/* eslint-disable prettier/prettier */
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Picker } from '@react-native-picker/picker';
import tw from '../../tailwind';
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';

/* ─────────────────────────────────────────────────────────
   Navigation types
   ───────────────────────────────────────────────────────── */
type RootStackParamList = {
  Profile: { userId: string | number };
};

type Nav = StackNavigationProp<RootStackParamList>;

/* ─────────────────────────────────────────────────────────
   Constants & helpers
   ───────────────────────────────────────────────────────── */
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

const getRating = (p: Partial<Profile> & Record<string, any>) =>
  Number((p?.avgRating ?? (p as any)?.rating) ?? 0);

const getHourly = (p: Partial<Profile> & Record<string, any>): number | undefined =>
  typeof p?.pricing?.hourly === 'number'
    ? p.pricing.hourly
    : typeof p?.pricing?.price === 'number'
    ? p.pricing.price
    : undefined;

const normalizeStr = (s?: string) => (s || '').toLowerCase().trim();

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
    if (g0.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${g0}`;
  }
  return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
};

const PER_PAGE = 6;

/* ─────────────────────────────────────────────────────────
   Screen
   ───────────────────────────────────────────────────────── */
const FindTutorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { filteredProfiles, loading, handleSearch } = useHomePage();
  const backendUrl = undefined as unknown as string | undefined; // optional if you build absolute gallery URLs

  // Filters
  const [query, setQuery] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<PriceRangeKey>('any');
  const [language, setLanguage] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Tutors list (role === tutor)
  const tutors = useMemo<Profile[]>(
    () => (filteredProfiles as Profile[]).filter((p: Profile) => p.role === 'tutor'),
    [filteredProfiles]
  );

  // Languages (merge common + from data)
  const languagesSet = useMemo(() => {
    const set = new Set<string>();
    LANGS_COMMON.forEach((l) => set.add(l));
    tutors.forEach((t) => {
      if (Array.isArray((t as any)?.languages)) {
        (t as any).languages.forEach((l: any) => {
          const s = String(l).trim();
          if (s) set.add(s);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tutors]);

  // Filter
  const filtered = useMemo<Profile[]>(() => {
    const q = normalizeStr(query);
    return tutors.filter((p: Profile & Record<string, any>) => {
      if (q) {
        const inName = normalizeStr(p?.name).includes(q);
        const inCat = normalizeStr(p?.category).includes(q);
        const inDesc = normalizeStr(p?.description).includes(q);
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

      return true;
    });
  }, [tutors, query, subject, availability, minRating, priceKey, language]);

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
    setPage(1);
  };

  const goProfile = (userId?: string | number) => {
    if (!userId) return;
    navigation.navigate('Profile', { userId });
  };

  /* ─────────────────────────────────────────────────────── */

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      {/* Header */}
      <View style={tw`px-4 pt-4 pb-2`}>
        <View style={tw`flex-row items-end justify-between`}>
          <View style={tw`flex-1 pr-3`}>
            <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>
              Find a tutor
            </Text>
            <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mt-1`}>
              Explore our community of expert tutors ready to help you achieve your learning goals.
            </Text>
          </View>
          <Pressable onPress={onReset} style={tw`rounded-xl h-9 px-4 bg-[#e7edf4] dark:bg-[#172534] justify-center`}>
            <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>Reset filters</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={tw`mt-3 rounded-xl overflow-hidden`}>
          <View style={tw`flex-row items-center bg-[#e7edf4] dark:bg-[#172534] h-12 px-3`}>
            <Text style={tw`text-base mr-2`}>🔎</Text>
            <TextInput
              placeholder="Search for a subject or tutor"
              placeholderTextColor="#49739c"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setPage(1);
                handleSearch?.(t);
              }}
              style={tw`flex-1 text-[#0d141c] dark:text-white`}
            />
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={tw`px-4 py-3 bg-slate-50 dark:bg-[#0b1016] border-y border-[#e7edf4] dark:border-white/10`}>
        <View style={tw`flex-row flex-wrap -mx-1`}>
          <Filter label="Subject">
            <Picker
              selectedValue={subject}
              onValueChange={(v) => { setSubject(String(v)); setPage(1); }}
              dropdownIconColor="#0d141c"
              style={tw`text-sm text-[#0d141c] dark:text-white`}
            >
              <Picker.Item label="Any" value="" />
              {SUBJECTS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </Filter>

          <Filter label="Availability">
            <Picker
              selectedValue={availability}
              onValueChange={(v) => { setAvailability(String(v)); setPage(1); }}
              style={tw`text-sm text-[#0d141c] dark:text-white`}
            >
              <Picker.Item label="Any" value="" />
              {AVAILABILITY.map((a) => <Picker.Item key={a} label={a} value={a} />)}
            </Picker>
          </Filter>

          <Filter label="Price">
            <Picker
              selectedValue={priceKey}
              onValueChange={(v) => { setPriceKey(v as PriceRangeKey); setPage(1); }}
              style={tw`text-sm text-[#0d141c] dark:text-white`}
            >
              <Picker.Item label="Any" value="any" />
              <Picker.Item label="$0–$20/hr" value="0-20" />
              <Picker.Item label="$20–$40/hr" value="20-40" />
              <Picker.Item label="$40–$60/hr" value="40-60" />
              <Picker.Item label="$60+/hr" value="60+" />
            </Picker>
          </Filter>

          <Filter label="Language">
            <Picker
              selectedValue={language}
              onValueChange={(v) => { setLanguage(String(v)); setPage(1); }}
              style={tw`text-sm text-[#0d141c] dark:text-white`}
            >
              <Picker.Item label="Any" value="" />
              {languagesSet.map((l) => <Picker.Item key={l} label={l} value={l} />)}
            </Picker>
          </Filter>

          <Filter label="Rating">
            <Picker
              selectedValue={String(minRating || '')}
              onValueChange={(v) => { setMinRating(Number(v || 0)); setPage(1); }}
              style={tw`text-sm text-[#0d141c] dark:text-white`}
            >
              <Picker.Item label="Any" value="" />
              {RATINGS.map((r) => <Picker.Item key={r} label={`${r}★ & up`} value={String(r)} />)}
            </Picker>
          </Filter>
        </View>
      </View>

      {/* Results */}
      <View style={tw`px-4 pt-3 pb-1`}>
        <Text style={tw`text-[18px] font-bold text-[#0d141c] dark:text-white`}>Tutors</Text>
      </View>

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
          <Text style={tw`mt-2 text-[#49739c] dark:text-white/70`}>Loading tutors…</Text>
        </View>
      ) : (
        <FlatList
          data={pageItems}
          keyExtractor={(t: any, i) => String(t?.user_id ?? t?.name ?? i)}
          contentContainerStyle={tw`px-4 pb-6`}
          ListEmptyComponent={
            <Text style={tw`text-[#49739c] dark:text-white/70 px-1`}>No tutors match your filters.</Text>
          }
          renderItem={({ item }) => {
            const t = item as Profile & Record<string, any>;
            const rating = getRating(t);
            const hourly = getHourly(t);
            const img = resolveImage(t, backendUrl, t.name);
            const sub = (t as any).category ?? 'Subject';
            const desc =
              typeof (t as any).description === 'string' && (t as any).description.length > 0
                ? (t as any).description.slice(0, 140)
                : 'Highly rated tutor ready to help you reach your goals.';

            return (
              <View style={tw`mb-4`}>
                <View style={tw`flex-row items-stretch justify-between gap-4`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-sm font-medium text-[#0d141c] dark:text-white`}>{sub}</Text>

                    <Pressable onPress={() => goProfile(t.user_id)} style={tw``}>
                      <Text style={tw`text-base font-bold text-[#0d141c] dark:text-white underline`}>
                        {t.name ?? 'Tutor'}
                      </Text>
                    </Pressable>

                    <View style={tw`flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-1`}>
                      <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>
                        {rating ? `${rating.toFixed(1)}★` : 'No rating'}
                      </Text>
                      <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>•</Text>
                      <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>
                        {typeof hourly === 'number' ? `$${hourly}/hr` : 'Ask for price'}
                      </Text>
                      {Array.isArray((t as any).languages) && (t as any).languages.length > 0 && (
                        <>
                          <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>•</Text>
                          <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>
                            Languages: {(t as any).languages.slice(0, 3).join(', ')}
                            {(t as any).languages.length > 3 ? '…' : ''}
                          </Text>
                        </>
                      )}
                    </View>

                    <Text style={tw`text-sm mt-1 text-[#0d141c] dark:text-white/90`}>{desc}</Text>
                  </View>

                  <Pressable onPress={() => goProfile(t.user_id)} style={tw`w-40 rounded-xl overflow-hidden`}>
                    <Image source={{ uri: img }} style={tw`w-full aspect-video`} resizeMode="cover" />
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={tw`flex-row items-center justify-center mt-2`}>
                <Pressable
                  onPress={() => setPage((prev: number) => Math.max(1, prev - 1))}
                  style={tw`w-10 h-10 rounded-full items-center justify-center active:opacity-70`}
                  accessibilityLabel="Previous page"
                >
                  <Text style={tw`text-lg`}>◀</Text>
                </Pressable>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  const active = n === pageSafe;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setPage(n)}
                      style={tw`${active ? 'bg-[#e7edf4] dark:bg-[#172534]' : ''} w-10 h-10 rounded-full items-center justify-center mx-0.5`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={tw`text-sm ${active ? 'font-extrabold' : ''}`}>{n}</Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
                  style={tw`w-10 h-10 rounded-full items-center justify-center active:opacity-70`}
                  accessibilityLabel="Next page"
                >
                  <Text style={tw`text-lg`}>▶</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

/* ─────────────────────────────────────────────────────────
   Small UI helper
   ───────────────────────────────────────────────────────── */
const Filter: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={tw`w-1/2 px-1 mb-3`}>
    <View style={tw`rounded-xl bg-[#e7edf4] dark:bg-[#172534] px-2 py-1`}>
      <Text style={tw`text-[11px] text-[#49739c] dark:text-white/60`}>{label}</Text>
      {children}
    </View>
  </View>
);

export default FindTutorScreen;
