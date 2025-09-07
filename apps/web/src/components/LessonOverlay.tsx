// LessonOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Optional: render Markdown + LaTeX (falls back to plaintext if not installed)
// npm i react-markdown remark-gfm remark-math rehype-katex
let ReactMarkdown: any, remarkGfm: any, remarkMath: any, rehypeKatex: any;
try {
  ReactMarkdown = require('react-markdown').default;
  remarkGfm = require('remark-gfm');
  remarkMath = require('remark-math');
  rehypeKatex = require('rehype-katex');
} catch {}

type Word = { text: string; start: number; end: number };

type Formula = {
  id: string;
  latex: string;
  title?: string;
  speakAs?: string;
  announceAtSentence?: number; // 1-based index
};

type Table = {
  id?: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  caption?: string;
  announceAtSentence?: number; // 1-based index
};

type LessonLike = {
  id: string;
  title?: string;
  markdown?: string;
  formulas?: Formula[];
  tables?: Table[];
};

export interface LessonOverlayProps {
  words: Word[];
  currentIndex: number;
  lesson?: LessonLike | null;
  /** pixels from the very top to keep the card below bars/chips */
  topOffset?: number;
  /** how long to linger after its trigger sentence has passed (ms) */
  lingerMs?: number;
  /** start pinned (stays visible) */
  defaultPinned?: boolean;
  /** remember position/state per key (e.g., `${courseId}:${lessonIdx}`) */
  rememberKey?: string;
}

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */
function renderGfmTable(t: { title?: string; caption?: string; columns: string[]; rows: (string|number)[][] }) {
  const head = `| ${t.columns.join(' | ')} |\n| ${t.columns.map(()=>'-').join(' | ')} |`;
  const body = (t.rows || []).map(r => `| ${r.map(x => String(x)).join(' | ')} |`).join('\n');
  return `\n**${t.title || 'Table'}**${t.caption ? ` — _${t.caption}_` : ''}\n\n${head}\n${body}\n`;
}

type OverlayItem =
  | { kind: 'formula'; at: number; key: string; md: string; title?: string; speakAs?: string }
  | { kind: 'table';   at: number; key: string; md: string; title?: string };

const SENTENCE_END = /[.!?…]+["')\]]?$/;

export default function LessonOverlay({
  words,
  currentIndex,
  lesson,
  topOffset = 72,
  lingerMs = 6000,
  defaultPinned = false,
  rememberKey,
}: LessonOverlayProps) {
  // 0) Derive sentence boundaries (0-based index)
  const sentences = useMemo(() => {
    if (!words.length) return [] as { startWi: number; endWi: number; index: number }[];
    const spans: { startWi: number; endWi: number; index: number }[] = [];
    let start = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]?.text || '';
      if (SENTENCE_END.test(w)) {
        spans.push({ startWi: start, endWi: i, index: spans.length });
        start = i + 1;
      }
    }
    if (start < words.length) spans.push({ startWi: start, endWi: words.length - 1, index: spans.length });
    return spans;
  }, [words]);

  const currentSentenceIndex = useMemo(() => {
    if (!sentences.length) return 0;
    const idx = sentences.findIndex(s => currentIndex >= s.startWi && currentIndex <= s.endWi);
    return idx === -1 ? 0 : idx;
  }, [sentences, currentIndex]);

  // 1) Build items queue from lesson metadata
  const items = useMemo<OverlayItem[]>(() => {
    if (!lesson) return [];
    const normalizeAt = (n?: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n - 1)) : undefined;

    const out: OverlayItem[] = [];

    (lesson.formulas || []).forEach((f, i) => {
      const at0 = normalizeAt(f.announceAtSentence);
      if (typeof at0 === 'number') {
        const md = `**${f.title || f.id || 'Formula'}**\n\n$$\n${f.latex || ''}\n$$` + (f.speakAs ? `\n\n_Read as: ${f.speakAs}_` : '');
        out.push({ kind: 'formula', at: at0, key: `F${i}:${f.id || i}`, md, title: f.title || f.id, speakAs: f.speakAs });
      }
    });

    (lesson.tables || []).forEach((t, i) => {
      const at0 = normalizeAt(t.announceAtSentence);
      if (typeof at0 === 'number' && (t.columns?.length || 0) && (t.rows?.length || 0)) {
        out.push({ kind: 'table', at: at0, key: `T${i}:${t.title || i}`, md: renderGfmTable(t), title: t.title });
      }
    });

    return out.sort((a, b) => a.at - b.at);
  }, [lesson]);

  // 2) Determine latest triggered index (<= current sentence)
  const latestIdx = useMemo(() => {
    if (!items.length) return -1;
    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].at <= currentSentenceIndex) idx = i; else break;
    }
    return idx;
  }, [items, currentSentenceIndex]);

  // 3) UI state: pos / pinned / maximized / minimized + persistence
  type Saved = { x: number; y: number; pinned: boolean; maximized: boolean; minimized: boolean };
  const defaultSaved: Saved = { x: 12, y: topOffset + 12, pinned: defaultPinned, maximized: false, minimized: false };

  const loadSaved = (): Saved => {
    try {
      if (!rememberKey) return defaultSaved;
      const raw = localStorage.getItem(`overlay:${rememberKey}`);
      if (!raw) return defaultSaved;
      const o = JSON.parse(raw);
      return {
        x: Number.isFinite(o.x) ? o.x : defaultSaved.x,
        y: Number.isFinite(o.y) ? o.y : defaultSaved.y,
        pinned: !!o.pinned,
        maximized: !!o.maximized,
        minimized: !!o.minimized,
      } as Saved;
    } catch {
      return defaultSaved;
    }
  };

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const s = loadSaved();
    return { x: s.x, y: s.y };
  });
  const [pinned, setPinned] = useState<boolean>(() => loadSaved().pinned);
  const [maximized, setMaximized] = useState<boolean>(() => loadSaved().maximized);
  const [minimized, setMinimized] = useState<boolean>(() => loadSaved().minimized);

  useEffect(() => {
    if (!rememberKey) return;
    try {
      const payload: Saved = { x: pos.x, y: pos.y, pinned, maximized, minimized };
      localStorage.setItem(`overlay:${rememberKey}`, JSON.stringify(payload));
    } catch {}
  }, [rememberKey, pos, pinned, maximized, minimized]);

  // 4) Linger logic: remember when content changed
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);

  useEffect(() => {
    if (latestIdx >= 0 && latestIdx !== activeIdx) {
      setActiveIdx(latestIdx);
      setLastSeenAt(Date.now());
    }
  }, [latestIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    if (minimized || activeIdx < 0) return false;
    if (pinned || maximized) return true;
    const justTriggeredOrCurrent = items[activeIdx]?.at >= currentSentenceIndex;
    if (justTriggeredOrCurrent) return true;
    return Date.now() - lastSeenAt < lingerMs;
  }, [minimized, activeIdx, pinned, maximized, currentSentenceIndex, lastSeenAt, lingerMs, items]);

  // 5) Group all items announced at the same sentence as activeIdx
  const group = useMemo(() => {
    if (activeIdx < 0) return [] as OverlayItem[];
    const at = items[activeIdx]?.at;
    return items.filter(it => it.at === at);
  }, [activeIdx, items]);

  // 6) Dragging (card only; disabled when maximized)
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (maximized) return;
    const el = cardRef.current;
    if (!el) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = el.getBoundingClientRect();
    dragState.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || maximized) return;
    const { dx, dy } = dragState.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = cardRef.current;
    const rect = el ? el.getBoundingClientRect() : ({ width: 360, height: 220 } as DOMRect);
    const loX = 0, hiX = vw - rect.width;
    const loY = topOffset, hiY = vh - rect.height - 8;
    setPos({ x: clamp(e.clientX - dx, loX, hiX), y: clamp(e.clientY - dy, loY, hiY) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // 7) Render

  // Minimized chip (always available if minimized)
  if (minimized) {
    return (
      <button
        className="absolute right-3 bottom-3 z-40 px-3 py-2 rounded-full bg-black/60 text-white text-sm ring-1 ring-white/15 shadow-lg"
        onClick={() => setMinimized(false)}
        title="Show notes"
      >
        Notes
      </button>
    );
  }

  if (!group.length || !visible) return null;

  const HeaderButtons = (
    <div className="ml-auto flex items-center gap-1.5">
      <button
        className="chip"
        onClick={() => setPinned(p => !p)}
        title={pinned ? 'Unpin' : 'Pin'}
      >
        {pinned ? 'Unpin' : 'Pin'}
      </button>
      <button className="chip" onClick={() => setMinimized(true)} title="Minimize">
        Minimize
      </button>
      {maximized ? (
        <button className="chip" onClick={() => setMaximized(false)} title="Restore">
          Restore
        </button>
      ) : (
        <button className="chip" onClick={() => setMaximized(true)} title="Maximize">
          Maximize
        </button>
      )}
    </div>
  );

  // Maximized docked panel
  if (maximized) {
    return (
      <AnimatePresence>
        <motion.div
          key="overlay-max"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 z-40 w-full sm:w-[56%] lg:w-[45%] xl:w-[38%] bg-black/70 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl overflow-auto rounded-l-2xl"
          style={{ top: topOffset, bottom: 8 }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-black/40 ring-1 ring-white/10">
            <div className="text-sm font-semibold truncate">{lesson?.title || 'Lesson notes'}</div>
            {HeaderButtons}
          </div>
          <div className="p-3 sm:p-4 space-y-3">
            {group.map((it) => (
              <div
                key={it.key}
                className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 sm:p-4"
              >
                <div className="text-[11px] sm:text-xs uppercase tracking-wide opacity-70 mb-1">
                  {it.kind === 'formula' ? 'Formula' : 'Table'}
                </div>
                <div className="prose prose-invert max-w-none">
                  {ReactMarkdown ? (
                    <ReactMarkdown
                      // @ts-ignore
                      remarkPlugins={[remarkGfm, remarkMath].filter(Boolean)}
                      // @ts-ignore
                      rehypePlugins={[rehypeKatex].filter(Boolean)}
                    >
                      {it.md}
                    </ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{it.md}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Floating draggable card with stacked items for the same trigger
  return (
    <AnimatePresence>
      <motion.div
        key={`overlay-float-${activeIdx}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.2 }}
        className="absolute z-40"
        style={{ left: pos.x, top: pos.y }}
        aria-live="polite"
      >
        <div
          ref={cardRef}
          className="pointer-events-auto w-[min(92vw,380px)] max-w-[92vw] rounded-2xl bg-black/70 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl"
        >
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-move select-none bg-white/10 rounded-t-2xl"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="text-xs font-semibold truncate">{lesson?.title || 'Lesson notes'}</div>
            {HeaderButtons}
          </div>

          <div className="p-3 sm:p-4 space-y-3 text-white">
            {group.map((it) => (
              <div key={it.key}>
                <div className="text-[11px] sm:text-xs uppercase tracking-wide opacity-70 mb-1">
                  {it.kind === 'formula' ? 'Formula' : 'Table'}
                </div>
                <div className="prose prose-invert max-w-none">
                  {ReactMarkdown ? (
                    <ReactMarkdown
                      // @ts-ignore
                      remarkPlugins={[remarkGfm, remarkMath].filter(Boolean)}
                      // @ts-ignore
                      rehypePlugins={[rehypeKatex].filter(Boolean)}
                    >
                      {it.md}
                    </ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{it.md}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
