import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Animated,
  Easing,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import tw from '../../tailwind';

import { useShopContext } from '@mytutorapp/shared/context';
import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';

/* -------- Minimal inline slider (no external deps) -------- */
type InlineSliderProps = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onSlidingComplete?: (ratio: number) => void; // 0..1
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
};
const InlineSlider: React.FC<InlineSliderProps> = ({
  value,
  minimumValue = 0,
  maximumValue = 1,
  onSlidingComplete,
  minimumTrackTintColor = '#fff',
  maximumTrackTintColor = 'rgba(255,255,255,0.35)',
  thumbTintColor = '#fff',
}) => {
  const [width, setWidth] = useState(1);
  const clamped = Math.max(minimumValue, Math.min(maximumValue, value));
  const ratio = (clamped - minimumValue) / Math.max(1e-6, maximumValue - minimumValue);
  const handleLayout = (e: LayoutChangeEvent) => setWidth(Math.max(1, e.nativeEvent.layout.width));
  const handleRelease = (e: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(width, e.nativeEvent.locationX));
    const r = x / width;
    onSlidingComplete?.(r);
  };
  return (
    <View
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleRelease}
      style={tw`h-6 justify-center`}
    >
      <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: maximumTrackTintColor }]}>
        <View style={{ width: `${ratio * 100}%`, backgroundColor: minimumTrackTintColor, height: '100%' }} />
      </View>
      <View
        pointerEvents="none"
        style={[
          tw`absolute h-4 w-4 rounded-full`,
          {
            backgroundColor: thumbTintColor,
            top: 6 - 8,
            left: Math.max(0, Math.min(width - 8, ratio * width - 8)),
          },
        ]}
      />
    </View>
  );
};
/* --------------------------------------------------------- */

type SpeakAsMode = 'math' | 'spell-out' | 'characters' | 'none';
type LessonLite = {
  id: string;
  title?: string;
  ssml: string;
  markdown?: string;
  formulas?: { id: string; latex: string; speakAs?: SpeakAsMode; title?: string; announceAtSentence?: number }[];
  tables?: { title: string; columns: string[]; rows: (string | number)[][]; caption?: string; announceAtSentence?: number }[];
};
type OutlineSection = { id: string; title: string; keyPoints?: string[] };

type Props = {
  ssml?: string;
  lessons?: LessonLite[];
  title?: string;
  voiceName?: string;
  onNext?: () => Promise<boolean> | boolean;
  isBuildingNext?: boolean;
  maximized?: boolean;
  onToggleMaximize?: () => void;
  onEnded?: () => void;
  disableInternalBackdrop?: boolean;
  backdropOverride?: React.ReactNode;
  onToggleThemePanel?: () => void;
  course?: any | null;
  outline?: OutlineSection[];
  backendUrlOverride?: string;
  playing?: boolean;
  playJoinedIfAvailable?: boolean;
  onBeforePlay?: () => Promise<void> | void;
};

function useRotatingImages(images: string[], playing: boolean, intervalSec = 14) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!playing || images.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), intervalSec * 1000);
    return () => clearInterval(t);
  }, [images.length, intervalSec, playing]);
  return images[idx] || undefined;
}

export default function ClassroomPlayer({
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
  playing = true,
  onEnded,
  onBeforePlay,
  playJoinedIfAvailable = false,
  disableInternalBackdrop = true,
  backdropOverride,
  onToggleThemePanel, // ✅ bring into scope
}: Props) {
  const {
    speak, loading, error, words: wordsRaw, currentIndex,
    isPlaying, play, pause, seekToWord, resumeAudioContext, endedTick,
  } = useWordSync();

  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  const hasJoined  = typeof ssml === 'string' && ssml.trim().length > 0;
  const useJoined  = playJoinedIfAvailable && hasJoined;

  const [lessonIdx, setLessonIdx] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const [internalMax, setInternalMax] = useState(false);
  const isControlled = typeof maximized === 'boolean';
  const isMax = isControlled ? (maximized as boolean) : internalMax;
  const toggleMax = () => (onToggleMaximize ? onToggleMaximize() : setInternalMax(v => !v));

  // backdrops
  const backdropImages = useMemo<string[]>(
    () => (course?.images?.length ? course.images : (course?.image ? [course.image] : [])),
    [course]
  );
  const currentBg = useRotatingImages(backdropImages, typeof playing === 'boolean' ? playing : isPlaying);

  // speak
  const lastSpeakKey = useRef<string | null>(null);
  const makeSpeakKey = () => {
    if (useJoined) return `joined|${voiceName}|${(ssml?.trim().length ?? 0)}`;
    if (hasLessons) return `l${lessons[lessonIdx]?.id || lessonIdx}|${voiceName}|${(lessons[lessonIdx]?.ssml || '').length}`;
    return `single|${voiceName}|${(ssml || '').length}`;
  };

  useEffect(() => {
    const key = makeSpeakKey();
    if (!key || key === lastSpeakKey.current) return;

    (async () => {
      try { await pause(); } catch {}
      const cur = useJoined ? (ssml || '').trim()
                : hasLessons ? (lessons[lessonIdx]?.ssml || '').trim()
                : (ssml || '').trim();
      if (cur.length > 0) {
        await speak(effectiveBackend, { ssml: cur, voiceName });
        lastSpeakKey.current = key;
        setIsAdvancing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useJoined, hasLessons, lessonIdx, lessons, ssml, voiceName, effectiveBackend]);

  // progress/time
  const words = (wordsRaw ?? []) as Array<{ text: string; start: number; end: number }>;
  const safeCurrentIndex = typeof currentIndex === 'number' && currentIndex >= 0 ? currentIndex : 0; // ✅
  const durationSec = useMemo(() => (words.length ? Math.max(...words.map(w => w.end)) : 0), [words]);
  const currentSec  = useMemo(() => words[safeCurrentIndex]?.start ?? 0, [words, safeCurrentIndex]); // ✅
  const progress    = durationSec ? currentSec / durationSec : 0;

  // chunk words into lines
  type Line = { text: string; start: number; end: number; indices: number[] };
  const LINES = useMemo<Line[]>(() => {
    const arr: Line[] = [];
    if (!words.length) return arr;
    const maxChars = 44;
    let buf = '', start = 0, indices: number[] = [];
    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > maxChars && buf) {
        const lastIdx = indices[indices.length - 1]!;
        arr.push({ text: buf, start, end: words[lastIdx]?.end ?? start, indices });
        buf = w.text; start = w.start; indices = [i];
      } else {
        if (!buf) start = w.start;
        buf += piece; indices.push(i);
      }
    });
    if (buf && indices.length) {
      const lastIdx = indices[indices.length - 1]!;
      arr.push({ text: buf, start, end: words[lastIdx]?.end ?? start, indices });
    }
    return arr;
  }, [words]);

  const activeLine = useMemo(() => {
    const idx = LINES.findIndex(ln => ln.indices.includes(safeCurrentIndex)); // ✅
    return idx === -1 ? 0 : idx;
  }, [LINES, safeCurrentIndex]);

  const seekToWordSafe = (i: number) => i >= 0 && i < words.length && seekToWord(i);
  const seekToTime = (t: number) => {
    if (!words.length) return;
    const idx = words.findIndex(w => w.start >= t);
    const target = idx === -1 ? words.length - 1 : Math.max(0, idx);
    seekToWordSafe(target);
  };
  const nudgeSeconds = (d: number) => seekToTime(Math.max(0, Math.min(durationSec, currentSec + d)));

  const autoPlayArmedRef = useRef(false);
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
        onEnded?.();
      }
      return;
    }

    if (endFiredForRef.current !== lessonIdx) {
      endFiredForRef.current = lessonIdx;
      onEnded?.();
    }

    const hasImmediateNext = hasLessons && lessonIdx < lessons.length - 1;
    const maybeMoreComing  = (outline?.length || 0) > (lessons?.length || 0);
    if (!hasImmediateNext && !maybeMoreComing) return;

    setIsAdvancing(true);
    autoPlayArmedRef.current = true;

    if (hasImmediateNext) {
      setTimeout(() => setLessonIdx(i => Math.min(i + 1, lessons.length - 1)), 80);
    }
  }, [endedTick, error, words.length, useJoined, lessonIdx, hasLessons, lessons.length, outline?.length, onEnded]);

  useEffect(() => {
    if (!words?.length) return;
    if (autoPlayArmedRef.current) {
      (async () => {
        try { await resumeAudioContext(); await play(); } catch {}
        autoPlayArmedRef.current = false;
      })();
    }
  }, [words?.length, play, resumeAudioContext]);

  const handlePlayClick = useCallback(async () => {
    try {
      await resumeAudioContext();
      if (!isPlaying) {
        await onBeforePlay?.();
        if (!words.length) autoPlayArmedRef.current = true;
        await play();
      } else {
        pause();
      }
    } catch {}
  }, [isPlaying, onBeforePlay, play, pause, resumeAudioContext, words.length]);

  const handleNextClick = useCallback(async () => {
    if (typeof onNext === 'function') {
      try { await onNext(); } catch {}
    } else if (hasLessons) {
      setLessonIdx(i => Math.min(i + 1, lessons.length - 1));
    }
  }, [onNext, hasLessons, lessons.length]);

  const titleForUi = useJoined
    ? title
    : hasLessons
      ? lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${Math.max(lessons?.length || 0, outline?.length || 0) || 1}`
      : title;

  const notesText = useMemo(() => {
    const cur = hasLessons ? lessons[lessonIdx] : undefined;
    if (cur?.markdown?.trim()) return cur.markdown.trim();
    const eqs = (cur?.formulas || []).map(f => `• ${f.title || f.id || 'Formula'}: ${f.latex}`).join('\n');
    const tbls = (cur?.tables || []).map(t => `• ${t.title}: ${t.columns.join(' | ')} :: ${t.rows.map(r => r.join(' | ')).join(' / ')}`).join('\n');
    return [eqs, tbls].filter(Boolean).join('\n').trim() || '_No notes for this lesson yet._';
  }, [hasLessons, lessons, lessonIdx]);

  /* ----- Backdrop fade using RN Animated ----- */
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.linear }).start(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.linear }).start();
    });
  }, [currentBg]);
  /* ------------------------------------------ */

  const listRef = useRef<FlatList>(null);
  useEffect(() => {
    if (!showTranscript) return;
    listRef.current?.scrollToIndex?.({
      index: Math.max(0, Math.min(LINES.length - 1, activeLine)),
      viewPosition: 0.4,
      animated: true,
    });
  }, [activeLine, showTranscript, LINES.length]);

  return (
    <SafeAreaView style={tw`flex-1 bg-[#0b1220] ${isMax ? 'bg-black' : ''}`}>
      <View style={tw`flex-1 ${isMax ? '' : 'm-3 rounded-2xl border border-white overflow-hidden'} relative`}>

        {/* Backdrop */}
        {!disableInternalBackdrop && !backdropOverride && currentBg ? (
          <ImageBackground source={{ uri: currentBg }} style={tw`absolute inset-0`}>
            <Animated.View style={[tw`absolute inset-0 bg-black/25`, { opacity: fade }]} />
          </ImageBackground>
        ) : backdropOverride || null}

        {/* Top bar */}
        <View style={tw`absolute top-0 inset-x-0 min-h-10 px-3 py-1.5 bg-black/35 flex-row items-center z-50`}>
          <Text style={tw`text-[12px] text-white/85 flex-1`} numberOfLines={1}>
            {voiceName} • {titleForUi}
          </Text>

          <View style={tw`flex-row items-center gap-2`}>
            <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`px-3 py-1.5 rounded bg-white/10`}>
              <Text style={tw`text-white text-[12px]`}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTranscript(s => !s)} style={tw`px-3 py-1.5 rounded bg-white/10`}>
              <Text style={tw`text-white text-[12px]`}>{showTranscript ? 'Hide' : 'Transcript'}</Text>
            </TouchableOpacity>
            {onToggleThemePanel && (
              <TouchableOpacity onPress={onToggleThemePanel} style={tw`px-3 py-1.5 rounded bg-white/10`}>
                <Text style={tw`text-white text-[12px]`}>Theme</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={toggleMax} style={tw`px-3 py-1.5 rounded bg-white/10`}>
              <Text style={tw`text-white text-[12px]`}>{isMax ? 'Minimize' : 'Maximize'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNotes(s => !s)} style={tw`px-3 py-1.5 rounded bg-white/10`}>
              <Text style={tw`text-white text-[12px]`}>{showNotes ? 'Hide notes' : 'Notes'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title chip + pager */}
        <View style={tw`absolute left-3 right-3 z-40 items-center`} pointerEvents="none">
          <View style={tw`mt-12 px-3 py-1 rounded bg-black/35 border border-white`}>
            <Text style={tw`text-white/90 text-xs`} numberOfLines={1}>{titleForUi}</Text>
          </View>

          {hasLessons && !useJoined && (
            <View style={tw`mt-2 self-end flex-row gap-2 pointer-events-auto`}>
              <TouchableOpacity
                onPress={() => setLessonIdx(i => Math.max(0, i - 1))}
                disabled={lessonIdx <= 0}
                style={tw`px-2 py-1 rounded bg-white/10 ${lessonIdx <= 0 ? 'opacity-50' : ''}`}
              >
                <Text style={tw`text-white text-[11px]`}>Prev</Text>
              </TouchableOpacity>
              <View style={tw`px-2 py-1 rounded bg-white/10`}>
                <Text style={tw`text-white text-[11px]`}>{lessonIdx + 1}/{Math.max(lessons?.length || 0, outline?.length || 0) || 1}</Text>
              </View>
              <TouchableOpacity
                onPress={handleNextClick}
                disabled={!!isBuildingNext}
                style={tw`px-2 py-1 rounded bg-white/10 ${isBuildingNext ? 'opacity-70' : ''}`}
              >
                <Text style={tw`text-white text-[11px]`}>{isBuildingNext ? 'Preparing…' : 'Next'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Center narration */}
        <View style={tw`absolute inset-0 items-center justify-center px-2 md:px-6`}>
          <View style={tw`${isMax ? 'w-[98%] max-w-[1400px]' : 'w-[96%] md:w-[92%] max-w-[1200px]'} pointer-events-none`}>
            <View style={tw`p-4 md:p-8`}>
              <Text style={tw`text-white font-semibold leading-[1.35] text-center drop-shadow-xl ${isMax ? 'text-[28px]' : 'text-[22px]'}`}>
                {(() => {
                  const cur = LINES[activeLine];
                  if (!cur) return null;
                  return cur.indices.map((wi, j) => {
                    const w = words[wi];
                    if (!w) return null; // ✅ guard
                    const isPastOrCurrent = wi <= safeCurrentIndex;
                    const isActive = wi === safeCurrentIndex;
                    return (
                      <Text
                        key={wi}
                        style={tw`${isPastOrCurrent ? 'opacity-100' : 'opacity-55'} ${isActive ? 'bg-white text-black rounded px-1' : ''}`}
                      >
                        {(j ? ' ' : '') + w.text}
                      </Text>
                    );
                  });
                })()}
              </Text>
            </View>
          </View>
        </View>

        {/* Center play overlay / advance spinner */}
        {!isPlaying && !isAdvancing && !loading && (
          <View style={tw`absolute inset-0 items-center justify-center z-50`}>
            <TouchableOpacity onPress={handlePlayClick} style={tw`rounded-full bg-black/60 w-24 h-24 items-center justify-center`}>
              <Text style={tw`text-white text-lg font-bold`}>▶</Text>
            </TouchableOpacity>
          </View>
        )}
        {isAdvancing && (
          <View style={tw`absolute inset-0 z-50 items-center justify-center`}>
            <View style={tw`rounded-full bg-black/60 p-5`}>
              <ActivityIndicator color="#fff" />
            </View>
            <Text style={tw`text-white/90 text-sm mt-3`}>Loading next lesson…</Text>
          </View>
        )}

        {/* Bottom controls */}
        <View style={tw`absolute bottom-0 inset-x-0 bg-black/45 border border-white z-40 px-3 sm:px-4 py-2`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity onPress={() => nudgeSeconds(-5)} style={tw`h-10 w-10 rounded-xl bg-white/10 items-center justify-center`}>
                <Text style={tw`text-white text-xs`}>⟲5</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePlayClick} disabled={loading} style={tw`h-10 px-4 rounded-xl bg-white mx-1 items-center justify-center`}>
                <Text style={tw`text-black font-semibold`}>{isPlaying ? 'Pause' : 'Play'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => nudgeSeconds(5)} style={tw`h-10 w-10 rounded-xl bg-white/10 items-center justify-center`}>
                <Text style={tw`text-white text-xs`}>5⟳</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`ml-auto`}>
              <Text style={tw`text-white/85 text-xs`}>
                {formatTime(currentSec)} / {durationSec ? formatTime(durationSec) : '0:00'}
              </Text>
            </View>
          </View>

          <View style={tw`mt-2`}>
            <InlineSlider
              value={progress}
              minimumValue={0}
              maximumValue={1}
              onSlidingComplete={(ratio: number) => seekToTime(ratio * (durationSec || 0))} // ✅ typed
            />
          </View>

          {!!error && !loading && (
            <View style={tw`mt-2 px-3 py-1.5 rounded bg-red-900/40`}>
              <Text style={tw`text-red-200 text-xs`}>{error}</Text>
            </View>
          )}
        </View>

        {/* Transcript Drawer */}
        <Modal visible={showTranscript} animationType="slide" transparent onRequestClose={() => setShowTranscript(false)}>
          <View style={tw`flex-1 bg-black/45 justify-end`}>
            <View style={tw`max-h-[75%] bg-[#0f1821] rounded-t-2xl border border-white`}>
              <View style={tw`px-3 py-2 flex-row items-center border-b border-white/10`}>
                <Text style={tw`text-white text-base font-semibold flex-1`} numberOfLines={1}>{titleForUi}</Text>
                <TouchableOpacity onPress={() => setShowTranscript(false)} style={tw`px-3 py-1.5 rounded bg-white/10`}><Text style={tw`text-white text-xs`}>Close</Text></TouchableOpacity>
              </View>
              <FlatList
                ref={listRef}
                data={LINES}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => seekToWord(item.indices[0])}
                    style={tw`px-3 py-2 border-b border-white/10 ${index === activeLine ? 'bg-white/10' : ''}`}
                  >
                    <Text style={tw`text-white/90 text-sm`}>{item.text}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Notes Drawer */}
        <Modal visible={showNotes} animationType="slide" transparent onRequestClose={() => setShowNotes(false)}>
          <View style={tw`flex-1 bg-black/45 justify-end`}>
            <View style={tw`max-h-[75%] bg-[#0f1821] rounded-t-2xl border border-white`}>
              <View style={tw`px-3 py-2 flex-row items-center border-b border-white/10`}>
                <Text style={tw`text-white text-base font-semibold flex-1`} numberOfLines={1}>{titleForUi} — Notes</Text>
                <TouchableOpacity onPress={() => setShowNotes(false)} style={tw`px-3 py-1.5 rounded bg-white/10`}><Text style={tw`text-white text-xs`}>Close</Text></TouchableOpacity>
              </View>
              <View style={tw`p-3`}>
                <Text style={tw`text-white/90 text-sm leading-5`}>{notesText}</Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
