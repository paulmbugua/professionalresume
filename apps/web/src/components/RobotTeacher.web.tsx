// apps/web/src/components/RobotTeacher.web.tsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, useAnimations } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

// Word-sync captions (your adapter)
import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';
// AI flow hook (public AI endpoints + cert flow)
import { useAiCourse } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context';

// Payment slide-over (carries your PayPal + M-Pesa flows)
import PaymentWidget from '../components/PaymentWidget.web';

// Fallback API for custom-topic sandbox course if hook doesn't expose startCustomTopic
import { createAiSandboxCourse } from '@mytutorapp/shared/api/aiCourseApi';

// NEW: Canvas DOM events helper (safe canvas listeners)
import CanvasDomEvents from './CanvasDomEvents';

// NOTE: All types come from @mytutorapp/shared/types. Do not declare here.

/* ─────────────────────────────────────────────────────────
   3D Robot Scene
   ───────────────────────────────────────────────────────── */
function RobotModel({ url = '/models/robot.glb' }: { url?: string }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const first = (Object.values(actions)[0] as THREE.AnimationAction | undefined);
    first?.reset().fadeIn(0.3).play();
    return () => {
      if (first) first.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.3) * 0.08;
    group.current.position.y = Math.sin(t * 1.1) * 0.01;
  });

  const prepared = useMemo(() => {
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

  return (
    <primitive
      ref={group}
      object={prepared}
      position={[0, -0.8, 0]}
      rotation={[0, Math.PI, 0]}
      scale={0.7}
    />
  );
}
useGLTF.preload('/models/robot.glb');

/* ─────────────────────────────────────────────────────────
   Video Classroom (robot + captions) — animated
   ───────────────────────────────────────────────────────── */
function VideoClassroom({
  ssml,
  title = 'AI Lesson',
  voiceName = 'en-US-JennyNeural',
  maximized = false,
  onToggleMaximize,
}: {
  ssml: string;
  title?: string;
  voiceName?: string;
  maximized?: boolean;
  onToggleMaximize?: () => void;
}) {
  const {
    speak, loading, error, words, currentIndex,
    isPlaying, play, pause, seekToWord,
  } = useWordSync();

  // We need backendUrl to hit the updated TTS API
  const { backendUrl } = useShopContext();

  // 🔸 Synth only when we have substantive SSML; call speak with 2 args.
  useEffect(() => {
    const clean = (ssml || '').trim();
    if (clean.length < 30) return; // avoid placeholder/short content
    speak(backendUrl, { ssml: clean, voiceName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ssml, voiceName, backendUrl]);

  // 🔸 Auto-play once fresh word timings arrive
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!words?.length) return;
    if (words.length !== prevCountRef.current) {
      prevCountRef.current = words.length;
      play();
    }
  }, [words, play]);

  // Group words for readable caption lines (~40 chars)
  const LINES = useMemo(() => {
    type Line = { text: string; start: number; end: number; indices: number[] };
    const arr: Line[] = [];
    let buf = '';
    let start = 0;
    let indices: number[] = [];

    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > 40 && buf) {
        const lastIdx = indices[indices.length - 1];
        arr.push({
          text: buf,
          start,
          end: words[lastIdx]?.end ?? start,
          indices,
        });
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
      arr.push({
        text: buf,
        start,
        end: words[lastIdx]?.end ?? start,
        indices,
      });
    }
    return arr;
  }, [words]);

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

  // Progress (0..1)
  const progress = words.length ? (currentIndex + 1) / words.length : 0;

  return (
    <div className="w-full">
      {/* Frame */}
      <div className={`${maximized ? 'aspect-[16/9]' : 'aspect-video'} rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 bg-[#0b1220] relative`}>
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 h-9 sm:h-10 flex items-center gap-2 px-2 sm:px-3 bg-black/30 backdrop-blur-sm z-20">
          <div className="hidden sm:flex gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="mx-auto text-[11px] sm:text-sm text-white/80 truncate">
            {voiceName} • Live Class
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isPlaying ? pause() : play())}
              className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              disabled={loading}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={onToggleMaximize}
              className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              title={maximized ? 'Exit full view' : 'Maximize'}
            >
              {maximized ? 'Minimize' : 'Maximize'}
            </button>
          </div>
        </div>

        {/* Content: robot | captions */}
        <div className="absolute inset-0 pt-9 sm:pt-10 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Robot column with Slide Stage */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-white/0">
            <div className="absolute inset-0">
              {/* UPDATED: Use CanvasDomEvents instead of brittle onCreated */}
              <Canvas shadows camera={{ position: [0, 1.4, 3.1], fov: 40 }} gl={{ antialias: false, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}>
                <CanvasDomEvents
                  onContextLost={(e) => { e.preventDefault(); console.warn('lost'); }}
                  onContextRestored={() => console.info('restored')}
                />
                <hemisphereLight args={[0xffffff, 0x223344, 0.7]} />
                <directionalLight position={[3, 5, 6]} intensity={1.25} castShadow />
                <Suspense fallback={null}>
                  <RobotModel />
                  <Environment preset="city" />
                </Suspense>
                <ContactShadows position={[0, -1.05, 0]} opacity={0.45} blur={1.5} far={3.5} />
                <OrbitControls enablePan={false} enableRotate={false} enableZoom={false} />
              </Canvas>
            </div>

            {/* Slide Stage (animated card that changes per active line) */}
            <div className="absolute bottom-2 left-2 right-2 md:left-3 md:right-3">
              <div className="pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeLine}
                    initial={{ y: 20, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className="rounded-xl bg-black/40 ring-1 ring-white/15 backdrop-blur-md p-3"
                  >
                    <div className="text-[10px] sm:text-xs text-white/60 mb-1">{title}</div>
                    <div className="text-sm sm:text-base md:text-lg font-semibold text-white leading-snug">
                      {LINES[activeLine]?.text || ''}
                    </div>
                    <motion.div
                      key={`${activeLine}-pulse`}
                      initial={{ opacity: 0.2, scaleX: 0.95 }}
                      animate={{ opacity: 0.5, scaleX: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-[2px] mt-2 bg-white/40 origin-left"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Narration state hints */}
            {!words.length && !error && (
              <div className="absolute bottom-2 left-2 text-[11px] sm:text-xs text-white/70">
                Generating lesson narration…
              </div>
            )}
            {error && (
              <div className="absolute bottom-2 left-2 text-[11px] sm:text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Captions column with animated words & auto-scroll */}
          <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden">
            <div className="text-white/90 font-semibold text-base sm:text-lg truncate">{title}</div>
            <div className="mt-0.5 sm:mt-1 text-white/50 text-[11px] sm:text-xs">
              Word-precise captions
            </div>

            <div
              className="mt-2 sm:mt-3 flex-1 overflow-auto pr-2 space-y-1.5 sm:space-y-2"
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
                    className={`text-sm rounded-md px-2 sm:px-3 py-1.5 sm:py-2 leading-6 cursor-pointer transition ${
                      active ? 'bg-white/15 ring-1 ring-white/25 text-white' : 'text-white/85 hover:bg-white/10'
                    }`}
                    onClick={() => seekToWord(ln.indices[0])}
                    title="Seek to this line"
                  >
                    {ln.indices.map((wi, j) => {
                      const word = words[wi];
                      const isActiveWord = wi === currentIndex;
                      return (
                        <motion.span
                          key={wi}
                          layout
                          initial={false}
                          animate={isActiveWord ? { scale: 1.06 } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.3 }}
                          className={isActiveWord ? 'bg-white/85 text-black px-1 rounded' : ''}
                        >
                          {(j ? ' ' : '') + word.text}
                        </motion.span>
                      );
                    })}
                  </div>
                );
              })}
              {loading && <div className="text-[11px] sm:text-xs text-white/60">Generating TTS…</div>}
              {error && <div className="text-[11px] sm:text-xs text-red-300">{error}</div>}
            </div>

            {/* Progress bar */}
            <div className="mt-2">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
                />
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-white/60 text-right">
                {words.length ? `${currentIndex + 1}/${words.length}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 inset-x-0 h-10 sm:h-12 px-2 sm:px-3 flex items-center justify-between bg-black/30 backdrop-blur-sm z-10">
          <div className="text-[11px] sm:text-xs text-white/70 truncate">{title}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Sidebar course list (chips on mobile) + Search toggle
   ───────────────────────────────────────────────────────── */
function CourseList({
  items,
  activeId,
  onSelect,
  onRefresh,
  onLoadMore,
  hasMore,
}: {
  items: { id: string; title: string; blurb?: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.title || '').toLowerCase().includes(q) ||
      (it.blurb || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <>
      {/* Mobile chips (include search filter if open) */}
      <div className="md:hidden w-full -mx-2 px-2">
        {showSearch && (
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg bg-white/10 ring-1 ring-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {visible.length ? visible.map((l, i) => {
            const active = l.id === activeId;
            return (
              <button
                key={l.id}
                onClick={() => onSelect(l.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ring-1 transition ${
                  active
                    ? 'bg-indigo-600/40 text-white ring-indigo-500'
                    : 'bg-white/5 text-white/90 hover:bg-white/10 ring-white/10'
                }`}
                title={l.blurb || l.title}
              >
                {String(i + 1).padStart(2, '0')} • {l.title}
              </button>
            );
          }) : (
            <span className="text-white/60 text-xs">No courses found.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
            aria-pressed={showSearch}
          >
            {showSearch ? 'Hide search' : 'Search'}
          </button>
          <button
            onClick={onRefresh}
            className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
            title="Reload list"
          >
            Refresh
          </button>
          <button
            onClick={onLoadMore}
            className="text-[11px] px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white"
            title="Load more courses"
            disabled={!hasMore}
          >
            {hasMore ? 'Load more' : 'All loaded'}
          </button>
        </div>
      </div>

      {/* Desktop card list (hidden on mobile by design) */}
      <div className="hidden md:flex md:flex-col rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white font-semibold">Available courses</div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch((s) => !s)}
              className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              aria-pressed={showSearch}
              title="Search courses"
            >
              {showSearch ? 'Hide search' : 'Search'}
            </button>
            <button
              onClick={onRefresh}
              className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              title="Reload list"
            >
              Refresh
            </button>
            <button
              onClick={onLoadMore}
              className="text-[11px] px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white"
              title="Load more courses"
              disabled={!hasMore}
            >
              {hasMore ? 'Load more' : 'All loaded'}
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg bg-white/10 ring-1 ring-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div
          className="space-y-2 max-h-[80vh] overflow-auto pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {visible.length ? visible.map((l, i) => {
            const active = l.id === activeId;
            return (
              <button
                key={l.id}
                onClick={() => onSelect(l.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-indigo-600/40 text-white' : 'bg-white/5 text-white/90 hover:bg-white/10'
                }`}
                title={l.blurb || l.title}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate">{l.title}</span>
                </div>
                {l.blurb ? (
                  <div className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{l.blurb}</div>
                ) : null}
              </button>
            );
          }) : (
            <div className="text-white/60 text-sm">No courses found. Try another search.</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────── */
type RobotTeacherProps = {
  /** Preferred default voice if none provided via `voiceName` prop or AI hook */
  defaultVoice?: string;
  /** Optional initial SSML to use when AI flow hasn't produced one yet */
  initialSsml?: string;
  /** Optional explicit voice to use (overrides defaultVoice) */
  voiceName?: string;
};

const RobotTeacher: React.FC<RobotTeacherProps> = ({
  defaultVoice = 'en-US-JennyNeural',
  initialSsml = '',
  voiceName,
}) => {
  // Avoid horizontal scrollbars globally (no vertical scroll inside the component)
  useEffect(() => {
    const prevX = document.body.style.overflowX;
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = prevX;
    };
  }, []);

  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    // lock body scroll when maximized
    const prev = document.body.style.overflow;
    if (isMaximized) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMaximized]);

  const effectiveVoice = voiceName || defaultVoice;
  const { backendUrl, token } = useShopContext();

  // Two-step read so we can access optional fields (like degraded/notice) without changing types
  const ai = useAiCourse(backendUrl, token || undefined) as any;
  const {
    topCourses,
    selectedCourse,
    outline,
    ssml,
    quiz,
    answers,
    grade,
    step,
    error,
    ttsLoading,
    ttsError,
    // actions from useAiCourse
    loadTopCourses,
    selectCourse,
    startWithAI,
    generateQuizNow,
    answerQuestion,
    allAnswered,
    gradeNow,
    tryGenerateCertificate,
    startCustomTopic,
  } = ai;

  // Optional pagination flags if your hook provides them
  const hasMoreCourses: boolean =
    (ai?.hasMoreCourses ?? ai?.coursesHasMore ?? ai?.hasMore ?? false) || false;
  const coursesCursor: string | null = ai?.coursesCursor ?? ai?.nextCursor ?? null;

  // Safely read degraded flag if the hook/backend surfaces notice
  const degraded: boolean = Boolean(ai?.degraded) || Boolean(ai?.notice?.degraded);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [downUrl, setDownUrl] = useState<string | null>(null);

  // NEW: custom topic input
  const [customTitle, setCustomTitle] = useState('');

  // Mobile dropdown state (custom, themed, and forced to drop downward)
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load many courses on mount (best effort)
  useEffect(() => {
    (async () => {
      try {
        await loadTopCourses?.({ limit: 200 });
      } catch {
        try {
          await loadTopCourses?.();
        } catch {
          // swallow error to keep UI calm
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    const opts =
      coursesCursor
        ? { append: true, cursor: coursesCursor, limit: 200 }
        : { append: true, page: 'next', limit: 200 };
    try {
      await loadTopCourses?.(opts);
    } catch {
      try {
        await loadTopCourses?.({ append: true });
      } catch {
        await loadTopCourses?.();
      }
    }
  };

  // After closing payment overlay (and user passed) → attempt certificate generation
  useEffect(() => {
    if (!paymentOpen && grade?.passed) {
      (async () => {
        const cert = await tryGenerateCertificate();
        if (cert) {
          setCertUrl((cert as any).url ?? null);
          const dl = (cert as any).download_url ?? (cert as any).downloadUrl ?? (cert as any).url ?? null;
          setDownUrl(dl);
        }
      })();
    }
  }, [paymentOpen, grade?.passed, tryGenerateCertificate]);

  const courseItems = useMemo(
    () => (topCourses || []).map((c: any) => ({ id: c.id, title: c.title, blurb: c.blurb })),
    [topCourses]
  );

  const hasCourses = topCourses && topCourses.length > 0;

  // Fallback custom-topic starter if hook doesn't export startCustomTopic
  const startCustomTopicSafe = async (title: string) => {
    if (typeof startCustomTopic === 'function') {
      await startCustomTopic(title, { level: 'beginner', minutes: 20, voiceName: effectiveVoice });
      return;
    }
    const sandbox = await createAiSandboxCourse(backendUrl, title);
    const next = { id: sandbox.id, title: sandbox.title, blurb: sandbox.description || '' };
    selectCourse(next as any);
    await startWithAI({ level: 'beginner', minutes: 20, voiceName: effectiveVoice });
  };

  // ✅ Use only real SSML from AI. Do not pre-read initialSsml.
  const classroomSsml = (ssml && ssml.trim().length > 0) ? ssml : '';

  // Optional: Auto-maximize on mobile when narration appears
  useEffect(() => {
    if (classroomSsml && window?.innerWidth && window.innerWidth < 768) {
      setIsMaximized(true);
    }
  }, [classroomSsml]);

  return (
    // No vertical scroll here — page handles it.
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      {/* Fullscreen overlay for maximized classroom */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-[#0b1220] px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-7xl mx-auto">
            <VideoClassroom
              ssml={classroomSsml}
              voiceName={effectiveVoice}
              title={selectedCourse?.title || 'AI Lesson'}
              maximized
              onToggleMaximize={() => setIsMaximized(false)}
            />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* LEFT: main content */}
        <div className="md:col-span-8 space-y-4 sm:space-y-6 order-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">AI Tutor Studio</h1>
          <p className="text-white/70 text-sm sm:text-base">
            Learn for free: AI lesson (audio + captions + slides) and quiz. Score <span className="font-semibold">≥ 70%</span> to unlock your certificate,
            then pay the small certificate fee to download your PDF.
          </p>

          {/* Degraded banner */}
          {degraded && (
            <div className="rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/40 p-3">
              <div className="text-yellow-200 text-sm">
                We’re running in fallback mode due to high demand. Content is simplified,
                but you can still take the lesson, quiz, and unlock your certificate.
              </div>
            </div>
          )}

          {/* Mobile: custom course selection dropdown above Start with A.I */}
          <div className="md:hidden">
            <label className="text-xs text-white/70">Choose a course</label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="w-full rounded-xl px-3 py-2 text-sm text-left transition
                           bg-white text-black ring-1 ring-black/10
                           dark:bg-white/10 dark:text-white dark:ring-white/15"
                aria-haspopup="listbox"
                aria-expanded={mobileOpen}
              >
                <span className={`${selectedCourse ? '' : 'opacity-70'}`}>
                  {selectedCourse?.title || (hasCourses ? 'Select a course…' : 'Loading courses…')}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60"
                  aria-hidden="true"
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.12l3.71-3.89a.75.75 0 111.08 1.04l-4.24 4.45a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                </svg>
              </button>

              {/* Dropdown (forced to bottom via top-full + mt-1) */}
              {mobileOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-40 max-h-64 overflow-auto rounded-xl shadow-lg
                             bg-white text-black ring-1 ring-black/10
                             dark:bg-[#101826] dark:text-white dark:ring-white/15"
                  role="listbox"
                >
                  {hasCourses ? (
                    (topCourses || []).map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={selectedCourse?.id === c.id}
                        onClick={() => {
                          setMobileOpen(false);
                          selectCourse(c);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition
                                    hover:bg-black/[0.04] active:bg-black/[0.06]
                                    dark:hover:bg-white/10 dark:active:bg-white/15
                                    ${selectedCourse?.id === c.id ? 'font-medium' : ''}`}
                        title={c.blurb || c.title}
                      >
                        {c.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm opacity-70">{hasCourses ? 'Select a course…' : 'Loading courses…'}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions row (minimalistic) */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div className="flex-1">
              <div className="text-xs text-white/70 mb-1">
                Select a course (dropdown on mobile / list on the right), then start with A.I — or type your own topic below.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={!selectedCourse || ttsLoading || step === 'outlining' || step === 'narrating'}
                onClick={() => startWithAI({ level: 'beginner', minutes: 20, voiceName: effectiveVoice })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${selectedCourse ? 'bg-white/15 hover:bg-white/25' : 'bg-white/10 cursor-not-allowed'}
                `}
                title={selectedCourse ? 'AI will generate outline + narration' : 'Pick a course first'}
              >
                Start with A.I
              </button>
            </div>
          </div>

          {/* Teach me anything */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/70">Or type any topic</label>
              <div className="mt-1 flex flex-col xs:flex-row gap-2">
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., Linear Algebra crash course"
                  className="w-full rounded-xl bg-white text-black ring-1 ring-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500
                             dark:bg-white/10 dark:text-white dark:ring-white/10"
                />
                <button
                  disabled={!customTitle.trim() || ttsLoading || step === 'outlining' || step === 'narrating'}
                  onClick={() => customTitle.trim() && startCustomTopicSafe(customTitle.trim())}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                    ${customTitle.trim() ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 cursor-not-allowed'}
                  `}
                  title="Spin up an AI sandbox course for this topic"
                >
                  Teach me
                </button>
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                We’ll spin up an AI sandbox course for this topic and run the same lesson → quiz → certificate flow.
              </p>
            </div>
          </div>

          {/* Video (free learning surface) */}
          <div className="mt-1" id="classroom">
            <VideoClassroom
              ssml={classroomSsml}
              voiceName={effectiveVoice}
              title={selectedCourse?.title || 'AI Lesson'}
              maximized={false}
              onToggleMaximize={() => setIsMaximized(true)}
            />
          </div>

          {/* Outline preview */}
          {outline.length > 0 && (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              {degraded && (
                <div className="mb-2 rounded-md bg-yellow-500/10 ring-1 ring-yellow-500/30 px-2 py-1 text-[12px] text-yellow-200">
                  Fallback content — auto-generated without the full AI model.
                </div>
              )}

              <div className="font-semibold mb-2">Lesson outline</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-white/80">
                {outline.map((s: any) => (
                  <li key={s.id}>
                    <span className="font-medium text-white">{s.title}</span>
                    <ul className="list-disc list-inside ml-4">
                      {s.keyPoints.map((k: string, idx: number) => (
                        <li key={idx} className="text-white/70">{k}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => generateQuizNow(6)}
                  className="rounded-lg h-10 px-3 bg-white/15 text-white text-sm font-semibold hover:bg-white/25"
                >
                  Generate quiz
                </button>
                {ttsLoading && <span className="text-xs text-white/60">Narration rendering…</span>}
                {(error || ttsError) && (
                  <span className="text-xs text-red-300">{error || ttsError}</span>
                )}
              </div>
            </div>
          )}

          {/* Quiz */}
          {quiz?.questions?.length ? (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              {degraded && (
                <div className="mb-2 rounded-md bg-yellow-500/10 ring-1 ring-yellow-500/30 px-2 py-1 text-[12px] text-yellow-200">
                  Fallback quiz — simplified checks of the main ideas.
                </div>
              )}

              <div className="font-semibold">Quick quiz</div>
              <div className="text-white/60 text-xs mb-2">Answer all to submit.</div>

              <div className="space-y-4">
                {quiz.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="text-sm font-medium mb-2">{idx + 1}. {q.prompt}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.choices.map((c: string, i: number) => {
                        const isSelected = answers[q.id] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => answerQuestion(q.id, i)}
                            className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition
                              ${isSelected ? 'bg-emerald-600/40 ring-emerald-500' : 'bg-white/5 ring-white/10 hover:bg-white/10'}
                            `}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => gradeNow()}
                  disabled={!allAnswered}
                  className={`rounded-lg h-10 px-4 text-sm font-semibold
                    ${allAnswered ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/40 cursor-not-allowed'}
                  `}
                >
                  Submit quiz
                </button>
                {grade && (
                  <span className="text-sm text-white/80">
                    Score: <span className="font-semibold">{grade.scorePct}%</span> (Pass mark {grade.passMark}%)
                  </span>
                )}
              </div>

              {/* Pass → Paywall for certificate */}
              {grade?.passed && (
                <div className="mt-4 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500 p-3">
                  <div className="text-sm text-emerald-200">
                    🎉 Great job! You passed (≥ {grade.passMark}%). Proceed to unlock your certificate.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setPaymentOpen(true)}
                      className="rounded-lg h-10 px-4 bg-emerald-600 text-white text-sm font-semibold hover:brightness-110"
                    >
                      Pay & unlock certificate
                    </button>

                    {certUrl && (
                      <>
                        <a
                          href={certUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg h-10 px-4 bg-white/10 ring-1 ring-white/20 text-sm font-semibold hover:bg-white/20"
                        >
                          View certificate
                        </a>
                        {downUrl && (
                          <a
                            href={downUrl}
                            className="rounded-lg h-10 px-4 bg-indigo-600 text-white text-sm font-semibold hover:brightness-110"
                          >
                            Download PDF
                          </a>
                        )}
                      </>
                    )}
                  </div>
                  {!certUrl && (
                    <p className="text-[12px] text-white/70 mt-2">
                      After you close the payment panel, we’ll automatically generate your certificate (if eligible).
                    </p>
                  )}
                </div>
              )}

              {/* Fail note */}
              {grade && !grade.passed && (
                <div className="mt-4 rounded-xl bg-red-500/10 ring-1 ring-red-500 p-3">
                  <div className="text-sm text-red-200">
                    You scored {grade.scorePct}%. Review the lesson and try again.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* RIGHT: sticky course list (desktop only; hidden on mobile) */}
        <aside className="md:col-span-4 order-2">
          <div className="md:sticky md:top-20 space-y-3">
            <CourseList
              items={courseItems}
              activeId={selectedCourse?.id || null}
              onSelect={(id) => {
                const found = (topCourses || []).find((c: any) => c.id === id) || null;
                selectCourse(found);
              }}
              onRefresh={() => {
                loadTopCourses?.({ limit: 200 }).catch(() => loadTopCourses?.());
              }}
              onLoadMore={handleLoadMore}
              hasMore={Boolean(hasMoreCourses)}
            />
          </div>
        </aside>
      </div>

      {/* Payment slide-over (PayPal + M-Pesa) */}
      <PaymentWidget
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Unlock Certificate"
        showTutorPreview={false}
      />
    </div>
  );
};

export default RobotTeacher;
