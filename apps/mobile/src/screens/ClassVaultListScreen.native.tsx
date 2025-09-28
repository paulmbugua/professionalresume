// apps/mobile/src/screens/ClassVaultListScreen.native.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../navigation/types';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useClassVault } from '@mytutorapp/shared/hooks';
import { fetchVideoReviews } from '@mytutorapp/shared/api/classVaultApi';
import type { RecordedVideo, VideoReview } from '@mytutorapp/shared/types';
import debounce from 'lodash.debounce';

/* ───────── Regions / Countries ───────── */
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
const norm = (s?: string) => (s || '').toLowerCase().trim();
const resolveRegionKey = (r?: string) =>
  Object.keys(COUNTRIES_BY_REGION).find(k => norm(k) === norm(r)) || undefined;

const readGeoFrom = (item: any): { region?: string; country?: string } => {
  const out: { region?: string; country?: string } = { region: item?.region, country: item?.country };
  const parseObj = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch {} }
    return {};
  };
  const meta = parseObj(item?.metadata);
  const desc = parseObj(item?.description);
  out.region  = out.region  ?? meta.region  ?? desc.region;
  out.country = out.country ?? meta.country ?? desc.country;
  if (Array.isArray(item?.tags)) {
    for (const t of item.tags) {
      const s = String(t);
      const [k, ...rest] = s.split(':');
      const v = rest.join(':').trim();
      if (norm(k) === 'region' && v && !out.region) out.region = v;
      if (norm(k) === 'country' && v && !out.country) out.country = v;
    }
  }
  return out;
};

/* ───────── Price bands (tokens) ───────── */
type PriceKey = 'any' | '1-5' | '6-10' | '11-20' | '21-50' | '51+';
const PRICE_BANDS: Record<PriceKey, (n?: number) => boolean> = {
  any: () => true,
  '1-5':  (n) => typeof n === 'number' && n >= 1 && n <= 5,
  '6-10': (n) => typeof n === 'number' && n >= 6 && n <= 10,
  '11-20':(n) => typeof n === 'number' && n >= 11 && n <= 20,
  '21-50':(n) => typeof n === 'number' && n >= 21 && n <= 50,
  '51+':  (n) => typeof n === 'number' && n >= 51,
};
const PRICE_LABEL: Record<PriceKey, string> = {
  any: 'Any price',
  '1-5': '1–5 tokens',
  '6-10': '6–10',
  '11-20': '11–20',
  '21-50': '21–50',
  '51+': '51+',
};

const toNum = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// ---------- Config ----------
type TabKey = 'videos' | 'notes';
const VISIBLE_LIMIT = 8;
const DEBOUNCE_MS = 300;

/* ---------------- small UI bits: Chip ---------------- */
const Chip: React.FC<{ label: string; active?: boolean; onPress(): void }> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw.style(
      'px-3 h-9 rounded-full items-center justify-center mr-2 mb-2',
      active ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]',
    )}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
  >
    <Text style={tw.style('text-sm', active ? 'text-white font-semibold' : 'text-[#0d141c] dark:text-white/90')}>
      {label}
    </Text>
  </Pressable>
);

type PdfItem = {
  id: number;
  title: string;
  price: number;
  subject?: string;
  grade_level?: string | number;
  tutor_id?: number;
  description?: string;
  metadata?: any;
  tags?: any[];
  region?: string;
  country?: string;
  thumbnail_url?: string;
  preview_url?: string;
};

export interface ClassVaultFilters {
  category?: string[]; // subject
  ageGroup?: string[]; // grade
  region?: string;
  country?: string;
}
interface ClassVaultListScreenProps {
  filters: ClassVaultFilters;
  clearFilters?: () => void;
  searchTerm?: string;
}

export default function ClassVaultListScreen({
  filters,
  clearFilters,
  searchTerm,
}: ClassVaultListScreenProps) {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'ClassVaultLibrary'>>();
  const { role, userId, backendUrl } = useShopContext();

  // Base hook filters
  const chosenSubject = filters.category?.[0] ?? '';
  const chosenGrade   = filters.ageGroup?.[0] ?? '';

  // Local UI filters (chip-based)
  const [region, setRegion]     = useState<string>(filters.region ?? '');
  const [country, setCountry]   = useState<string>(filters.country ?? '');
  const [subject, setSubject]   = useState<string>('');
  const [grade, setGrade]       = useState<string>('');
  const [priceKey, setPriceKey] = useState<PriceKey>('any');

  const {
    videos,
    filteredVideos,
    filteredPdfRows,
    purchasedIds,
    loading,
    error,
    refresh,
    purchase,
    remove,
  } = useClassVault(chosenSubject, chosenGrade);

  const [tab, setTab] = useState<TabKey>('videos');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  // Preview player
  const previewPlayer = useVideoPlayer(null, (player) => { player.loop = true; });
  useEffect(() => {
    const current = filteredVideos.find(v => v.id === previewId);
    const url = current?.preview_url || null;
    let cancelled = false;
    (async () => {
      try {
        previewPlayer.pause();
        await previewPlayer.replace(url);
        if (!cancelled && url) previewPlayer.play();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [previewId, filteredVideos, previewPlayer]);

  // Refresh on focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Role scoping
  const scopedVideos = useMemo(() => {
    if (role === 'tutor' && userId != null) {
      const me = Number(userId);
      return filteredVideos.filter(v => Number(v.tutor_id) === me);
    }
    return filteredVideos;
  }, [filteredVideos, role, userId]);

  const scopedPdfRows: PdfItem[][] = useMemo(() => {
    if (role === 'tutor' && userId != null) {
      const me = Number(userId);
      const rows = filteredPdfRows
        .map(row => row.filter(pdf => Number((pdf as { tutor_id?: number }).tutor_id) === me) as PdfItem[])
        .filter(row => row.length > 0);
      return rows;
    }
    return filteredPdfRows as unknown as PdfItem[][];
  }, [filteredPdfRows, role, userId]);

  // Build Subject / Grade lists dynamically
  const subjectsList = useMemo(() => {
    const s = new Set<string>();
    scopedVideos.forEach(v => v.subject && s.add(String(v.subject)));
    scopedPdfRows.flat().forEach(p => p.subject && s.add(String(p.subject)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [scopedVideos, scopedPdfRows]);

  const gradesList = useMemo(() => {
    const s = new Set<string>();
    scopedVideos.forEach(v => v.grade_level && s.add(String(v.grade_level)));
    scopedPdfRows.flat().forEach(p => p.grade_level && s.add(String(p.grade_level)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [scopedVideos, scopedPdfRows]);

  // Global text search (optional from parent)
  const q = (searchTerm ?? '').trim().toLowerCase();
  const searchFilteredVideos = useMemo(() => {
    if (!q) return scopedVideos;
    return scopedVideos.filter(v => {
      const titleMatch   = v.title.toLowerCase().includes(q);
      const subjectMatch = (v.subject ?? '').toLowerCase().includes(q);
      const gradeMatch   = v.grade_level != null ? String(v.grade_level).toLowerCase().includes(q) : false;
      const descMatch    = (v.description ?? '').toLowerCase().includes(q);
      return titleMatch || subjectMatch || gradeMatch || descMatch;
    });
  }, [scopedVideos, q]);

  const searchFilteredPdfRows = useMemo(() => {
    if (!q) return scopedPdfRows;
    return scopedPdfRows
      .map(row =>
        row.filter(pdf => {
          const titleMatch   = pdf.title.toLowerCase().includes(q);
          const subjectMatch = (pdf.subject ?? '').toLowerCase().includes(q);
          const gradeMatch   = pdf.grade_level != null ? String(pdf.grade_level).toLowerCase().includes(q) : false;
          const descMatch    = (pdf.description ?? '').toLowerCase().includes(q);
          return titleMatch || subjectMatch || gradeMatch || descMatch;
        })
      )
      .filter(row => row.length > 0);
  }, [scopedPdfRows, q]);

  // Region/Country narrowing
  const regionCountryFilteredVideos = useMemo(() => {
    if (!region && !country) return searchFilteredVideos;
    const key = resolveRegionKey(region);
    const regionCountries = key ? (COUNTRIES_BY_REGION[key] || []).map(norm) : [];
    return searchFilteredVideos.filter(v => {
      const { region: r, country: c } = readGeoFrom(v);
      const rOk = !region || norm(r) === norm(region) || (!!c && regionCountries.includes(norm(c)));
      const cOk = !country || norm(c) === norm(country);
      return rOk && cOk;
    });
  }, [searchFilteredVideos, region, country]);

  const regionCountryFilteredPdfRows = useMemo(() => {
    if (!region && !country) return searchFilteredPdfRows;
    const key = resolveRegionKey(region);
    const regionCountries = key ? (COUNTRIES_BY_REGION[key] || []).map(norm) : [];
    return searchFilteredPdfRows
      .map(row => row.filter(pdf => {
        const { region: r, country: c } = readGeoFrom(pdf);
        const rOk = !region || norm(r) === norm(region) || (!!c && regionCountries.includes(norm(c)));
        const cOk = !country || norm(c) === norm(country);
        return rOk && cOk;
      }))
      .filter(row => row.length > 0);
  }, [searchFilteredPdfRows, region, country]);

  // Subject/Grade/Price filters
  const fullyFilteredVideos = useMemo(() => {
    return regionCountryFilteredVideos.filter(v => {
      const subjectOk = !subject || norm(String(v.subject)) === norm(subject);
      const gradeOk   = !grade   || norm(String(v.grade_level)) === norm(grade);
      const priceOk   = PRICE_BANDS[priceKey](toNum(v.price));
      return subjectOk && gradeOk && priceOk;
    });
  }, [regionCountryFilteredVideos, subject, grade, priceKey]);

  const fullyFilteredPdfRows = useMemo(() => {
    return regionCountryFilteredPdfRows
      .map((row: PdfItem[]) => row.filter((pdf: PdfItem) => {
        const subjectOk = !subject || norm(String(pdf.subject)) === norm(subject);
        const gradeOk   = !grade   || norm(String(pdf.grade_level)) === norm(grade);
        const priceOk   = PRICE_BANDS[priceKey](toNum(pdf.price));
        return subjectOk && gradeOk && priceOk;
      }))
      .filter((row: PdfItem[]) => row.length > 0);
  }, [regionCountryFilteredPdfRows, subject, grade, priceKey]);

  // ---------- Ratings prefetch ----------
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({});
  const fetchingIdsRef = useRef<Set<number>>(new Set());
  const idsToPrefetch = useMemo<number[]>(
    () => fullyFilteredVideos.slice(0, VISIBLE_LIMIT).map(v => v.id),
    [fullyFilteredVideos]
  );
  const debouncedFetch = useMemo(
    () =>
      debounce(async (ids: number[]) => {
        if (!backendUrl) return;
        for (const id of ids) {
          if (ratings[id] || fetchingIdsRef.current.has(id)) continue;
          fetchingIdsRef.current.add(id);
          try {
            const data: VideoReview[] = await fetchVideoReviews(backendUrl, id);
            const count = data.length;
            const avg = count > 0
              ? Number((data.reduce((s, r) => s + Number(r.rating), 0) / count).toFixed(2))
              : 0;
            setRatings(prev => (prev[id] ? prev : { ...prev, [id]: { avg, count } }));
          } finally {
            fetchingIdsRef.current.delete(id);
          }
        }
      }, DEBOUNCE_MS),
    [backendUrl, ratings]
  );
  useEffect(() => {
    const pending = idsToPrefetch.filter(id => !ratings[id] && !fetchingIdsRef.current.has(id));
    if (pending.length > 0) debouncedFetch(pending);
    return () => { debouncedFetch.cancel(); };
  }, [idsToPrefetch, ratings, debouncedFetch]);

  // ----- Derived values & handlers that MUST be before any returns -----
  const countriesForRegion = useMemo(() => {
    const key = resolveRegionKey(region);
    return key
      ? (COUNTRIES_BY_REGION[key] || [])
      : ['United States','United Kingdom','Kenya','India','United Arab Emirates','Saudi Arabia','Qatar'];
  }, [region]);

  const resetAll = useCallback(() => {
    setRegion(''); setCountry(''); setSubject(''); setGrade(''); setPriceKey('any');
    clearFilters?.();
  }, [clearFilters]);

  // ---------- Purchase / Download / Delete ----------
  const handlePurchase = useCallback(
    async (item: RecordedVideo) => {
      if (buyingId === item.id) return;
      const confirmText =
        `You are about to purchase "${item.title}" for ${item.price} tokens.\n\n` +
        `This amount will be deducted from your balance. Do you want to continue?`;
      Alert.alert('Confirm Purchase', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              setBuyingId(item.id);
              await purchase(item);
              Alert.alert('Success', `"${item.title}" is now unlocked.`, [
                { text: 'OK', onPress: () => navigation.navigate('ClassVaultDetail', { id: item.id }) },
              ]);
            } catch (err: unknown) {
              const message =
                typeof err === 'object' && err && 'message' in err && typeof (err as { message: unknown }).message === 'string'
                  ? (err as { message: string }).message
                  : 'Purchase failed';
              if (message.includes('Insufficient tokens')) {
                Alert.alert(
                  'Insufficient Tokens',
                  'Not enough tokens. Would you like to buy more?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Buy Tokens', onPress: () => navigation.navigate('BuyTokens') },
                  ]
                );
              } else {
                Alert.alert('Error', message);
              }
            } finally { setBuyingId(null); }
          },
        },
      ]);
    },
    [purchase, navigation, buyingId]
  );

  const handleDownload = useCallback(
    (item: RecordedVideo | { id: number }) => navigation.navigate('ClassVaultDetail', { id: item.id }),
    [navigation]
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (role !== 'tutor') return;
      Alert.alert('Delete Item', 'Delete this item?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => { try { await remove(id); } catch { Alert.alert('Deletion failed'); } },
        },
      ]);
    },
    [remove, role]
  );

  // ---------- Early returns are now SAFE (all hooks declared above) ----------
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-slate-50 dark:bg-[#0b1016]`}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-slate-50 dark:bg-[#0b1016] p-4`}>
        <Text style={tw`text-red-600 dark:text-red-400 text-center`}>{error}</Text>
      </View>
    );
  }

  const videosEmpty = fullyFilteredVideos.length === 0;
  const notesEmpty  = fullyFilteredPdfRows.flat().length === 0;

  return (
    <View style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView contentContainerStyle={tw`px-4 py-4`}>
        {/* Title + Reset */}
        <View style={tw`flex-row items-end justify-between mb-2`}>
          <View style={tw`flex-1 pr-3`}>
            <Text style={tw`text-[20px] font-extrabold text-[#0d141c] dark:text-white`}>
              {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
            </Text>
          </View>
          <TouchableOpacity onPress={resetAll} style={tw`rounded-xl h-9 px-4 bg-[#e7edf4] dark:bg-[#172534] justify-center`}>
            <Text style={tw`text-sm text-[#0d141c] dark:text-white`}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={tw`flex-row self-center bg-[#e7edf4] dark:bg-[#172534] border border-[#cedbe8] dark:border-white/10 rounded-full p-1 mb-3`}>
          <TouchableOpacity
            onPress={() => setTab('videos')}
            style={tw.style('px-4 py-2 rounded-full', tab === 'videos' && 'bg-white dark:bg-[#0f1821]')}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === 'videos' }}
          >
            <Text style={tw.style('text-xs font-semibold',
              tab === 'videos' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/70')}>
              Videos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('notes')}
            style={tw.style('px-4 py-2 rounded-full', tab === 'notes' && 'bg-white dark:bg-[#0f1821]')}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === 'notes' }}
          >
            <Text style={tw.style('text-xs font-semibold',
              tab === 'notes' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/70')}>
              Class Notes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick filters (FindTutor-style chips) */}
        <View style={tw`mb-1`}>
          <Text style={tw`text-[16px] font-bold text-[#0d141c] dark:text-white`}>Quick filters</Text>

          {/* Subject */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-2 pr-2`}>
            <Chip label={subject ? `Subject: ${subject}` : 'Any subject'} active={!!subject} onPress={() => setSubject('')} />
            {subjectsList.map((s) => (
              <Chip key={s} label={s} active={subject === s} onPress={() => setSubject(s)} />
            ))}
          </ScrollView>

          {/* Grade */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
            <Chip label={grade ? `Grade: ${grade}` : 'Any grade'} active={!!grade} onPress={() => setGrade('')} />
            {gradesList.map((g) => (
              <Chip key={String(g)} label={String(g)} active={grade === String(g)} onPress={() => setGrade(String(g))} />
            ))}
          </ScrollView>

          {/* Price (tokens) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
            {(['any','1-5','6-10','11-20','21-50','51+'] as PriceKey[]).map(pk => (
              <Chip key={pk} label={PRICE_LABEL[pk]} active={priceKey === pk} onPress={() => setPriceKey(pk)} />
            ))}
          </ScrollView>

          {/* Region */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
            <Chip label={region || 'Any region'} active={!!region} onPress={() => { setRegion(''); setCountry(''); }} />
            {REGIONS.map((r) => (
              <Chip key={r} label={r} active={region === r} onPress={() => { setRegion(r); setCountry(''); }} />
            ))}
          </ScrollView>

          {/* Country */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1 pr-2`}>
            <Chip label={country || 'Any country'} active={!!country} onPress={() => setCountry('')} />
            {countriesForRegion.map((c) => (
              <Chip key={c} label={c} active={country === c} onPress={() => setCountry(c)} />
            ))}
          </ScrollView>
        </View>

        {/* Tutor empty message */}
        {role === 'tutor' && videos.length === 0 && (
          <View style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-3 rounded-2xl mb-4`}>
            <Text style={tw`text-[#0d141c] dark:text-white font-semibold text-center`}>
              Earn passive income—upload once and get paid every time a student purchases.
            </Text>
          </View>
        )}

        {/* VIDEOS */}
        {tab === 'videos' ? (
          videosEmpty ? (
            <View style={tw`items-center mt-8`}>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-center mb-4`}>
                {role === 'tutor' ? 'No recorded videos yet.' : 'No available videos.'}
              </Text>
              {role === 'tutor' && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ClassVaultUpload')}
                  style={tw`bg-[#3d99f5] px-6 py-3 rounded-full`}
                >
                  <Text style={tw`text-white font-semibold`}>Upload Your First Class</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            fullyFilteredVideos.map(video => {
              const stat = ratings[video.id];
              const showStars = Boolean(stat && stat.count > 0);
              const isPreviewing = previewId === video.id;

              return (
                <View
                  key={video.id}
                  style={tw`bg-white dark:bg-[#0f1821] border border-[#cedbe7] dark:border-white/10 p-4 rounded-2xl mb-4`}
                >
                  {/* Title & meta */}
                  <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-1`} numberOfLines={2}>
                    {video.title}
                  </Text>

                  {/* ⭐ Ratings */}
                  {showStars ? (
                    <Text style={tw`text-yellow-500 mb-1`}>
                      {'★'.repeat(Math.min(5, Math.round(stat!.avg)))}<Text style={tw`text-[#49739c] dark:text-white/70`}> ({stat!.count})</Text>
                    </Text>
                  ) : null}

                  <Text style={tw`text-[#49739c] dark:text-white/70 mb-2`} numberOfLines={1}>
                    {(video.subject ?? 'Unknown subject')} • Grade {video.grade_level}
                  </Text>
                  <Text style={tw`text-[#49739c] dark:text-white/70 mb-1`}>Price: {video.price} tokens</Text>

                  {/* Preview */}
                  {!isPreviewing && (video.thumbnail_url || video.preview_url) ? (
                    <View style={tw`relative mt-3`}>
                      {video.thumbnail_url ? (
                        <Image source={{ uri: video.thumbnail_url }} style={tw`w-full h-48 rounded-xl`} />
                      ) : (
                        <View style={tw`w-full h-48 rounded-xl bg-black items-center justify-center`}>
                          <FontAwesome5 name="play-circle" size={48} color="#ffffff" />
                        </View>
                      )}
                      {video.preview_url ? (
                        <TouchableOpacity
                          onPress={() => setPreviewId(video.id)}
                          style={tw`absolute inset-0 items-center justify-center`}
                          accessibilityRole="button"
                          accessibilityLabel="Play preview"
                        >
                          <FontAwesome5 name="play-circle" size={48} color="#ffffff" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}

                  {isPreviewing && video.preview_url && (
                    <View style={tw`w-full h-48 rounded-xl overflow-hidden mt-3`}>
                      <VideoView
                        player={previewPlayer}
                        style={tw`w-full h-full`}
                        nativeControls
                        allowsFullscreen
                        allowsPictureInPicture
                        contentFit="contain"
                      />
                      <TouchableOpacity
                        onPress={() => setPreviewId(null)}
                        style={tw`absolute top-2 right-2`}
                        accessibilityRole="button"
                        accessibilityLabel="Close preview"
                      >
                        <FontAwesome5 name="times-circle" size={24} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Actions */}
                  {role === 'tutor' ? (
                    <TouchableOpacity onPress={() => handleDelete(video.id)} style={tw`bg-red-600 py-2 rounded-xl mt-3`}>
                      <Text style={tw`text-white text-center font-medium`}>Delete</Text>
                    </TouchableOpacity>
                  ) : purchasedIds.has(video.id) ? (
                    <>
                      <TouchableOpacity onPress={() => handleDownload(video)} style={tw`bg-[#e7edf4] dark:bg-[#172534] py-2 rounded-xl mt-3`}>
                        <Text style={tw`text-slate-900 dark:text-white text-center font-medium`}>Download</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => navigation.navigate('ClassVaultDetail', { id: video.id })} style={tw`bg-[#e7edf4] dark:bg-[#172534] py-2 rounded-xl mt-3`}>
                        <Text style={tw`text-slate-900 dark:text-white text-center font-medium`}>Review</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      disabled={buyingId === video.id}
                      onPress={() => handlePurchase(video)}
                      style={tw.style('bg-[#3d99f5] py-2 rounded-xl mt-3', buyingId === video.id && 'opacity-60')}
                      accessibilityHint={buyingId === video.id ? 'Processing…' : undefined}
                    >
                      <Text style={tw`text-white text-center font-semibold`}>
                        {buyingId === video.id ? 'Purchasing…' : 'Purchase'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )
        ) : (
          // NOTES
          notesEmpty ? (
            <View style={tw`items-center mt-8`}>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-center mb-4`}>
                {role === 'tutor' ? 'No class notes uploaded yet.' : 'No class notes available.'}
              </Text>
              {role === 'tutor' && (
                <TouchableOpacity onPress={() => navigation.navigate('ClassVaultUpload')} style={tw`bg-[#3d99f5] px-6 py-3 rounded-full`}>
                  <Text style={tw`text-white font-semibold`}>Upload Your First Notes</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            regionCountryFilteredPdfRows.length > 0 && fullyFilteredPdfRows.map((row: PdfItem[], idx: number) => (
              <View key={idx} style={tw`flex-row justify-between mb-4`}>
                {row.map((pdf: PdfItem) => (
                  <View key={pdf.id} style={tw`flex-1 mx-1 bg-white dark:bg-[#0f1821] border border-[#cedbe8] dark:border-white/10 p-4 rounded-2xl`}>
                    <FontAwesome5 name="file-pdf" size={48} color="#6b7280" style={tw`mb-2 dark:text-white`} />
                    <Text style={tw`text-[#0d141c] dark:text-white font-semibold mb-1`} numberOfLines={2}>{pdf.title}</Text>
                    <Text style={tw`text-[#49739c] dark:text-white/70 mb-2`}>Price: {pdf.price} tokens</Text>

                    {role === 'tutor' ? (
                      <TouchableOpacity onPress={() => handleDelete(pdf.id)} style={tw`bg-red-600 py-2 rounded-xl mt-3`}>
                        <Text style={tw`text-white text-center font-medium`}>Delete</Text>
                      </TouchableOpacity>
                    ) : purchasedIds.has(pdf.id) ? (
                      <TouchableOpacity onPress={() => navigation.navigate('ClassVaultDetail', { id: pdf.id })} style={tw`bg-[#e7edf4] dark:bg-[#172534] py-2 rounded-xl mt-3`}>
                        <Text style={tw`text-slate-900 dark:text-white text-center font-medium`}>Download</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        disabled={buyingId === pdf.id}
                        onPress={() => handlePurchase(pdf as unknown as RecordedVideo)}
                        style={tw.style('bg-[#3d99f5] py-2 rounded-xl mt-3', buyingId === pdf.id && 'opacity-60')}
                      >
                        <Text style={tw`text-white text-center font-semibold`}>
                          {buyingId === pdf.id ? 'Purchasing…' : 'Purchase Access'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {row.length === 1 && <View style={tw`flex-1 mx-1`} />}
              </View>
            ))
          )
        )}

        {/* Upload CTA */}
        {role === 'tutor' && videos.length > 0 && (
          <View style={tw`items-center my-6`}>
            <TouchableOpacity onPress={() => navigation.navigate('ClassVaultUpload')} style={tw`bg-[#3d99f5] px-6 py-3 rounded-full`}>
              <Text style={tw`text-white font-semibold`}>Upload New Class</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Optional: clear filters from parent */}
        {clearFilters && (
          <View style={tw`items-center mt-2`}>
            <TouchableOpacity onPress={clearFilters} style={tw`px-4 py-2 rounded-full bg-[#e7edf4] dark:bg-[#172534]`}>
              <Text style={tw`text-slate-900 dark:text-white`}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
