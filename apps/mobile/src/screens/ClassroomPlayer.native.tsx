/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  AppState,
} from 'react-native';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { setAudioModeAsync } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
// If you already use expo-image elsewhere, feel free to swap in <Image /> for nicer fades.
// import { Image } from 'expo-image';

const DBG = typeof __DEV__ !== 'undefined' ? !!__DEV__ : false;

// ─────────────────────────────────────────────────────────
// Types (kept close to your web props)
// ─────────────────────────────────────────────────────────
type SpeakAsMode = 'math' | 'spell-out' | 'characters' | 'none';
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
    rows: (string | number)[][];
    caption?: string;
    announceAtSentence?: number;
  }[];
};
type OutlineSection = { id: string; title: string; keyPoints?: string[] };

export type NativeNarrationPlayerProps = {
  ssml?: string;
  lessons?: LessonLite[];
  title?: string;
  voiceName?: string;
  onPlayerReady?: () => void;
  onNext?: () => Promise<boolean> | boolean;
  isBuildingNext?: boolean;
  maximized?: boolean;               // optional controlled
  onToggleMaximize?: () => void;
  onEnded?: () => void;
  onBeforePlay?: () => Promise<void> | void;
  backdropOverride?: React.ReactNode; // provide your own background
  course?: any | null;
  outline?: OutlineSection[];
  backendUrlOverride?: string;
  playing?: boolean;                 // ignored here; we derive from hook
  playJoinedIfAvailable?: boolean;   // default false
  disableInternalBackdrop?: boolean;                 // ignored on native
 onToggleThemePanel?: () => void;                   // optional handler
 themeOpen?: boolean;                               // ignored unless you use it
 onThemeOpenChange?: (open: boolean) => void;       // ignored unless you use it
 showFloatingThemeButton?: boolean;                 // small helper button (optional)
 playerHeight?: number;
 compactControls?: boolean;
  ensureLesson?: (index: number) => Promise<unknown>;
};

// ─────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────
const formatTime = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Minimal inline slider (no external deps)
type InlineSliderProps = {
  value: number;                 // 0..1
  onSlidingComplete?: (ratio: number) => void;
  height?: number;
};
const InlineSlider: React.FC<InlineSliderProps> = ({ value, onSlidingComplete, height = 16 }) => {
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<View>(null as any);
  const onSet = (x: number, w: number) => {
    if (!w) return;
    const r = Math.max(0, Math.min(1, x / w));
    onSlidingComplete?.(r);
  };
  return (
    <View
      ref={(r) => { barRef.current = r as any; }}
      onLayout={() => {}}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        setDragging(true);
        const w = (e.nativeEvent.target as any)?._internalFiberInstanceHandleDEV?.memoizedProps?.style?.width;
      }}
      onResponderMove={(e) => {
        if (!dragging || !barRef.current) return;
      }}
      onResponderRelease={(e) => {
        setDragging(false);
        // measure manually
        barRef.current?.measure((_x, _y, w, _h, pageX, _pageY) => {
          onSet(e.nativeEvent.pageX - pageX, w);
        });
      }}
      style={[tw`w-full rounded-full bg-white/15`, { height }]}
    >
      <View style={[tw`absolute left-0 top-0 bottom-0 rounded-full bg-white/85`, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
};

// Chunk words into projector-friendly lines
function useLines(words: Array<{ text: string; start: number; end: number }>, isCompact: boolean) {
  return useMemo(() => {
    type Line = { text: string; start: number; end: number; indices: number[] };
    const arr: Line[] = [];
    let buf = '';
    let start = 0;
    let indices: number[] = [];
    const maxChars = isCompact ? 42 : 64;

    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > maxChars && buf) {
        const lastIdx = indices.length ? indices[indices.length - 1] : null;
      const end = (lastIdx != null && words[lastIdx]) ? words[lastIdx].end : start;
     arr.push({ text: buf, start, end, indices });
        buf = w.text;
        start = w.start;
        indices = [i];
      } else {
        if (!buf) start = w.start;
        buf += piece;
        indices.push(i);
      }
    });

    if (buf && indices.length) {
      const lastIdx = indices.length ? indices[indices.length - 1] : null;
 const end = (lastIdx != null && words[lastIdx]) ? words[lastIdx].end : start;
 arr.push({ text: buf, start, end, indices });
    }
    return arr;
  }, [words, isCompact]);
}

// ─────────────────────────────────────────────────────────
// The Player
// ─────────────────────────────────────────────────────────
const AndroidNarrationPlayer: React.FC<NativeNarrationPlayerProps> = ({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized,
  onToggleMaximize,
  onNext,
  isBuildingNext,
  course,
  outline = [],
  backendUrlOverride,
  onEnded,
  onBeforePlay,
  backdropOverride,
  playJoinedIfAvailable = false,
  disableInternalBackdrop, 
  onToggleThemePanel,
  themeOpen,
  onThemeOpenChange,
  showFloatingThemeButton,
  playerHeight,
 compactControls,
 ensureLesson,
 onPlayerReady,
}) => {
  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  // Audio focus / Android mode
  useEffect(() => {
  (async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
      });
    } catch (e) {
      if (DBG) console.warn('[native] setAudioModeAsync failed', e);
    }
  })();
}, []);



  // Keep screen awake while playing or maximized
  useKeepAwake();

  // Hook
  const {
    speak,
    loading,
    error,
    words: wordsRaw,
    currentIndex,
    isPlaying,
    play,
    pause,
    seekToWord,
    resumeAudioContext,
    endedTick,
  } = useWordSync();

  const words = wordsRaw ?? [];

 
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const isCompact = width < 600;

  // Joined vs per-lesson mode
  const hasLessons = lessons?.length > 0;
  const hasJoined = typeof ssml === 'string' && ssml.trim().length > 0;
  const useJoined = playJoinedIfAvailable && hasJoined;

  const [lessonIdx, setLessonIdx] = useState(0);

  useEffect(() => {
  (async () => {
    if (hasLessons && typeof ensureLesson === 'function') {
      try {
        await ensureLesson(lessonIdx); // usually 0 at first
      } catch (e) {
        if (DBG) console.warn('[native] ensureLesson initial failed', e);
      }
    }
  })();
// we only want this on first mount in practice
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const totalLessonsForUi = Math.max(lessons?.length || 0, outline?.length || 0) || 1;

  const currentSourceKey = useMemo(() => {
  if (useJoined) return `joined|voice:${voiceName}|len:${(ssml?.trim().length ?? 0)}`;
  if (hasLessons) {
    const l = lessons[lessonIdx];
    return `lesson:${l?.id || lessonIdx}|voice:${voiceName}|len:${(l?.ssml || '').length}`;
  }
  return `single|voice:${voiceName}|len:${(ssml || '').length}`;
}, [useJoined, hasLessons, lessonIdx, lessons, ssml, voiceName]);

   // track whether we've already notified
const readyNotifiedRef = useRef(false);
const spokeForCurrentKeyRef = useRef(false);

// reset the "ready" notification whenever the source changes
useEffect(() => {
  readyNotifiedRef.current = false;
  spokeForCurrentKeyRef.current = false;
}, [currentSourceKey]);


// fire once when words are loaded and we're not loading anymore
useEffect(() => {
  const ready = !loading && (words?.length || 0) > 0;
  const matches = lastSpeakKey.current === currentSourceKey && spokeForCurrentKeyRef.current;

  if (ready && matches && !readyNotifiedRef.current) {
    readyNotifiedRef.current = true;
    try { onPlayerReady?.(); } catch {}
  }
}, [loading, words?.length, currentSourceKey, onPlayerReady]);

 

  // Fullscreen (controlled or internal)
  const [internalMax, setInternalMax] = useState(false);
  const isControlled = typeof maximized === 'boolean';
  const isMax = isControlled ? (maximized as boolean) : internalMax;
  const toggleMax = () => (onToggleMaximize ? onToggleMaximize() : setInternalMax((v) => !v));

  // Persisted UI prefs
  const [userScale, setUserScale] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(1.0);
  const SCALE_KEY = 'player:userScale';
  const SPEED_KEY = 'player:speed';
  useEffect(() => {
    (async () => {
      try {
        const [s, v] = await Promise.all([AsyncStorage.getItem(SCALE_KEY), AsyncStorage.getItem(SPEED_KEY)]);
        if (s) setUserScale(parseFloat(s) || 1);
        if (v) setSpeed(parseFloat(v) || 1);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(SCALE_KEY, String(userScale)).catch(() => {});
  }, [userScale]);
  useEffect(() => {
    AsyncStorage.setItem(SPEED_KEY, String(speed)).catch(() => {});
    // if the hook supports setPlaybackRate, use it
    try {
      const anyHook = (useWordSync as any) as { setPlaybackRate?: (r: number) => void };
      if (anyHook && typeof (anyHook as any).setPlaybackRate === 'function') {
        (anyHook as any).setPlaybackRate(speed);
      }
    } catch {}
  }, [speed]);

  // Compute lines + active line
  const LINES = useLines(words, isCompact);
  const activeLine = useMemo(() => {
    const idx = LINES.findIndex((ln) => ln.indices.includes(currentIndex));
    return idx === -1 ? 0 : idx;
  }, [LINES, currentIndex]);

  // Times
  const durationSec = useMemo(() => (words.length ? Math.max(...words.map((w) => w.end)) : 0), [words]);
  const currentSec = useMemo(() => words[currentIndex]?.start ?? 0, [words, currentIndex]);
  const progress = durationSec ? currentSec / durationSec : 0;

  const titleForUi = useJoined
    ? title
    : hasLessons
    ? lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${totalLessonsForUi}`
    : title;

  // Seek helpers
  const seekToWordSafe = (i: number) => i >= 0 && i < words.length && seekToWord(i);
  const seekToTime = (t: number) => {
    if (!words.length) return;
    const idx = Math.max(0, words.findIndex((w) => w.start >= t));
    seekToWordSafe(idx === -1 ? words.length - 1 : idx);
  };
  const nudgeSeconds = (d: number) => seekToTime(Math.max(0, Math.min(durationSec, currentSec + d)));

  // AppState: politely pause when app goes background (Android UX)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
   (async () => {
     try {
       if (Platform.OS === 'android' && s !== 'active') await pause();
     } catch {}
   })();
 });
    return () => sub.remove();
  }, []);

  // Speak the right source
  const lastSpeakKey = useRef<string | null>(null);

useEffect(() => {
  const key = currentSourceKey;
  if (!key || key === lastSpeakKey.current) return;

  (async () => {
    try { await pause(); } catch {}
    const cur = useJoined
      ? (ssml || '').trim()
      : hasLessons
      ? (lessons[lessonIdx]?.ssml || '').trim()
      : (ssml || '').trim();

    if (cur.length > 0) {
      await speak(effectiveBackend, { ssml: cur, voiceName });
      lastSpeakKey.current = key;
      spokeForCurrentKeyRef.current = true;
    }
  })();
}, [
  currentSourceKey,
  useJoined,
  hasLessons,
  lessonIdx,
  lessons,
  ssml,
  voiceName,
  effectiveBackend,
  pause,
  speak,
]);

  const totalOutline = Array.isArray(outline) ? outline.length : 0;

// centralized, clamped navigation
const goToLesson = useCallback(async (index: number) => {
  const total = Math.max(lessons?.length || 0, totalOutline);
  if (total <= 0) return;

  const clamped = Math.max(0, Math.min(index, total - 1));
  try {
    if (typeof ensureLesson === 'function') {
      await ensureLesson(clamped);
    }
  } catch (e) {
    if (DBG) console.warn('[native] ensureLesson failed', e);
  }
  setLessonIdx(clamped);
  if (DBG) console.info('[native] goToLesson', { index: clamped, total });
}, [lessons?.length, totalOutline, ensureLesson]);

// light neighbor prefetch
const prefetchAround = useCallback((index: number) => {
  if (typeof ensureLesson !== 'function') return;
  try { void ensureLesson(index + 1); } catch {}
  try { void ensureLesson(index + 2); } catch {}
}, [ensureLesson]);

useEffect(() => { prefetchAround(lessonIdx); }, [lessonIdx, prefetchAround]);


  // End handling & optional next
  const lastEndedTickRef = useRef(0);
  useEffect(() => {
  if (!endedTick || endedTick === lastEndedTickRef.current) return;
  lastEndedTickRef.current = endedTick;

  if (useJoined) {
    onEnded?.();
    return;
  }
  onEnded?.();

  const hasImmediateNext = hasLessons && lessonIdx < lessons.length - 1;
  const maybeMoreComing = (outline?.length || 0) > (lessons?.length || 0);
  if (!hasImmediateNext && !maybeMoreComing) return;

  (async () => {
    try {
      const parentDidAdvance = await onNext?.();
      if (parentDidAdvance) return;
    } catch {}
    if (hasImmediateNext) { void goToLesson(lessonIdx + 1); }
  })();
}, [endedTick, useJoined, hasLessons, lessonIdx, lessons.length, outline?.length, onEnded, onNext, goToLesson]);


  // UI State
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // ms
  const sleepTORef = useRef<NodeJS.Timeout | null>(null);
  const topBarHRef = useRef(0);
 const bottomBarHRef = useRef(0);
 const [, forceRerender] = useState(0); // to reflow when heights change
 const setTopBarH = (h: number) => {
   if (topBarHRef.current !== h) { topBarHRef.current = h; forceRerender((n) => n + 1); }
 };
 const setBottomBarH = (h: number) => {
   if (bottomBarHRef.current !== h) { bottomBarHRef.current = h; forceRerender((n) => n + 1); }
 };


  useEffect(() => {
    if (sleepTORef.current) {
      clearTimeout(sleepTORef.current);
      sleepTORef.current = null;
    }
    if (sleepTimer && sleepTimer > 0) {
      sleepTORef.current = setTimeout(() => {
   (async () => { try { await pause(); } catch {} })();
 }, sleepTimer);
    }
    return () => {
      if (sleepTORef.current) clearTimeout(sleepTORef.current);
    };
  }, [sleepTimer]);

  // Play/Pause handler
  const handlePlayClick = useCallback(async () => {
  try {
    await resumeAudioContext?.();

    if (!isPlaying) {
      // 1) Ensure SSML exists in lesson mode
      if (hasLessons && typeof ensureLesson === 'function') {
        try {
          if (!lessons[lessonIdx]?.ssml?.trim()) {
            if (DBG) console.info('[native] ensureLesson before play', { lessonIdx });
            await ensureLesson(lessonIdx);
          }
        } catch (e) {
          if (DBG) console.warn('[native] ensureLesson before play failed', e);
        }
      }

      // 2) If audio pipeline not prepared, speak now
      if (!words.length) {
        const cur = (
          useJoined
            ? (ssml || '')
            : hasLessons
              ? (lessons[lessonIdx]?.ssml || '')
              : (ssml || '')
        ).trim();

        if (!cur.length) {
          if (DBG) console.warn('[native] No SSML available to speak');
          return; // nothing to play yet
        }

        if (DBG) console.info('[native] speak before play', { len: cur.length });
        await speak(effectiveBackend, { ssml: cur, voiceName });
      }

      await onBeforePlay?.();
      if (DBG) console.info('[native] play()');
      await play();
    } else {
      if (DBG) console.info('[native] pause()');
      await pause();
    }
  } catch (e) {
    if (DBG) console.warn('[native] play/pause failed', e);
  }
}, [
  isPlaying,
  resumeAudioContext,
  onBeforePlay,
  play,
  pause,
  words.length,
  useJoined,
  ssml,
  hasLessons,
  lessons,
  lessonIdx,
  ensureLesson,
  speak,
  voiceName,
  effectiveBackend,
]);



  // Notes markdown fallback (tables + formulas rendered as plaintext here)
  const currentLesson = hasLessons ? lessons[lessonIdx] : undefined;
  const notesMarkdown = useMemo(() => {
    const md = (currentLesson?.markdown || '').trim();
    if (md) return md;
    const eqs = (currentLesson?.formulas || [])
      .map((f) => `• ${f.title || f.id || 'Formula'}: ${f.latex || ''}`)
      .join('\n');
    const tbls = (currentLesson?.tables || [])
      .map((t) => {
        if (!t?.columns?.length || !t?.rows?.length) return '';
        const head = `${t.columns.join(' | ')}`;
        const rows = t.rows.map((r) => r.map(String).join(' | ')).join('\n');
        return `\n${t.title || 'Table'}\n${head}\n${rows}`;
      })
      .join('\n');
    return [eqs, tbls].filter(Boolean).join('\n').trim() || '_No notes for this lesson yet._';
  }, [currentLesson]);

  // Layout frame (16:9 when not maximized; full screen when maximized)
  const horizontalPadding = 16;
  const maxWidth = Math.min(width - horizontalPadding * 2, 1088);
  const OUTLINE_GAP = 24; // leaves space so the next section isn't overlapped
 const maxPlayableHeight = Math.max(240, height - OUTLINE_GAP);
 const autoHeight = Math.round(maxWidth * (isPortrait ? 9 / 16 : 9 / 18));
 const frameHeight = Math.min(
   playerHeight ?? (isMax ? maxPlayableHeight : autoHeight),
   maxPlayableHeight
);

const isCompactChrome = typeof compactControls === 'boolean'
   ? compactControls
   : frameHeight <= 420; // auto-compact when we get short
  // Scale for the center text (projector-friendly)
  const baseFont = isMax
    ? (isCompact ? 22 : 26)
    : (isCompact ? 18 : 20);
  const fontSize = Math.round(baseFont * userScale);

 


  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={tw`flex-1 bg-[#0b1220]`}>
      <View style={[tw`self-center w-full`, { maxWidth, height: frameHeight }]}>
        {/* Backdrop */}
        <View style={tw`absolute inset-0`}>
          {backdropOverride ? (
            backdropOverride
          ) : (
            <View style={tw`flex-1 bg-[#0b1220]`} />
          )}
          <View style={tw`absolute inset-0 bg-black/25`} />
        </View>

        {/* Top bar */}
        <View
            onLayout={(e) => setTopBarH(e.nativeEvent.layout.height)}
            style={tw`absolute top-0 left-0 right-0 z-50 px-2 py-1 bg-black/35`}
          >
          <View style={tw`flex-row items-center`}>
            <Text numberOfLines={1} style={tw`text-white/90 text-xs`}>
              {voiceName} • {titleForUi}
            </Text>
            <View style={tw`ml-auto flex-row gap-2`}>
              <TouchableOpacity
                onPress={handlePlayClick}
                style={tw`${isCompactChrome ? 'px-2 py-1' : 'px-3 py-1.5'} rounded bg-white/10`}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              >
                <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white`}>{isPlaying ? 'Pause' : 'Play'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTranscript((s) => !s)}
                style={tw`${isCompactChrome ? 'px-2 py-1' : 'px-3 py-1.5'} rounded bg-white/10`}
              >
                <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white`}>{showTranscript ? 'Hide' : 'Transcript'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMax} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white`}>{isMax ? 'Minimize' : 'Maximize'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNotes((s) => !s)} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white`}>{showNotes ? 'Hide notes' : 'Notes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Center narration */}
        <View
   style={[
     tw`absolute left-0 right-0 items-center justify-center px-3`,
     { top: topBarHRef.current, bottom: bottomBarHRef.current },
   ]}
 >
          <View style={[tw`w-full`, { maxWidth: isMax ? 1400 : 1200 }]}>
            <View style={tw`p-3`}>
              <Text
                selectable={false}
                style={[
                  tw`text-white font-semibold`,
                  { fontSize, lineHeight: Math.round(fontSize * (isCompactChrome ? 1.25 : 1.35)), textAlign: 'center' }
                ]}
              >
                {(() => {
                  const cur = LINES[activeLine];
                  if (!cur) return '';
                  return cur.indices
                    .map((wi) => {
                      const w = words[wi];
                      if (!w) return '';
                      const isPastOrCurrent = wi <= currentIndex;
                      const isActive = wi === currentIndex;
                      return (isActive ? ` ${w.text} ` : w.text) + (isPastOrCurrent ? '' : '');
                       })
                    .join(' ');
                })()}
              </Text>
            </View>
          </View>

          {/* Center play button overlay */}
          {!isPlaying && !loading && (
            <TouchableOpacity
              onPress={handlePlayClick}
              accessibilityLabel="Play"
              style={tw`absolute w-20 h-20 rounded-full bg-black/60 items-center justify-center`}
            >
              <Text style={tw`text-white text-lg`}>▶</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status + errors */}
        {!words.length && !error && (
          <View style={[tw`absolute z-40 items-center`, { left: 0, right: 0, bottom: bottomBarHRef.current + 10 }]}>
            <View style={tw`px-3 py-1.5 rounded-full bg-black/65`}>
              <Text style={tw`text-white/90 text-xs`}>Generating lesson narration…</Text>
            </View>
          </View>
        )}
        {!!error && !loading && (
          <View style={[tw`absolute z-40`, { left: 8, bottom: bottomBarHRef.current + 10 }]}>
            <View style={tw`px-2 py-1 rounded bg-red-900/60`}>
              <Text style={tw`text-red-200 text-xs`}>{error}</Text>
            </View>
          </View>
        )}

        
      {/* Bottom controls */}
 <View
   onLayout={(e) => setBottomBarH(e.nativeEvent.layout.height)}
   style={tw`${isCompactChrome ? 'px-2 pt-1 pb-2' : 'px-3 pt-2 pb-3'} absolute bottom-0 left-0 right-0 bg-black/45`}
 >
          {/* Transport row */}
          <View style={tw`flex-row items-center gap-2`}>
            <TouchableOpacity
              onPress={() => nudgeSeconds(-5)}
              accessibilityLabel="Back 5 seconds"
              style={tw`${isCompactChrome ? 'h-8 w-8' : 'h-10 w-10'} rounded-xl bg-white/10 items-center justify-center`}
            >
              <Text style={tw`text-white`}>{'⟲'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePlayClick}
              disabled={loading}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={tw`${isCompactChrome ? 'h-8 px-3' : 'h-10 px-4'} rounded-xl bg-white items-center justify-center`}
            >
              <Text style={tw`text-black font-semibold`}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => nudgeSeconds(5)}
              accessibilityLabel="Forward 5 seconds"
              style={tw`${isCompactChrome ? 'h-8 w-8' : 'h-10 w-10'} rounded-xl bg-white/10 items-center justify-center`}
            >
              <Text style={tw`text-white`}>{'⟳'}</Text>
            </TouchableOpacity>

            {/* Timers */}
            <View style={tw`ml-2 flex-row items-center`}>
              <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white/85`}>{formatTime(currentSec)}</Text>
              <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-xs'} text-white/60 mx-1`}>/</Text>
              <Text style={tw`text-white/85 text-xs`}>{durationSec ? formatTime(durationSec) : '0:00'}</Text>
            </View>

            {/* Spacer */}
            <View style={tw`flex-1`} />

            {/* Speed */}
            <TouchableOpacity
              onPress={() => setSpeed((v) => (v >= 1.5 ? 1.0 : v >= 1.25 ? 1.5 : v >= 1.0 ? 1.25 : 1.0))}
              style={tw`${isCompactChrome ? 'px-2 h-7' : 'px-2 h-9'} rounded-lg bg-white/10 items-center justify-center`}
            >
              <Text style={tw`text-white text-xs`}>{`${speed.toFixed(2)}x`}</Text>
            </TouchableOpacity>

            {/* Text size */}
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity
                onPress={() => setUserScale((s) => Math.max(0.7, +(s / 1.12).toFixed(3)))}
                style={tw`${isCompactChrome ? 'px-2 h-7' : 'px-2 h-9'} rounded-lg bg-white/10 items-center justify-center`}
              >
                <Text style={tw`text-white text-xs`}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUserScale((s) => Math.min(3, +(s * 1.12).toFixed(3)))}
                style={tw`${isCompactChrome ? 'px-2 h-7' : 'px-2 h-9'} rounded-lg bg-white/10 items-center justify-center`}
              >
                <Text style={tw`text-white text-xs`}>A+</Text>
              </TouchableOpacity>
            </View>

            {/* Sleep timer */}
            <TouchableOpacity
              onPress={() => {
                // cycle: off -> 10m -> 20m -> 30m -> off
                setSleepTimer((cur) => (cur == null ? 10 * 60_000 : cur === 10 * 60_000 ? 20 * 60_000 : cur === 20 * 60_000 ? 30 * 60_000 : null));
              }}
              style={tw`${isCompactChrome ? 'px-2 h-7' : 'px-2 h-9'} rounded-lg bg-white/10 items-center justify-center`}
            >
              <Text style={tw`text-white text-xs`}>{sleepTimer ? `${Math.round(sleepTimer / 60000)}m` : 'Sleep'}</Text>
            </TouchableOpacity>

            {/* Maximize */}
            <TouchableOpacity onPress={toggleMax} style={tw`${isCompactChrome ? 'px-2 h-7' : 'px-2 h-9'} rounded-lg bg-white/10 items-center justify-center`}>
              <Text style={tw`text-white text-xs`}>{isMax ? 'Min' : 'Max'}</Text>
            </TouchableOpacity>
          </View>

          {/* Progress row */}
          <View style={tw`mt-2 flex-row items-center gap-2`}>
            <Text style={tw`${isCompactChrome ? 'text-[10px]' : 'text-[11px]'} text-white/70 w-10 text-right`}>{formatTime(currentSec)}</Text>
            <View style={tw`flex-1`}>
              <InlineSlider
                 value={progress || 0}
                  onSlidingComplete={(r) => seekToTime((durationSec || 0) * r)}
                  height={isCompactChrome ? 10 : 12}
              />
            </View>
            <Text style={tw`text-white/70 text-[11px] w-10`}>{durationSec ? formatTime(durationSec) : '0:00'}</Text>
          </View>

          {/* Lesson nav (if per-lesson) */}
          {hasLessons && !useJoined && (
            <View style={tw`mt-2 flex-row items-center justify-between`}>
              <TouchableOpacity
                onPress={() => { void goToLesson(lessonIdx - 1); }}
                disabled={lessonIdx <= 0}
                style={tw`px-3 py-1.5 rounded bg-white/10 ${lessonIdx <= 0 ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white text-xs`}>Prev</Text>
              </TouchableOpacity>
              <Text style={tw`text-white/85 text-xs`}>{lessonIdx + 1}/{totalLessonsForUi}</Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const parentDidAdvance = await onNext?.();
                    if (parentDidAdvance) return;
                  } catch {}
                  void goToLesson(lessonIdx + 1);
                }}
                disabled={!!isBuildingNext}
                style={tw`px-3 py-1.5 rounded bg-white/10 ${isBuildingNext ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white text-xs`}>{isBuildingNext ? 'Preparing…' : 'Next'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {showFloatingThemeButton && onToggleThemePanel && (
    <TouchableOpacity
      onPress={onToggleThemePanel}
      style={tw`absolute right-4 bottom-28 bg-white/10 rounded-xl px-3 py-2`}
      accessibilityLabel="Open theme"
    >
      <Text style={tw`text-white text-xs`}>Theme</Text>
    </TouchableOpacity>
  )}


      {/* Transcript Modal */}
      <Modal visible={showTranscript} transparent animationType="slide" onRequestClose={() => setShowTranscript(false)}>
        <View style={tw`flex-1 bg-black/70`}>
          <SafeAreaView style={tw`flex-1`}>
            <View style={tw`p-3`}>
              <Text style={tw`text-white text-base font-semibold`}>{titleForUi}</Text>
            </View>
            <ScrollView contentContainerStyle={tw`px-3 pb-6`}>
              {LINES.map((ln, i) => {
                const active = i === activeLine;
                return (
                  <TouchableOpacity
                      key={i}
                      onPress={() => {
                        const first = ln.indices?.[0];
                        if (typeof first === 'number') seekToWordSafe(first);
                      }}
                      style={tw`py-2`}
                    >
                    <Text style={[tw`text-white`, { opacity: active ? 1 : 0.7 }]}>{ln.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={tw`p-3`}>
              <TouchableOpacity onPress={() => setShowTranscript(false)} style={tw`h-10 rounded-xl bg-white items-center justify-center`}>
                <Text style={tw`text-black font-semibold`}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={showNotes} transparent animationType="fade" onRequestClose={() => setShowNotes(false)}>
        <View style={tw`flex-1 bg-black/70`}>
          <SafeAreaView style={tw`flex-1`}>
            <View style={tw`p-3`}>
              <Text style={tw`text-white text-base font-semibold`}>{titleForUi} — Notes</Text>
            </View>
            <ScrollView contentContainerStyle={tw`px-3 pb-6`}>
              <Text style={tw`text-white/90`}>{notesMarkdown}</Text>
            </ScrollView>
            <View style={tw`p-3`}>
              <TouchableOpacity onPress={() => setShowNotes(false)} style={tw`h-10 rounded-xl bg-white items-center justify-center`}>
                <Text style={tw`text-black font-semibold`}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const classRoomPlayer = AndroidNarrationPlayer;
export default classRoomPlayer;