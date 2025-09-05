import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { useShopContext } from '@mytutorapp/shared/context';

// Subject-aware image helpers
import {
  pickImageForCourse,
  SUBJECT_IMAGE_MAP,
  SUBJECT_ALIASES,
  FALLBACK_COURSE_IMAGE,
} from '@/utils/subjectImages';

// OPTIONAL (nice rendering): add these packages to render Markdown + LaTeX
// npm i react-markdown remark-gfm remark-math rehype-katex
// And import the KaTeX CSS once in your app root: import 'katex/dist/katex.min.css';
let ReactMarkdown: any, remarkGfm: any, remarkMath: any, rehypeKatex: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ReactMarkdown = require('react-markdown').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  remarkGfm = require('remark-gfm');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  remarkMath = require('remark-math');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  rehypeKatex = require('rehype-katex');
} catch { /* optional deps not installed; fallback to plaintext notes */ }

type LessonLite = {
  id: string;
  title?: string;
  ssml: string;
  markdown?: string; // GFM + $$...$$ math
  formulas?: { id: string; latex: string; speakAs?: string }[];
  tables?: { title: string; columns: string[]; rows: (string | number)[][] }[];
};
type OutlineSection = { id: string; title: string; keyPoints?: string[] };

type ClassroomPlayerProps = {
  ssml?: string;
  lessons?: LessonLite[];
  title?: string;
  voiceName?: string;
  maximized?: boolean;              // controlled optional
  onToggleMaximize?: () => void;    // controlled optional
  onEnded?: () => void;

  course?: any | null;
  outline?: OutlineSection[];
  backendUrlOverride?: string;
  playing?: boolean;

  onBeforePlay?: () => Promise<void> | void;
};

/* ─────────────────────────────────────────────────────────
   Subject-aware backdrop (single faint global overlay)
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
    keys.forEach((k) => pool.add(SUBJECT_IMAGE_MAP[k]));
    return Array.from(pool).slice(0, 4);
  }, [base, course, outline]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!playing || images.length <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % images.length), intervalSec * 1000);
    return () => window.clearInterval(t);
  }, [images.length, intervalSec, playing]);

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  const current = images[idx] || base;

  return (
    <div className="absolute inset-0 overflow-hidden">
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
      {/* Single faint overlay across the whole screen */}
      <div className="absolute inset-0 bg-black/25" />
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

function useMeasuredHeight<T extends HTMLElement>(ref: React.RefObject<T>, fallback = 56) {
  const [h, setH] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    setH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [ref]);
  return h;
}

/* ─────────────────────────────────────────────────────────
   Classroom Player (mobile-first bottom controls + status)
   ───────────────────────────────────────────────────────── */
const ClassroomPlayer: React.FC<ClassroomPlayerProps> = ({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized,                 // may be undefined (uncontrolled fallback)
  onToggleMaximize,

  course,
  outline = [],
  backendUrlOverride,
  playing = true,
  onEnded,
  onBeforePlay,
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAudioDebug, setShowAudioDebug] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Manual on mobile (no auto behavior)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const { backendUrl } = useShopContext();
  const effectiveBackend = backendUrlOverride || backendUrl;

  const totalLessonsForUi = useMemo(
    () => Math.max(lessons?.length || 0, outline?.length || 0) || 1,
    [lessons?.length, outline?.length]
  );

  // --- Fullscreen: controlled & uncontrolled
  const [internalMax, setInternalMax] = useState(false);
  const isControlled = typeof maximized === 'boolean';
  const isMax = isControlled ? (maximized as boolean) : internalMax;
  const toggleMax = () => {
    if (onToggleMaximize) onToggleMaximize();
    else setInternalMax((v) => !v);
  };

  // Measure top bar & bottom controls so drawers/status never overlap
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const topH = useMeasuredHeight(topBarRef, 40);
  const bottomH = useMeasuredHeight(bottomBarRef, 64);

  // Prevent duplicate audio on maximize/remount
  const lastSpeakKey = useRef<string | null>(null);
  const makeSpeakKey = () => {
    if (hasLessons) {
      const l = lessons[lessonIdx];
      return `lesson:${l?.id || lessonIdx}|voice:${voiceName}|len:${(l?.ssml || '').length}`;
    }
    return `single|voice:${voiceName}|len:${(ssml || '').length}`;
  };

  const advancingRef = useRef(false);                 // prevents multi-advance while TTS loads
  const endFiredForRef = useRef<number | null>(null); // ensure onEnded once per lesson
  const [isAdvancing, setIsAdvancing] = useState(false); // drives the spinner visibility

  /* Speak current lesson / single SSML */
  useEffect(() => {
    const key = makeSpeakKey();
    if (!key || key === lastSpeakKey.current) return;

    const run = async () => {
      try { await pause(); } catch {}
      const cur = hasLessons ? (lessons[lessonIdx]?.ssml || '').trim() : (ssml || '').trim();
      if (cur.length >= 30) {
        await speak(effectiveBackend, { ssml: cur, voiceName });
        lastSpeakKey.current = key;

        if (advancingRef.current) {
          advancingRef.current = false;
          setIsAdvancing(false);
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLessons, lessonIdx, lessons, ssml, voiceName, effectiveBackend]);

  /* Track lessons length changes to handle "next arrives later" */
  const prevLenRef = useRef(lessons.length);
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

  /* Auto-advance guards + spinner */
  useEffect(() => {
    if (!words.length) return;
    const atEnd = !isPlaying && currentIndex >= words.length - 1;
    if (!atEnd) return;

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
        setLessonIdx((i) => Math.min(i + 1, lessons.length - 1));
      }, 50);
      return () => clearTimeout(id);
    }
  }, [
    isPlaying,
    currentIndex,
    words.length,
    hasLessons,
    lessonIdx,
    lessons.length,
    outline?.length,
    onEnded,
  ]);

  useEffect(() => {
    if (error && isAdvancing) {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [error, isAdvancing]);

  // Center stage — line chunking (mobile-friendly makes slightly longer lines)
  const LINES = useMemo(() => {
    type Line = { text: string; start: number; end: number; indices: number[] };
    const arr: Line[] = [];
    let buf = '';
    let start = 0;
    let indices: number[] = [];
    const maxChars = isMobile ? 40 : 64; // mobile shows a bigger chunk like a short paragraph

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

  // Transcript autoscroll
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (!showTranscript) return;
    const el = lineRefs.current[activeLine];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLine, showTranscript]);

  // Times
  const durationSec = useMemo(() => (words.length ? Math.max(...words.map((w) => w.end)) : 0), [words]);
  const currentSec = useMemo(() => (words[currentIndex]?.start ?? 0), [words, currentIndex]);
  const progress = durationSec ? currentSec / durationSec : 0;

  const titleForUi = hasLessons
    ? lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${totalLessonsForUi}`
    : title;

  const currentLesson = hasLessons ? lessons[lessonIdx] : undefined;
  const notesMarkdown = useMemo(() => {
    const md = (currentLesson?.markdown || '').trim();
    if (md) return md;
    const eqs = (currentLesson?.formulas || []).map(f =>
      `**${f.id || ''}**\n\n$$${f.latex || ''}$$`
    ).join('\n\n');
    const tbls = (currentLesson?.tables || []).map(t => {
      if (!t?.columns?.length || !t?.rows?.length) return '';
      const head = `| ${t.columns.join(' | ')} |`;
      const sep  = `| ${t.columns.map(()=>'---').join(' | ')} |`;
      const rows = t.rows.map(r => `| ${r.map(v => String(v)).join(' | ')} |`).join('\n');
      return `\n\n**${t.title || 'Table'}**\n\n${head}\n${sep}\n${rows}`;
    }).join('\n\n');
    return [eqs, tbls].filter(Boolean).join('\n\n').trim();
  }, [currentLesson]);

  const slideshowPlaying = typeof playing === 'boolean' ? playing : isPlaying;

  const seekToWordSafe = (i: number) => i >= 0 && i < words.length && seekToWord(i);
  const seekToTime = (t: number) => {
    if (!words.length) return;
    const idx = Math.max(0, words.findIndex((w) => w.start >= t));
    seekToWordSafe(idx === -1 ? words.length - 1 : idx);
  };
  const nudgeSeconds = (d: number) => seekToTime(Math.max(0, Math.min(durationSec, currentSec + d)));

  // Autoplay arm
  const autoPlayArmedRef = useRef(false);
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!words?.length) return;
    if (words.length !== prevCountRef.current) {
      prevCountRef.current = words.length;
      if (autoPlayArmedRef.current) {
        (async () => {
          try { await resumeAudioContext(); await play(); } catch {}
          autoPlayArmedRef.current = false;
        })();
      }
    }
  }, [words?.length, play, resumeAudioContext]);

  // Keyboard: Space, arrows, T, F, D, N
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;

      if (e.code === 'Space') {
        e.preventDefault();
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
      } else if (e.code === 'ArrowRight') {
        e.preventDefault(); nudgeSeconds(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault(); nudgeSeconds(-5);
      } else if (e.key.toLowerCase() === 't') {
        setShowTranscript((s) => !s);
      } else if (e.key.toLowerCase() === 'f') {
        toggleMax();
      } else if (e.key.toLowerCase() === 'd') {
        setShowAudioDebug((s) => !s);
      } else if (e.key.toLowerCase() === 'n') {
        setShowNotes((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, pause, play, resumeAudioContext, nudgeSeconds, onBeforePlay, words.length]);

  // Scrubber
  const barRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const setFromPointer = (clientX: number) => {
    const el = barRef.current;
    if (!el || !durationSec) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekToTime(ratio * durationSec);
  };

  // Font sizes (smaller on mobile)
  const stageFontSize = useMemo(() => {
    if (isMax) {
      return isMobile
        ? 'clamp(12px, 4vw, 20px)'
        : 'clamp(20px, min(6.5vw, 6.5svh), 56px)';
    }
    return isMobile
      ? 'clamp(12px, 3.6vw, 18px)'
      : 'clamp(18px, 2.4vw, 32px)';
  }, [isMobile, isMax]);

  // Layout
  const wrapperClass = isMax ? 'fixed inset-0 z-[9999] bg-black' : 'relative w-full';
  const frameClass = isMax
    ? 'absolute inset-0 rounded-none overflow-hidden shadow-2xl ring-1 ring-white/10 bg-[#0b1220]'
    : 'relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 bg-[#0b1220]';
  const aspectClass = isMax ? 'w-full h-full' : 'md:aspect-video aspect-[3/4]';

  const core = (
    <div className={wrapperClass}>
      <div className={`${aspectClass} ${frameClass}`}>
        {/* Top bar */}
        <div
          ref={topBarRef}
          className="absolute top-0 inset-x-0 min-h-10 flex items-center gap-2 px-3 bg-black/35 backdrop-blur-sm z-30"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="mx-0 text-[12px] sm:text-sm text-white/85 truncate">
            {voiceName} • {titleForUi}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={async () => {
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
              {showTranscript ? 'Hide' : 'Transcript'}
            </button>

            <button
              onClick={toggleMax}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title={isMax ? 'Exit full view (F)' : 'Maximize (F)'}
            >
              {isMax ? 'Minimize' : 'Maximize'}
            </button>

            <button
              onClick={() => setShowNotes((s) => !s)}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title="Toggle lesson notes (N)"
            >
              {showNotes ? 'Hide notes' : 'Notes'}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div
          className="absolute inset-0"
          style={{ paddingTop: topH }}
          onPointerDown={async () => {
            try { await resumeAudioContext(); } catch {}
          }}
        >
          {/* Backdrop + faint global overlay */}
          <ClassroomBackdrop
            course={course || null}
            outline={outline}
            backendUrl={effectiveBackend}
            playing={typeof playing === 'boolean' ? playing : isPlaying}
            intervalSec={14}
          />

          {/* Centered narration */}
          <div className="absolute inset-0 z-20 flex items-center justify-center px-2 md:px-6">
            <div className={`${isMax ? 'w-[98%] max-w-[1400px]' : 'w-[96%] md:w-[92%] max-w-[1200px]'} pointer-events-none`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`stage-${hasLessons ? `l${lessonIdx}` : 'single'}-${activeLine}`}
                  initial={{ y: 12, opacity: 0.98 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0.98 }}
                  transition={{ type: 'tween', ease: 'easeOut', duration: 0.22 }}
                  className="relative p-4 md:p-8"
                >
                  <div
                    className="leading-[1.35] font-semibold whitespace-pre-wrap break-words text-white select-none
                               drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                    style={{ fontSize: stageFontSize }}
                  >
                    {(() => {
                      const cur = LINES[activeLine];
                      if (!cur) return null;
                      return cur.indices.map((wi, j) => {
                        const w = words[wi];
                        const isPastOrCurrent = wi <= currentIndex;
                        const isActive = wi === currentIndex;
                        return (
                          <motion.span
                            key={wi}
                            layout="position"
                            initial={false}
                            animate={{ opacity: isPastOrCurrent ? 1 : 0.55 }}
                            transition={{ type: 'tween', duration: 0.1 }}
                            className={isActive ? 'bg-white text-black rounded px-[0.15em]' : ''}
                          >
                            {(j ? ' ' : '') + w.text}
                          </motion.span>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Center Play overlay */}
          {!isPlaying && !isAdvancing && (
            <div className="absolute inset-0 z-30 flex items-center justify-center">
              <button
                onClick={async () => {
                  try {
                    await onBeforePlay?.();
                    await resumeAudioContext();
                    if (!words.length) autoPlayArmedRef.current = true;
                    await play();
                  } catch {}
                }}
                className="pointer-events-auto rounded-full bg-black/60 hover:bg-black/70 text-white shadow-2xl w-20 h-20 sm:w-24 sm:h-24 grid place-items-center focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Play"
                title="Play (Space)"
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}

          {/* Next-lesson loading spinner overlay (auto) */}
          <AnimatePresence>
            {isAdvancing && (
              <motion.div
                key="next-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
              >
                <div className="rounded-full bg-black/60 p-5 shadow-2xl">
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
                <div className="mt-3 text-white/90 text-sm">Loading next lesson…</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status pill (mobile-friendly) */}
          <AnimatePresence>
            {!words.length && !error && !isAdvancing && (
              <motion.div
                key="status-pill"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 flex justify-center z-30"
                style={{ bottom: bottomH + 10 }}
                aria-live="polite"
                role="status"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 text-white/90 text-xs sm:text-sm backdrop-blur-md ring-1 ring-white/10 shadow-lg">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Generating lesson narration…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mini lesson controls */}
          {hasLessons && (
            <div className="absolute z-30 flex gap-2 text-[11px] right-3"
                 style={{ top: (topH as number) + 4 }}>
              <button
                onClick={() => setLessonIdx((i) => Math.max(0, i - 1))}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              >
                Prev
              </button>
              <div className="px-2 py-1 rounded bg-white/10 text-white/90">
                {lessonIdx + 1}/{totalLessonsForUi}
              </div>
              <button
                onClick={() => setLessonIdx((i) => Math.min(i + 1, Math.max(lessons.length - 1, 0)))}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              >
                Next
              </button>
            </div>
          )}

          {/* Hints / errors (converted to non-overlapping badges) */}
          {hasLessons && outline?.length > lessons.length && (
            <div
              className="absolute left-2 z-30 text-[12px] sm:text-xs text-white/85 bg-black/45 rounded px-2 py-1 ring-1 ring-white/10"
              style={{ bottom: bottomH + 10 }}
            >
              Loading the rest of the lessons…
            </div>
          )}
          {error && (
            <div
              className="absolute left-2 z-30 text-[12px] sm:text-xs text-red-200/95 bg-red-950/50 rounded px-2 py-1 ring-1 ring-red-300/30"
              style={{ bottom: bottomH + 10 }}
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        {/* Bottom controls — MOBILE-FIRST, wraps gracefully, larger tap targets */}
        <div
          ref={bottomBarRef}
          className="absolute bottom-0 inset-x-0 z-30 bg-black/45 backdrop-blur-md ring-1 ring-white/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="px-3 sm:px-4 py-2 flex flex-col gap-2">
            {/* Row 1: transport + timers (wrap on mobile) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Transport group */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => nudgeSeconds(-5)}
                  className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Back 5 seconds"
                  aria-label="Back 5 seconds"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M13 5l-7 7 7 7v-4h8v-6h-8V5z" />
                  </svg>
                </button>

                <button
                  onClick={async () => {
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
                  }}
                  className="h-10 px-4 min-w-[80px] rounded-xl bg-white text-black font-semibold shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={loading}
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={() => nudgeSeconds(5)}
                  className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Forward 5 seconds"
                  aria-label="Forward 5 seconds"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11 5v4H3v6h8v4l7-7-7-7z" />
                  </svg>
                </button>
              </div>

              {/* Times */}
              <div className="ml-1 flex items-center gap-2 text-white/85 text-xs sm:text-sm tabular-nums">
                <span aria-label="Current time">{formatTime(currentSec)}</span>
                <span className="opacity-60">/</span>
                <span aria-label="Total time">{durationSec ? formatTime(durationSec) : '0:00'}</span>
              </div>

              {/* Utility buttons collapse nicely to icons on mobile */}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => setShowTranscript((s) => !s)}
                  className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Toggle transcript (T)"
                  aria-label="Toggle transcript"
                >
                  <span className="hidden xs:inline">{showTranscript ? 'Hide Transcript' : 'Transcript'}</span>
                  <span className="xs:hidden inline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M4 4h16v12H5.17L4 17.17V4zm2 4v2h12V8H6zm0 4v2h8v-2H6z" />
                    </svg>
                  </span>
                </button>

                <button
                  onClick={toggleMax}
                  className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-white/40"
                  title={isMax ? 'Exit full view (F)' : 'Maximize (F)'}
                  aria-label={isMax ? 'Minimize' : 'Maximize'}
                >
                  <span className="hidden xs:inline">{isMax ? 'Minimize' : 'Maximize'}</span>
                  <span className="xs:hidden inline">
                    {/* corners icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      {isMax ? (
                        <path d="M7 7h4V5H5v6h2V7zm10 10h-4v2h6v-6h-2v4zM7 17v-4H5v6h6v-2H7zM17 7v4h2V5h-6v2h4z" />
                      ) : (
                        <path d="M7 9H5V5h4v2H7v2zm12-4v4h-2V7h-2V5h4zM7 15h2v2h2v2H7v-4zm10 0h2v4h-4v-2h2v-2z" />
                      )}
                    </svg>
                  </span>
                </button>

                <button
                  onClick={() => setShowNotes((s) => !s)}
                  className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-white/40"
                  title="Toggle lesson notes (N)"
                  aria-label="Toggle notes"
                >
                  <span className="hidden xs:inline">{showNotes ? 'Hide Notes' : 'Notes'}</span>
                  <span className="xs:hidden inline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M3 5v14l4-2 4 2 4-2 4 2V5H3zm14 10l-4 2-4-2-4 2V7h16v8z" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            {/* Row 2: scrubber is full-width, chunkier on mobile */}
            <div className="flex items-center gap-2">
              <div className="text-white/70 text-[11px] sm:text-xs tabular-nums w-[42px] text-right">
                {formatTime(currentSec)}
              </div>
              <div
                ref={barRef}
                className="relative h-3 w-full rounded-full bg-white/15 cursor-pointer select-none"
                onMouseDown={(e) => { setScrubbing(true); setFromPointer(e.clientX); }}
                onMouseMove={(e) => { if (scrubbing) setFromPointer(e.clientX); }}
                onMouseUp={() => setScrubbing(false)}
                onMouseLeave={() => setScrubbing(false)}
                onTouchStart={(e) => { setScrubbing(true); setFromPointer(e.touches[0].clientX); }}
                onTouchMove={(e) => scrubbing && setFromPointer(e.touches[0].clientX)}
                onTouchEnd={() => setScrubbing(false)}
                aria-label="Seek bar"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={durationSec || 0}
                aria-valuenow={currentSec || 0}
              >
                <motion.div
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-white/85"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                />
              </div>
              <div className="text-white/70 text-[11px] sm:text-xs tabular-nums w-[42px]">
                {durationSec ? formatTime(durationSec) : '0:00'}
              </div>
            </div>
          </div>
        </div>

        {/* Slide-in Transcript Drawer */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              key="transcript"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute right-0 w-full sm:w-[56%] lg:w-[45%] xl:w-[40%] bg-black/70 backdrop-blur-xl ring-1 ring-white/10 z-40 rounded-l-2xl overflow-hidden"
              style={{ top: topH, bottom: bottomH, scrollbarWidth: 'thin' as any }}
            >
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-white/95 font-semibold text-base sm:text-lg truncate">{titleForUi}</div>
                  <div className="mt-0.5 text-white/60 text-[12px] sm:text-xs">Transcript (tap a line to seek)</div>
                </div>

                <div className="flex-1 overflow-auto px-2 sm:px-3 py-2 space-y-2 sm:space-y-2.5">
                  {LINES.map((ln, i) => {
                    const active = i === activeLine;
                    return (
                      <div
                        key={i}
                        ref={(el) => { lineRefs.current[i] = el; }}
                        className={`text-base sm:text-lg rounded-md px-3 sm:px-3.5 py-2 sm:py-2.5 leading-7 cursor-pointer transition ${
                          active ? 'bg-white/15 ring-1 ring-white/25 text-white' : 'text-white/90 hover:bg-white/10'
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

        {/* Slide-in Notes Drawer (Markdown + LaTeX + Tables) */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              key="notes"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute left-0 w-full sm:w-[56%] lg:w-[45%] xl:w-[40%] bg-black/70 backdrop-blur-xl ring-1 ring-white/10 z-40 rounded-r-2xl overflow-auto"
              style={{ top: topH, bottom: bottomH, scrollbarWidth: 'thin' as any }}
            >
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-white/95 font-semibold text-base sm:text-lg truncate">
                  {titleForUi} — Notes
                </div>
                <div className="mt-0.5 text-white/60 text-[12px] sm:text-xs">
                  Formulas & tables render here. Audio sticks with narration.
                </div>
              </div>
              <div className="p-3 sm:p-4 prose prose-invert max-w-none">
                {ReactMarkdown ? (
                  <ReactMarkdown
                    // @ts-ignore
                    remarkPlugins={[remarkGfm, remarkMath].filter(Boolean)}
                    // @ts-ignore
                    rehypePlugins={[rehypeKatex].filter(Boolean)}
                  >
                    {notesMarkdown || '_No notes for this lesson yet._'}
                  </ReactMarkdown>
                ) : (
                  <pre className="text-white/90 text-sm whitespace-pre-wrap">
                    {notesMarkdown || 'No notes for this lesson yet.'}
                  </pre>
                )}
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

  // Portal when maximized to avoid parent clipping (keeps behavior consistent)
  if (isMax && typeof document !== 'undefined') {
    return ReactDOM.createPortal(core, document.body);
  }
  return core;
};

export default ClassroomPlayer;
