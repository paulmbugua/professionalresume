import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, useAnimations } from '@react-three/drei';
import { useWordSync } from '@mytutorapp/shared/hooks/useWordSync';

/* =========================================================================
   Types
   ========================================================================= */
type Props = { ssml?: string; voiceName?: string; title?: string };

type Course = {
  id: string;
  title: string;
  category: string;
  rating: number;
  reviews: number;
  blurb: string;
};

type Lesson = { id: string; title: string; ssml: string };

type OutlineItem = {
  id: string;
  title: string;
  keyPoints: string[];
  // optional: estimated minutes, resources, etc.
};

type QuizQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number; // server may not send this to client in prod; here for demo
};

type QuizResult = {
  scorePct: number;
  correct: number;
  total: number;
  passed: boolean;
};

/* =========================================================================
   Mock data (replace with real, or hydrate from your backend)
   ========================================================================= */
const COURSES: Course[] = [
  { id: 'c1', title: 'AI Fundamentals', category: 'AI', rating: 4.9, reviews: 1286, blurb: 'Core concepts, use-cases & ethics.' },
  { id: 'c2', title: 'Prompt Engineering', category: 'AI', rating: 4.8, reviews: 2011, blurb: 'Reliable prompting patterns & evals.' },
  { id: 'c3', title: 'RAG Systems & Vector DBs', category: 'AI', rating: 4.9, reviews: 1540, blurb: 'Indexes, embeddings & retrieval.' },
  { id: 'c4', title: 'Fractions & Decimals', category: 'Math', rating: 4.9, reviews: 1754, blurb: 'Master parts of a whole.' },
  { id: 'c5', title: 'Algebra Refresher', category: 'Math', rating: 4.7, reviews: 1205, blurb: 'Equations, functions & graphs.' },
  { id: 'c6', title: 'German A1 Starter', category: 'Languages', rating: 4.8, reviews: 1320, blurb: 'Everyday phrases & pronunciation.' },
  { id: 'c7', title: 'Kiswahili Grammar', category: 'Languages', rating: 4.7, reviews: 980, blurb: 'Sarufi, sentensi na matamshi.' },
  { id: 'c8', title: 'React Native for Beginners', category: 'Programming', rating: 4.6, reviews: 990, blurb: 'Ship iOS/Android fast.' },
  { id: 'c9', title: 'TypeScript in Practice', category: 'Programming', rating: 4.7, reviews: 1422, blurb: 'Types, generics, safe refactors.' },
  { id: 'c10', title: 'Web Performance & SEO', category: 'Programming', rating: 4.8, reviews: 803, blurb: 'Vitals, SSR/SSG, accessibility.' },
].sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews)).slice(0, 10);

/* =========================================================================
   3D Robot
   ========================================================================= */
function RobotModel({ url = '/robot.glb' }: { url?: string }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const first = (Object.values(actions)[0] as THREE.AnimationAction | undefined);
    first?.reset().fadeIn(0.3).play();
    return () => { first?.fadeOut(0.2); };
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
        m.castShadow = true; m.receiveShadow = true;
        const mat = m.material as THREE.Material & { envMapIntensity?: number };
        if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.0;
      }
    });
    return scene;
  }, [scene]);

  return <primitive ref={group} object={prepared} position={[0, -0.8, 0]} rotation={[0, Math.PI, 0]} scale={0.7} />;
}
useGLTF.preload('/robot.glb');

/* =========================================================================
   Video Classroom (Robot + TTS captions)
   ========================================================================= */
function VideoClassroom({
  ssml,
  title = 'Welcome to your AI class',
  voiceName = 'en-US-JennyNeural',
}: {
  ssml: string;
  title?: string;
  voiceName?: string;
}) {
  const {
    speak, loading, error, words, currentIndex,
    isPlaying, play, pause, seekToWord,
  } = useWordSync();

  useEffect(() => { speak({ ssml, voiceName }); }, [speak, ssml, voiceName]);

  const LINES = useMemo(() => {
    const arr: { text: string; indices: number[] }[] = [];
    let buf = '', indices: number[] = [];
    words.forEach((w, i) => {
      const piece = (buf ? ' ' : '') + w.text;
      if ((buf + piece).length > 42 && buf) {
        arr.push({ text: buf, indices });
        buf = w.text; indices = [i];
      } else {
        buf += piece; indices.push(i);
      }
    });
    if (buf && indices.length) arr.push({ text: buf, indices });
    return arr;
  }, [words]);

  const activeLine = useMemo(() => {
    const idx = LINES.findIndex((ln) => ln.indices.includes(currentIndex));
    return idx === -1 ? 0 : idx;
  }, [LINES, currentIndex]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="aspect-video rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 bg-[#0b1220] relative">
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 h-9 sm:h-10 flex items-center gap-2 px-2 sm:px-3 bg-black/30 backdrop-blur-sm z-10">
          <div className="mx-auto text-[11px] sm:text-sm text-white/80 truncate">
            {voiceName} • Live Class
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => (isPlaying ? pause() : play())}
              className="text-[11px] sm:text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
              disabled={loading}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="absolute inset-0 pt-9 sm:pt-10 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Robot */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-white/0">
            <div className="absolute inset-0">
              <Canvas shadows camera={{ position: [0, 1.4, 3.1], fov: 40 }} gl={{ antialias: true, alpha: true }}>
                <hemisphereLight args={[0xffffff, 0x223344, 0.7]} />
                <directionalLight position={[3, 5, 6]} intensity={1.25} castShadow />
                <Suspense fallback={null}>
                  <RobotModel url="/robot.glb" />
                  <Environment preset="city" />
                </Suspense>
                <ContactShadows position={[0, -1.05, 0]} opacity={0.45} blur={1.5} far={3.5} />
                <OrbitControls enablePan={false} enableRotate={false} enableZoom={false} />
              </Canvas>
            </div>
          </div>

          {/* Captions */}
          <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden">
            <div className="text-white/90 font-semibold text-base sm:text-lg truncate">{title}</div>
            <div className="mt-2 sm:mt-3 flex-1 overflow-auto pr-2 space-y-1.5 sm:space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {LINES.map((ln, i) => {
                const active = i === activeLine;
                return (
                  <div
                    key={i}
                    className={`text-sm rounded-md px-2 sm:px-3 py-1.5 sm:py-2 leading-6 cursor-pointer transition ${
                      active ? 'bg-indigo-600/30 text-white' : 'text-white/80 hover:bg-white/10'
                    }`}
                    onClick={() => seekToWord(ln.indices[0])}
                    title="Seek to this line"
                  >
                    {ln.indices.map((wi, j) => {
                      const word = words[wi];
                      const isActiveWord = wi === currentIndex;
                      return (
                        <span key={wi} className={isActiveWord ? 'bg-white/80 text-black px-1 rounded' : ''}>
                          {(j ? ' ' : '') + word.text}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
              {loading && <div className="text-[11px] sm:text-xs text-white/60">Generating TTS…</div>}
              {error && <div className="text-[11px] sm:text-xs text-red-300">{error}</div>}
            </div>
            <div className="mt-2 ml-auto text-[11px] sm:text-xs text-white/60">
              {words.length ? `${currentIndex + 1}/${words.length}` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Payments (stub)
   ========================================================================= */
function CheckoutButtons({
  priceLabel = 'Certificate: $9',
  onStripe,
  onPayPal,
  disabled,
}: {
  priceLabel?: string;
  onStripe?: () => void;
  onPayPal?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/80 text-xs sm:text-sm">{priceLabel}</span>
      <button
        onClick={onStripe}
        disabled={disabled}
        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-white text-xs sm:text-sm
          ${disabled ? 'bg-indigo-900/40 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
      >
        Pay with Stripe
      </button>
      <button
        onClick={onPayPal}
        disabled={disabled}
        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-black text-xs sm:text-sm
          ${disabled ? 'bg-[#b39b45]/50 cursor-not-allowed' : 'bg-[#ffc439] hover:bg-[#ffb300]'}`}
      >
        PayPal
      </button>
    </div>
  );
}

/* =========================================================================
   AI Orchestrator (stepper state + API stubs)
   ========================================================================= */
enum Step {
  PickCourse = 0,
  GenerateOutline = 1,
  Learn = 2,
  Quiz = 3,
  Results = 4,
}

const PASS_MARK = 70; // %

async function apiGenerateOutline(course: Course): Promise<OutlineItem[]> {
  // TODO: call your backend (which calls OpenAI) e.g. POST /api/ai/outline
  // return await (await fetch(`${backendUrl}/api/ai/outline`, { ... })).json();
  await new Promise(r => setTimeout(r, 700));
  return [
    { id: 'o1', title: `Intro to ${course.title}`, keyPoints: ['Goals', 'Key ideas', 'Where it applies'] },
    { id: 'o2', title: 'Core Concepts', keyPoints: ['Concept A', 'Concept B', 'Concept C'] },
    { id: 'o3', title: 'Hands-on Exercise', keyPoints: ['Mini-project outline', 'Evaluation rubric'] },
  ];
}

async function apiGenerateLessonSSML(course: Course, outline: OutlineItem[]): Promise<string> {
  // TODO: use OpenAI to transform outline → SSML
  await new Promise(r => setTimeout(r, 500));
  return `<speak>
    <p>Welcome to <emphasis level="moderate">${course.title}</emphasis>.</p>
    <p>We will cover: ${outline.map(o => o.title).join(', ')}.</p>
    <p>By the end, you will complete a mini-project and attempt the quiz.</p>
  </speak>`;
}

async function apiGenerateQuiz(course: Course, outline: OutlineItem[]): Promise<QuizQuestion[]> {
  // TODO: call backend to create adaptive quiz
  await new Promise(r => setTimeout(r, 600));
  return [
    { id: 'q1', prompt: `Which statement best describes ${course.title}?`, choices: ['X', 'Y', 'Z', 'All of the above'], answerIndex: 3 },
    { id: 'q2', prompt: `Pick a key concept from "${outline[1].title}"`, choices: ['A', 'B', 'Concept B', 'D'], answerIndex: 2 },
    { id: 'q3', prompt: 'True/False: Hands-on practice is discouraged.', choices: ['True', 'False'], answerIndex: 1 },
  ];
}

function gradeQuiz(answers: Record<string, number>, quiz: QuizQuestion[]): QuizResult {
  let correct = 0;
  quiz.forEach(q => {
    if (answers[q.id] === q.answerIndex) correct += 1;
  });
  const total = quiz.length;
  const scorePct = Math.round((correct / total) * 100);
  const passed = scorePct >= PASS_MARK;
  return { scorePct, correct, total, passed };
}

/* =========================================================================
   UI helpers
   ========================================================================= */
function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="inline-flex items-center gap-0.5 text-yellow-400">
      {Array.from({ length: full }).map((_, i) => <span key={`f${i}`} aria-hidden>★</span>)}
      {half && <span aria-hidden>☆</span>}
      {Array.from({ length: empty }).map((_, i) => <span key={`e${i}`} aria-hidden className="opacity-40">☆</span>)}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = ['Pick', 'Outline', 'Learn', 'Quiz', 'Results'];
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
      {items.map((label, i) => (
        <li key={label} className={`px-2 py-1 rounded-lg ring-1 ${i === step ? 'bg-indigo-600/40 ring-indigo-500 text-white' : 'bg-white/5 ring-white/10'}`}>
          {String(i + 1).padStart(2, '0')} • {label}
        </li>
      ))}
    </ol>
  );
}

/* =========================================================================
   CoursePicker + Top 10
   ========================================================================= */
function CoursePicker({
  courses,
  selected,
  onSelect,
  onStart,
  generating,
}: {
  courses: Course[];
  selected?: Course | null;
  onSelect: (c: Course) => void;
  onStart: () => void;
  generating: boolean;
}) {
  const categories = useMemo(() => Array.from(new Set(courses.map(c => c.category))).sort(), [courses]);
  const [category, setCategory] = useState<string>('All');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let arr = courses;
    if (category !== 'All') arr = arr.filter(c => c.category === category);
    if (q) arr = arr.filter(c => c.title.toLowerCase().includes(q.toLowerCase()));
    return arr.slice(0, 10);
  }, [courses, category, q]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Pick a course</h2>
          <p className="text-white/60 text-xs sm:text-sm">AI will generate a tailored outline & quiz automatically.</p>
          <Stepper step={0} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-white/70 text-sm">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">All</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="w-48 sm:w-64 px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            disabled={!selected || generating}
            onClick={onStart}
            className={`px-3 py-2 rounded-lg text-white text-sm ${
              !selected || generating ? 'bg-emerald-900/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {generating ? 'Generating…' : 'Start with AI'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((c) => {
          const active = selected?.id === c.id;
          return (
            <button key={c.id} onClick={() => onSelect(c)}
              className={`text-left rounded-2xl p-4 ring-1 transition ${
                active ? 'bg-indigo-600/30 ring-indigo-500 text-white' : 'bg-white/5 ring-white/10 text-white/90 hover:bg-white/10'
              }`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">{c.title}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-white/10">{c.category}</span>
              </div>
              <p className="mt-1 text-white/70 text-sm line-clamp-2">{c.blurb}</p>
              <div className="mt-2 flex items-center gap-2">
                <Stars rating={c.rating} />
                <span className="text-xs text-white/80">{c.rating.toFixed(1)} ({c.reviews.toLocaleString()})</span>
              </div>
              {active && <div className="mt-2 text-[11px] text-emerald-300">Selected</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   Outline Viewer
   ========================================================================= */
function OutlineView({
  course, outline, onContinue, busy,
}: {
  course: Course; outline: OutlineItem[]; onContinue: () => void; busy?: boolean;
}) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">AI Course Outline</h2>
          <p className="text-white/60 text-xs sm:text-sm">Generated for: <span className="text-white">{course.title}</span></p>
          <Stepper step={1} />
        </div>
        <button onClick={onContinue}
          disabled={busy}
          className={`px-3 py-2 rounded-lg text-white text-sm ${busy ? 'bg-indigo-900/40' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
          {busy ? 'Preparing lesson…' : 'Continue to Lesson'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {outline.map((o) => (
          <div key={o.id} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <h3 className="font-semibold">{o.title}</h3>
            <ul className="mt-2 list-disc list-inside text-white/80 text-sm space-y-1">
              {o.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Quiz View
   ========================================================================= */
function QuizView({
  quiz, answers, onAnswer, onSubmit, busy,
}: {
  quiz: QuizQuestion[];
  answers: Record<string, number>;
  onAnswer: (qid: string, choiceIndex: number) => void;
  onSubmit: () => void;
  busy?: boolean;
}) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Quick Quiz</h2>
          <p className="text-white/60 text-xs sm:text-sm">Answer to unlock certification.</p>
          <Stepper step={3} />
        </div>
        <button
          onClick={onSubmit}
          disabled={busy}
          className={`px-3 py-2 rounded-lg text-white text-sm ${busy ? 'bg-emerald-900/40' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
          {busy ? 'Grading…' : 'Submit Quiz'}
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {quiz.map((q, idx) => (
          <div key={q.id} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="font-semibold">Q{idx + 1}. {q.prompt}</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.choices.map((c, i) => {
                const chosen = answers[q.id] === i;
                return (
                  <button key={i} onClick={() => onAnswer(q.id, i)}
                    className={`text-left rounded-xl px-3 py-2 ring-1 transition ${
                      chosen ? 'bg-indigo-600/30 ring-indigo-500 text-white'
                             : 'bg-white/5 ring-white/10 text-white/90 hover:bg-white/10'
                    }`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Results + Certificate Payment
   ========================================================================= */
function ResultsView({
  result, onRetry, onPayStripe, onPayPaypal,
}: {
  result: QuizResult;
  onRetry: () => void;
  onPayStripe: () => void;
  onPayPaypal: () => void;
}) {
  const disabled = !result.passed;
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Results</h2>
          <p className="text-white/60 text-xs sm:text-sm">
            Score: <span className="text-white">{result.scorePct}%</span> • {result.correct}/{result.total}{' '}
            {result.passed ? '✅ Passed' : '❌ Try again'}
          </p>
          <Stepper step={4} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRetry}
            className="px-3 py-2 rounded-lg text-white text-sm bg-white/10 hover:bg-white/20">
            Retry Quiz
          </button>
          <CheckoutButtons onStripe={onPayStripe} onPayPal={onPayPaypal} disabled={disabled} />
        </div>
      </div>
      {!result.passed && <p className="mt-2 text-xs text-white/70">Pass mark: {PASS_MARK}% to unlock the certificate checkout.</p>}
    </div>
  );
}

/* =========================================================================
   MAIN: RobotTeacher AI Flow
   ========================================================================= */
const RobotTeacher: React.FC<Props> = ({ ssml, voiceName, title }) => {
  // ensure page itself is scrollable vertically; video on top for mobile
  useEffect(() => {
    const prevX = document.body.style.overflowX;
    document.body.style.overflowX = 'hidden';
    return () => { document.body.style.overflowX = prevX; };
  }, []);

  const [step, setStep] = useState<Step>(Step.PickCourse);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [generating, setGenerating] = useState(false);

  const [outline, setOutline] = useState<OutlineItem[] | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  // Start AI flow: Outline -> Lesson -> Quiz (pre-gen)
  const handleStartAI = useCallback(async () => {
    if (!selectedCourse) return;
    setGenerating(true);
    try {
      // 1) Outline
      const outlineData = await apiGenerateOutline(selectedCourse);
      setOutline(outlineData);
      setStep(Step.GenerateOutline);

      // 2) Lesson SSML
      const ssmlText = await apiGenerateLessonSSML(selectedCourse, outlineData);
      const lessonData: Lesson = { id: `lesson-${selectedCourse.id}`, title: selectedCourse.title, ssml: ssmlText };
      setLesson(lessonData);

      // 3) Quiz
      const quizData = await apiGenerateQuiz(selectedCourse, outlineData);
      setQuiz(quizData);
    } finally {
      setGenerating(false);
    }
  }, [selectedCourse]);

  const continueToLesson = useCallback(() => {
    setStep(Step.Learn);
    // smooth scroll to classroom
    const el = document.getElementById('classroom');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goToQuiz = useCallback(() => {
    setStep(Step.Quiz);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const answerQuestion = useCallback((qid: string, choiceIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: choiceIndex }));
  }, []);

  const submitQuiz = useCallback(() => {
    if (!quiz) return;
    const res = gradeQuiz(answers, quiz);
    setResult(res);
    setStep(Step.Results);
  }, [answers, quiz]);

  const retryQuiz = useCallback(() => {
    setAnswers({});
    setStep(Step.Quiz);
  }, []);

  const handleStripe = useCallback(() => {
    alert('TODO: Create Stripe Checkout Session then redirect');
    // await createCheckoutSession({...})
  }, []);

  const handlePaypal = useCallback(() => {
    alert('TODO: Create PayPal order then approve → capture');
  }, []);

  // default SSML if no AI lesson yet
  const defaultLesson: Lesson = useMemo(() => ({
    id: 'default',
    title: title ?? 'Welcome',
    ssml: ssml ?? `<speak><p>Pick a course and let AI prepare your lesson and quiz.</p></speak>`,
  }), [ssml, title]);

  const activeLesson = lesson ?? defaultLesson;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden overflow-y-scroll">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">AI Tutor Studio</h1>
            <p className="text-white/70 mt-1 text-sm sm:text-base">
              Select a course → AI generates outline & quiz → Learn → Take quiz → Unlock certificate
            </p>
          </div>
          <div className="text-white/60 text-xs sm:text-sm">
            Pass mark: <span className="text-white font-medium">{PASS_MARK}%</span>
          </div>
        </div>

        {/* STEP 0: PICK */}
        <section>
          <CoursePicker
            courses={COURSES}
            selected={selectedCourse}
            onSelect={setSelectedCourse}
            onStart={handleStartAI}
            generating={generating}
          />
        </section>

        {/* STEP 1: OUTLINE */}
        {outline && selectedCourse && step >= Step.GenerateOutline && (
          <section>
            <OutlineView course={selectedCourse} outline={outline} onContinue={continueToLesson} busy={false} />
          </section>
        )}

        {/* STEP 2: LEARN (Video on top for mobile) */}
        {step >= Step.Learn && (
          <section id="classroom" className="mt-2 sm:mt-4">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              {/* Main column first (video on top mobile) */}
              <div className="order-1 md:order-1 flex-1">
                <div className="mb-2">
                  <Stepper step={2} />
                </div>
                <VideoClassroom
                  ssml={activeLesson.ssml}
                  voiceName={voiceName ?? 'en-US-JennyNeural'}
                  title={activeLesson.title}
                />
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-white/70 text-xs sm:text-sm">
                    When ready, proceed to the quiz to unlock your certificate.
                  </div>
                  <button onClick={goToQuiz} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
                    Start Quiz
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: QUIZ */}
        {quiz && step >= Step.Quiz && (
          <section>
            <QuizView
              quiz={quiz}
              answers={answers}
              onAnswer={answerQuestion}
              onSubmit={submitQuiz}
            />
          </section>
        )}

        {/* STEP 4: RESULTS + CERT */}
        {result && step >= Step.Results && (
          <section>
            <ResultsView
              result={result}
              onRetry={retryQuiz}
              onPayStripe={handleStripe}
              onPayPaypal={handlePaypal}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default RobotTeacher;
