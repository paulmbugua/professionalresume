/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
  Pressable,
  ImageBackground,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import tw from '../../tailwind';

import LessonOverlay from './LessonOverlay.native';

// word-sync + shop
import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { useShopContext } from '@mytutorapp/shared/context';

// Subject-aware image helpers (shared)
import {
  pickImageForCourse,
  SUBJECT_IMAGE_MAP,
  SUBJECT_ALIASES,
  FALLBACK_COURSE_IMAGE,
} from '../../utils/subjectImages';

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
type WordTiming = { text: string; start: number; end: number };

type SpeakAsMode = 'math' | 'spell-out' | 'characters' | 'none';
const toSpeakAsMode = (v?: string): SpeakAsMode | undefined => {
  switch ((v || '').toLowerCase()) {
    case 'math':
    case 'spell-out':
    case 'characters':
    case 'none':
      return v as SpeakAsMode;
    default:
      return undefined;
  }
};

type LessonImage = {
  id: string;
  title?: string;
  alt?: string;
  url?: string;
  caption?: string;
  announceAtSentence?: number;
};

type LessonSnippet = {
  id: string;
  title?: string;
  language?: string;
  code: string;
  explanation?: string;
  announceAtSentence?: number;
};

type LessonChart = {
  id: string;
  title?: string;
  kind?: 'bar' | 'line' | 'pie' | 'histogram' | 'scatter' | 'box' | 'heatmap' | 'other';
  alt?: string;
  url?: string;
  svg?: string;
  caption?: string;
  announceAtSentence?: number;
};

type LessonLite = {
  id: string;
  title?: string;
  ssml: string;
  markdown?: string;
  formulas?: {
    id: string;
    latex: string;
    speakAs?: SpeakAsMode;
    title?: string;
    announceAtSentence?: number;
  }[];
  tables?: {
    title: string;
    columns: string[];
    rows: (string | number | boolean)[][];
    caption?: string;
    announceAtSentence?: number;
  }[];
  images?: LessonImage[];
  snippets?: LessonSnippet[];
  charts?: LessonChart[];
};

type OutlineSection = { id: string; title: string; keyPoints?: string[] };

export type ClassroomPlayerProps = {
  ssml?: string;
  lessons?: LessonLite[];
  title?: string;
  voiceName?: string;

  onNext?: () => Promise<boolean> | boolean;
  onPrev?: () => Promise<boolean> | boolean;

  isBuildingNext?: boolean;
  activeIndex?: number;

  maximized?: boolean;
  playerHeight?: number | string;
  onToggleMaximize?: () => void;
  onEnded?: () => void;
  disableInternalBackdrop?: boolean;
  backdropOverride?: React.ReactNode;
  onToggleThemePanel?: () => void;
  onPlayerLoadingChange?: (loading: boolean) => void;
  onRequestStart?: () => void;
  course?: any | null;
  outline?: OutlineSection[];
  backendUrlOverride?: string;
  playing?: boolean;
  playJoinedIfAvailable?: boolean;
  onBeforePlay?: () => Promise<void> | void;
};

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */
const toOverlayLesson = (lesson: LessonLite | undefined) => {
  if (!lesson) return null;
  const formulas = Array.isArray(lesson.formulas)
    ? lesson.formulas.map((f) => ({
        id: f.id,
        latex: f.latex,
        speakAs: toSpeakAsMode(f.speakAs),
        title: f.title,
        announceAtSentence: f.announceAtSentence,
      }))
    : undefined;

  return { ...lesson, formulas };
};

function collectSubjectKeysFromText(txt: string) {
  const hay = txt.toLowerCase();
  const hits: string[] = [];
  for (const key of Object.keys(SUBJECT_IMAGE_MAP)) if (hay.includes(key)) hits.push(key);
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES as Record<string, string[]>))
    if (aliases.some((a) => hay.includes(a))) hits.push(canonical);
  return Array.from(new Set(hits));
}

function useBackdropImages({
  course,
  outline,
  backendUrl,
}: {
  course?: any | null;
  outline?: OutlineSection[];
  backendUrl?: string;
}) {
  const base = useMemo(() => {
    try {
      return course ? pickImageForCourse(course, backendUrl ?? '') : FALLBACK_COURSE_IMAGE;
    } catch {
      return FALLBACK_COURSE_IMAGE;
    }
  }, [course, backendUrl]);

  const images = useMemo(() => {
    const textBits: string[] = [];
    if (course?.title) textBits.push(course.title);
    if (course?.subject) textBits.push(course.subject);
    if (course?.category) textBits.push(course.category);
    if (course?.description) textBits.push(course.description);
    (outline || []).forEach((s) => {
      textBits.push(s.title);
      (s.keyPoints || []).forEach((k) => textBits.push(k));
    });

    const keys = collectSubjectKeysFromText(textBits.join(' '));
    const pool = new Set<string>([base]);
    const SIM = SUBJECT_IMAGE_MAP as Record<string, string>;
    keys.forEach((k) => {
      if (k && SIM[k]) pool.add(SIM[k]);
    });

    return Array.from(pool).slice(0, 4);
  }, [base, course, outline]);

  return { images, base };
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────────────────
   Inline Drawers (to match reference look)
   ───────────────────────────────────────────────────────── */
function TranscriptDrawerInline({
  open,
  title,
  lines,
  words,
  activeLine,
  readerScale,
  loading,
  error,
  onSeekToWord,
}: {
  open: boolean;
  title: string;
  lines: { text: string; start: number; end: number; indices: number[] }[];
  words: any[];
  activeLine: number;
  readerScale: number;
  loading: boolean;
  error?: string;
  onSeekToWord: (i: number) => void;
}) {
  return (
    <Modal animationType="slide" visible={open} transparent>
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Pressable style={tw`flex-1`} />
        <View style={[tw`bg-slate-900 rounded-t-2xl px-4 pt-3 pb-6`, { maxHeight: '70%' }]}>
          <Text style={tw`text-white text-base font-semibold mb-2`}>
            {title} — Transcript
          </Text>
          {loading && <Text style={tw`text-white/80 mb-2`}>Generating…</Text>}
          {error ? (
            <Text style={tw`text-red-300`}>{error}</Text>
          ) : (
            <ScrollView style={tw`max-h-[60%]`} contentContainerStyle={tw`pb-4`}>
              {lines.map((ln, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => onSeekToWord(ln.indices[0] ?? 0)}
                  style={[
                    tw`px-3 py-2 rounded-lg mb-2`,
                    { backgroundColor: idx === activeLine ? 'rgba(255,255,255,0.08)' : 'transparent' },
                  ]}
                >
                  <Text
                    style={[
                      tw`text-white`,
                      { fontSize: Math.min(18, 16 * readerScale) },
                    ]}
                  >
                    {ln.text}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function NotesDrawerInline({
  open,
  title,
  markdown,
}: {
  open: boolean;
  title: string;
  markdown: string;
}) {
  return (
    <Modal animationType="slide" visible={open} transparent>
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Pressable style={tw`flex-1`} />
        <View style={[tw`bg-slate-900 rounded-t-2xl px-4 pt-3 pb-6`, { maxHeight: '70%' }]}>
          <Text style={tw`text-white text-base font-semibold mb-2`}>{title}</Text>
          <ScrollView>
            <Text style={tw`text-white/90`}>{markdown || '_No notes for this lesson yet._'}</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   Component (expo-av powered)
   ───────────────────────────────────────────────────────── */
export default function ClassroomPlayerNative({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',

  maximized,
  onToggleMaximize,
  playerHeight,

  onNext,
  onPrev,
  isBuildingNext,
  activeIndex,

  course,
  outline = [],
  backendUrlOverride,
  playing = true,
  onEnded,
  onBeforePlay,
  onToggleThemePanel,
  onPlayerLoadingChange,
  onRequestStart,
  playJoinedIfAvailable = true,
  disableInternalBackdrop = true,
  backdropOverride,
}: ClassroomPlayerProps) {
  // useWordSync: source of ssml->audioUrl + word timings
  const insets = useSafeAreaInsets();
  const ws = useWordSync() as any;
  const speak = ws.speak as (backend: string, o: { ssml: string; voiceName: string }) => Promise<unknown>;
  const loading: boolean = !!ws.loading;
  const error: string | null = ws.error ?? null;
  const wordsRaw: WordTiming[] = ws.words ?? [];
  const currentIndex: number = ws.currentIndex ?? 0;
  const resumeAudioContext = ws.resumeAudioContext ?? (async () => {});
  const seekToWord = ws.seekToWord ?? (() => {});
  const audioUrl: string | null = ws.audioUrl ?? null;
  const endedTick: number = ws.endedTick ?? 0;
  const markEnded = ws.markEnded ?? (() => {});
  const setTime: ((t: number) => void) | undefined = ws.setTime;

  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  const hasJoined = typeof ssml === 'string' && ssml.trim().length > 0;
  const useJoined = playJoinedIfAvailable && hasJoined;

  // AV state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingAv, setIsPlayingAv] = useState(false);
  const [mediaDur, setMediaDur] = useState(0);
  const [mediaTime, setMediaTime] = useState(0);
  const [speakReqTick, setSpeakReqTick] = useState(0);
  const lastLoadedUrlRef = useRef<string | null>(null);
  const autoPlayArmedRef = useRef(false);
  const requestedKeyRef = useRef<string | null>(null);
const speakKeyFor = (text: string) => `${voiceName}|${text.length}|${text.slice(0,64)}`;


  // Index state + controlled mirror
  const [lessonIdx, setLessonIdx] = useState(0);
  useEffect(() => {
    if (typeof activeIndex === 'number') setLessonIdx(activeIndex);
  }, [activeIndex]);
  const displayIdx = typeof activeIndex === 'number' ? activeIndex : lessonIdx;

  
    const pickSpeakSource = useCallback(() => {
   const lessonCur = lessons[lessonIdx]?.ssml?.trim();
   if (lessonCur) return lessonCur;

   const firstReadyIdx = lessons.findIndex(l => l?.ssml && l.ssml.trim().length);
   if (firstReadyIdx >= 0) {
     if (firstReadyIdx !== lessonIdx) setLessonIdx(firstReadyIdx);
     return lessons[firstReadyIdx]!.ssml.trim();
   }

   if (playJoinedIfAvailable && typeof ssml === 'string' && ssml.trim()) {
     return ssml.trim();
   }
   return '';
 }, [lessons, lessonIdx, setLessonIdx, playJoinedIfAvailable, ssml]);

  const words: WordTiming[] = wordsRaw ?? [];

  useEffect(() => {
    const hasAnySource = useJoined || hasLessons || Boolean((ssml || '').trim().length);
    const shouldBeLoading = loading || (hasAnySource && !words.length && !audioUrl);
    try { onPlayerLoadingChange?.(!!shouldBeLoading); } catch {}
  }, [loading, words.length, useJoined, hasLessons, ssml, audioUrl, onPlayerLoadingChange]);

  // layout & scale
  const [chromeTop, setChromeTop] = useState(44);
  const [chromeBottom, setChromeBottom] = useState(84);
  const wdim = useWindowDimensions();
  const isSmall = wdim.width < 640;

  // ── expo-av: status handler
  const onSoundStatus = useCallback((st: AVPlaybackStatus) => {
    if (!st.isLoaded) return;
    const pos = (st.positionMillis ?? 0) / 1000;
    const dur = (st.durationMillis ?? 0) / 1000;
    setMediaTime(pos);
    setMediaDur(dur);
    setIsPlayingAv(st.isPlaying);

    // let words engine follow AV time if available
    try { setTime?.(pos); } catch {}

    // ready signal
    if (!('isBuffering' in st) || !st.isBuffering) {
      try { onPlayerLoadingChange?.(false); } catch {}
    }

    if (st.didJustFinish) {
      setIsPlayingAv(false);
      try { markEnded(); } catch {}
      try { onEnded?.(); } catch {}
    }
  }, [setTime, markEnded, onEnded, onPlayerLoadingChange]);

  // ── load/unload sound when audioUrl changes
  useEffect(() => {
    (async () => {
      if (!audioUrl || audioUrl === lastLoadedUrlRef.current) return;
      lastLoadedUrlRef.current = audioUrl;
      try {
        if (soundRef.current) {
          try { await soundRef.current.unloadAsync(); } catch {}
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 100 },
          onSoundStatus
        );
        soundRef.current = sound;

        if (autoPlayArmedRef.current) {
          try {
            await sound.playAsync();
            setIsPlayingAv(true);
          } catch {}
          autoPlayArmedRef.current = false;
        }
      } catch (e) {
        console.warn('Failed to load sound', e);
      }
    })();
  }, [audioUrl, onSoundStatus]);

  // cleanup
  useEffect(() => {
    return () => {
      (async () => {
        try { await soundRef.current?.unloadAsync(); } catch {}
        soundRef.current = null;
      })();
    };
  }, []);

  // Play/Pause button — generate audio first if needed
 const handlePlayClick = useCallback(async () => {
  const snd = soundRef.current;

  // No sound yet → arm immediately and kick off TTS now
  if (!snd) {
    autoPlayArmedRef.current = true;
    requestedKeyRef.current = null;
    setSpeakReqTick(t => t + 1);
    console.log('[word-sync] play: armed');

    try {
      await resumeAudioContext?.();
      onRequestStart?.();
      onPlayerLoadingChange?.(true);
      await onBeforePlay?.();
    } catch (e) {
      console.warn('[word-sync] resume/onBeforePlay failed (continuing):', e);
    }

    // 🔑 NEW: request TTS right away (don’t wait for the effect)
    const cur = pickSpeakSource();
    if (cur && !audioUrl && !loading && effectiveBackend) {
      const key = speakKeyFor(cur);
      if (requestedKeyRef.current !== key) {
        requestedKeyRef.current = key;
        console.log('[word-sync] speak: firing', { key, backend: effectiveBackend, curLen: cur.length });
        // fire-and-forget; no await
        speak(effectiveBackend, { ssml: cur, voiceName }).catch(e =>
          console.warn('[word-sync] speak() failed', e)
        );
      }
    }
    return;
  }

  // Toggle playback
  try {
    const st = await snd.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) {
      await snd.pauseAsync();
      setIsPlayingAv(false);
    } else {
      await onBeforePlay?.();
      await snd.playAsync();
      setIsPlayingAv(true);
    }
  } catch (e) {
    console.warn('[word-sync] toggle failed:', e);
  }
}, [
  resumeAudioContext,
  onRequestStart,
  onPlayerLoadingChange,
  onBeforePlay,
  pickSpeakSource,
  audioUrl,
  loading,
  effectiveBackend,
  voiceName,
  speak,
]);


  // Seek helpers (drive AV + keep words engine in sync)
  const seekToTimeAv = useCallback(async (sec: number) => {
    const snd = soundRef.current;
    if (!snd) return;
    try {
      const st = await snd.getStatusAsync();
      if (!st.isLoaded) return;
      const dur = (st.durationMillis ?? 0) / 1000;
      const t = Math.max(0, Math.min(dur || 0, sec));
      await snd.setPositionAsync(t * 1000);
      setMediaTime(t);
      try { setTime?.(t); } catch {}
    } catch {}
  }, [setTime]);

  const nudgeSeconds = useCallback(async (d: number) => {
    const snd = soundRef.current;
    if (!snd) return;
    try {
      const st = await snd.getStatusAsync();
      if (!st.isLoaded) return;
      const cur = (st.positionMillis ?? 0) / 1000;
      await seekToTimeAv(cur + d);
    } catch {}
  }, [seekToTimeAv]);

  // Scrub bar
  const [barWidth, setBarWidth] = useState(0);
  const onScrubAtX = useCallback(
    async (x: number) => {
      const durationSec = mediaDur || 0;
      if (!durationSec || barWidth <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / barWidth));
      await seekToTimeAv(ratio * durationSec);
    },
    [barWidth, mediaDur, seekToTimeAv]
  );

  // next/prev fallbacks (unchanged behavior)
  const [internalMax, setInternalMax] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const isControlledMax = typeof maximized === 'boolean';
  const isMax = isControlledMax ? (maximized as boolean) : internalMax;
  const toggleMax = () => {
    if (onToggleMaximize) onToggleMaximize();
    else setInternalMax((v) => !v);
  };

  const totalLessonsForUi = useMemo(
    () => Math.max(lessons?.length || 0, outline?.length || 0) || 1,
    [lessons?.length, outline?.length]
  );

  const handlePrevClick = useCallback(async () => {
    if (useJoined) return;
    if (typeof onPrev === 'function') {
      try {
        const parentDidAdvance = await onPrev();
        if (parentDidAdvance) return;
      } catch {}
    }
    setLessonIdx((i) => Math.max(0, i - 1));
  }, [useJoined, onPrev]);

  const handleNextClick = useCallback(async () => {
    if (useJoined) return;
    if (typeof onNext === 'function') {
      try {
        const parentDidAdvance = await onNext();
        if (parentDidAdvance) return;
      } catch {}
    }
    setLessonIdx((i) => Math.min(i + 1, Math.max(totalLessonsForUi - 1, 0)));
  }, [useJoined, onNext, totalLessonsForUi]);

  // Build lines + active line (same)
  const LINES = useMemo(() => {
    type Line = { text: string; start: number; end: number; indices: number[] };
    const arr: Line[] = [];
    let buf = '';
    let start = 0;
    let indices: number[] = [];
    const maxChars = isSmall ? 40 : 64;

    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > maxChars && buf) {
        const li = indices.length ? indices[indices.length - 1]! : -1;
        const endTime = li >= 0 && words[li] ? (words[li]!.end ?? start) : start;
        arr.push({ text: buf, start, end: endTime, indices });
        buf = w.text;
        start = Number.isFinite(w.start) ? (w.start as number) : start;
        indices = [i];
      } else {
        if (!buf) start = Number.isFinite(w.start) ? (w.start as number) : start;
        buf += piece;
        indices.push(i);
      }
    });
    if (buf && indices.length) {
      const li = indices.length ? indices[indices.length - 1]! : -1;
      const endTime = li >= 0 && words[li] ? (words[li]!.end ?? start) : start;
      arr.push({ text: buf, start, end: endTime, indices });
    }
    return arr;
  }, [words, isSmall]);

  const activeLine = useMemo(() => {
    const idx = LINES.findIndex((ln) => ln.indices.includes(currentIndex));
    return idx === -1 ? 0 : idx;
  }, [LINES, currentIndex]);

  // Times for UI (prefer AV clocks; fall back to words)
  const durationSec = mediaDur || (words.length ? Math.max(...words.map((w) => w.end)) : 0);
  const currentSec = mediaTime || (words[currentIndex]?.start ?? 0);
  const progress = durationSec ? currentSec / durationSec : 0;

  // End/advance handling (unchanged)
  const prevLenRef = useRef(lessons.length);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancingRef = useRef(false);
  const lastEndedTickRef = useRef(0);
  const endFiredForRef = useRef<number | null>(null);



  useEffect(() => {
  console.log('[word-sync] backend', { effectiveBackend });
}, [effectiveBackend]);

useEffect(() => {
  if (audioUrl) console.log('[word-sync] audioUrl ready', audioUrl);
}, [audioUrl]);


  useEffect(() => {
    const prev = prevLenRef.current;
    const cur  = lessons.length;

    if (prev === 0 && cur > 0) setLessonIdx(0);

    if (isAdvancing) {
      const desiredNext = lessonIdx + 1;
      if (desiredNext < cur && lessons[desiredNext]) {
        setLessonIdx(desiredNext);
        advancingRef.current = false;
        setIsAdvancing(false);
      }
    }

    prevLenRef.current = cur;
  }, [lessons, isAdvancing, lessonIdx]);

 // 🔁 Auto-start TTS as soon as we have SSML (joined or first lesson).
useEffect(() => {
  // Helpful visibility
  console.log('[word-sync] check', {
    audioUrl: !!audioUrl,
    loading,
    armed: autoPlayArmedRef.current,
  });

  // 1) Need a backend
  if (!effectiveBackend) {
    console.warn('[word-sync] missing backendUrl; cannot speak');
    return;
  }

  // 2) If we already have audio or a request in flight, do nothing
  if (audioUrl || loading) return;

  // 3) Find the best source of SSML (lesson > first-ready > joined)
  const cur = pickSpeakSource();
  if (!cur) {
    console.log('[word-sync] no SSML yet');
    return;
  }

  // 4) De-dupe per (voice,text) combo
  const key = speakKeyFor(cur);
  if (requestedKeyRef.current === key) return;
  requestedKeyRef.current = key;

  // 5) Arm autoplay *now* so expo-av will play when the URL shows up
  autoPlayArmedRef.current = true;
  onPlayerLoadingChange?.(true);

  console.log('[word-sync] auto-start TTS', {
    backend: effectiveBackend,
    key,
    curLen: cur.length,
  });

  // 6) Fire TTS immediately
  speak(effectiveBackend, { ssml: cur, voiceName }).catch((e) => {
    console.warn('[word-sync] speak() failed', e);
  });
}, [
  lessons,            // lesson SSML becomes available
  ssml,               // joined SSML becomes available
  audioUrl,           // stop once we have audio
  loading,            // stop while in-flight
  effectiveBackend,   // must exist
  voiceName,
  pickSpeakSource,
  speak,
  onPlayerLoadingChange,
]);



  useEffect(() => {
    if (!endedTick || endedTick === lastEndedTickRef.current) return;
    lastEndedTickRef.current = endedTick;
    if (error) return;
    if (words.length) return;

    if (useJoined) {
      if (endFiredForRef.current !== -1) {
        endFiredForRef.current = -1;
        try { onEnded?.(); } catch {}
      }
      return;
    }

    if (endFiredForRef.current !== lessonIdx) {
      endFiredForRef.current = lessonIdx;
      try { onEnded?.(); } catch {}
    }

    const desiredNext = lessonIdx + 1;
    const maybeMoreComing = (outline?.length || 0) > (lessons?.length || 0);
    if (desiredNext < Math.max(outline?.length || 0, lessons?.length || 0) || maybeMoreComing) {
      if (advancingRef.current) return;
      advancingRef.current = true;
      setIsAdvancing(true);
      autoPlayArmedRef.current = true;
      onPlayerLoadingChange?.(true);
    }
  }, [endedTick, error, words.length, useJoined, lessonIdx, outline?.length, lessons?.length, onEnded, onPlayerLoadingChange]);

  useEffect(() => {
    if (error && isAdvancing) {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [error, isAdvancing]);

  // reader scale (same)
  const [userScale] = useState(1);
  const autoScale = useMemo(() => {
    const w = wdim.width, h = wdim.height;
    if (Math.max(w, h) >= 2160) return 1.8;
    if (w >= 1920 || h >= 1080) return 1.4;
    if (w >= 1440 || h >= 900) return 1.2;
    return 1;
  }, [wdim]);
  const readerScale = autoScale * userScale;

  // Backdrop cross-fade (same look)
  const { images, base } = useBackdropImages({
    course: course || null,
    outline,
    backendUrl: effectiveBackend,
  });
  const [bgIdx, setBgIdx] = useState(0);
  const fadeA = useRef(new Animated.Value(1)).current;
  const fadeB = useRef(new Animated.Value(0)).current;
  const [frontA, setFrontA] = useState(true);

  useEffect(() => {
    if (disableInternalBackdrop || (typeof playing === 'boolean' ? !playing : !isPlayingAv) || images.length <= 1) return;
    const t = setInterval(() => {
      if (frontA) {
        setBgIdx((i) => (i + 1) % images.length);
        fadeB.setValue(0);
        Animated.timing(fadeB, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
          fadeA.setValue(0);
          setFrontA(false);
        });
      } else {
        setBgIdx((i) => (i + 1) % images.length);
        fadeA.setValue(0);
        Animated.timing(fadeA, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
          fadeB.setValue(0);
          setFrontA(true);
        });
      }
    }, 14000);
    return () => clearInterval(t);
  }, [images.length, disableInternalBackdrop, playing, isPlayingAv, fadeA, fadeB, frontA]);

  const currentBg = images[bgIdx] || base;

  const titleForUi = useJoined
    ? title
    : hasLessons
    ? lessons[displayIdx]?.title || `${title} — Lesson ${displayIdx + 1}/${totalLessonsForUi}`
    : title;

  const currentLesson = hasLessons ? lessons[lessonIdx] : undefined;
  const notesMarkdown = useMemo(() => {
    const md = (currentLesson?.markdown || '').trim();
    if (md) return md;
    const eqs = (currentLesson?.formulas || [])
      .map((f) => `**${f.id || ''}**\n\n${f.latex || ''}`)
      .join('\n\n');
    const tbls = (currentLesson?.tables || [])
      .map((t) => {
        if (!t?.columns?.length || !t?.rows?.length) return '';
        const head = `| ${t.columns.join(' | ')} |`;
        const sep = `| ${t.columns.map(() => '---').join(' | ')} |`;
        const rows = t.rows.map((r) => `| ${r.map((v) => String(v)).join(' | ')} |`).join('\n');
        return `\n\n**${t.title || 'Table'}**\n\n${head}\n${sep}\n${rows}`;
      })
      .join('\n\n');
    return [eqs, tbls].filter(Boolean).join('\n\n').trim();
  }, [currentLesson]);

  /* ─────────────────────────────────────────────────────────
     UI (same visual parity)
     ───────────────────────────────────────────────────────── */
  const Core = (
    <View style={tw`flex-1 bg-[#0b1220]`}>
      {/* Top bar */}
      <View collapsable={false}>
         <SafeAreaView edges={['top']} style={tw`bg-black/35`}>
          <View
            onLayout={(e) => setChromeTop(e.nativeEvent.layout.height)}
            style={[tw`px-3 py-1.5`, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }]}
          >
            <Text style={[tw`text-white/85 text-xs`]} numberOfLines={1} ellipsizeMode="tail">
              {voiceName} • {titleForUi}
            </Text>

            <View style={[{ marginLeft: 'auto' }, tw`flex-row gap-2`, { flexWrap: 'wrap' }]}>
              {!useJoined && hasLessons && (
                <View style={[tw`flex-row gap-2`, { flexWrap: 'wrap' }]}>
                  <TouchableOpacity onPress={handlePrevClick} disabled={displayIdx <= 0} style={tw`px-2 py-1.5 rounded bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>Prev</Text>
                  </TouchableOpacity>
                  <Text style={tw`text-white/80 text-xs`}>
                    {displayIdx + 1}/{totalLessonsForUi}
                  </Text>
                  <TouchableOpacity
                    onPress={handleNextClick}
                    disabled={!!isBuildingNext || displayIdx >= totalLessonsForUi - 1}
                    style={tw`px-2 py-1.5 rounded bg-white/10`}
                  >
                    <Text style={tw`text-white text-xs`}>{isBuildingNext ? 'Preparing next…' : 'Next'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`text-white text-xs`}>{isPlayingAv ? 'Pause' : 'Play'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowTranscript((s) => !s)} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`text-white text-xs`}>{showTranscript ? 'Hide' : 'Transcript'}</Text>
              </TouchableOpacity>

              {onToggleThemePanel && (
                <TouchableOpacity onPress={onToggleThemePanel} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>Theme</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={toggleMax} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`text-white text-xs`}>{isMax ? 'Minimize' : 'Maximize'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowNotes((s) => !s)} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`text-white text-xs`}>{showNotes ? 'Hide notes' : 'Notes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Content frame */}
      <View style={tw`flex-1`} pointerEvents="box-none">
        {/* Backdrop (crossfade layers) */}
        {!disableInternalBackdrop && !backdropOverride && (
          <View style={tw`absolute inset-0`}>
            <Animated.View style={[tw`absolute inset-0`, { opacity: frontA ? fadeA : fadeB }]}>
              <ImageBackground source={{ uri: currentBg }} resizeMode="cover" style={tw`flex-1`}>
                <View style={tw`absolute inset-0 bg-black/25`} />
              </ImageBackground>
            </Animated.View>
            <Animated.View style={[tw`absolute inset-0`, { opacity: frontA ? fadeB : fadeA }]}>
              <ImageBackground source={{ uri: currentBg }} resizeMode="cover" style={tw`flex-1`}>
                <View style={tw`absolute inset-0 bg-black/25`} />
              </ImageBackground>
            </Animated.View>
          </View>
        )}
        {backdropOverride}

        {/* Centered active line with per-word highlight */}
        <View
          style={[
            tw`absolute inset-0 px-3`,
            { paddingTop: chromeTop, paddingBottom: chromeBottom, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <View style={tw`w-[96%] max-w-[1200px]`}>
            <Text
              style={[
                tw`text-white font-semibold text-center`,
                {
                  fontSize: isMax ? Math.min(52, 28 * readerScale) : Math.min(40, 24 * readerScale),
                  lineHeight: 1.35 * (isMax ? Math.min(52, 28 * readerScale) : Math.min(40, 24 * readerScale)),
                },
              ]}
            >
              {(() => {
                const cur = LINES[activeLine];
                if (!cur) return null;

                return cur.indices.map((wi, j) => {
                  const w = words[wi]!;
                  const isPastOrCurrent = wi <= currentIndex;
                  const isActive = wi === currentIndex;

                  return (
                    <Text
                      key={wi}
                      style={[
                        { opacity: isPastOrCurrent ? 1 : 0.55 },
                        isActive ? { backgroundColor: '#ffffff', color: '#000000', borderRadius: 6, paddingHorizontal: 2 } : null,
                      ]}
                    >
                      {(j ? ' ' : '') + w.text}
                    </Text>
                  );
                });
              })()}
            </Text>
          </View>
        </View>

        {/* Lesson overlay */}
        <LessonOverlay
          words={words}
          currentIndex={currentIndex}
          lesson={toOverlayLesson(currentLesson)}
          topOffset={chromeTop}
          lingerMs={6000}
          defaultPinned={false}
          rememberKey={currentLesson?.id ? `overlay:${currentLesson.id}` : 'overlay:joined'}
          zIndex={10000}
          freeMove
          fullOnMaximize
        />

        {/* Preparing/generating status */}
        {!words.length && !error && !isAdvancing && (
          <View style={[tw`absolute left-0 right-0 items-center`, { bottom: chromeBottom + 8 }]}>
            <View style={tw`flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-black/65`}>
              <View style={tw`h-3 w-3 rounded-full border-2 border-white/30 border-t-white`} />
              <Text style={tw`text-white/90 text-xs`}>Generating lesson narration…</Text>
            </View>
          </View>
        )}

        {/* Advancing overlay */}
        {isAdvancing && (
          <View style={tw`absolute inset-0 items-center justify-center`}>
            <View style={tw`rounded-full bg-black/60 p-5`}>
              <View style={tw`h-10 w-10 rounded-full border-2 border-white/30`} />
            </View>
            <Text style={tw`mt-3 text-white/90 text-sm`}>Loading next lesson…</Text>
          </View>
        )}

        {/* Error pill */}
        {error && !loading && (
          <View style={[tw`absolute left-2`, { bottom: chromeBottom + 8 }]}>
            <Text style={tw`text-red-200 bg-red-950/50 px-2 py-1 rounded`}>{error}</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View collapsable={false}>
        <SafeAreaView edges={['bottom']}
          onLayout={(e) => setChromeBottom(e.nativeEvent.layout.height)}
          style={tw`bg-black/45`}
        >
          <View style={tw`px-3 py-2`}>
            {/* Row 1 */}
            <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }]}>
              {/* Transport */}
              <View style={[tw`flex-row gap-2`, { alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => nudgeSeconds(-5)} style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}>
                  <Text style={tw`text-white`}>{'<<'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`h-10 px-4 items-center justify-center rounded-xl bg-white`}>
                  <Text style={tw`text-black font-semibold`}>{isPlayingAv ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => nudgeSeconds(5)} style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}>
                  <Text style={tw`text-white`}>{'>>'}</Text>
                </TouchableOpacity>
              </View>

              {/* Prev / Counter / Next */}
              {!useJoined && hasLessons && (
                <View style={[tw`ml-2 flex-row gap-2`, { alignItems: 'center', flexWrap: 'wrap' }]}>
                  <TouchableOpacity onPress={handlePrevClick} disabled={displayIdx <= 0} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>Prev</Text>
                  </TouchableOpacity>
                  <Text style={tw`text-white/85 text-xs`}>{displayIdx + 1}/{totalLessonsForUi}</Text>
                  <TouchableOpacity
                    onPress={handleNextClick}
                    disabled={!!isBuildingNext || displayIdx >= totalLessonsForUi - 1}
                    style={tw`h-10 px-3 rounded-xl bg-white/10`}
                  >
                    <Text style={tw`text-white text-xs`}>{isBuildingNext ? 'Preparing next…' : 'Next'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Times */}
              <View style={[tw`ml-2 flex-row gap-2`, { alignItems: 'center' }]}>
                <Text style={tw`text-white/85 text-xs`}>{formatTime(currentSec)}</Text>
                <Text style={tw`text-white/60 text-xs`}>/</Text>
                <Text style={tw`text-white/85 text-xs`}>{durationSec ? formatTime(durationSec) : '0:00'}</Text>
              </View>

              {/* Utilities */}
              <View style={[{ marginLeft: 'auto' }, tw`flex-row gap-2`, { flexWrap: 'wrap' }]}>
                <TouchableOpacity onPress={() => setShowTranscript((s) => !s)} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>{showTranscript ? 'Hide Transcript' : 'Transcript'}</Text>
                </TouchableOpacity>
                {onToggleThemePanel && (
                  <TouchableOpacity onPress={onToggleThemePanel} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>Theme</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={toggleMax} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>{isMax ? 'Minimize' : 'Maximize'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowNotes((s) => !s)} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>{showNotes ? 'Hide Notes' : 'Notes'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: scrubber */}
            <View style={tw`mt-2 flex-row items-center gap-2`}>
              <Text style={tw`text-white/70 text-[11px] w-12 text-right`}>{formatTime(currentSec)}</Text>
              <View
                style={tw`flex-1 h-3 rounded-full bg-white/15 overflow-hidden`}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              >
                <Pressable
                  style={tw`absolute inset-0`}
                  onPress={(e) => onScrubAtX(e.nativeEvent.locationX)}
                >
                  <View style={[tw`h-full bg-white/85`, { width: `${Math.round((progress || 0) * 100)}%` }]} />
                </Pressable>
              </View>
              <Text style={tw`text-white/70 text-[11px] w-12`}>
                {durationSec ? formatTime(durationSec) : '0:00'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );

  
  return isMax ? (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
       statusBarTranslucent={false} 
      onRequestClose={toggleMax}
    >
      {Core}
      <TranscriptDrawerInline
        open={showTranscript}
        title={titleForUi}
        lines={LINES}
        words={words}
        activeLine={activeLine}
        readerScale={readerScale}
        loading={!!loading}
        error={error ?? undefined}
        onSeekToWord={(wi) => seekToWord(wi)}
      />
      <NotesDrawerInline
        open={showNotes}
        title={`${titleForUi} — Notes`}
        markdown={(currentLesson?.markdown || '').trim() || '_No notes for this lesson yet._'}
      />
    </Modal>
  ) : (
    <View
      style={[
        { width: '100%' },
        playerHeight != null ? { height: playerHeight } : tw`flex-1`,
        tw`bg-[#0b1220] rounded-2xl overflow-hidden ring-1 ring-white/10`,
      ]}
    >
      {Core}
      <TranscriptDrawerInline
        open={showTranscript}
        title={titleForUi}
        lines={LINES}
        words={words}
        activeLine={activeLine}
        readerScale={readerScale}
        loading={!!loading}
        error={error ?? undefined}
        onSeekToWord={(wi) => seekToWord(wi)}
      />
      <NotesDrawerInline
        open={showNotes}
        title={`${titleForUi} — Notes`}
        markdown={(currentLesson?.markdown || '').trim() || '_No notes for this lesson yet._'}
      />
    </View>
  );
}
