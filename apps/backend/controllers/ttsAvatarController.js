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

export const speakRobot = async (req, res) => {
  const t0 = process.hrtime.bigint();
  try {
    const { ssml, text, voiceName, rate, pitch } = req.body || {};
    console.log(
      `[tts] speak IN voice=${voiceName || '-'} rate=${rate || '0%'} pitch=${pitch || '0st'} ` +
      `textLen=${text ? text.length : 0} ssmlLen=${ssml ? ssml.length : 0}`
    );

    if (!ssml && !text) {
      console.warn('[tts] speak BAD_REQUEST: empty text/ssml');
      return res.status(400).json({ message: 'TTS_FAILED', error: 'EMPTY_TEXT' });
    }

    const out = await synthesizeTtsWithVisemes({
      ssml, text, voiceName, speakingRate: rate ?? '0%', pitch: pitch ?? '0st',
    });

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
