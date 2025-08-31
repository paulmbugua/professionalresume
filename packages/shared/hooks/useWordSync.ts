// packages/shared/hooks/useWordSync.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRobotSpeaker } from './useRobotSpeaker';
import type { WordTiming } from '../api/ttsAvatarApi';

// Very small VTT/SRT line parser (expects whole-line timings, not per word)
function parseSimpleVttOrSrt(text: string): WordTiming[] {
  // This turns each caption line into one “word” block; you can enhance to per-word later
  const lines = text.split(/\r?\n/);
  const out: WordTiming[] = [];
  let i = 0;
  const ts = /(\d+):(\d+):(\d+\.\d+)\s*-->\s*(\d+):(\d+):(\d+\.\d+)/;
  while (i < lines.length) {
    if (ts.test(lines[i])) {
      const m = lines[i].match(ts)!;
      const toSec = (h: string, m: string, s: string) => Number(h) * 3600 + Number(m) * 60 + Number(s);
      const start = toSec(m[1], m[2], m[3]);
      const end = toSec(m[4], m[5], m[6]);
      let textLine = '';
      i++;
      while (i < lines.length && lines[i].trim()) {
        textLine += (textLine ? ' ' : '') + lines[i].trim();
        i++;
      }
      out.push({ start, end, text: textLine || '...' });
    }
    i++;
  }
  return out;
}

// crude viseme → word blocks (approx), groups N visemes per chunk
function approximateFromVisemes(visemes: { time: number; id: number }[], ssmlOrText?: string): WordTiming[] {
  if (!visemes?.length) return [];
  const words = (ssmlOrText || '').replace(/<\/?[^>]+>/g, ' ')
    .split(/\s+/).filter(Boolean);
  const chunks = Math.max(1, words.length);
  const dur = (visemes.at(-1)!.time || 0) + 0.3;
  const per = dur / chunks;

  let t = 0;
  const out: WordTiming[] = [];
  for (let i = 0; i < chunks; i++) {
    const start = t;
    const end = Math.min(dur, start + per);
    out.push({ start, end, text: words[i] ?? '...' });
    t = end;
  }
  return out;
}

export function useWordSync() {
  const robot = useRobotSpeaker();
  const [words, setWords] = useState<WordTiming[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // create audio element once
  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    a.onended = () => setIsPlaying(false);
    a.ontimeupdate = () => {
      const t = a.currentTime;
      const i = words.findIndex(w => t >= w.start && t < w.end);
      if (i !== -1) setCurrentIndex(i);
    };
    audioEl.current = a;
    return () => { a.pause(); audioEl.current = null; };
  }, [words]);

  // whenever SpeakResp arrives, choose best source of timings
  useEffect(() => {
    const resp = robot.data;
    if (!resp) return;

    const apply = async () => {
      // 1) direct words
      if (resp.words?.length) {
        setWords(resp.words);
      // 2) fetch VTT/SRT
      } else if (resp.subtitleVttUrl || resp.subtitleSrtUrl) {
        const url = resp.subtitleVttUrl || resp.subtitleSrtUrl!;
        const txt = await (await fetch(url)).text();
        setWords(parseSimpleVttOrSrt(txt));
      // 3) fallback: approximate from visemes
      } else if (robot.data?.visemes?.length) {
        setWords(approximateFromVisemes(robot.data.visemes));
      } else {
        setWords([]);
      }

      if (audioEl.current) {
        audioEl.current.src = resp.url;
        audioEl.current.currentTime = 0;
      }
    };
    apply();
  }, [robot.data]);

  const play = () => audioEl.current?.play().then(() => setIsPlaying(true));
  const pause = () => { audioEl.current?.pause(); setIsPlaying(false); };
  const seekToWord = (i: number) => {
    if (!audioEl.current || !words[i]) return;
    audioEl.current.currentTime = words[i].start + 0.001;
    setCurrentIndex(i);
  };

  return {
    // from your hook
    speak: robot.speak,
    requestSpeech: robot.requestSpeech,
    loading: robot.loading,
    error: robot.error,

    // captions control
    words,
    isPlaying,
    currentIndex,
    play, pause, seekToWord,
  };
}
