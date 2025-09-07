// LessonOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Optional Markdown + LaTeX support
let ReactMarkdown: any, remarkGfm: any, remarkMath: any, rehypeKatex: any;
try {
  ReactMarkdown = require('react-markdown').default;
  remarkGfm = require('remark-gfm');
  remarkMath = require('remark-math');
  rehypeKatex = require('rehype-katex');
} catch {}

/* ─────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────── */
type Word = { text: string; start: number; end: number };

type Formula = {
  id: string;
  latex: string;
  title?: string;
  speakAs?: 'math' | 'spell-out' | 'characters' | 'none';
  variables?: { symbol: string; meaning: string }[]; // NEW: show legend
  announceAtSentence?: number; // 1-based
};

type Table = {
  id?: string;
  title: string;
  columns: string[];
  rows: (string | number | boolean)[][];
  caption?: string;
  announceAtSentence?: number; // 1-based
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
  /** Initial offset from top when first showing (px) */
  topOffset?: number;
  /** How long to linger after the trigger sentence passes (ms) */
  lingerMs?: number;
  /** Start pinned (always visible) */
  defaultPinned?: boolean;
  /** Persist UI state under this key */
  rememberKey?: string;
  /** Render above the whole page via a body portal */
  portal?: boolean;              // default: true
  /** Z-index to use when portaled */
  zIndex?: number;               // default: 10000
  /** Allow dragging anywhere in the viewport (ignores topOffset during drag) */
  freeMove?: boolean;            // default: true
  /** Make Maximize go truly full-screen (inset-0) */
  fullOnMaximize?: boolean;      // default: true
}

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */
function renderGfmTable(t: { title?: string; caption?: string; columns: string[]; rows: (string|number|boolean)[][] }) {
  const head = `| ${t.columns.join(' | ')} |\n| ${t.columns.map(()=>'-').join(' | ')} |`;
  const body = (t.rows || []).map(r => `| ${r.map(x => String(x)).join(' | ')} |`).join('\n');
  return `\n**${t.title || 'Table'}**${t.caption ? ` — _${t.caption}_` : ''}\n\n${head}\n${body}\n`;
}

type OverlayItem =
  | { kind: 'formula'; at: number; key: string; md: string; title?: string; speakAs?: string }
  | { kind: 'table';   at: number; key: string; md: string; title?: string };

const SENTENCE_END = /[.!?…]+["')\]]?$/;

/* ─────────────────────────────────────────────────────────
   Reusable Markdown renderer (GFM + Math), pretty tables/code
   ───────────────────────────────────────────────────────── */
function Markdown({
  children,
  className = '',
}: { children: string; className?: string }) {
  // Fallback if optional libs aren't installed
  if (!ReactMarkdown) {
    return <pre className="whitespace-pre-wrap text-sm">{children}</pre>;
  }

  const katexOptions = {
    throwOnError: false,
    strict: false,
    macros: { "\\RR": "\\mathbb{R}", "\\NN": "\\mathbb{N}" },
  };

  // Type each renderer param as appropriate DOM props
  const components = {
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className="mt-1 mb-2 text-lg font-semibold" {...props} />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className="mt-1 mb-1 text-base font-semibold opacity-90" {...props} />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="leading-relaxed" {...props} />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="my-2 space-y-1" {...props} />
    ),
    ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
      <ol className="my-2 space-y-1" {...props} />
    ),
    code: (
      props: (React.HTMLAttributes<HTMLElement> & { inline?: boolean; className?: string }) & { children?: React.ReactNode }
    ) => {
      const { inline, className, children, ...rest } = props;
      if (inline) {
        return (
          <code className={`px-1 py-0.5 rounded bg-white/10 ${className || ''}`} {...rest}>
            {children}
          </code>
        );
      }
      return (
        <code className={`block p-3 rounded-lg bg-white/10 overflow-x-auto text-[13px] ${className || ''}`} {...rest}>
          {children}
        </code>
      );
    },
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="not-prose overflow-x-auto rounded-xl ring-1 ring-white/10">
        <table className="w-full table-auto border-separate border-spacing-0 text-sm" {...props} />
      </div>
    ),
    thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
      <thead className="text-left" {...props} />
    ),
    th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
      <th className="px-3 py-2 font-semibold border-b border-white/10 bg-white/5" {...props} />
    ),
    td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
      <td className="px-3 py-2 align-top border-b border-white/5" {...props} />
    ),
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
      <hr className="my-3 border-white/10" {...props} />
    ),
  };

  return (
    <div className={`prose prose-invert max-w-none prose-sm sm:prose-base ${className}`}>
      <ReactMarkdown
        // @ts-ignore - these are runtime optional
        remarkPlugins={[remarkGfm, remarkMath].filter(Boolean)}
        // @ts-ignore
        rehypePlugins={[[rehypeKatex, katexOptions]].filter(Boolean)}
        // Cast is fine: react-markdown accepts a partial components map
        components={components as any}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────── */
export default function LessonOverlay({
  words,
  currentIndex,
  lesson,
  topOffset = 72,
  lingerMs = 6000,
  defaultPinned = false,
  rememberKey,
  portal = true,
  zIndex = 10000,
  freeMove = true,
  fullOnMaximize = true,
}: LessonOverlayProps) {
  const portaled = portal && typeof document !== 'undefined';
  const positionClass = portaled ? 'fixed' : 'absolute';

  // 1) Sentence ranges
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

  // 2) Items to show
  const items = useMemo<OverlayItem[]>(() => {
    if (!lesson) return [];
    const normalizeAt = (n?: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n - 1)) : undefined;

    const out: OverlayItem[] = [];
    (lesson.formulas || []).forEach((f, i) => {
      const at0 = normalizeAt(f.announceAtSentence);
      if (typeof at0 === 'number') {
        const varsMd = Array.isArray(f.variables) && f.variables.length
          ? `\n\n**Variables**\n${f.variables.map(v => `- **${v.symbol}** — ${v.meaning}`).join('\n')}`
          : '';
        const readLine = f.speakAs ? `\n\n_Read as_: ${f.speakAs}` : '';
        const md = `**${f.title || f.id || 'Formula'}**\n\n$$\n${f.latex || ''}\n$$${varsMd}${readLine}`;
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

  const latestIdx = useMemo(() => {
    if (!items.length) return -1;
    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].at <= currentSentenceIndex) idx = i; else break;
    }
    return idx;
  }, [items, currentSentenceIndex]);

  // 3) UI state + persistence
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
    } catch { return defaultSaved; }
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

  // 4) Items grouped by the last triggered sentence
  const group = useMemo(() => {
    if (activeIdx < 0) return [] as OverlayItem[];
    const at = items[activeIdx]?.at;
    return items.filter(it => it.at === at);
  }, [activeIdx, items]);

  // 5) Dragging
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

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
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || maximized) return;
    e.preventDefault();
    const { dx, dy } = dragState.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = cardRef.current;
    const rect = el ? el.getBoundingClientRect() : ({ width: 360, height: 220 } as DOMRect);
    const loX = 0, hiX = vw - rect.width;
    const loY = freeMove ? 0 : topOffset;
    const hiY = vh - rect.height - 8;
    setPos({ x: clamp(e.clientX - dx, loX, hiX), y: clamp(e.clientY - dy, loY, hiY) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null;
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // 6) Keyboard: Escape exits Maximize
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && maximized) setMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  // 7) Minimized chip
  if (minimized) {
    const chip = (
      <button
        className={`${positionClass} right-3 bottom-3 px-3 py-2 rounded-full bg-black/60 text-white text-sm ring-1 ring-white/15 shadow-lg`}
        style={{ zIndex }}
        onClick={() => setMinimized(false)}
        title="Show notes"
      >
        Notes
      </button>
    );
    return portaled ? ReactDOM.createPortal(chip, document.body) : chip;
  }

  if (!group.length || !visible) return null;

  const HeaderButtons = (
    <div className="ml-auto flex items-center gap-1.5">
      <button className="chip" onClick={() => setPinned(p => !p)} title={pinned ? 'Unpin' : 'Pin'}>
        {pinned ? 'Unpin' : 'Pin'}
      </button>
      <button className="chip" onClick={() => setMinimized(true)} title="Minimize">Minimize</button>
      {maximized ? (
        <button className="chip" onClick={() => setMaximized(false)} title="Restore">Restore</button>
      ) : (
        <button className="chip" onClick={() => setMaximized(true)} title="Maximize">Maximize</button>
      )}
    </div>
  );

  /* ───────────────────────────────────────────────────────
     8) Full-screen Maximize (fills all available viewport)
     ─────────────────────────────────────────────────────── */
  if (maximized && fullOnMaximize) {
    const panel = (
      <AnimatePresence>
        <motion.div
          key="overlay-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`${positionClass} inset-0 bg-black/70 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl`}
          style={{ zIndex }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-black/35 ring-1 ring-white/10"
               style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="text-sm font-semibold truncate">{lesson?.title || 'Lesson notes'}</div>
            {HeaderButtons}
          </div>

          {/* Two-column flow on wide screens; cards avoid breaking across columns */}
          <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3 sm:columns-2 sm:gap-5"
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {group.map((it) => (
              <div key={it.key} className="break-inside-avoid rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 sm:p-5">
                <div className="text-[11px] sm:text-xs uppercase tracking-wide opacity-70 mb-2">
                  {it.kind === 'formula' ? 'Formula' : 'Table'}
                </div>
                <Markdown>
                  {it.md}
                </Markdown>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
    return portaled ? ReactDOM.createPortal(panel, document.body) : panel;
  }

  /* ───────────────────────────────────────────────────────
     9) Floating draggable card
     ─────────────────────────────────────────────────────── */
  const card = (
    <AnimatePresence>
      <motion.div
        key={`overlay-float-${activeIdx}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className={`${positionClass}`}
        style={{ left: pos.x, top: pos.y, zIndex, touchAction: 'none' as any }}
        aria-live="polite"
      >
        <div
          ref={cardRef}
          className="pointer-events-auto w-[min(92vw,420px)] max-w-[92vw] rounded-2xl bg-black/70 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl"
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 select-none bg-white/10 rounded-t-2xl ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                <Markdown>
                  {it.md}
                </Markdown>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return portaled ? ReactDOM.createPortal(card, document.body) : card;
}
