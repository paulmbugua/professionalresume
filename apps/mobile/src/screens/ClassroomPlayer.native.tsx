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

// ── 1) Prefer expo-av; keep expo-audio as a soft fallback (for future parity) ──
import * as ExpoAV from 'expo-av';
import * as ExpoAudio from 'expo-audio';

import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
// If you already use expo-image elsewhere, feel free to swap in <Image /> for nicer fades.
// import { Image } from 'expo-image';

const DBG = typeof __DEV__ !== 'undefined' ? !!__DEV__ : false;

// Small compat shim (prefers expo-av; falls back to expo-audio shapes if they ever match)
const AVNS: any = (ExpoAV as any);
const AudioNS: any =
  (AVNS?.Audio)                       // expo-av’s Audio namespace (preferred)
  || AVNS                              // some bundlers expose at module root
  || (ExpoAudio as any)?.Audio         // future: expo-audio parity
  || (ExpoAudio as any);

async function setAudioModeCompatAsync(opts: any) {
  if (typeof AudioNS?.setAudioModeAsync === 'function') return AudioNS.setAudioModeAsync(opts);
  if (AudioNS?.Audio && typeof AudioNS.Audio.setAudioModeAsync === 'function') {
    return AudioNS.Audio.setAudioModeAsync(opts);
  }
  if (DBG) console.warn('[audio] setAudioModeAsync not found');
}

async function createSoundAsync(uri: string) {
  // ✅ expo-av path (current, supported)
  if (AudioNS?.Sound?.createAsync) {
    return AudioNS.Sound.createAsync({ uri }, { shouldPlay: false, isMuted: false });
  }
  if (AudioNS?.Audio?.Sound?.createAsync) {
    return AudioNS.Audio.Sound.createAsync({ uri }, { shouldPlay: false, isMuted: false });
  }
  // Fallback not available → surface a clear error
  throw new Error('No compatible Sound.createAsync found (use expo-av for audio).');
}

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
  playing?: boolean;                 // ignored here; we derive from engine state
  playJoinedIfAvailable?: boolean;   // default false
  disableInternalBackdrop?: boolean; // ignored on native
  onToggleThemePanel?: () => void;   // optional handler
  themeOpen?: boolean;               // ignored unless you use it
  onThemeOpenChange?: (open: boolean) => void; // ignored unless you use it
  showFloatingThemeButton?: boolean; // small helper button (optional)
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
      onResponderGrant={() => { setDragging(true); }}
      onResponderMove={() => {
        if (!dragging || !barRef.current) return;
      }}
      onResponderRelease={(e) => {
        setDragging(false);
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

  // ── 3) One-time audio mode (with common, safe options) ──
  useEffect(() => {
    (async () => {
      try {
        if (DBG) console.log('[audio] setAudioModeAsync begin');
        await setAudioModeCompatAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: AudioNS?.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          interruptionModeIOS: AudioNS?.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        });
        if (DBG) console.log('[audio] setAudioModeAsync ok');
      } catch (e) {
        if (DBG) console.warn('[native] setAudioModeAsync failed', e);
      }
    })();
  }, []);

  // Keep screen awake while playing or maximized
  useKeepAwake();

  // Hook (pure; no audio in hook)
  const {
    speak,
    loading,
    error,
    words: wordsRaw,
    currentIndex,
    setTime,            // we drive this from player status
    getTimeForWord,     // to compute seek targets
    durationFromWords,  // computed duration
    markEnded,          // call when playback finishes
    audioUrl,           // url to load into Sound
    endedTick,
  } = useWordSync();

  const words = wordsRaw ?? [];

  // Expo Sound engine
  const soundRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastLoadedUrlRef = useRef<string | null>(null);

  // Subscribe to player status → drive hook.setTime
  const attachStatus = useCallback((snd: any) => {
    if (typeof snd?.setOnPlaybackStatusUpdate !== 'function') return;
    snd.setOnPlaybackStatusUpdate((st: any) => {
      const pos = (st?.positionMillis ?? 0) / 1000;
      setTime(pos);
      if (st?.didJustFinish) {
        setIsPlaying(false);
        markEnded();
        onEnded?.();
      }
    });
  }, [setTime, markEnded, onEnded]);

  // (Re)load sound when audioUrl changes
  useEffect(() => {
    (async () => {
      if (!audioUrl || audioUrl === lastLoadedUrlRef.current) return;

      // unload previous
      try { await soundRef.current?.unloadAsync(); } catch {}
      soundRef.current = null;

      try {
        const { sound } = await createSoundAsync(audioUrl);
        soundRef.current = sound;
        lastLoadedUrlRef.current = audioUrl;
        attachStatus(sound);
        // notify ready once words exist for the current source
        if ((words?.length ?? 0) > 0) {
          try { onPlayerReady?.(); } catch {}
        }
      } catch (e) {
        if (DBG) console.warn('[player] failed to load sound', e);
      }
    })();
  }, [audioUrl, attachStatus, words?.length, onPlayerReady]);

  // AppState: politely pause when app goes background (Android UX)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (s) => {
      if (Platform.OS === 'android' && s !== 'active') {
        try { await soundRef.current?.pauseAsync(); setIsPlaying(false); } catch {}
      }
    });
    return () => sub.remove();
  }, []);

  // ---- debug: observe hook state ----
  useEffect(() => {
    if (!DBG) return;
    console.log(
      '[hook] loading=%s idx=%s words=%s err=%o',
      loading,
      currentIndex,
      words.length,
      error
    );
  }, [loading, currentIndex, words.length, error]);

  useEffect(() => {
    if (!DBG) return;
    console.log('[hook] endedTick=', endedTick);
  }, [endedTick]);

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
    if (ready && spokeForCurrentKeyRef.current && !readyNotifiedRef.current) {
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
  const [speed, setSpeed] = useState<number>(1.0); // (UI + playback via setRateAsync)
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

  // Seek helpers using hook’s times
  const seekToWordSafe = useCallback(async (i: number) => {
    if (i < 0 || i >= words.length) return;
    const t = getTimeForWord(i);
    try { await soundRef.current?.setPositionAsync(t * 1000); } catch {}
    setTime(t);
  }, [words.length, getTimeForWord, setTime]);

  const seekToTime = useCallback(async (t: number) => {
    const tt = Math.max(0, t);
    try { await soundRef.current?.setPositionAsync(tt * 1000); } catch {}
    setTime(tt);
  }, [setTime]);

  const nudgeSeconds = useCallback((d: number) => {
    const tgt = Math.max(0, Math.min(durationSec, currentSec + d));
    void seekToTime(tgt);
  }, [currentSec, durationSec, seekToTime]);

  // Speak the right source automatically (we do not autoplay)
  const lastSpeakKey = useRef<string | null>(null);
  const playIntentRef = useRef(false);

  useEffect(() => {
    const key = currentSourceKey;
    if (!key || key === lastSpeakKey.current) return;

    if (playIntentRef.current || isPlaying || loading) {
      if (DBG) console.log('[player] skip auto speak (intent/playing/loading)', {
        intent: playIntentRef.current, isPlaying, loading
      });
      return;
    }

    if (DBG) console.log('[player] source changed → auto speak begin', { key });

    (async () => {
      try {
        try { await soundRef.current?.unloadAsync(); } catch {}
        const cur = useJoined
          ? (ssml || '').trim()
          : hasLessons
            ? (lessons[lessonIdx]?.ssml || '').trim()
            : (ssml || '').trim();

        if (!cur.length) {
          if (DBG) console.log('[player] auto speak skipped (empty cur)');
          return;
        }
        const t0 = Date.now();
        await speak(effectiveBackend, { ssml: cur, voiceName });
        if (DBG) console.log('[player] auto speak resolved in', Date.now() - t0, 'ms');
        lastSpeakKey.current = key;
        spokeForCurrentKeyRef.current = true;
      } catch (e) {
        if (DBG) console.warn('[player] auto speak failed', e);
      }
    })();
  }, [
    currentSourceKey, useJoined, hasLessons, lessonIdx, lessons, ssml,
    voiceName, effectiveBackend, speak, isPlaying, loading
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
    if (topBarHRef.current !== h) {
      topBarHRef.current = h;
      if (DBG) console.log('[layout] top bar height =', h);
      forceRerender((n) => n + 1);
    }
  };
  const setBottomBarH = (h: number) => {
    if (bottomBarHRef.current !== h) {
      bottomBarHRef.current = h;
      if (DBG) console.log('[layout] bottom bar height =', h);
      forceRerender((n) => n + 1);
    }
  };

  useEffect(() => {
    if (sleepTORef.current) {
      clearTimeout(sleepTORef.current);
      sleepTORef.current = null;
    }
    if (sleepTimer && sleepTimer > 0) {
      sleepTORef.current = setTimeout(() => {
        (async () => { try { await soundRef.current?.pauseAsync(); setIsPlaying(false); } catch {} })();
      }, sleepTimer);
    }
    return () => {
      if (sleepTORef.current) clearTimeout(sleepTORef.current);
    };
  }, [sleepTimer]);

  useEffect(() => {
    playIntentRef.current = false;
    lastSpeakKey.current = null;
    spokeForCurrentKeyRef.current = false;
    if (DBG) console.log('[init] refs reset (playIntent=false, lastSpeakKey=null)');
  }, []);

  // ── 4) Tie UI speed to playback rate ─────────────────────────────────
  // If speed changes mid-play, update the current sound.
  useEffect(() => {
    (async () => {
      try {
        if (soundRef.current && typeof soundRef.current.setRateAsync === 'function' && isPlaying) {
          await soundRef.current.setRateAsync(speed, true);
        }
      } catch {}
    })();
  }, [speed, isPlaying]);

  // Play/Pause handler
  const handlePlayClick = useCallback(async () => {
    try {
      // prevent race with auto-speak during prop churn
      playIntentRef.current = true;

      if (DBG) console.log('[player] handlePlayClick start');

      const cur = (
        useJoined ? (ssml || '') :
        hasLessons ? (lessons[lessonIdx]?.ssml || '') :
        (ssml || '')
      ).trim();

      if (DBG) console.log('[player] cur SSML len =', cur.length, {
        useJoined, hasLessons, lessonIdx, key: currentSourceKey
      });

      if (!cur.length) {
        if (DBG) console.warn('[native] No SSML available to speak');
        return;
      }

      const needSpeak = !audioUrl || lastSpeakKey.current !== currentSourceKey;
      if (DBG) console.log('[player] needSpeak?', needSpeak, {
        hasAudioUrl: !!audioUrl, lastSpeakKey: lastSpeakKey.current
      });

      if (needSpeak) {
        const t0 = Date.now();
        if (DBG) console.info('[player] speak() begin');
        await speak(effectiveBackend, { ssml: cur, voiceName });
        if (DBG) console.info('[player] speak() resolved in', Date.now() - t0, 'ms');
        lastSpeakKey.current = currentSourceKey;
        spokeForCurrentKeyRef.current = true;
      }

      if (DBG) console.log('[player] calling onBeforePlay');
      await onBeforePlay?.();

      // Ensure sound is loaded for the current audioUrl
      if (audioUrl && audioUrl !== lastLoadedUrlRef.current) {
        try { await soundRef.current?.unloadAsync(); } catch {}
        const { sound } = await createSoundAsync(audioUrl);
        soundRef.current = sound;
        lastLoadedUrlRef.current = audioUrl;
        attachStatus(sound);
      }

      if (!soundRef.current) {
        if (DBG) console.warn('[player] no sound available yet');
        return;
      }

      // 🧠 apply playback rate before play
      if (typeof soundRef.current.setRateAsync === 'function') {
        try { await soundRef.current.setRateAsync(speed, true); } catch {}
      }

      const t1 = Date.now();
      if (DBG) console.log('[player] play() begin');
      await soundRef.current.playAsync();
      setIsPlaying(true);
      if (DBG) console.log('[player] play() resolved in', Date.now() - t1, 'ms');

      setTimeout(async () => {
        const st: any = await soundRef.current?.getStatusAsync?.();
        const pos = (st?.positionMillis ?? 0) / 1000;
        if (DBG) console.log('[probe] post-play isPlaying=%s currentTime=%s', true, pos);
      }, 50);

    } catch (e) {
      if (DBG) console.warn('[native] play failed', e);
    } finally {
      setTimeout(() => { playIntentRef.current = false; }, 600);
    }
  }, [
    speak, effectiveBackend, voiceName, ssml, hasLessons, lessons, lessonIdx,
    currentSourceKey, onBeforePlay, audioUrl, attachStatus, speed
  ]);

  const onPlayPress = useCallback(() => {
    if (loading) { if (DBG) console.log('[player] ignore play during loading'); return; }
    if (isPlaying) {
      // if already playing, interpret as pause (UX: big Play/Pause button toggles)
      (async () => { try { await soundRef.current?.pauseAsync(); } catch {} setIsPlaying(false); })();
      return;
    }
    if (DBG) console.log('[player] onPlayPress fired (isPlaying=%s, loading=%s)', isPlaying, loading);
    void handlePlayClick();
  }, [handlePlayClick, loading, isPlaying]);

  const pauseEngine = useCallback(async () => {
    try { await soundRef.current?.pauseAsync(); } catch {}
    setIsPlaying(false);
  }, []);

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
        <View style={tw`absolute inset-0`} pointerEvents="none">
          {backdropOverride ? backdropOverride : <View style={tw`flex-1 bg-[#0b1220]`} />}
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
                onPress={onPlayPress}
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
          pointerEvents="box-none"   // ✅ let touches pass through
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
          {!isPlaying && (
            <TouchableOpacity
              onPress={onPlayPress}
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
          style={[tw`${isCompactChrome ? 'px-2 pt-1 pb-2' : 'px-3 pt-2 pb-3'} absolute bottom-0 left-0 right-0 bg-black/45`, { zIndex: 60 }]}
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
              onPress={onPlayPress}
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

            {/* Speed (UI + playback rate via setRateAsync) */}
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
                onSlidingComplete={(r) => { void seekToTime((durationSec || 0) * r); }}
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
                      if (typeof first === 'number') { void seekToWordSafe(first); }
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
