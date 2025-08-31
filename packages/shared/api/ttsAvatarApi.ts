// packages/shared/api/ttsAvatarApi.ts

// -------------------- Types --------------------
export type Viseme = { time: number; id: number };

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
  words?: WordTiming[];
};

// -------------------- Helpers --------------------
function resolveBackendUrl(): string {
  // In browsers with Vite (web):
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env)
    ? (import.meta as any).env
    : undefined;

  // Prefer explicit Vite variable if present
  const viteBackend = viteEnv?.VITE_BACKEND_URL as string | undefined;
  if (viteBackend && typeof viteBackend === 'string') return viteBackend.replace(/\/+$/, '');

  // Optional global override the host app can inject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalOverride = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined;
  if (globalOverride) return globalOverride.replace(/\/+$/, '');

  // Node/SSR fallback
  const nodeEnv =
    (typeof process !== 'undefined' && process.env) ? process.env : ({} as Record<string, string | undefined>);
  const nodeUrl = nodeEnv.BACKEND_URL || `http://localhost:${nodeEnv.PORT || 4000}`;

  return String(nodeUrl).replace(/\/+$/, '');
}

// -------------------- API --------------------
const BASE = resolveBackendUrl();

/**
 * POST /api/ttsAvatar/speak
 * Returns MP3 url + (optionally) visemes & captions.
 */
export async function speakRobot(body: SpeakReq): Promise<SpeakResp> {
  const res = await fetch(`${BASE}/api/ttsAvatar/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // include credentials only if your server needs cookies:
    // credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`speakRobot failed: ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`);
  }

  const json = (await res.json()) as SpeakResp;

  // Normalize to absolute URL if backend ever returns a relative path
  const absolutify = (u?: string) => {
    if (!u) return u;
    if (/^https?:\/\//i.test(u)) return u;
    return `${BASE}${u.startsWith('/') ? '' : '/'}${u}`;
  };

  return {
    ...json,
    url: absolutify(json.url)!,
    subtitleVttUrl: absolutify(json.subtitleVttUrl),
    subtitleSrtUrl: absolutify(json.subtitleSrtUrl),
  };
}
