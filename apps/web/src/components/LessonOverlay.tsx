// LessonOverlay.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  | { kind: 'formula'; at: number; key: string; md: string }
  | { kind: 'table';   at: number; key: string; md: string };

const SENTENCE_END = /[.!?…]+["')\]]?$/;

export default function LessonOverlay({ words, currentIndex, lesson, topOffset = 72 }: LessonOverlayProps) {
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

  // 1) Build queue from lesson metadata
  const overlayQueue = useMemo<OverlayItem[]>(() => {
    if (!lesson) return [];
    const normalizeAt = (n?: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.round(n - 1)) : undefined;

    const items: OverlayItem[] = [];

    (lesson.formulas || []).forEach((f, i) => {
      const at0 = normalizeAt(f.announceAtSentence);
      if (typeof at0 === 'number') {
        const md = `**${f.title || f.id || 'Formula'}**\n\n$$\n${f.latex || ''}\n$$`;
        items.push({ kind: 'formula', at: at0, key: `F${i}:${f.id || i}`, md });
      }
    });

    (lesson.tables || []).forEach((t, i) => {
      const at0 = normalizeAt(t.announceAtSentence);
      if (typeof at0 === 'number' && (t.columns?.length || 0) && (t.rows?.length || 0)) {
        items.push({ kind: 'table', at: at0, key: `T${i}:${t.title || i}`, md: renderGfmTable(t) });
      }
    });

    return items.sort((a, b) => a.at - b.at);
  }, [lesson]);

  // 2) Pick items due for the current sentence
  const [active, setActive] = useState<OverlayItem[]>([]);
  useEffect(() => {
    setActive(overlayQueue.filter(x => x.at === currentSentenceIndex));
  }, [overlayQueue, currentSentenceIndex]);

  if (!active.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`overlay-${currentSentenceIndex}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.2 }}
        className="absolute right-2 sm:right-3 z-40 max-w-[92vw] sm:max-w-[520px] pointer-events-none"
        style={{ top: topOffset }}
        aria-live="polite"
      >
        {active.map((it, idx) => (
          <div
            key={it.key + ':' + idx}
            className="mb-2 pointer-events-auto rounded-2xl bg-black/70 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl p-3 sm:p-4 text-white"
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
      </motion.div>
    </AnimatePresence>
  );
}
