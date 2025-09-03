import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { useShopContext } from '@mytutorapp/shared/context';

// 👇 subject-aware image helpers you provided
import {
  pickImageForCourse,
  SUBJECT_IMAGE_MAP,
  SUBJECT_ALIASES,
  FALLBACK_COURSE_IMAGE,
} from '@/utils/subjectImages';

type LessonLite = { id: string; title?: string; ssml: string };
type OutlineSection = { id: string; title: string; keyPoints?: string[] };

type ClassroomPlayerProps = {
  ssml?: string;
  lessons?: LessonLite[];
  title?: string;
  voiceName?: string;
  maximized?: boolean;
  onToggleMaximize?: () => void;

  // NEW: to power the subject-aware backdrop
  course?: any | null;
  outline?: OutlineSection[];
  backendUrlOverride?: string;

  // NEW: optionally pause the slideshow when audio is paused
  playing?: boolean;
};

/* ─────────────────────────────────────────────────────────
   Subject-aware crossfading backdrop (embedded)
   ───────────────────────────────────────────────────────── */
function collectSubjectKeysFromText(txt: string) {
  const hay = txt.toLowerCase();
  const hits: string[] = [];

  for (const key of Object.keys(SUBJECT_IMAGE_MAP)) {
    if (hay.includes(key)) hits.push(key);
  }
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((a) => hay.includes(a))) hits.push(canonical);
  }
  return Array.from(new Set(hits));
}

function ClassroomBackdrop({
  course,
  outline,
  backendUrl,
  intervalSec = 14,
  playing = true,
}: {
  course?: any | null;
  outline?: OutlineSection[];
  backendUrl?: string;
  intervalSec?: number;
  playing?: boolean;
}) {
  // 1) Base (safe) image using your helper
  const base = useMemo(() => {
    try {
      return course ? pickImageForCourse(course, backendUrl) : FALLBACK_COURSE_IMAGE;
    } catch {
      return FALLBACK_COURSE_IMAGE;
    }
  }, [course, backendUrl]);

  // 2) Smart list: add a few more images gleaned from title/outline/desc/subject
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
    keys.forEach((k) => pool.add(SUBJECT_IMAGE_MAP[k]));

    // cap to 4 for perf; base always first
    return Array.from(pool).slice(0, 4);
  }, [base, course, outline]);

  // 3) Crossfade current image
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!playing || images.length <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % images.length), intervalSec * 1000);
    return () => window.clearInterval(t);
  }, [images.length, intervalSec, playing]);

  // preload
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  const current = images[idx] || base;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url('${current}')` }}
        />
      </AnimatePresence>
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */
function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────────────────
   Classroom Player (Backdrop + Lower-Third + Player Controls + Transcript Drawer)
   ───────────────────────────────────────────────────────── */
const ClassroomPlayer: React.FC<ClassroomPlayerProps> = ({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized = false,
  onToggleMaximize,

  course,
  outline = [],
  backendUrlOverride,
  playing = true,
}) => {
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
    audioUrl,
  } = useWordSync();

  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  const [lessonIdx, setLessonIdx] = useState(0);

  const words = wordsRaw ?? [];
  const [needsGesture, setNeedsGesture] = useState(false);
  const [showAudioDebug, setShowAudioDebug] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  // Synthesize: prefer per-lesson SSML; fallback to single SSML
  useEffect(() => {
    if (hasLessons) {
      const cur = lessons[lessonIdx]?.ssml?.trim() || '';
      if (cur.length >= 30) speak(effectiveBackend, { ssml: cur, voiceName });
      return;
    }
    const clean = (ssml || '').trim();
    if (clean.length >= 30) speak(effectiveBackend, { ssml: clean, voiceName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLessons, lessonIdx, lessons, ssml, voiceName, effectiveBackend]);

  // Auto-play after timings arrive (handle autoplay policies)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!words?.length) return;
    if (words.length !== prevCountRef.current) {
      prevCountRef.current = words.length;
      (async () => {
        try {
          await resumeAudioContext();
          await play();
          setNeedsGesture(false);
        } catch {
          setNeedsGesture(true);
        }
      })();
    }
  }, [words, play, resumeAudioContext]);

  // Auto-advance to next lesson when current audio is finished
  useEffect(() => {
    if (!hasLessons || !words.length) return;
    const atEnd = !isPlaying && currentIndex >= words.length - 1;
    if (atEnd && lessonIdx < lessons.length - 1) {
      const id = setTimeout(() => setLessonIdx((i) => i + 1), 400);
      return () => clearTimeout(id);
    }
  }, [hasLessons, isPlaying, currentIndex, words.length, lessonIdx, lessons.length]);

  // Group words into readable lines (larger lines on mobile)
  const LINES = useMemo(() => {
    type Line = { text: string; start: number; end: number; indices: number[] };
    const arr: Line[] = [];
    let buf = '';
    let start = 0;
    let indices: number[] = [];
    const maxChars = isMobile ? 32 : 48;

    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > maxChars && buf) {
        const lastIdx = indices[indices.length - 1];
        arr.push({ text: buf, start, end: words[lastIdx]?.end ?? start, indices });
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
      const lastIdx = indices[indices.length - 1];
      arr.push({ text: buf, start, end: words[lastIdx]?.end ?? start, indices });
    }
    return arr;
  }, [words, isMobile]);

  const activeLine = useMemo(() => {
    const idx = LINES.findIndex((ln) => ln.indices.includes(currentIndex));
    return idx === -1 ? 0 : idx;
  }, [LINES, currentIndex]);

  // Smooth-scroll the active line into view (drawer transcript)
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (!showTranscript) return;
    const el = lineRefs.current[activeLine];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLine, showTranscript]);

  // Player times (derived from words timings)
  const durationSec = useMemo(() => (words.length ? Math.max(...words.map((w) => w.end)) : 0), [words]);
  const currentSec = useMemo(() => (words[currentIndex]?.start ?? 0), [words, currentIndex]);
  const progress = durationSec ? currentSec / durationSec : 0;

  const titleForUi = hasLessons
    ? lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${lessons.length}`
    : title;

  // Use audio playing state to control slideshow (if caller doesn't pass "playing")
  const slideshowPlaying = typeof playing === 'boolean' ? playing : isPlaying;

  // Seek helpers: time -> word index
  const seekToTime = (t: number) => {
    if (!words.length) return;
    const idx = Math.max(
      0,
      words.findIndex((w) => w.start >= t)
    );
    const target = idx === -1 ? words.length - 1 : idx;
    if (target >= 0) seekToWord(target);
  };

  const nudgeSeconds = (delta: number) => {
    const target = Math.max(0, Math.min(durationSec, currentSec + delta));
    seekToTime(target);
  };

  // Keyboard controls
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        try {
          await resumeAudioContext();
          if (isPlaying) pause();
          else await play();
          setNeedsGesture(false);
        } catch {
          setNeedsGesture(true);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nudgeSeconds(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        nudgeSeconds(-5);
      } else if (e.key.toLowerCase() === 't') {
        setShowTranscript((s) => !s);
      } else if (e.key.toLowerCase() === 'f') {
        onToggleMaximize?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, pause, play, resumeAudioContext, nudgeSeconds, onToggleMaximize]);

  // Scrubber interactions
  const barRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const setFromPointer = (clientX: number) => {
    const el = barRef.current;
    if (!el || !durationSec) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekToTime(ratio * durationSec);
  };

  return (
    <div className="w-full">
      {/* Frame */}
      <div
        className={`${
          maximized ? 'aspect-[16/9]' : 'md:aspect-video aspect-[3/4]'
        } rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 bg-[#0b1220] relative`}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 inset-x-0 h-10 sm:h-10 flex items-center gap-2 px-2 sm:px-3 bg-black/30 backdrop-blur-sm z-30"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="hidden sm:flex gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="mx-auto text-[12px] sm:text-sm text-white/80 truncate">
            {voiceName} • Live Class
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await resumeAudioContext();
                  if (isPlaying) pause();
                  else await play();
                  setNeedsGesture(false);
                } catch {
                  setNeedsGesture(true);
                }
              }}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              disabled={loading}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => setShowTranscript((s) => !s)}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Toggle transcript (T)"
            >
              {showTranscript ? 'Hide transcript' : 'Transcript'}
            </button>

            <button
              onClick={onToggleMaximize}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title={maximized ? 'Exit full view (F)' : 'Maximize (F)'}
            >
              {maximized ? 'Minimize' : 'Maximize'}
            </button>

            {needsGesture && (
              <button
                onClick={async () => {
                  try {
                    await resumeAudioContext();
                    await play();
                    setNeedsGesture(false);
                  } catch {
                    /* keep visible */
                  }
                }}
                className="hidden xs:inline-flex text-[12px] sm:text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                title="Click to enable audio"
              >
                Enable audio
              </button>
            )}

            <button
              onClick={() => setShowAudioDebug((s) => !s)}
              className="hidden sm:inline-flex text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Dev: toggle raw audio element"
            >
              Audio debug
            </button>
          </div>
        </div>

        {/* ───── CONTENT LAYER: Backdrop + lower-third live line (FULL-WIDTH CENTER STAGE) ───── */}
        <div className="absolute inset-0 pt-10 sm:pt-10 p-2 sm:p-4">
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/20">
            {/* Backdrop */}
            <div className="absolute inset-0">
              <ClassroomBackdrop
                course={course || null}
                outline={outline}
                backendUrl={effectiveBackend}
                playing={slideshowPlaying}
                intervalSec={14}
              />
            </div>

            {/* Lower-third "stage" with the active line */}
            <div className="absolute bottom-14 left-2 right-2 md:left-4 md:right-4 z-20">
              <div className="pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`stage-${hasLessons ? `l${lessonIdx}` : 'single'}-${activeLine}`}
                    initial={{ y: 20, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="rounded-xl bg-black/45 ring-1 ring-white/15 backdrop-blur-md p-3 sm:p-4"
                  >
                    <div className="text-[11px] sm:text-xs text-white/70 mb-1">{titleForUi}</div>
                    <div className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-snug">
                      {LINES[activeLine]?.text || ''}
                    </div>
                    <motion.div
                      key={`${activeLine}-pulse`}
                      initial={{ opacity: 0.25, scaleX: 0.95 }}
                      animate={{ opacity: 0.6, scaleX: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-[3px] sm:h-[2px] mt-2 bg-white/50 origin-left rounded-full"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Hints */}
            {!words.length && !error && (
              <div className="absolute bottom-16 left-2 text-[12px] sm:text-xs text-white/75 z-20">
                Generating lesson narration…
              </div>
            )}
            {error && (
              <div className="absolute bottom-16 left-2 text-[12px] sm:text-xs text-red-300 z-20">
                {error}
              </div>
            )}

            {/* Mini lesson controls (keep) */}
            {hasLessons && (
              <div className="absolute top-3 right-3 z-30 flex gap-2 text-[11px]">
                <button
                  onClick={() => setLessonIdx((i) => Math.max(0, i - 1))}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                >
                  Prev
                </button>
                <div className="px-2 py-1 rounded bg-white/10 text-white/90">
                  {lessonIdx + 1}/{lessons.length}
                </div>
                <button
                  onClick={() => setLessonIdx((i) => Math.min(lessons.length - 1, i + 1))}

                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ───── Bottom “video player” controls ───── */}
        <div
          className="absolute bottom-0 inset-x-0 h-14 sm:h-14 px-3 sm:px-4 flex items-center gap-3 bg-black/35 backdrop-blur-md z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Play/Pause & nudge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => nudgeSeconds(-5)}
              className="text-[12px] sm:text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Back 5s (←)"
            >
              −5s
            </button>

            <button
              onClick={async () => {
                try {
                  await resumeAudioContext();
                  if (isPlaying) pause();
                  else await play();
                  setNeedsGesture(false);
                } catch {
                  setNeedsGesture(true);
                }
              }}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white min-w-[64px]"
              disabled={loading}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={() => nudgeSeconds(5)}
              className="text-[12px] sm:text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Forward 5s (→)"
            >
              +5s
            </button>
          </div>

          {/* Time + Scrubber */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="text-[11px] sm:text-xs text-white/80 tabular-nums">{formatTime(currentSec)}</div>
            <div
              ref={barRef}
              className="relative h-2 w-full rounded-full bg-white/15 cursor-pointer select-none"
              onMouseDown={(e) => {
                setScrubbing(true);
                setFromPointer(e.clientX);
              }}
              onMouseMove={(e) => {
                if (scrubbing) setFromPointer(e.clientX);
              }}
              onMouseUp={() => setScrubbing(false)}
              onMouseLeave={() => setScrubbing(false)}
              onTouchStart={(e) => {
                setScrubbing(true);
                setFromPointer(e.touches[0].clientX);
              }}
              onTouchMove={(e) => scrubbing && setFromPointer(e.touches[0].clientX)}
              onTouchEnd={() => setScrubbing(false)}
            >
              <motion.div
                className="absolute left-0 top-0 bottom-0 rounded-full bg-white/80"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
              />
            </div>
            <div className="text-[11px] sm:text-xs text-white/80 tabular-nums">
              {durationSec ? formatTime(durationSec) : '0:00'}
            </div>
          </div>

          {/* Transcript toggle + Maximize */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTranscript((s) => !s)}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Toggle transcript (T)"
            >
              {showTranscript ? 'Hide' : 'Transcript'}
            </button>

            <button
              onClick={onToggleMaximize}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title={maximized ? 'Exit full view (F)' : 'Maximize (F)'}
            >
              {maximized ? 'Minimize' : 'Maximize'}
            </button>
          </div>
        </div>

        {/* ───── Slide-in Transcript Drawer (scrollable, seekable) ───── */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              key="transcript"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute top-10 bottom-14 right-0 w-full sm:w-[56%] lg:w-[45%] xl:w-[40%] bg-black/70 backdrop-blur-xl ring-1 ring-white/10 z-40 rounded-l-2xl overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-white/95 font-semibold text-base sm:text-lg truncate">{titleForUi}</div>
                  <div className="mt-0.5 text-white/60 text-[12px] sm:text-xs">Transcript (click a line to seek)</div>
                </div>

                <div
                  className="flex-1 overflow-auto px-2 sm:px-3 py-2 space-y-2 sm:space-y-2.5"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {LINES.map((ln, i) => {
                    const active = i === activeLine;
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        className={`text-base sm:text-lg rounded-md px-3 sm:px-3.5 py-2 sm:py-2.5 leading-7 cursor-pointer transition ${
                          active
                            ? 'bg-white/15 ring-1 ring-white/25 text-white'
                            : 'text-white/90 hover:bg-white/10'
                        }`}
                        onClick={() => ln.indices.length && seekToWord(ln.indices[0])}
                        title="Seek to this line"
                      >
                        {ln.indices.map((wi, j) => {
                          const w = words[wi];
                          const isActiveWord = wi === currentIndex;
                          return (
                            <motion.span
                              key={wi}
                              layout
                              initial={false}
                              animate={isActiveWord ? { scale: 1.08 } : { scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.3 }}
                              className={isActiveWord ? 'bg-white text-black px-1.5 rounded' : ''}
                            >
                              {(j ? ' ' : '') + w.text}
                            </motion.span>
                          );
                        })}
                      </div>
                    );
                  })}
                  {loading && <div className="text-[12px] sm:text-xs text-white/70 px-3">Generating TTS…</div>}
                  {error && <div className="text-[12px] sm:text-xs text-red-300 px-3">{error}</div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dev-only raw audio */}
      {showAudioDebug && audioUrl && (
        <div className="mt-2 text-white/70 text-xs">
          <div>Debug audio element (direct MP3):</div>
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default ClassroomPlayer;
