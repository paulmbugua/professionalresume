// packages/shared/hooks/useRobotSpeaker.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { speakRobot, SpeakReq, SpeakResp, Viseme } from '../api/ttsAvatarApi';

type State = SpeakResp | null;
const COOLDOWN_MS = 2500; // wait after any failure before trying again

// Best-effort extractor for { error: "CODE" } from backend errors (or wrapped errors)
function extractErrorCode(err: any): string | undefined {
  if (!err) return undefined;
  if (typeof err.code === 'string') return err.code;
  if (typeof err.body === 'string') {
    try { const j = JSON.parse(err.body); if (typeof j?.error === 'string') return j.error; } catch {}
  }
  const msg = String(err.message || '');
  const m = msg.match(/"error"\s*:\s*"([^"]+)"/);
  if (m?.[1]) return m[1];
  try {
    const maybeJson = JSON.parse(msg.slice(msg.indexOf('{')));
    if (typeof maybeJson?.error === 'string') return maybeJson.error;
  } catch {}
  return undefined;
}

function toFriendlyError(code?: string, fallback = 'Text-to-speech failed. Please retry.') {
  switch (code) {
    case 'EMPTY_TEXT':
      return 'Please enter some text to synthesize.';
    case 'AZURE_EMPTY_AUDIO':
    case 'TTS_EMPTY_AUDIO_AFTER_RETRY':
      return 'Speech service returned empty audio. Try again in a moment.';
    case 'SPEAK_API_ERROR':
    case 'SYNTH_FAILED':
      return 'Speech service had a temporary issue. Please retry.';
    case 'UNEXPECTED':
      return 'Unexpected error while generating speech.';
    default:
      return fallback;
  }
}

export function useRobotSpeaker() {
  const [data, setData] = useState<State>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep visemes in a ref for fast lookup (component re-renders not required)
  const visemesRef = useRef<Viseme[]>([]);

  // Concurrency / lifecycle
  const inflightRef = useRef(false);
  const lastFailAtRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const callSeqRef = useRef(0); // increments per request to ignore stale responses

  const setFromResponse = useCallback((resp: SpeakResp, callId: number) => {
    // Drop stale results (in case an older request resolves after a newer one)
    if (callId !== callSeqRef.current) return;
    if (resp.visemes?.length) visemesRef.current = resp.visemes;
    setData(resp);
  }, []);

  /**
   * Request speech from backend.
   * @param backendUrl e.g. "http://localhost:4000" or new URL("https://api.example.com")
   * @param body Speak payload (text/ssml/voiceName/rate/pitch)
   * @param token Optional JWT for Authorization header
   * @param timeoutMs Optional request timeout (default 30s)
   */
  const requestSpeech = useCallback(
    async (backendUrl: string | URL, body: SpeakReq, token?: string, timeoutMs = 30_000) => {
      // Prevent overlap: abort the previous one if any
      if (inflightRef.current && abortRef.current) {
        abortRef.current.abort('superseded');
      }

      // Cooldown after a failure
      const sinceFail = Date.now() - lastFailAtRef.current;
      if (sinceFail < COOLDOWN_MS) return;

      setLoading(true);
      setError(null);
      inflightRef.current = true;

      const callId = ++callSeqRef.current;
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const resp = await speakRobot(backendUrl, body, token, { timeoutMs, signal: ctrl.signal });
        setFromResponse(resp, callId);
      } catch (e: any) {
        // If we aborted due to a new call/unmount, don't surface an error
        if (e?.name === 'AbortError') return;

        lastFailAtRef.current = Date.now();
        const code = extractErrorCode(e);
        setError(toFriendlyError(code, e?.message || 'Failed to synthesize speech'));
      } finally {
        if (callId === callSeqRef.current) {
          inflightRef.current = false;
          setLoading(false);
        }
      }
    },
    [setFromResponse]
  );

  /** Convenience alias for requestSpeech */
  const speak = useCallback(
    async (backendUrl: string | URL, opts: SpeakReq, token?: string, timeoutMs?: number) =>
      requestSpeech(backendUrl, opts, token, timeoutMs),
    [requestSpeech]
  );

  /** Get the current viseme for t (seconds). Returns the last viseme whose time <= t (binary search). */
  const getCurrentViseme = useCallback((tSec: number) => {
    const arr = visemesRef.current;
    if (!arr.length) return undefined;
    let lo = 0, hi = arr.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time <= tSec) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return arr[ans];
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort('reset');
    setData(null);
    setError(null);
    setLoading(false);
    visemesRef.current = [];
    lastFailAtRef.current = 0;
    inflightRef.current = false;
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => abortRef.current?.abort('unmount');
  }, []);

  return useMemo(
    () => ({
      data,              // SpeakResp | null
      loading,           // boolean
      error,             // string | null (human-friendly)
      requestSpeech,     // (backendUrl, body, token?, timeoutMs?) => Promise<void>
      speak,             // alias
      getCurrentViseme,  // (t: number) => Viseme | undefined
      reset,             // () => void
    }),
    [data, loading, error, requestSpeech, speak, getCurrentViseme, reset]
  );
}
