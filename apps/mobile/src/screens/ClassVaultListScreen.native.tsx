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
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video'; // ✅ expo-video
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

// ---------- Config (parity with web) ----------
type TabKey = 'videos' | 'notes';
const VISIBLE_LIMIT = 8;
const DEBOUNCE_MS = 300;

export interface ClassVaultFilters {
  category?: string[]; // subject
  ageGroup?: string[]; // grade
}

interface ClassVaultListScreenProps {
  filters: ClassVaultFilters;
  clearFilters?: () => void;
  /** Optional global search (to match web's ?q=) */
  searchTerm?: string;
}

export default function ClassVaultListScreen({
  filters,
  clearFilters,
  searchTerm,
}: ClassVaultListScreenProps) {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'ClassVaultLibrary'>>();
  const { role, userId, backendUrl } = useShopContext();

  // Derive subject & grade for hook (match web "chosenSubject/Grade")
  const chosenSubject = filters.category?.[0] ?? '';
  const chosenGrade   = filters.ageGroup?.[0] ?? '';

  // Fetch & base-filter via hook
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

  // ---------- Single preview player (expo-video) ----------
  // Create a player once; swap its source on demand.
  const previewPlayer = useVideoPlayer(null, (player) => {
    player.loop = true;
  });

  useEffect(() => {
    const current = filteredVideos.find(v => v.id === previewId);
    const url = current?.preview_url || null;

    let cancelled = false;
    (async () => {
      try {
        // pause before swapping sources to avoid blips
        previewPlayer.pause();
        await previewPlayer.replace(url); // string or null is allowed
        if (!cancelled && url) {
          previewPlayer.play();
        }
      } catch {
        // swallow errors; preview is optional
      }
    })();

    return () => { cancelled = true; };
  }, [previewId, filteredVideos, previewPlayer]);

  // Refresh on focus (parity with web's useEffect refresh)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // ---------- Role scoping (tutor sees only own uploads) ----------
  const scopedVideos = useMemo(() => {
    if (role === 'tutor' && userId != null) {
      const me = Number(userId);
      return filteredVideos.filter(v => Number(v.tutor_id) === me);
    }
    return filteredVideos;
  }, [filteredVideos, role, userId]);

  const scopedPdfRows = useMemo(() => {
    if (role === 'tutor' && userId != null) {
      const me = Number(userId);
      const rows = filteredPdfRows
        .map(row => row.filter(pdf => Number((pdf as { tutor_id?: number }).tutor_id) === me))
        .filter(row => row.length > 0);
      return rows;
    }
    return filteredPdfRows;
  }, [filteredPdfRows, role, userId]);

  // ---------- Global search (title/subject/grade) ----------
  const q = (searchTerm ?? '').trim().toLowerCase();
  const searchFilteredVideos = useMemo(() => {
    if (!q) return scopedVideos;
    return scopedVideos.filter(v => {
      const titleMatch   = v.title.toLowerCase().includes(q);
      const subjectMatch = (v.subject ?? '').toLowerCase().includes(q);
      const gradeMatch   = v.grade_level != null
        ? String(v.grade_level).toLowerCase().includes(q)
        : false;
      return titleMatch || subjectMatch || gradeMatch;
    });
  }, [scopedVideos, q]);

  const searchFilteredPdfRows = useMemo(() => {
    if (!q) return scopedPdfRows;
    return scopedPdfRows
      .map(row =>
        row.filter(pdf => {
          const titleMatch   = pdf.title.toLowerCase().includes(q);
          const subjectMatch = (pdf.subject ?? '').toLowerCase().includes(q);
          const gradeMatch   = pdf.grade_level != null
            ? String(pdf.grade_level).toLowerCase().includes(q)
            : false;
          return titleMatch || subjectMatch || gradeMatch;
        })
      )
      .filter(row => row.length > 0);
  }, [scopedPdfRows, q]);

  // ---------- Ratings prefetch (debounced, first N visible) ----------
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({});
  const fetchingIdsRef = useRef<Set<number>>(new Set());

  const idsToPrefetch = useMemo<number[]>(
    () => searchFilteredVideos.slice(0, VISIBLE_LIMIT).map(v => v.id),
    [searchFilteredVideos]
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
          } catch {
            // ignore, leave unrated
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
    return () => {
      debouncedFetch.cancel();
    };
  }, [idsToPrefetch, ratings, debouncedFetch]);

  // ---------- Handlers ----------
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
                    // Use your existing BuyTokens route (can show PaymentWidget)
                    { text: 'Buy Tokens', onPress: () => navigation.navigate('BuyTokens') },
                  ]
                );
              } else {
                Alert.alert('Error', message);
              }
            } finally {
              setBuyingId(null);
            }
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
          onPress: async () => {
            try { await remove(id); }
            catch { Alert.alert('Deletion failed'); }
          },
        },
      ]);
    },
    [remove, role]
  );

  // ---------- States ----------
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-900 p-4`}>
        <Text style={tw`text-red-500 text-center`}>{error}</Text>
      </View>
    );
  }

  const videosEmpty = searchFilteredVideos.length === 0;
  const notesEmpty  = searchFilteredPdfRows.flat().length === 0;

  return (
    <ScrollView contentContainerStyle={tw`bg-gray-900 p-4`}>
      {/* Title */}
      <Text style={tw`text-2xl text-white font-bold mb-4 text-center`}>
        {role === 'tutor' ? 'Your Uploaded Classes' : 'Available Classes'}
      </Text>

      {/* Tabs */}
      <View style={tw`flex-row bg-gray-800 border border-gray-700 rounded-full p-1 mb-4 self-center`}>
        <TouchableOpacity
          onPress={() => setTab('videos')}
          style={tw.style('px-4 py-2 rounded-full', tab === 'videos' && 'bg-gray-700')}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'videos' }}
        >
          <Text style={tw.style('text-sm font-medium', tab === 'videos' ? 'text-white' : 'text-gray-400')}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('notes')}
          style={tw.style('px-4 py-2 rounded-full', tab === 'notes' && 'bg-gray-700')}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'notes' }}
        >
          <Text style={tw.style('text-sm font-medium', tab === 'notes' ? 'text-white' : 'text-gray-400')}>
            Class Notes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tutor empty message */}
      {role === 'tutor' && videos.length === 0 && (
        <View style={tw`bg-gray-800 p-3 rounded mb-4`}>
          <Text style={tw`text-white font-semibold text-center`}>
            Earn passive income—upload once and get paid every time a student purchases.
          </Text>
        </View>
      )}

      {/* VIDEOS */}
      {tab === 'videos' ? (
        videosEmpty ? (
          <View style={tw`items-center mt-8`}>
            <Text style={tw`text-gray-400 text-center mb-4`}>
              {role === 'tutor' ? 'No recorded videos yet.' : 'No available videos.'}
            </Text>
            {role === 'tutor' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClassVaultUpload')}
                style={tw`bg-gray-700 px-6 py-3 rounded-full`}
              >
                <Text style={tw`text-white font-semibold`}>Upload Your First Class</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          searchFilteredVideos.map(video => {
            const stat = ratings[video.id];
            const showStars = Boolean(stat && stat.count > 0);

            const isPreviewing = previewId === video.id;

            return (
              <View key={video.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                {/* Title & meta */}
                <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
                  {video.title}
                </Text>

                {/* ⭐ Ratings row */}
                {showStars ? (
                  <Text style={tw`text-yellow-400 mb-1`}>
                    {'★'.repeat(Math.min(5, Math.round(stat!.avg)))}
                    <Text style={tw`text-gray-400`}> ({stat!.count})</Text>
                  </Text>
                ) : null}

                <Text style={tw`text-gray-400 mb-2`} numberOfLines={1}>
                  {(video.subject ?? 'Unknown subject')} • Grade {video.grade_level}
                </Text>
                <Text style={tw`text-gray-400 mb-1`}>Price: {video.price} tokens</Text>

                {/* Preview: poster image then inline video controls when tapped */}
                {!isPreviewing && video.thumbnail_url ? (
                  <View style={tw`relative mt-3`}>
                    <Image source={{ uri: video.thumbnail_url }} style={tw`w-full h-48 rounded-lg`} />
                    {video.preview_url ? (
                      <TouchableOpacity
                        onPress={() => setPreviewId(video.id)}
                        style={tw`absolute inset-0 items-center justify-center`}
                        accessibilityRole="button"
                        accessibilityLabel="Play preview"
                      >
                        <FontAwesome5 name="play-circle" size={48} color="white" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {isPreviewing && video.preview_url && (
                  <View style={tw`w-full h-48 rounded-lg overflow-hidden mt-3`}>
                    <VideoView
                      // Expo Video props:
                      // - player connected above; source swapped via previewPlayer.replace(...)
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
                      <FontAwesome5 name="times-circle" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Actions */}
                {role === 'tutor' ? (
                  <TouchableOpacity
                    onPress={() => handleDelete(video.id)}
                    style={tw`bg-red-600 py-2 rounded-lg mt-3`}
                  >
                    <Text style={tw`text-white text-center`}>Delete</Text>
                  </TouchableOpacity>
                ) : purchasedIds.has(video.id) ? (
                  <>
                    <TouchableOpacity
                      onPress={() => handleDownload(video)}
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ClassVaultDetail', { id: video.id })}
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>Review</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    disabled={buyingId === video.id}
                    onPress={() => handlePurchase(video)}
                    style={tw.style('bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3', buyingId === video.id && 'opacity-60')}
                    accessibilityHint={buyingId === video.id ? 'Processing…' : undefined}
                  >
                    <Text style={tw`text-white text-center font-medium`}>
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
            <Text style={tw`text-gray-400 text-center mb-4`}>
              {role === 'tutor' ? 'No class notes uploaded yet.' : 'No class notes available.'}
            </Text>
            {role === 'tutor' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClassVaultUpload')}
                style={tw`bg-gray-700 px-6 py-3 rounded-full`}
              >
                <Text style={tw`text-white font-semibold`}>Upload Your First Notes</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          searchFilteredPdfRows.map((row, idx) => (
            <View key={idx} style={tw`flex-row justify-between mb-4`}>
              {row.map(pdf => (
                <View key={pdf.id} style={tw`flex-1 mx-1 bg-gray-800 p-4 rounded-lg`}>
                  <FontAwesome5 name="file-pdf" size={48} color="white" style={tw`mb-2`} />
                  <Text style={tw`text-white font-semibold mb-1`} numberOfLines={2}>
                    {pdf.title}
                  </Text>
                  <Text style={tw`text-gray-400 mb-2`}>Price: {pdf.price} tokens</Text>

                  {role === 'tutor' ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(pdf.id)}
                      style={tw`bg-red-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center`}>Delete</Text>
                    </TouchableOpacity>
                  ) : purchasedIds.has(pdf.id) ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ClassVaultDetail', { id: pdf.id })}
                      style={tw`bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3`}
                    >
                      <Text style={tw`text-white text-center font-medium`}>Download</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      disabled={buyingId === pdf.id}
                      onPress={() => handlePurchase(pdf as RecordedVideo)}
                      style={tw.style('bg-gray-700 border border-gray-600 py-2 rounded-lg mt-3', buyingId === pdf.id && 'opacity-60')}
                    >
                      <Text style={tw`text-white text-center font-medium`}>
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
          <TouchableOpacity
            onPress={() => navigation.navigate('ClassVaultUpload')}
            style={tw`bg-gray-700 px-6 py-3 rounded-full`}
          >
            <Text style={tw`text-white font-semibold`}>Upload New Class</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Optional: clear filters button if provided */}
      {clearFilters && (
        <View style={tw`items-center mt-2`}>
          <TouchableOpacity onPress={clearFilters} style={tw`px-4 py-2 rounded-full bg-gray-800`}>
            <Text style={tw`text-white`}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
