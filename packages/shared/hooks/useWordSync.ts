// packages/shared/hooks/useWordSync.ts
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRobotSpeaker } from './useRobotSpeaker';
import type { WordTiming } from '../api/ttsAvatarApi';
import { bestAudioUrl } from '../api/ttsAvatarApi';

/* ----------------------------------------------------------------------------
   Transition (discourse marker) handling used by de-echo logic
---------------------------------------------------------------------------- */
const TRANSITION_RE = /^(?:First,|Next,|Now,|For example,|However,|Then,|Finally,|In short,)\s*/i;

/** Minimal absolute join in case captions come back as relative paths */
function toAbsolute(base?: string, path?: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return path;
  const b = String(base).replace(/\/+$/, '');
  return `${b}${path.startsWith('/') ? '' : '/'}${path}`;
}

function normalizeCoreForEcho(s: string): string {
  return s
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(TRANSITION_RE, '')
    .toLowerCase()
    .replace(/['"“”‘’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize text (strip tags/entities/spaces) and remove immediate duplicate sentences/phrases.
 *  Prefers the LONGER variant when one contains the other (e.g., heading + full sentence). */
function normalizeAndDeEcho(input?: string): string {
  if (!input) return '';
  let txt = input
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;/g, (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>' }[m] as string))
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!txt) return '';

  const chunks = txt
    .split(/([.?!])/)
    .reduce<string[]>((acc, part) => {
      if (!part.trim()) return acc;
      if (/^[.?!]$/.test(part) && acc.length) acc[acc.length - 1] += part;
      else acc.push(part.trim());
      return acc;
    }, [])
    .filter(Boolean);

  const out: string[] = [];
  const norm = (s: string) => normalizeCoreForEcho(s);
  for (let i = 0; i < chunks.length; i++) {
    const cur = chunks[i], prev = out[out.length - 1];
    if (!prev) { out.push(cur); continue; }
    const a = norm(prev), b = norm(cur);
    const same = a === b;
    const aContainsB = a && b && a.includes(b);
    const bContainsA = a && b && b.includes(a);
    const prefixOverlap = a.length > 8 && (a.startsWith(b) || b.startsWith(a));
    if (same) continue;
    if (aContainsB || bContainsA || prefixOverlap) {
      out[out.length - 1] = (b.length >= a.length) ? cur : prev;
      continue;
    }
    out.push(cur);
  }
  return out.join(' ').replace(/\s+([.,!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/** Parse VTT/SRT (supports comma or dot decimals, with/without hours) into line-level "word" blocks. */
function parseSimpleVttOrSrt(text: string): WordTiming[] {
  const lines = text.split(/\r?\n/);
  const out: WordTiming[] = [];
  let i = 0;
  const ts = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/;
  const toSec = (h?: string, m?: string, s?: string, ms?: string) =>
    (Number(h || 0) * 3600) + (Number(m || 0) * 60) + Number(s || 0) + Number(ms || 0) / 1000;

  while (i < lines.length) {
    const m = lines[i].match(ts);
    if (m) {
      const start = toSec(m[1], m[2], m[3], m[4]);
      const end = toSec(m[5], m[6], m[7], m[8]);
      i++;
      let textLine = '';
      while (i < lines.length && lines[i].trim()) {
        textLine += (textLine ? ' ' : '') + lines[i].trim();
        i++;
      }
      out.push({ start, end, text: textLine || '…' });
    }
    i++;
  }
  return out;
}

/** Build (approximate) per-word timings from visemes and optional original text/SSML. */
function approximateFromVisemes(
  visemes: { time: number; id: number }[] | undefined,
  ssmlOrText?: string
): WordTiming[] {
  if (!visemes?.length) return [];
  const plain = normalizeAndDeEcho(ssmlOrText);
  const words = plain ? plain.split(/\s+/) : [];
  const chunks = Math.max(1, words.length || Math.ceil(visemes.length / 2));
  const lastTime = visemes[visemes.length - 1]?.time ?? 0;
  const dur = Math.max(0.5, lastTime + 0.25);
  const per = dur / chunks;

  let t = 0;
  const out: WordTiming[] = [];
  for (let i = 0; i < chunks; i++) {
    const start = t;
    const end = Math.min(dur, start + per);
    out.push({ start, end, text: words[i] ?? '…' });
    t = end;
  }
  return out;
}

/** Evenly distribute words across a duration when no timing data exists. */
function spreadEvenly(wordsText: string, durationSec: number): WordTiming[] {
  const tokens = wordsText.replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const dur = Math.max(0.5, durationSec);
  const per = dur / tokens.length;
  const out: WordTiming[] = [];
  let t = 0;
  for (let i = 0; i < tokens.length; i++) {
    const start = t;
    const end = i === tokens.length - 1 ? dur : start + per;
    out.push({ start, end, text: tokens[i] });
    t = end;
  }
  return out;
}

/** Merge/clean adjacent echo-y blocks (for line-level captions). */
function compactEchoes(arr: WordTiming[]): WordTiming[] {
  if (arr.length < 2) return arr;
  const out: WordTiming[] = [];
  const norm = (s: string) => normalizeCoreForEcho(s);
  const stripPunct = (s: string) => s.replace(/\s+([.,!?;:])/g, '$1').trim();

  let i = 0;
  while (i < arr.length) {
    let cur = { ...arr[i] };
    let j = i + 1;
    while (j < arr.length) {
      const a = stripPunct(norm(cur.text));
      const b = stripPunct(norm(arr[j].text));
      const same = a === b && a.length > 0;
      const overlap = a && b && (a.includes(b) || b.includes(a) || a.startsWith(b) || b.startsWith(a));
      if (same || overlap) {
        const preferB = b.length > a.length;
        cur = {
          start: Math.min(cur.start, arr[j].start),
          end: Math.max(cur.end, arr[j].end),
          text: preferB ? arr[j].text : cur.text,
        };
        j++;
        continue;
      }
      break;
    }
    out.push(cur);
    i = j;
  }
  return out;
}

/** Heuristic: are these timings per-token (word-ish) rather than line-level? */
function isPerToken(words: WordTiming[]): boolean {
  if (words.length < 8) return false;
  let short = 0;
  for (let i = 0; i < words.length; i++) {
    if ((words[i].text || '').length <= 8) short++;
  }
  return short / words.length > 0.6;
}

/** Token normalization for repeat detection. */
function normTok(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .trim();
}

/** Remove repeated token sequences (forward & lookahead). */
function dedupeTokenRepeats(words: WordTiming[]): WordTiming[] {
  const MIN_L = 3;
  const MAX_L = 8;
  const LOOKAHEAD = 10;

  const out: WordTiming[] = [];
  const tokWindow: string[] = [];

  let i = 0;
  while (i < words.length) {
    const cur = words[i];
    const tcur = normTok(cur.text);
    out.push(cur);
    tokWindow.push(tcur);

    // forward duplicate
    let skipped = false;
    for (let L = Math.min(MAX_L, tokWindow.length); L >= MIN_L; L--) {
      if (i + L >= words.length) continue;
      const lastL = tokWindow.slice(-L);
      let match = true;
      for (let k = 0; k < L; k++) {
        if (normTok(words[i + 1 + k].text) !== lastL[k]) { match = false; break; }
      }
      if (match) {
        i += L;
        skipped = true;
        break;
      }
    }
    if (skipped) { i++; continue; }

    // lookahead overlap
    for (let L = Math.min(MAX_L, tokWindow.length); L >= MIN_L; L--) {
      const lastL = tokWindow.slice(-L);
      const ahead: string[] = [];
      for (let k = 1; k <= LOOKAHEAD && i + k < words.length; k++) ahead.push(normTok(words[i + k].text));
      let foundPos = -1;
      for (let start = 0; start + L <= ahead.length; start++) {
        let ok = true;
        for (let k = 0; k < L; k++) {
          if (ahead[start + k] !== lastL[k]) { ok = false; break; }
        }
        if (ok) { foundPos = start; break; }
      }
      if (foundPos !== -1) {
        out.splice(out.length - L, L);
        tokWindow.splice(tokWindow.length - L, L);
        break;
      }
    }

    i++;
  }
  return out;
}

/** Binary search into timing array for current time. */
function indexAtTime(arr: WordTiming[], t: number): number {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = arr[mid];
    if (t < w.start) hi = mid - 1;
    else if (t >= w.end) lo = mid + 1;
    else { ans = mid; break; }
  }
  return ans;
}

/* ----------------------------------------------------------------------------
   Sentence-aware grouping helpers for slide/caption alignment
---------------------------------------------------------------------------- */
export type SentenceTiming = { text: string; start: number; end: number; indices: number[] };

function groupWordsBySentence(words: WordTiming[], maxChars: number): SentenceTiming[] {
  const sentences: SentenceTiming[] = [];
  let buf = '', start = 0, idxs: number[] = [];
  const isEnd = (t: string) => /[\.!\?]["']?$/.test(t);

  words.forEach((w, i) => {
    const piece = (buf ? ' ' : '') + w.text;
    if (!buf) start = w.start;
    buf += piece;
    idxs.push(i);

    if (isEnd(w.text) || buf.length >= maxChars) {
      sentences.push({ text: buf.trim(), start, end: w.end, indices: idxs });
      buf = ''; idxs = [];
    }
  });

  if (buf && idxs.length) {
    sentences.push({
      text: buf.trim(),
      start,
      end: words[idxs[idxs.length - 1]].end,
      indices: idxs
    });
  }

  return sentences;
}

/* ----------------------------------------------------------------------------
   Hook
---------------------------------------------------------------------------- */
export function useWordSync() {
  const robot = useRobotSpeaker();

  const [words, setWords] = useState<WordTiming[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioEl = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);

  // remember the last backend base we spoke against (for bestAudioUrl)
  const lastBaseRef = useRef<string>('');

  // expose speak/request wrappers that also record the base URL
  const speak = useCallback(
    async (backendBase: string, ...rest: any[]) => {
      lastBaseRef.current = backendBase;
      // @ts-ignore downstream signature
      return robot.speak(backendBase, ...rest);
    },
    [robot]
  );
  const requestSpeech = useCallback(
    async (backendBase: string, ...rest: any[]) => {
      lastBaseRef.current = backendBase;
      // @ts-ignore downstream signature
      return (robot as any).requestSpeech?.(backendBase, ...rest);
    },
    [robot]
  );

  // keep ref in sync (prevents stale reads in rAF)
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // Create a single audio element (not attached to DOM).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const a = document.createElement('audio');
    a.preload = 'auto';
    a.crossOrigin = 'anonymous';
    a.muted = false;
    a.volume = 1.0;
    a.setAttribute('playsinline', 'true');
    a.setAttribute('x-webkit-airplay', 'deny');
    a.onended = () => setIsPlaying(false);
    a.onerror = () => {
      // If the proxy stream errors, try falling back to direct URL (if different)
      try {
        const src = a.currentSrc || a.src || '';
        const data = (robot as any).data || {};
        const base = lastBaseRef.current;
        if (base && data) {
          try {
            const preferred = bestAudioUrl(base, data);
            if (preferred && preferred !== src) {
              a.src = preferred;
              a.load();
            }
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    };
    audioEl.current = a;
    return () => { try { a.pause(); } catch {} audioEl.current = null; };
  }, [robot]);

  // rAF ticker for smooth highlight (subscribes only when timings change)
  const rafId = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  useEffect(() => {
    function tick() {
      const a = audioEl.current;
      if (a && words.length) {
        const t = a.currentTime;
        if (Math.abs(t - lastTimeRef.current) > 0.0125) {
          lastTimeRef.current = t;
          const idx = indexAtTime(words, t);
          if (idx !== -1 && idx !== currentIndexRef.current) {
            currentIndexRef.current = idx;
            setCurrentIndex(idx);
          }
        }
      }
      rafId.current = requestAnimationFrame(tick);
    }
    rafId.current = requestAnimationFrame(tick);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); rafId.current = null; };
  }, [words]);

  // When a new TTS response arrives, pick the best timing source and resolve the preferred audio URL.
  useEffect(() => {
    const resp = (robot as any).data as {
      url?: string;
      streamPath?: string;
      cacheKey?: string;
      subtitleVttUrl?: string;
      subtitleSrtUrl?: string;
      words?: WordTiming[];
      visemes?: { time: number; id: number }[];
      ssml?: string;
      text?: string;
      rawText?: string;
    } | null;

    if (!resp) {
      setAudioUrl(null);
      setWords([]);
      setCurrentIndex(0);
      return;
    }

    const apply = async () => {
      const ctrl = new AbortController();
      let aborted = false;
      const onCleanup = () => { aborted = true; ctrl.abort(); };
      // install cleanup immediately for this invocation
      cleanupRef.current = onCleanup;

      let nextWords: WordTiming[] = [];

      // Prefer baked timings from backend
      if (resp.words?.length) {
        nextWords = resp.words as WordTiming[];
      } else if (resp.subtitleVttUrl || resp.subtitleSrtUrl) {
        const base = lastBaseRef.current;
        const url = toAbsolute(base, resp.subtitleVttUrl || resp.subtitleSrtUrl!);
        let txt = '';
        try {
          const r = await fetch(url, { signal: ctrl.signal });
          txt = await r.text();
        } catch {
          if (ctrl.signal.aborted) return; // ignore if aborted
        }
        nextWords = parseSimpleVttOrSrt(txt);
      } else {
        // Fallbacks: try visemes from response, then from the speaker hook (cache-hit case)
        const visemesFromResp = resp.visemes as { time: number; id: number }[] | undefined;
        const visemesFromHook = typeof (robot as any).getVisemes === 'function'
          ? (robot as any).getVisemes() as { time: number; id: number }[] | undefined
          : undefined;

        const ssmlOrText: string = (resp.ssml ?? resp.text ?? resp.rawText ?? '') as string;
        const cleaned = normalizeAndDeEcho(ssmlOrText);

        const vs = (visemesFromResp && visemesFromResp.length ? visemesFromResp : visemesFromHook) || [];
        if (vs.length) {
          nextWords = approximateFromVisemes(vs, cleaned);
        } else {
          if (cleaned.length) nextWords = spreadEvenly(cleaned, 1);
          else nextWords = [];
        }
      }

      // Clean echoes:
      if (aborted) return;
      if (nextWords.length) {
        nextWords = isPerToken(nextWords) ? dedupeTokenRepeats(nextWords) : compactEchoes(nextWords);
      }

      setWords(nextWords);
      setCurrentIndex(0);

      // Preferred audio URL: local proxy stream > derived streamPath from cacheKey > direct URL
      let src: string | null = null;
      try {
        if (aborted) return;
        src = bestAudioUrl(lastBaseRef.current, resp as any);
      } catch {
        src = resp.url ?? null;
      }

      setAudioUrl(src);

      if (audioEl.current && src) {
        const a = audioEl.current;
        if (a.src !== src) {
          a.src = src;
          try { a.load(); } catch {}
          a.onloadedmetadata = () => {
            if (
              nextWords.length &&
              nextWords[nextWords.length - 1].end <= 1 &&
              a.duration &&
              isFinite(a.duration)
            ) {
              const joined = normalizeAndDeEcho(nextWords.map(w => w.text).join(' '));
              let corrected = spreadEvenly(joined, Math.max(0.5, a.duration));
              corrected = isPerToken(corrected) ? dedupeTokenRepeats(corrected) : compactEchoes(corrected);
              setWords(corrected);
              setCurrentIndex(0);
            }
          };
        }
        a.currentTime = 0;
      }
    };

    // Track cleanup per apply() call
    const cleanupRef = { current: () => {} as any };
    // kick off
    apply();
    return () => {
      try {
        (cleanupRef.current as any)?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(robot as any).data]);

  // AudioContext helpers
  const ensureAudioContext = async () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    if (typeof window === 'undefined') return null;
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      try {
        const ctx = new AC();
        audioCtxRef.current = ctx;
        return ctx;
      } catch {}
    }
    return null;
  };

  const resumeAudioContext = async () => {
    const ctx = await ensureAudioContext();
    if (ctx && ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
  };

  const play = async () => {
    await resumeAudioContext();
    const a = audioEl.current;
    if (!a) return;
    try {
      await a.play();
      setIsPlaying(true);
    } catch (err) {
      throw err;
    }
  };

  const pause = () => {
    try { audioEl.current?.pause(); } finally { setIsPlaying(false); }
  };

  const seekToWord = (i: number) => {
    const a = audioEl.current;
    if (!a || !words[i]) return;
    a.currentTime = Math.max(0, words[i].start + 0.001);
    setCurrentIndex(i);
  };

  // OPTIONAL convenience: precomputed sentence groups (non-breaking for existing callers)
  const sentenceGroups = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const cap = isMobile ? 32 : 48;
    return groupWordsBySentence(words, cap);
  }, [words]);

  return {
    // TTS actions (wrapped to remember base for bestAudioUrl)
    speak,
    requestSpeech,

    loading: (robot as any).loading,
    error:   (robot as any).error,

    // timings
    words,
    // backward-compatible name
    sentences: sentenceGroups,
    // clearer alias
    sentenceGroups,

    isPlaying,
    currentIndex,
    play,
    pause,
    seekToWord,

    resumeAudioContext,
    audioUrl,
  };
}

/* ----------------------------------------------------------------------------
   Re-exports (named helpers) — handy for unit tests & other players
---------------------------------------------------------------------------- */
export {
  normalizeAndDeEcho,
  parseSimpleVttOrSrt,
  approximateFromVisemes,
  spreadEvenly,
  compactEchoes,
  dedupeTokenRepeats,
  groupWordsBySentence,
  indexAtTime,
};
