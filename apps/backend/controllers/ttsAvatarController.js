// apps/backend/controllers/ttsAvatarController.js
import { synthesizeTtsWithVisemes } from '../services/azureTtsService.js';

function shortUrl(u) {
  if (!u) return '';
  try { const { hostname, pathname } = new URL(u); return `${hostname}${pathname}`; } catch { return u; }
}
function msSince(t0) { return Number(process.hrtime.bigint() - t0) / 1e6; }
function errShape(err) {
  return {
    name: err?.name,
    code: err?.code,
    message: err?.message,
    cause: err?.cause?.message || err?.cause || undefined,
  };
}

/**
 * TTS controller
 *
 * • Default: returns JSON (urls + visemes) — backward compatible with your client.
 * • If `?raw=1` OR the request Accept header includes `audio/mpeg`, we stream the MP3 directly.
 * • No manual cancel/retry loops here. Errors map cleanly to 4xx/5xx.
 * • IMPORTANT: default pitch now uses "+0st" (Azure is picky about the leading plus).
 */
export const speakRobot = async (req, res) => {
  const t0 = process.hrtime.bigint();
  const wantsRaw =
    String(req.query?.raw || '').toLowerCase() === '1' ||
    /\baudio\/mpeg\b/.test(String(req.headers?.accept || ''));

  try {
    const { ssml, text, voiceName, rate, pitch } = req.body || {};
    const speakingRate = rate ?? '0%';
    const safePitch    = pitch ?? '+0st'; // ← note the leading '+'

    console.log(
      `[tts] speak IN voice=${voiceName || '-'} rate=${speakingRate} pitch=${safePitch} ` +
      `textLen=${text ? text.length : 0} ssmlLen=${ssml ? ssml.length : 0}`
    );

    if (!ssml && !text) {
      console.warn('[tts] speak BAD_REQUEST: empty text/ssml');
      return res.status(400).json({ message: 'TTS_FAILED', error: 'EMPTY_TEXT' });
    }

    // One clean synthesis call; chunking/sanitizing handled inside the service
    const out = await synthesizeTtsWithVisemes({
      ssml, text, voiceName, speakingRate, pitch: safePitch,
    });

    // If the caller wants raw audio, fetch from Cloudinary and stream it
    if (wantsRaw) {
      // Node 18+ has global fetch; if not, install 'node-fetch' and import it.
      const r = await fetch(out.urlPath);
      if (!r.ok) {
        console.error('[tts] fetch audio failed', out.urlPath, r.status);
        return res.status(502).json({ message: 'TTS_FAILED', error: 'AUDIO_FETCH_FAILED' });
      }
      // Stream response
      res.setHeader('Content-Type', 'audio/mpeg');
      // Expose minimal subtitles/visemes via headers if you like (optional)
      // res.setHeader('X-Subtitle-VTT', out.subtitleVttUrl || '');
      // res.setHeader('X-Subtitle-SRT', out.subtitleSrtUrl || '');
      console.log(
        `[tts] speak STREAM cached=${out.cached} url=${shortUrl(out.urlPath)} ` +
        `visemes=${out.visemes?.length ?? 0} dur=${msSince(t0).toFixed(0)}ms`
      );
      // Pipe the body directly
      return r.body.pipe(res);
    }

    // Default JSON response (backward compatible)
    console.log(
      `[tts] speak OUT cached=${out.cached} url=${shortUrl(out.urlPath)} ` +
      `visemes=${out.visemes?.length ?? 0} vtt=${!!out.subtitleVttUrl} srt=${!!out.subtitleSrtUrl} ` +
      `dur=${msSince(t0).toFixed(0)}ms`
    );

    return res.json({
      url: out.urlPath,
      subtitleVttUrl: out.subtitleVttUrl,
      subtitleSrtUrl: out.subtitleSrtUrl,
      visemes: out.visemes,
      cacheKey: out.cacheKey,
      cached: out.cached,
    });
  } catch (err) {
    const code = err?.code;
    console.error('[tts] speak ERROR', errShape(err), `dur=${msSince(t0).toFixed(0)}ms`);

    if (code === 'AZURE_EMPTY_AUDIO' || code === 'TTS_EMPTY_AUDIO_AFTER_RETRY' || code === 'SPEAK_API_ERROR' || code === 'SYNTH_FAILED') {
      return res.status(502).json({ message: 'TTS_FAILED', error: code });
    }
    if (code === 'EMPTY_TEXT') {
      return res.status(400).json({ message: 'TTS_FAILED', error: code });
    }
    return res.status(500).json({ message: 'TTS_FAILED', error: code || 'UNEXPECTED' });
  }
};
