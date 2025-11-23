/* eslint-disable prettier/prettier */
// apps/mobile/src/screens/FindTutor.native.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';
import tw from '../../tailwind';
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';
import { COUNTRIES } from '@mytutorapp/shared/utils/countries';

/* ───────── Constants ───────── */
const FALLBACK_AVATAR = (name = 'Tutor') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=e7edf4&color=0d141c`;

const SUBJECTS = [
  'Math',
  'Science',
  'Programming',
  'Art',
  'Wellness',
  'Languages',
  'English',
  'History',
] as const;
const RATINGS = [5, 4.5, 4, 3.5, 3] as const;
const PRICES = ['any', '0-20', '20-40', '40-60', '60+'] as const;

// Availability, Languages
const AVAILABILITY = ['Weekdays', 'Weekends', 'Evenings', 'Mornings'] as const;
const LANGS_COMMON = [
  'English',
  'Spanish',
  'French',
  'Arabic',
  'Chinese',
  'German',
] as const;

type PriceRangeKey = (typeof PRICES)[number];
const PRICE_RANGES: Record<PriceRangeKey, (n: number) => boolean> = {
  any: () => true,
  '0-20': (n) => n >= 0 && n < 20,
  '20-40': (n) => n >= 20 && n < 40,
  '40-60': (n) => n >= 40 && n < 60,
  '60+': (n) => n >= 60,
};

/** ── Flatten shared COUNTRIES list to labels ────────────────────────── */
const COUNTRY_OPTIONS: string[] = Array.isArray(COUNTRIES)
  ? (COUNTRIES as any[])
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') {
          return (
            (c as any).label || (c as any).name || (c as any).value || ''
          );
        }
        return '';
      })
      .filter(Boolean)
  : [];

/* ───────── Utils ───────── */
const normalize = (s?: string) => (s || '').toLowerCase().trim();
const normalizeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v.toLowerCase().trim();
  if (typeof v === 'number' || typeof v === 'boolean')
    return String(v).toLowerCase().trim();
  if (Array.isArray(v)) return v.map(normalizeStr).join(' ').trim();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const preferred =
      o.bio ?? o.overview ?? o.summary ?? o.title ?? o.name ?? o.label ?? o.text;
    return preferred
      ? normalizeStr(preferred)
      : Object.values(o)
          .map(normalizeStr)
          .join(' ')
          .trim();
  }
  return '';
};
const getRating = (p: Partial<Profile> & Record<string, any>) =>
  Number((p?.avgRating ?? (p as any)?.rating) ?? 0);
const getHourly = (
  p: Partial<Profile> & Record<string, any>,
): number | undefined =>
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
    return (p as any).expertise.some((e: any) =>
      normalize(String(e)).includes(subj),
    );
  }
  return false;
};

const hasAvailability = (p: any, option: string) => {
  if (!option) return true;
  const opt = normalizeStr(option);
  const a = p?.availability;
  if (typeof a === 'string') return normalizeStr(a).includes(opt);
  if (Array.isArray(a))
    return a.some((x) => normalizeStr(String(x)).includes(opt));
  const slots = p?.availableSlots;
  if (Array.isArray(slots))
    return slots.some((x: any) => normalizeStr(String(x)).includes(opt));
  return true;
};

const hasLanguage = (p: any, lang: string) => {
  if (!lang) return true;
  const list = p?.languages;
  if (Array.isArray(list)) {
    return list
      .map((x) => normalizeStr(String(x)))
      .includes(normalizeStr(lang));
  }
  return true;
};

const resolveImage = (p: any, backendUrl?: string, fallbackName?: string) => {
  const g0 = Array.isArray(p?.gallery) ? p.gallery[0] : undefined;
  if (typeof g0 === 'string' && g0.length > 0) {
    if (/^https?:\/\//i.test(g0)) return g0;
    if (g0.startsWith('/') && backendUrl)
      return `${backendUrl.replace(/\/+$/, '')}${g0}`;
  }
  return FALLBACK_AVATAR(fallbackName ?? p?.name ?? 'Tutor');
};

const getDescriptionObj = (raw: any): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return {};
};

/** Extract a tutor’s bio from `description` (object OR JSON string OR plain string) */
const getDescriptionText = (p: any): string => {
  const d = p?.description;
  if (typeof d === 'string') {
    try {
      const asObj = JSON.parse(d);
      if (
        asObj &&
        typeof asObj === 'object' &&
        typeof (asObj as any).bio === 'string'
      ) {
        return (asObj as any).bio;
      }
    } catch {}
    return d;
  }
  if (d && typeof d === 'object') {
    const bio = (d as any).bio ?? (d as any).overview ?? (d as any).summary;
    if (bio) return String(bio);
  }
  return '';
};

/* ───────── Small UI bits ───────── */
const Chip: React.FC<{
  label: string;
  active?: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw.style(
      'px-3 h-9 rounded-full items-center justify-center mr-2 mb-2',
      active ? 'bg-primary' : 'bg-[#e7edf4] dark:bg-[#172534]',
    )}
  >
    <Text
      style={tw.style(
        'text-sm',
        active
          ? 'text-white font-semibold'
          : 'text-[#0d141c] dark:text-white/90',
      )}
    >
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

  const bioRaw = getDescriptionText(item);
  const desc = bioRaw ? String(bioRaw).slice(0, 140) : '';

  return (
    <View style={tw`mb-4`}>
      <View
        style={tw`flex-row items-stretch justify-between gap-4 rounded-2xl bg-white dark:bg-[#0b1016] p-3 border border-[#e2edf5] dark:border-white/5 shadow-sm`}
      >
        <View style={tw`flex-1`}>
          <Text
            style={tw`text-xs font-medium text-[#49739c] dark:text-white/70`}
          >
            {sub}
          </Text>
          <Pressable onPress={() => onPress(item.user_id)} style={tw`mt-0.5`}>
            <Text
              style={tw`text-base font-extrabold text-[#0d141c] dark:text-white`}
            >
              {item.name ?? 'Tutor'}
            </Text>
          </Pressable>

          <View
            style={tw`flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-1`}
          >
            {/* Rating */}
            <Text
              style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}
            >
              {rating ? `${rating.toFixed(1)}★` : 'No rating'}
            </Text>

            {/* Hourly price – only if defined, no "Ask for price" */}
            {typeof hourly === 'number' && (
              <Text
                style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}
              >
                ${hourly}/hr
              </Text>
            )}

            {/* Languages – no leading dot */}
            {Array.isArray((item as any).languages) &&
              (item as any).languages.length > 0 && (
                <Text
                  style={tw`text-sm text-[#0d141c] dark:text-white/90`}
                >
                  Languages: {(item as any).languages.slice(0, 3).join(', ')}
                  {(item as any).languages.length > 3 ? '…' : ''}
                </Text>
              )}
          </View>

          {desc ? (
            <Text
              style={tw`text-sm mt-1 text-[#0d141c] dark:text-white/90`}
            >
              {desc}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => onPress(item.user_id)}
          style={tw`w-36 rounded-xl overflow-hidden`}
        >
          <Image
            source={{ uri: img }}
            style={tw`w-full aspect-video`}
            resizeMode="cover"
          />
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

  const insets = useSafeAreaInsets();
  const FOOTER_OFFSET = 80;
  const bottomPad = Math.max(insets.bottom, 16);
  const topPad = Math.max(insets.top, 12);

  // Core search (debounced)
  const [query, setQuery] = useState<string>('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [subject, setSubject] = useState<string>('');
  const [availability, setAvailability] = useState<string>(''); // NEW
  const [minRating, setMinRating] = useState<number>(0);
  const [priceKey, setPriceKey] = useState<PriceRangeKey>('any');
  const [language, setLanguage] = useState<string>(''); // NEW
  const [country, setCountry] = useState<string>(''); // NEW (no region now)

  // Progressive render
  const [visible, setVisible] = useState<number>(PER_CHUNK);
  const [loadingMore, setLoadingMore] = useState(false);

  // Tutors only
  const tutors = useMemo<Profile[]>(
    () =>
      (filteredProfiles as Profile[]).filter(
        (p: Profile) => p.role === 'tutor',
      ),
    [filteredProfiles],
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

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleSearch?.(query);
    }, 250);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, handleSearch]);

  // Filtering (includes bio, expertise, availability, language, country)
  const filtered = useMemo(() => {
    const q = normalizeStr(query);
    return tutors.filter((pp: Profile & Record<string, any>) => {
      const p = pp as any;

      if (q) {
        const inName = normalizeStr(p?.name).includes(q);
        const inCat = normalizeStr(p?.category).includes(q);
        const inDesc = normalizeStr(getDescriptionText(p)).includes(q);
        const inExpertise =
          Array.isArray(p?.expertise) &&
          p.expertise.some((e: any) =>
            normalizeStr(String(e)).includes(q),
          );
        if (!inName && !inCat && !inDesc && !inExpertise) return false;
      }

      if (subject && !tutorMatchesSubject(p, subject)) return false;
      if (availability && !hasAvailability(p, availability)) return false;
      if (minRating > 0 && getRating(p) < minRating) return false;

      const hourly = getHourly(p);
      if (
        priceKey !== 'any' &&
        typeof hourly === 'number' &&
        !PRICE_RANGES[priceKey](hourly)
      )
        return false;

      if (language && !hasLanguage(p, language)) return false;

      // Country filter (top-level p.country OR description.country)
      if (country) {
        const wanted = normalizeStr(country);
        const desc = getDescriptionObj(p.description);
        const profCountry =
          normalizeStr(p.country) || normalizeStr(desc.country);

        if (!profCountry || !profCountry.includes(wanted)) {
          return false;
        }
      }

      return true;
    });
  }, [
    tutors,
    query,
    subject,
    availability,
    minRating,
    priceKey,
    language,
    country,
  ]);

  const data = filtered.slice(0, visible);

  // Scroll-triggered "load more"
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const pad = 160;
      const reachedBottom =
        contentOffset.y + layoutMeasurement.height + pad >= contentSize.height;

      if (
        reachedBottom &&
        !loadingMore &&
        data.length < filtered.length
      ) {
        setLoadingMore(true);
        requestAnimationFrame(() => {
          setVisible((v) => Math.min(filtered.length, v + PER_CHUNK));
          setLoadingMore(false);
        });
      }
    },
    [data.length, filtered.length, loadingMore],
  );

  const onReset = () => {
    setQuery('');
    setSubject('');
    setAvailability('');
    setMinRating(0);
    setPriceKey('any');
    setLanguage('');
    setCountry('');
    setVisible(PER_CHUNK);
  };

  const goProfile = (userId?: string | number) =>
    userId && navigation.navigate('Profile', { id: String(userId) });

  return (
    <SafeAreaView
      style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}
      edges={['top', 'bottom']}
    >
      {/* Soft background orbs */}
      <View style={tw`absolute inset-0`}>
        <View
          style={tw`absolute -top-16 -right-10 h-36 w-36 rounded-full bg-pink-500/12 dark:bg-pink-500/10`}
        />
        <View
          style={tw`absolute -bottom-24 -left-20 h-44 w-44 rounded-full bg-sky-500/10 dark:bg-sky-500/10`}
        />
      </View>

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
          <Text
            style={tw`mt-2 text-[#49739c] dark:text-white/70`}
          >
            Loading tutors…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={[
            tw`pb-6`,
            {
              paddingTop: topPad,
              paddingBottom: bottomPad + FOOTER_OFFSET, // ✅ nothing hidden behind footer
            },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title / Reset */}
          <View style={tw`px-4 pt-2 pb-2`}>
            <View style={tw`flex-row items-end justify-between`}>
              <View style={tw`flex-1 pr-3`}>
                <Text
                  style={tw`text-xs tracking-[2px] uppercase text-pink-500/80 dark:text-pink-400`}
                >
                  DayBreak Tutors
                </Text>
                <Text
                  style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white mt-1`}
                >
                  Find a tutor
                </Text>
                <Text
                  style={tw`text-sm text-[#49739c] dark:text-white/70 mt-1`}
                >
                  Explore our community of expert tutors ready to help you
                  achieve your goals.
                </Text>
              </View>
              <Pressable
                onPress={onReset}
                style={tw`rounded-full h-9 px-4 bg-[#e7edf4] dark:bg-[#172534] justify-center`}
              >
                <Text
                  style={tw`text-xs font-semibold text-[#0d141c] dark:text-white`}
                >
                  Reset
                </Text>
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={tw`mt-3 rounded-xl overflow-hidden`}>
              <View
                style={tw`flex-row items-center bg-[#e7edf4] dark:bg-[#172534] h-12 px-3`}
              >
                <Text style={tw`text-base mr-2`}>🔎</Text>
                <TextInput
                  placeholder="Search for a subject or tutor"
                  placeholderTextColor="#49739c"
                  value={query}
                  onChangeText={(t) => {
                    setQuery(t);
                    setVisible(PER_CHUNK);
                  }}
                  style={tw`flex-1 text-[#0d141c] dark:text-white`}
                  returnKeyType="search"
                />
              </View>
            </View>
          </View>

          {/* Quick filters */}
          <View style={tw`px-4`}>
            <Text
              style={tw`text-[18px] font-bold text-[#0d141c] dark:text-white`}
            >
              Quick filters
            </Text>

            {/* Subjects */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-2 pr-2`}
            >
              <Chip
                label={subject ? `Subject: ${subject}` : 'Any subject'}
                active={!!subject}
                onPress={() => {
                  setSubject('');
                  setVisible(PER_CHUNK);
                }}
              />
              {SUBJECTS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  active={subject === s}
                  onPress={() => {
                    setSubject(s);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>

            {/* Availability */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-1 pr-2`}
            >
              <Chip
                label={
                  availability ? `Time: ${availability}` : 'Any time'
                }
                active={!!availability}
                onPress={() => {
                  setAvailability('');
                  setVisible(PER_CHUNK);
                }}
              />
              {AVAILABILITY.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  active={availability === a}
                  onPress={() => {
                    setAvailability(a);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>

            {/* Language */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-1 pr-2`}
            >
              <Chip
                label={language ? `Lang: ${language}` : 'Any language'}
                active={!!language}
                onPress={() => {
                  setLanguage('');
                  setVisible(PER_CHUNK);
                }}
              />
              {languagesSet.map((l) => (
                <Chip
                  key={l}
                  label={l}
                  active={language === l}
                  onPress={() => {
                    setLanguage(l);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>

            {/* Ratings */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-1 pr-2`}
            >
              <Chip
                label={minRating ? `≥ ${minRating}★` : 'Any rating'}
                active={!!minRating}
                onPress={() => {
                  setMinRating(0);
                  setVisible(PER_CHUNK);
                }}
              />
              {RATINGS.map((r) => (
                <Chip
                  key={String(r)}
                  label={`${r}★ & up`}
                  active={minRating === r}
                  onPress={() => {
                    setMinRating(r);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>

            {/* Price */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-1 pr-2`}
            >
              {PRICES.map((p) => (
                <Chip
                  key={p}
                  label={
                    p === 'any'
                      ? 'Any price'
                      : p === '60+'
                      ? '$60+/hr'
                      : `$${p}/hr`
                  }
                  active={priceKey === p}
                  onPress={() => {
                    setPriceKey(p);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>

            {/* Country (from shared COUNTRIES list, no region) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`py-1 pr-2`}
            >
              <Chip
                label={country ? `Country: ${country}` : 'Any country'}
                active={!!country}
                onPress={() => {
                  setCountry('');
                  setVisible(PER_CHUNK);
                }}
              />
              {COUNTRY_OPTIONS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={country === c}
                  onPress={() => {
                    setCountry(c);
                    setVisible(PER_CHUNK);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          {/* Tutors */}
          <View style={tw`px-4 pt-3 pb-1`}>
            <Text
              style={tw`text-[18px] font-bold text-[#0d141c] dark:text-white`}
            >
              Tutors
            </Text>
          </View>

          <View style={tw`px-4`}>
            {data.length === 0 ? (
              <Text style={tw`text-[#49739c] dark:text-white/70`}>
                No tutors match your filters.
              </Text>
            ) : (
              data.map((item) => (
                <TutorRow
                  key={String(
                    (item as any)?.user_id ?? (item as any)?.id,
                  )}
                  item={item as any}
                  onPress={goProfile}
                  backendUrl={backendUrl}
                />
              ))
            )}

            {/* Load more indicator */}
            {data.length < filtered.length && (
              <View style={tw`py-4 items-center`}>
                <ActivityIndicator />
                <Text
                  style={tw`mt-2 text-[#49739c] dark:text:white/70`}
                >
                  Loading more…
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FindTutorScreen;
