// packages/shared/api/ttsAvatarApi.ts

// -------------------- Types --------------------
export type Viseme = { time: number; id: number };
export type WordTiming = { start: number; end: number; text: string };

export type SpeakReq = {
  ssml?: string;
  text?: string;
  voiceName?: string;
  rate?: string;   // e.g. "0%", "+10%", "-15%"
  pitch?: string;  // e.g. "0st", "+2st", "-3st"
};

export type SpeakResp = {
  url: string;               // MP3 URL (Cloudinary secure_url or absolute URL)
  visemes?: Viseme[];        // may be omitted on cache hit
  cacheKey: string;
  cached: boolean;
  subtitleVttUrl?: string;   // WebVTT captions (optional)
  subtitleSrtUrl?: string;   // SRT captions (optional)
  words?: WordTiming[];      // optional
};

// -------------------- Helpers --------------------
export function normalizeBase(backendUrl: string | URL | null | undefined) {
  if (!backendUrl) throw new Error('Missing backendUrl');
  const s = backendUrl instanceof URL ? backendUrl.toString() : String(backendUrl);
  return s.replace(/\/+$/, '');
}

export class SpeakApiError extends Error {
  code?: string;
  status: number;
  statusText: string;
  body?: string;
  constructor(message: string, status: number, statusText: string, body?: string, code?: string) {
    super(message);
    this.name = 'SpeakApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    if (code) this.code = code;
  }
}

type SpeakOptions = {
  /** Request timeout in ms (default 30000) */
  timeoutMs?: number;
  /** Optionally pass your own AbortSignal to chain cancellation */
  signal?: AbortSignal;
};

// -------------------- API --------------------
/**
 * POST /api/ttsAvatar/speak
 * Returns MP3 url + (optionally) visemes & captions.
 */
export async function speakRobot(
  backendUrl: string | URL,
  body: SpeakReq,
  token?: string,
  options?: SpeakOptions
): Promise<SpeakResp> {
  const base = normalizeBase(backendUrl);
  const url = `${base}/api/ttsAvatar/speak`;

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 30_000;

  // If caller provided a signal, cancel our controller when theirs aborts
  if (options?.signal) {
    if (options.signal.aborted) controller.abort(options.signal.reason);
    else options.signal.addEventListener('abort', () => controller.abort(options.signal!.reason), { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text().catch(() => '');
  let parsed: any = undefined;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (text && isJson) {
    try { parsed = JSON.parse(text); } catch { /* ignore parse errors */ }
  }

  if (!res.ok) {
    const err = new SpeakApiError(
      `speakRobot failed: ${res.status} ${res.statusText}`,
      res.status,
      res.statusText,
      text,
      parsed?.error
    );
    throw err;
  }

  // If server returned non-JSON (shouldn't), still avoid crashing
  return (parsed ?? {}) as SpeakResp;
}
