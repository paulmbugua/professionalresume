// packages/shared/hooks/useWordSync.ts
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRobotSpeaker } from './useRobotSpeaker';
import type { WordTiming, SpeakResp } from '../api/ttsAvatarApi';
import { bestAudioUrl } from '../api/ttsAvatarApi';

/* ─────────────────────────────────────────────────────────
   Local types
───────────────────────────────────────────────────────── */
type Viseme = { time: number; id: number };

type RobotSpeaker = {
  speak: (backendBase: string, ...rest: unknown[]) => Promise<unknown>;
  requestSpeech?: (backendBase: string, ...rest: unknown[]) => Promise<unknown>;
  loading: boolean;
  error: string | null;
  data?: SpeakResp | null;
  getVisemes?: () => Viseme[] | undefined;
};

type ExtendedSpeakResp = SpeakResp & { ssml?: string; text?: string; rawText?: string };

/* ─────────────────────────────────────────────────────────
   Helpers (no exports here; we export once at bottom)
───────────────────────────────────────────────────────── */
const TRANSITION_RE = /^(?:First,|Next,|Now,|For example,|However,|Then,|Finally,|In short,)\s*/i;

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

function normalizeAndDeEcho(input?: string): string {
  if (!input) return '';
  let txt = input
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(
      /&nbsp;|&amp;|&lt;|&gt;/g,
      (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>' }[m] as string)
    )
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
    const cur = chunks[i];
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(cur);
      continue;
    }
    const a = norm(prev);
    const b = norm(cur);
    const same = a === b;
    const aContainsB = a && b && a.includes(b);
    const bContainsA = a && b && b.includes(a);
    const prefixOverlap = a.length > 8 && (a.startsWith(b) || b.startsWith(a));
    if (same) continue;
    if (aContainsB || bContainsA || prefixOverlap) {
      out[out.length - 1] = b.length >= a.length ? cur : prev;
      continue;
    }
    out.push(cur);
  }
  return out.join(' ').replace(/\s+([.,!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function parseSimpleVttOrSrt(text: string): WordTiming[] {
  const lines = text.split(/\r?\n/);
  const out: WordTiming[] = [];
  let i = 0;
  const ts =
    /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/;
  const toSec = (h?: string, m?: string, s?: string, ms?: string) =>
    Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0) + Number(ms || 0) / 1000;

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

function approximateFromVisemes(visemes: Viseme[] | undefined, ssmlOrText?: string): WordTiming[] {
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
      const overlap =
        a && b && (a.includes(b) || b.includes(a) || a.startsWith(b) || b.startsWith(a));
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

function isPerToken(words: WordTiming[]): boolean {
  if (words.length < 8) return false;
  let short = 0;
  for (let i = 0; i < words.length; i++) if ((words[i].text || '').length <= 8) short++;
  return short / words.length > 0.6;
}

function normTok(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .trim();
}

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
        if (normTok(words[i + 1 + k].text) !== lastL[k]) {
          match = false;
          break;
        }
      }
      if (match) {
        i += L;
        skipped = true;
        break;
      }
    }
    if (skipped) {
      i++;
      continue;
    }

    // lookahead overlap
    for (let L = Math.min(MAX_L, tokWindow.length); L >= MIN_L; L--) {
      const lastL = tokWindow.slice(-L);
      const ahead: string[] = [];
      for (let k = 1; k <= LOOKAHEAD && i + k < words.length; k++)
        ahead.push(normTok(words[i + k].text));
      let foundPos = -1;
      for (let start = 0; start + L <= ahead.length; start++) {
        let ok = true;
        for (let k = 0; k < L; k++) {
          if (ahead[start + k] !== lastL[k]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          foundPos = start;
          break;
        }
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

function indexAtTime(arr: WordTiming[], t: number): number {
  let lo = 0,
    hi = arr.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = arr[mid];
    if (t < w.start) hi = mid - 1;
    else if (t >= w.end) lo = mid + 1;
    else {
      ans = mid;
      break;
    }
  }
  return ans;
}

export type SentenceTiming = { text: string; start: number; end: number; indices: number[] };

function groupWordsBySentence(words: WordTiming[], maxChars: number): SentenceTiming[] {
  const sentences: SentenceTiming[] = [];
  let buf = '',
    start = 0,
    idxs: number[] = [];
  const isEnd = (t: string) => /[\.!\?]["']?$/.test(t);
  words.forEach((w, i) => {
    const piece = (buf ? ' ' : '') + w.text;
    if (!buf) start = w.start;
    buf += piece;
    idxs.push(i);
    if (isEnd(w.text) || buf.length >= maxChars) {
      sentences.push({ text: buf.trim(), start, end: w.end, indices: idxs });
      buf = '';
      idxs = [];
    }
  });
  if (buf && idxs.length)
    sentences.push({
      text: buf.trim(),
      start,
      end: words[idxs[idxs.length - 1]].end,
      indices: idxs,
    });
  return sentences;
}

/* ─────────────────────────────────────────────────────────
   PURE hook (no DOM/AudioContext/Expo)
───────────────────────────────────────────────────────── */
export function useWordSync() {
  const robot = useRobotSpeaker() as unknown as RobotSpeaker;

  const [words, setWords] = useState<WordTiming[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const [endedTick, setEndedTick] = useState(0);

  const lastBaseRef = useRef<string>('');

  const speak = useCallback(
    async (backendBase: string, ...rest: unknown[]) => {
      lastBaseRef.current = backendBase;
      return robot.speak(backendBase, ...rest);
    },
    [robot]
  );

  const requestSpeech = useCallback(
    async (backendBase: string, ...rest: unknown[]) => {
      lastBaseRef.current = backendBase;
      return robot.requestSpeech?.(backendBase, ...rest);
    },
    [robot]
  );

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const resp: SpeakResp | null = robot.data ?? null;
    let cancelled = false;

    async function apply() {
      if (!resp) {
        if (!cancelled) {
          setWords([]);
          setAudioUrl(null);
          setCurrentIndex(0);
        }
        return;
      }

      let nextWords: WordTiming[] = [];

      if (resp.words?.length) {
        nextWords = resp.words;
      } else if (resp.subtitleVttUrl || resp.subtitleSrtUrl) {
        const base = lastBaseRef.current;
        const url = toAbsolute(base, resp.subtitleVttUrl || resp.subtitleSrtUrl!);
        try {
          const r = await fetch(url);
          const txt = await r.text();
          nextWords = parseSimpleVttOrSrt(txt);
        } catch {
          nextWords = [];
        }
      } else {
        const respEx: ExtendedSpeakResp = resp;
        const visemesFromResp = resp.visemes;
        const visemesFromHook =
          typeof robot.getVisemes === 'function' ? robot.getVisemes() : undefined;

        const ssmlOrText: string = respEx.ssml ?? respEx.text ?? respEx.rawText ?? '';
        const cleaned = normalizeAndDeEcho(ssmlOrText);

        const vs =
          (visemesFromResp && visemesFromResp.length ? visemesFromResp : visemesFromHook) || [];
        if (vs.length) nextWords = approximateFromVisemes(vs, cleaned);
        else nextWords = cleaned.length ? spreadEvenly(cleaned, 1) : [];
      }

      if (cancelled) return;

      if (nextWords.length) {
        nextWords = isPerToken(nextWords) ? dedupeTokenRepeats(nextWords) : compactEchoes(nextWords);
      }

      // --- sanitize timings + strong fallback --- //
      const toNum = (v: any) => (Number.isFinite(+v) ? +v : 0);

      let hasGoodTimings =
        nextWords.length > 0 &&
        Number.isFinite(toNum(nextWords[nextWords.length - 1]?.end)) &&
        toNum(nextWords[nextWords.length - 1]?.end) > 0 &&
        nextWords.every((w, i, arr) => {
          const s = toNum(w.start);
          const e = toNum(w.end);
          const prevS = i > 0 ? toNum(arr[i - 1].start) : -Infinity;
          return Number.isFinite(s) && Number.isFinite(e) && e >= s && s >= prevS;
        });

      // If timing fields are missing/bad, rebuild evenly over a sensible duration
      if (!hasGoodTimings) {
        const respEx: any = resp;
        const cleaned =
          normalizeAndDeEcho(respEx?.ssml ?? respEx?.text ?? respEx?.rawText ?? '') ||
          normalizeAndDeEcho(nextWords.map((w: any) => w.text).join(' '));

        // Prefer a real duration if we can infer it; else estimate ~0.35s per token
        const visLast =
          (resp?.visemes && resp.visemes.length
            ? resp.visemes[resp.visemes.length - 1].time
            : 0) || 0;
        const approxDur =
          visLast > 0
            ? Math.max(0.5, visLast + 0.25)
            : Math.max(1, cleaned.split(/\s+/).filter(Boolean).length * 0.35);

        nextWords = spreadEvenly(cleaned, approxDur);
        hasGoodTimings = nextWords.length > 0;
      }

      // Final normalization just in case
      if (hasGoodTimings) {
        nextWords = nextWords.map((w: any) => ({
          start: toNum(w.start),
          end: Math.max(toNum(w.start), toNum(w.end)),
          text: String(w.text ?? '').trim() || '…',
        }));
      }

      nextWords.sort((a, b) => a.start - b.start);
      setWords(nextWords);
      setCurrentIndex(0);

      let src: string | null = null;
      try {
        src = bestAudioUrl(lastBaseRef.current, resp);
      } catch {
        src = resp.url ?? null;
      }

      if (!cancelled) setAudioUrl(src);
    }

    apply();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot.data]);

  // Player drives time -> we map to index
  const setTime = useCallback(
    (seconds: number) => {
      if (!words.length) {
        setCurrentIndex(0);
        return;
      }
      const idx = indexAtTime(words, Math.max(0, seconds));
      if (idx !== -1 && idx !== currentIndexRef.current) {
        currentIndexRef.current = idx;
        setCurrentIndex(idx);
      }
    },
    [words]
  );

  const getTimeForWord = useCallback(
    (i: number) => {
      if (!words[i]) return 0;
      return Math.max(0, words[i].start + 0.001);
    },
    [words]
  );

  const markEnded = useCallback(() => {
    setEndedTick((t) => t + 1);
  }, []);

  const sentenceGroups = useMemo(() => groupWordsBySentence(words, 48), [words]);

  const durationFromWords = useMemo(
    () => (words.length ? words[words.length - 1].end : 0),
    [words]
  );

  const retimeEvenly = useCallback((totalDurationSec: number) => {
  // Build a single string from current words; if empty, no-op
  const joined = (words || []).map(w => String(w.text || '')).join(' ').trim();
  if (!joined) return;
  const rebuilt = spreadEvenly(normalizeAndDeEcho(joined), Math.max(0.5, totalDurationSec));
  if (rebuilt.length) {
    setWords(rebuilt.map(w => ({
      start: Number(w.start) || 0,
      end: Math.max(Number(w.start) || 0, Number(w.end) || 0),
      text: String(w.text || '…'),
    })));
    setCurrentIndex(0);
  }
}, [words]);


  return {
    // TTS
    speak,
    requestSpeech,
    loading: robot.loading,
    error: robot.error,
    retimeEvenly,

    // timings & sync
    words,
    sentenceGroups,
    currentIndex,
    setTime,
    getTimeForWord,
    durationFromWords,
    markEnded,

    // media
    audioUrl,

    // end signal
    endedTick,
  };
}

/* ─────────────────────────────────────────────────────────
   Single export block for helpers (no duplicates)
───────────────────────────────────────────────────────── */
export {
  normalizeAndDeEcho,
  parseSimpleVttOrSrt,
  approximateFromVisemes,
  spreadEvenly,
  compactEchoes,
  dedupeTokenRepeats,
  groupWordsBySentence,
  isPerToken,
  indexAtTime,
};
