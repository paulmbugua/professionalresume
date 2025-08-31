// packages/shared/hooks/useRobotSpeaker.ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { speakRobot, SpeakReq, SpeakResp, Viseme } from '../api/ttsAvatarApi';

type State = SpeakResp | null;

export function useRobotSpeaker() {
  const [data, setData] = useState<State>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep visemes in a ref for fast lookup (component re-renders not required)
  const visemesRef = useRef<Viseme[]>([]);

  const setFromResponse = useCallback((resp: SpeakResp) => {
    // On cache hit, backend may omit visemes — keep existing if present
    if (resp.visemes && resp.visemes.length) {
      visemesRef.current = resp.visemes;
    }
    setData(resp);
  }, []);

  const requestSpeech = useCallback(
    async (body: SpeakReq) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await speakRobot(body);
        setFromResponse(resp);
      } catch (e: any) {
        setError(e?.message || 'Failed to synthesize speech');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setFromResponse]
  );

  /**
   * Get the current viseme for t (seconds).
   * Returns the last viseme whose time <= t (binary search).
   */
  const getCurrentViseme = useCallback((tSec: number) => {
    const arr = visemesRef.current;
    if (!arr.length) return undefined;

    // Binary search for rightmost index with time <= tSec
    let lo = 0;
    let hi = arr.length - 1;
    let ans = 0;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time <= tSec) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return arr[ans];
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    visemesRef.current = [];
  }, []);

  // Convenience helper to quickly synthesize with either ssml or text
  const speak = useCallback(
    async (opts: SpeakReq) => requestSpeech(opts),
    [requestSpeech]
  );

  return useMemo(
    () => ({
      data,           // SpeakResp | null (contains url, optional subtitleVttUrl/subtitleSrtUrl, etc.)
      loading,        // boolean
      error,          // string | null
      requestSpeech,  // (body: SpeakReq) => Promise<void>
      speak,          // alias for requestSpeech
      getCurrentViseme, // (t: number) => Viseme | undefined
      reset,          // () => void
    }),
    [data, loading, error, requestSpeech, speak, getCurrentViseme, reset]
  );
}
