// ClassroomPlayer.web.tsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, Html, useAnimations } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
import { useShopContext } from '@mytutorapp/shared/context';

import CanvasDomEvents from './CanvasDomEvents';
import robotUrl from '@/assets/models/robot.glb?url';

type LessonLite = { id: string; title?: string; ssml: string };

type ClassroomPlayerProps = {
  ssml?: string;                  // fallback (single blob path)
  lessons?: LessonLite[];         // per-lesson SSML (preferred)
  title?: string;
  voiceName?: string;
  maximized?: boolean;
  onToggleMaximize?: () => void;
};

/* ─────────────────────────────────────────────────────────
   3D Robot Scene
   ───────────────────────────────────────────────────────── */
function RobotModel({ url = robotUrl, scale = 0.8 }: { url?: string; scale?: number }) {
  const group = useRef<THREE.Group>(null!);
  const gltf: any = useGLTF(url);
  const scene = gltf?.scene as THREE.Object3D | undefined;
  const clips = (gltf?.animations ?? []) as THREE.AnimationClip[];
 const { actions } = useAnimations(clips, group);

  useEffect(() => {
    if (!actions) return;

    const first = Object.values(actions)[0] as THREE.AnimationAction | undefined;

    first?.reset();
    first?.fadeIn(0.3);
    first?.play();

    return () => {
      first?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.rotation.y = Math.sin(t * 0.3) * 0.08;
    g.position.y = Math.sin(t * 1.1) * 0.01;
  });

  const prepared = useMemo(() => {
    if (!scene) return undefined;
    scene.traverse((o) => {
      if ((o as any).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.Material & { envMapIntensity?: number };
        if (mat && typeof mat === 'object' && 'envMapIntensity' in mat) {
          mat.envMapIntensity = 1.0;
        }
      }
    });
    return scene;
  }, [scene]);

  return prepared ? (
    <primitive ref={group} object={prepared} position={[0, -0.8, 0]} rotation={[0, Math.PI, 0]} scale={scale} />
  ) : null;
}
useGLTF.preload(robotUrl);

/* ─────────────────────────────────────────────────────────
   Classroom Player (Robot + Captions + Controls)
   ───────────────────────────────────────────────────────── */
const ClassroomPlayer: React.FC<ClassroomPlayerProps> = ({
  ssml,
  lessons = [],
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized = false,
  onToggleMaximize,
}) => {
  const {
    speak, loading, error, words: wordsRaw, currentIndex,
    isPlaying, play, pause, seekToWord, resumeAudioContext, audioUrl,
  } = useWordSync();

  const hasLessons = Array.isArray(lessons) && lessons.length > 0;
  const [lessonIdx, setLessonIdx] = useState(0);

  const words = wordsRaw ?? [];
  const [needsGesture, setNeedsGesture] = useState(false);
  const [showAudioDebug, setShowAudioDebug] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const { backendUrl } = useShopContext();

  // Synthesize: prefer per-lesson SSML; fallback to single SSML
  useEffect(() => {
    if (hasLessons) {
      const cur = lessons[lessonIdx]?.ssml?.trim() || '';
      if (cur.length >= 30) {
        speak(backendUrl, { ssml: cur, voiceName });
      }
      return;
    }
    const clean = (ssml || '').trim();
    if (clean.length >= 30) {
      speak(backendUrl, { ssml: clean, voiceName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLessons, lessonIdx, lessons, ssml, voiceName, backendUrl]);

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
    if (!hasLessons) return;
    if (!words.length) return;
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

  // Smooth-scroll the active line into view
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    const el = lineRefs.current[activeLine];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLine]);

  const progress = words.length ? (currentIndex + 1) / words.length : 0;
  const titleForUi = hasLessons
    ? (lessons[lessonIdx]?.title || `${title} — Lesson ${lessonIdx + 1}/${lessons.length}`)
    : title;

  return (
    <div className="w-full">
      {/* Frame */}
      <div
        className={`${maximized ? 'aspect-[16/9]' : 'md:aspect-video aspect-[3/4]'} rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 bg-[#0b1220] relative`}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 inset-x-0 h-10 sm:h-10 flex items-center gap-2 px-2 sm:px-3 bg-black/30 backdrop-blur-sm z-20"
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
              onClick={onToggleMaximize}
              className="text-[12px] sm:text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              title={maximized ? 'Exit full view' : 'Maximize'}
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
                  } catch {/* keep visible */}
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

        {/* Content: robot | captions */}
        <div className="absolute inset-0 pt-10 sm:pt-10 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Robot column + slide stage */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-white/0">
            <div className="absolute inset-0">
              <Canvas
                shadows
                camera={{ position: [0, 1.4, 3.1], fov: 40 }}
                gl={{ antialias: false, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}
              >
                <CanvasDomEvents
                  onContextLost={(e) => { e.preventDefault(); console.warn('WebGL context lost'); }}
                  onContextRestored={() => console.info('WebGL context restored')}
                />
                <hemisphereLight args={[0xffffff, 0x223344, 0.7]} />
                <directionalLight position={[3, 5, 6]} intensity={1.25} castShadow />
                <Suspense fallback={
                  <Html center style={{ pointerEvents: 'none' }}>
                    <div className="text-sm text-white/70">Loading 3D model…</div>
                  </Html>
                }>
                  <RobotModel url={robotUrl} scale={isMobile ? 0.9 : 0.8} />
                  <Environment preset="city" />
                </Suspense>
                <ContactShadows position={[0, -1.05, 0]} opacity={0.45} blur={1.5} far={3.5} />
                <OrbitControls enablePan={false} enableRotate={false} enableZoom={false} />
              </Canvas>
            </div>

            {/* Slide Stage */}
            <div className="absolute bottom-2 left-2 right-2 md:left-3 md:right-3">
              <div className="pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${hasLessons ? `l${lessonIdx}` : 'single'}-${activeLine}`}
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
              <div className="absolute bottom-2 left-2 text-[12px] sm:text-xs text-white/75">
                Generating lesson narration…
              </div>
            )}
            {error && (
              <div className="absolute bottom-2 left-2 text-[12px] sm:text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Mini lesson controls */}
            {hasLessons && (
              <div className="absolute bottom-12 right-2 z-20 flex gap-2 text-[11px]">
                <button
                  onClick={() => setLessonIdx((i) => Math.max(0, i - 1))}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                >
                  Prev
                </button>
                <div className="px-2 py-1 rounded bg-white/10">
                  {lessonIdx + 1}/{lessons.length}
                </div>
                <button
                  onClick={() => setLessonIdx((i) => Math.min(lessons.length - 1, i + 1))}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Captions column */}
          <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden">
            <div className="text-white/95 font-semibold text-lg sm:text-xl truncate">{titleForUi}</div>
            <div className="mt-0.5 sm:mt-1 text-white/60 text-[12px] sm:text-xs">Word-precise captions</div>

            <div className="mt-2 sm:mt-3 flex-1 overflow-auto pr-2 space-y-2 sm:space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
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
              {loading && <div className="text-[12px] sm:text-xs text-white/70">Generating TTS…</div>}
              {error && <div className="text-[12px] sm:text-xs text-red-300">{error}</div>}
            </div>

            {/* Progress */}
            <div className="mt-2">
              <div className="h-2 sm:h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
                />
              </div>
              <div className="mt-1 text-[12px] sm:text-xs text-white/65 text-right">
                {words.length ? `${currentIndex + 1}/${words.length}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="absolute bottom-0 inset-x-0 h-12 sm:h-12 px-3 sm:px-3 flex items-center justify-between bg-black/30 backdrop-blur-sm z-10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="text-[12px] sm:text-xs text-white/75 truncate">{titleForUi}</div>
        </div>
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
