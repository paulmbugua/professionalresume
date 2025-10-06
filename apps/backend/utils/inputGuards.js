// apps/backend/utils/inputGuards.js
export const ALLOWED_VOICES = new Set(['en-US-JennyNeural', 'en-US-AriaNeural']);

export function safeVoice(v) {
  const vv = String(v || '').trim();
  return ALLOWED_VOICES.has(vv) ? vv : 'en-US-JennyNeural';
}

export const TRACKS = new Set(['general', 'module', 'certificate']);

export function safeTrack(t) {
  const tt = String(t || '').trim().toLowerCase();
  return TRACKS.has(tt) ? tt : 'general';
}
