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
  SafeAreaView,
  useWindowDimensions,
  Platform,
  Pressable,
  ImageBackground,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import tw from '../../tailwind';
import LessonOverlay from '../screens/LessonOverlay.native';

import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { useShopContext } from '@mytutorapp/shared/context';

import {
  pickImageForCourse,
  SUBJECT_IMAGE_MAP,
  SUBJECT_ALIASES,
  FALLBACK_COURSE_IMAGE,
} from '../../utils/subjectImages';

type WordTiming = { text: string; start: number; end: number };
type WordSyncShape = {
  speak?: (backendBase: string, opts: { ssml: string; voiceName: string }) => Promise<unknown>;
  requestSpeech?: (backendBase: string, opts: { ssml: string; voiceName: string }) => Promise<unknown>;
  loading?: boolean;
  error?: string | null;
  words?: WordTiming[];
  currentIndex?: number;
  setTime?: (t: number) => void;
  getTimeForWord?: (i: number) => number;
  durationFromWords?: number;
  markEnded?: () => void;
  audioUrl?: string | null;
  endedTick?: number;
  retimeEvenly?: (durationSec: number) => void;
};

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
  isBuildingNext?: boolean;
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

// Normalize lesson for overlay (if you have a native LessonOverlay, wire it similarly)
const toOverlayLesson = (lesson: LessonLite | undefined) => {
  if (!lesson) return null;
  const formulas = Array.isArray(lesson.formulas)
    ? lesson.formulas.map((f) => ({
        id: f.id,
        latex: f.latex,
        speakAs: toSpeakAsMode(f.speakAs),
      }))
    : undefined;
  return { ...lesson, formulas };
};

function TranscriptDrawerInline({
  open,
  title,
  lines,
  words,
  activeLine,
  top,
  bottom,
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
  top: number;
  bottom: number;
  readerScale: number;
  loading: boolean;
  error?: string;
  onSeekToWord: (i: number) => void;
}) {
  return (
    <Modal animationType="slide" visible={open} transparent>
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Pressable style={tw`flex-1`} onPress={() => { /* parent toggles */ }} />
        <View
          style={[
            tw`bg-slate-900 rounded-t-2xl px-4 pt-3 pb-6`,
            { maxHeight: '70%' },
          ]}
        >
          <Text style={tw`text-white text-base font-semibold mb-2`}>
            {title} — Transcript
          </Text>
          {loading && (
            <Text style={tw`text-white/80 mb-2`}>Generating…</Text>
          )}
          {error ? (
            <Text style={tw`text-red-300`}>{error}</Text>
          ) : (
            <ScrollView
              style={tw`max-h-[60%]`}
              contentContainerStyle={tw`pb-4`}
            >
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
  isMax,
}: {
  open: boolean;
  title: string;
  markdown: string;
  isMax: boolean;
}) {
  return (
    <Modal animationType="slide" visible={open} transparent>
      <SafeAreaView style={[tw`flex-1`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Pressable style={tw`flex-1`} onPress={() => { /* parent toggles */ }} />
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

function collectSubjectKeysFromText(txt: string) {
  const hay = txt.toLowerCase();
  const hits: string[] = [];
  for (const key of Object.keys(SUBJECT_IMAGE_MAP)) if (hay.includes(key)) hits.push(key);
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES))
    if ((aliases as string[]).some((a) => hay.includes(a))) hits.push(canonical);
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
      return course ? pickImageForCourse(course, backendUrl) : FALLBACK_COURSE_IMAGE;
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

export default function ClassroomPlayerNative({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized,
  onToggleMaximize,
  playerHeight,
  onNext,
  isBuildingNext,
  course,
  outline = [],
  backendUrlOverride,
  playing = true,
  onEnded,
  onBeforePlay,
  onToggleThemePanel,
  onPlayerLoadingChange,
  onRequestStart,
  playJoinedIfAvailable = false,
  disableInternalBackdrop = true,
  backdropOverride,
}: ClassroomPlayerProps) {
  useKeepAwake();

  const ws = useWordSync() as Partial<WordSyncShape>;

  const speak         = ws.speak ?? (async () => {});
  const requestSpeech = ws.requestSpeech ?? (async () => {});
  const loading       = !!ws.loading;
  const error         = ws.error ?? null;
  const wordsRaw      = ws.words ?? [];
  const currentIndex  = ws.currentIndex ?? 0;
  const audioUrl      = ws.audioUrl ?? null;
  const endedTick     = ws.endedTick ?? 0;

  const setTime           = ws.setTime;
  const getTimeForWord    = ws.getTimeForWord ?? ((_: number) => 0);
  const durationFromWords = ws.durationFromWords ?? 0;
  const markEnded         = ws.markEnded ?? (() => {});
  const retimeEvenly      = ws.retimeEvenly;

  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  const hasJoined = typeof ssml === 'string' && ssml.trim().length > 0;
  const useJoined = playJoinedIfAvailable && hasJoined;

  const [lessonIdx, setLessonIdx] = useState(0);
  const words = wordsRaw ?? [];

  useEffect(() => {
    const hasAnySource = useJoined || hasLessons || Boolean((ssml || '').trim().length);
    const shouldBeLoading = loading || (hasAnySource && !words.length);
    try {
      onPlayerLoadingChange?.(shouldBeLoading);
    } catch {}
  }, [loading, words.length, useJoined, hasLessons, ssml, onPlayerLoadingChange]);

  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [chromeTop, setChromeTop] = useState(44);
  const [chromeBottom, setChromeBottom] = useState(84);

  const wordDurRef = useRef(0);
  const wordsRef = useRef<typeof words>([]);
  useEffect(() => { wordDurRef.current = durationFromWords || 0; }, [durationFromWords]);
  useEffect(() => { wordsRef.current = words || []; }, [words]);

  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  const totalLessonsForUi = useMemo(
    () => Math.max(lessons?.length || 0, outline?.length || 0) || 1,
    [lessons?.length, outline?.length]
  );

  const [internalMax, setInternalMax] = useState(false);
  const isControlled = typeof maximized === 'boolean';
  const isMax = isControlled ? (maximized as boolean) : internalMax;
  const toggleMax = () => {
    if (onToggleMaximize) onToggleMaximize();
    else setInternalMax((v) => !v);
  };

  // ── Audio: expo-av
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastLoadedUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaDur, setMediaDur] = useState(0);
  const [mediaTime, setMediaTime] = useState(0);
const hasSignaledReadyRef = useRef(false);
  const mediaToWordsScaleRef = useRef(1);
  const haveLockedScaleRef = useRef(false);
  const didRetimeOnceRef = useRef(false);
  const retimedThisTrackRef = useRef(false);

  const unloadSound = useCallback(async () => {
    try { await soundRef.current?.unloadAsync(); } catch {}
    soundRef.current = null;
  }, []);

  const onSoundStatus = useCallback((st: AVPlaybackStatus) => {
    if (!st.isLoaded) return;
    const pos = st.positionMillis ?? 0;
    const dur = st.durationMillis ?? 0;
    setMediaTime(pos / 1000);
    setMediaDur(dur / 1000);
    setIsPlaying(st.isPlaying);

    const tMedia = (pos ?? 0) / 1000;
    const tWords = retimedThisTrackRef.current
      ? tMedia
      : tMedia * (haveLockedScaleRef.current ? mediaToWordsScaleRef.current : 1);
    setTime?.(tWords);

    if (!hasSignaledReadyRef.current && (!('isBuffering' in st) || !st.isBuffering)) {
    hasSignaledReadyRef.current = true;
    try { onPlayerLoadingChange?.(false); } catch {}
  }

    if (st.didJustFinish) {
      setIsPlaying(false);
      markEnded();
      try { onEnded?.(); } catch {}
    }
  }, [setTime, markEnded, onEnded,onPlayerLoadingChange]);

  useEffect(() => {
    (async () => {
      if (!audioUrl || audioUrl === lastLoadedUrlRef.current) return;
      hasSignaledReadyRef.current = false;

      haveLockedScaleRef.current = false;
      didRetimeOnceRef.current = false;
      retimedThisTrackRef.current = false;

      lastLoadedUrlRef.current = audioUrl;
      await unloadSound();

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, progressUpdateIntervalMillis: 100 },
        onSoundStatus
      );
      soundRef.current = sound;

      const st = await sound.getStatusAsync();
      if (st.isLoaded) {
        const durM = (st.durationMillis ?? 0) / 1000;
        const durW = Number(wordDurRef.current) || 0;

        if (!didRetimeOnceRef.current && durM > 0 && durW > 0) {
          const absDiff = Math.abs(durW - durM);
          const relDiff = absDiff / Math.max(durM, durW);
          if (relDiff > 0.10 || absDiff > 1.0) {
            try {
              retimeEvenly?.(durM);
              didRetimeOnceRef.current = true;
              retimedThisTrackRef.current = true;
              mediaToWordsScaleRef.current = 1;
              haveLockedScaleRef.current = true;
            } catch {
              mediaToWordsScaleRef.current = durW / durM;
              haveLockedScaleRef.current = true;
              retimedThisTrackRef.current = false;
            }
          } else {
            mediaToWordsScaleRef.current = durW / durM;
            haveLockedScaleRef.current = true;
            retimedThisTrackRef.current = false;
          }
        }
      }
    })();
  }, [audioUrl, unloadSound, retimeEvenly, onSoundStatus]);

  const autoPlayArmedRef = useRef(false);
  const handlePlayClick = useCallback(async () => {
    const snd = soundRef.current;
    if (!snd) {
      onRequestStart?.();
      onPlayerLoadingChange?.(true);
      autoPlayArmedRef.current = true;
      await onBeforePlay?.();

      const cur = useJoined
        ? (ssml || '').trim()
        : hasLessons
        ? (lessons[lessonIdx]?.ssml || '').trim()
        : (ssml || '').trim();

      if (cur.length) {
        await speak(effectiveBackend, { ssml: cur, voiceName });
      }
      return;
    }

    const st = await snd.getStatusAsync();
    if (st.isLoaded && st.isPlaying) {
      await snd.pauseAsync();
      setIsPlaying(false);
    } else {
      await onBeforePlay?.();
      await snd.playAsync();
      setIsPlaying(true);
    }
  }, [
    speak,
    effectiveBackend,
    voiceName,
    useJoined,
    ssml,
    hasLessons,
    lessons,
    lessonIdx,
    onRequestStart,
    onPlayerLoadingChange,
    onBeforePlay,
  ]);

  const prevUrlRef = useRef<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!audioUrl || audioUrl === prevUrlRef.current) return;
      prevUrlRef.current = audioUrl;

      if (autoPlayArmedRef.current && soundRef.current) {
        try {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        } catch {}
        autoPlayArmedRef.current = false;
      }
    })();
  }, [audioUrl]);

  const seekToTime = useCallback(async (sec: number) => {
    const snd = soundRef.current;
    if (!snd) return;
    const st = await snd.getStatusAsync();
    if (!st.isLoaded) return;
    const dur = (st.durationMillis ?? 0) / 1000;
    const t = Math.max(0, Math.min(dur || 0, sec));
    await snd.setPositionAsync(t * 1000);
    setMediaTime(t);
    const tWords = retimedThisTrackRef.current ? t : t * (haveLockedScaleRef.current ? mediaToWordsScaleRef.current : 1);
    setTime?.(tWords);
  }, [setTime]);

  const nudgeSeconds = useCallback(async (d: number) => {
    const snd = soundRef.current;
    if (!snd) return;
    const st = await snd.getStatusAsync();
    if (!st.isLoaded) return;
    const cur = (st.positionMillis ?? 0) / 1000;
    await seekToTime(cur + d);
  }, [seekToTime]);

  const seekToWordSafe = useCallback(async (i: number) => {
    const liveWords = wordsRef.current;
    if (i < 0 || i >= liveWords.length) return;

    const tWord = getTimeForWord(i);
    const snd = soundRef.current;
    if (!snd) return;

    const st = await snd.getStatusAsync();
    if (!st.isLoaded) return;
    const durM = (st.durationMillis ?? 0) / 1000;

    const tMedia = retimedThisTrackRef.current
      ? tWord
      : (haveLockedScaleRef.current && mediaToWordsScaleRef.current > 0)
        ? tWord / mediaToWordsScaleRef.current
        : tWord;

    const clamped = Math.max(0, durM > 0 ? Math.min(durM, tMedia) : tMedia);
    await snd.setPositionAsync(clamped * 1000);
    setMediaTime(clamped);
    setTime?.(tWord);
  }, [getTimeForWord, setTime]);

  const lastSpeakKey = useRef<string | null>(null);
  const makeSpeakKey = () => {
    if (useJoined) return `joined|voice:${voiceName}|len:${(ssml?.trim().length ?? 0)}`;
    if (hasLessons) {
      const l = lessons[lessonIdx];
      return `lesson:${l?.id || lessonIdx}|voice:${voiceName}|len:${(l?.ssml || '').length}`;
    }
    return `single|voice:${voiceName}|len:${(ssml || '').length}`;
  };

  useEffect(() => {
  const key = makeSpeakKey();
  if (!key || key === lastSpeakKey.current) return;

  const run = async () => {
    try {
      await unloadSound();

      const cur = useJoined
        ? (ssml || '').trim()
        : hasLessons
        ? (lessons[lessonIdx]?.ssml || '').trim()
        : (ssml || '').trim();

      if (cur.length) {
        onPlayerLoadingChange?.(true);               // ⬅️ tell shell we’re loading
        await speak(effectiveBackend, { ssml: cur, voiceName });
        lastSpeakKey.current = key;
      }
    } catch {}
  };
  run();
}, [useJoined, hasLessons, lessonIdx, lessons, ssml, voiceName, effectiveBackend, unloadSound, speak, onPlayerLoadingChange]);


  const prevLenRef = useRef(lessonIdx);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancingRef = useRef(false);
  useEffect(() => {
    const prev = prevLenRef.current;
    const cur = lessons.length;
    if (prev === 0 && cur > 0) {
      setLessonIdx(0);
    } else if (isAdvancing && cur > prev) {
      setLessonIdx((i) => Math.min(i + 1, cur - 1));
    }
    prevLenRef.current = cur;
  }, [lessons.length, isAdvancing]);

  const lastEndedTickRef = useRef(0);
  const endFiredForRef = useRef<number | null>(null);

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

    const hasImmediateNext = hasLessons && lessonIdx < lessons.length - 1;
    const maybeMoreComing = (outline?.length || 0) > (lessons?.length || 0);
    if (!hasImmediateNext && !maybeMoreComing) return;
    if (advancingRef.current) return;

    advancingRef.current = true;
    setIsAdvancing(true);
    autoPlayArmedRef.current = true;

    if (hasImmediateNext) {
      const id = setTimeout(() => {
        const nextFilledIndex = (from: number) => {
          for (let k = from + 1; k < lessons.length; k++) if (lessons[k]) return k;
          return -1;
        };
        const nfi = nextFilledIndex(lessonIdx);
        if (nfi !== -1) setLessonIdx(nfi);
      }, 50);
      return () => clearTimeout(id);
    }
  }, [endedTick, error, words.length, useJoined, lessonIdx, hasLessons, lessons.length, outline?.length, onEnded]);

  useEffect(() => {
    if (error && isAdvancing) {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [error, isAdvancing]);

  const isSmall = useWindowDimensions().width < 640;
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
        const lastIndexOf = (arr: number[]) =>
          arr.length ? (arr[arr.length - 1]! as number) : -1;
        const li = lastIndexOf(indices);
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
      const lastIndexOf = (arr: number[]) =>
        arr.length ? (arr[arr.length - 1]! as number) : -1;
      const li = lastIndexOf(indices);
      const endTime = li >= 0 && words[li] ? (words[li]!.end ?? start) : start;
      arr.push({ text: buf, start, end: endTime, indices });
    }
    return arr;
  }, [words, isSmall]);

  const activeLine = useMemo(() => {
    const idx = LINES.findIndex((ln) => ln.indices.includes(currentIndex));
    return idx === -1 ? 0 : idx;
  }, [LINES, currentIndex]);

  const durationSec = mediaDur;
  const currentSec = mediaTime;
  const progress = durationSec ? currentSec / durationSec : 0;

  const titleForUi = useJoined
    ? title
    : hasLessons
    ? lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${totalLessonsForUi}`
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

  const [barWidth, setBarWidth] = useState(0);
  const onScrubAtX = useCallback(
    async (x: number) => {
      if (!durationSec || barWidth <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / barWidth));
      await seekToTime(ratio * durationSec);
    },
    [barWidth, durationSec, seekToTime]
  );

  const [userScale, setUserScale] = useState(1);
  const wdim = useWindowDimensions();
  const autoScale = useMemo(() => {
    const w = wdim.width, h = wdim.height;
    if (Math.max(w, h) >= 2160) return 1.8;
    if (w >= 1920 || h >= 1080) return 1.4;
    if (w >= 1440 || h >= 900) return 1.2;
    return 1;
  }, [wdim]);
  const readerScale = autoScale * userScale;

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
    if (disableInternalBackdrop || (typeof playing === 'boolean' ? !playing : !isPlaying) || images.length <= 1) return;
    const t = setInterval(() => {
      if (frontA) {
        setBgIdx((i) => (i + 1) % images.length);
        fadeB.setValue(0);
        Animated.timing(fadeB, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
          fadeA.setValue(0);
          setFrontA(false);
        });
      } else {
        setBgIdx((i) => (i + 1) % images.length);
        fadeA.setValue(0);
        Animated.timing(fadeA, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
          fadeB.setValue(0);
          setFrontA(true);
        });
      }
    }, 14000);
    return () => clearInterval(t);
  }, [images.length, disableInternalBackdrop, playing, isPlaying, fadeA, fadeB, frontA]);

  const currentBg = images[bgIdx] || base;

  useEffect(() => {
    return () => { unloadSound(); };
  }, []);

  // ─────────────────────────────────────────────────────────
  // NEW: Prev/Next handlers (no icons) — always visible controls
  // ─────────────────────────────────────────────────────────
  const handlePrevClick = useCallback(() => {
    if (useJoined || !hasLessons) return;
    setLessonIdx((i) => Math.max(0, i - 1));
  }, [useJoined, hasLessons]);

  const handleNextClick = useCallback(async () => {
    if (useJoined) return; // joined mode has no per-lesson next
    if (typeof onNext === 'function') {
      try {
        const parentDidAdvance = await onNext();
        if (parentDidAdvance) return; // parent handled it (e.g., fetching next)
      } catch {
        // swallow and fall back
      }
    }
    if (!hasLessons) return;
    setLessonIdx((i) => Math.min(i + 1, Math.max(totalLessonsForUi - 1, 0)));
  }, [useJoined, onNext, hasLessons, totalLessonsForUi]);

  // UI
  return (
    <View
      style={[
        { width: '100%' },
        playerHeight != null ? { height: playerHeight } : tw`flex-1`,
        tw`bg-[#0b1220]`,
      ]}
    >
      {/* Top bar (always visible, includes Prev/Next and Theme/Maximize) */}
      <View collapsable={false}>
        <SafeAreaView style={tw`bg-black/35`}>
          <View
              onLayout={(e) => setChromeTop(e.nativeEvent.layout.height)}
              // allow wrapping + keep items aligned
              style={[tw`px-3 py-2`, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}]}
            >
              <Text style={[tw`text-white/85 text-xs`, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                {voiceName} • {titleForUi}
              </Text>

              {/* controls group can wrap under the title when space is tight */}
              <View style={[{ marginLeft: 'auto' }, tw`flex-row gap-2`, { flexWrap: 'wrap' }]}>
                {!useJoined && hasLessons && (
                  <View style={[tw`flex-row gap-2`, { flexWrap: 'wrap' }]}>
                    <TouchableOpacity onPress={handlePrevClick} disabled={lessonIdx <= 0} style={tw`px-2 py-1.5 rounded bg-white/10`}>
                      <Text style={tw`text-white text-xs`}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={tw`text-white/80 text-xs`}>
                      {lessonIdx + 1}/{totalLessonsForUi}
                    </Text>
                    <TouchableOpacity
                      onPress={handleNextClick}
                      disabled={!!isBuildingNext || lessonIdx >= totalLessonsForUi - 1}
                      style={tw`px-2 py-1.5 rounded bg-white/10`}
                    >
                      <Text style={tw`text-white text-xs`}>{isBuildingNext ? 'Preparing next…' : 'Next'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>{isPlaying ? 'Pause' : 'Play'}</Text>
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
        {/* Backdrop */}
        {!disableInternalBackdrop && !backdropOverride && (
          <View style={tw`absolute inset-0`}>
            <Animated.View style={[tw`absolute inset-0`, { opacity: frontA ? fadeA : fadeB }]}>
              <ImageBackground
                source={{ uri: currentBg }}
                resizeMode="cover"
                style={tw`flex-1`}
              >
                <View style={tw`absolute inset-0 bg-black/25`} />
              </ImageBackground>
            </Animated.View>
            <Animated.View style={[tw`absolute inset-0`, { opacity: frontA ? fadeB : fadeA }]}>
              <ImageBackground
                source={{ uri: currentBg }}
                resizeMode="cover"
                style={tw`flex-1`}
              >
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
                  fontSize: isMax ? Math.min(48, 26 * readerScale) : Math.min(32, 20 * readerScale),
                  lineHeight: 1.35 * (isMax ? Math.min(48, 26 * readerScale) : Math.min(32, 20 * readerScale)),
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
          defaultPinned={true}
          rememberKey={currentLesson?.id ? `overlay:${currentLesson.id}` : 'overlay:joined'}
          zIndex={10000}
          freeMove={true}
          fullOnMaximize={true}
        />

        {/* Preparing/generating status */}
        {!words.length && !error && !isAdvancing && (
          <View style={[tw`absolute left-0 right-0 items-center`, { bottom: chromeBottom + 8}]}>
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

      {/* Bottom controls (always visible, now also include Prev/Next) */}
      <View collapsable={false}>
        <SafeAreaView
          onLayout={(e) => setChromeBottom(e.nativeEvent.layout.height)}
          style={tw`bg-black/45`}
        >
          <View style={tw`px-3 py-2`}>
            {/* Row 1 */}
            {/* Row 1 (wrap when tight so nothing gets clipped) */}
              <View style={[tw``, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }]}>
                {/* Transport */}
                <View style={[tw`flex-row gap-2`, { alignItems: 'center' }]}>
                  <TouchableOpacity onPress={() => nudgeSeconds(-5)} style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}>
                    <Text style={tw`text-white`}>{'<<'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`h-10 px-4 items-center justify-center rounded-xl bg-white`}>
                    <Text style={tw`text-black font-semibold`}>{isPlaying ? 'Pause' : 'Play'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => nudgeSeconds(5)} style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}>
                    <Text style={tw`text-white`}>{'>>'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Prev / Counter / Next */}
                {!useJoined && hasLessons && (
                  <View style={[tw`ml-2 flex-row gap-2`, { alignItems: 'center', flexWrap: 'wrap' }]}>
                    <TouchableOpacity onPress={handlePrevClick} disabled={lessonIdx <= 0} style={tw`h-10 px-3 rounded-xl bg-white/10`}>
                      <Text style={tw`text-white text-xs`}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={tw`text-white/85 text-xs`}>{lessonIdx + 1}/{totalLessonsForUi}</Text>
                    <TouchableOpacity
                      onPress={handleNextClick}
                      disabled={!!isBuildingNext || lessonIdx >= totalLessonsForUi - 1}
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

                {/* Utilities (Transcript/Theme/Maximize/Notes) */}
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
                  onPress={(e) => {
                    const x = e.nativeEvent.locationX;
                    onScrubAtX(x);
                  }}
                >
                  <View style={[tw`h-full bg-white/85`, { width: `${Math.round(progress * 100)}%` }]} />
                </Pressable>
              </View>
              <Text style={tw`text-white/70 text-[11px] w-12`}>
                {durationSec ? formatTime(durationSec) : '0:00'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Transcript Drawer */}
      <TranscriptDrawerInline
        open={showTranscript}
        title={titleForUi}
        lines={LINES}
        words={words}
        activeLine={activeLine}
        top={0}
        bottom={0}
        readerScale={readerScale}
        loading={loading}
        error={error ?? undefined}
        onSeekToWord={(wi) => seekToWordSafe(wi)}
      />

      {/* Notes Drawer */}
      <NotesDrawerInline
        open={showNotes}
        title={`${titleForUi} — Notes`}
        markdown={notesMarkdown || '_No notes for this lesson yet._'}
        isMax={!!isMax}
      />
    </View>
  );
}
