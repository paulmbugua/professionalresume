// apps/backend/controllers/ttsAvatarController.js
import { v2 as cloudinary } from 'cloudinary';
import { synthesizeTtsLocalFirst } from '../services/azureTtsService.js';

function msSince(t0) { return Number(process.hrtime.bigint() - t0) / 1e6; }
function errShape(err) {
  return {
    name: err?.name,
    code: err?.code,
    message: err?.message,
    cause: err?.cause?.message || err?.cause || undefined,
  };
}

// Tiny hot cache: immediate streaming for the first couple minutes
const HOT_TTL_MS = 2 * 60 * 1000; // 2 minutes

const hotAudio = new Map(); // id -> { buf, expiresAt }
const putHot = (id, buf) => {
  hotAudio.set(id, { buf, expiresAt: Date.now() + HOT_TTL_MS });
  // keep memory tidy; non-blocking timer
  const t = setTimeout(() => hotAudio.delete(id), HOT_TTL_MS);
  if (typeof t?.unref === 'function') t.unref();
};
const getHot = (id) => {
  const e = hotAudio.get(id);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { hotAudio.delete(id); return null; }
  return e.buf;
};

// Cloudinary buffer upload helper
function uploadBuf({ buffer, public_id, resource_type, folder = 'tts' }) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        public_id: `${folder}/${public_id}`,
        resource_type,
        overwrite: true,
        type: 'upload',
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    upload.end(buffer);
  });
}

export const speakRobot = async (req, res) => {
  const t0 = process.hrtime.bigint();
  const wantsRaw =
    String(req.query?.raw || '').toLowerCase() === '1' ||
    /\baudio\/mpeg\b/.test(String(req.headers?.accept || ''));

  try {
    const { ssml, text, voiceName, rate, pitch } = req.body || {};
    const speakingRate = rate ?? '0%';
    const safePitch    = pitch ?? '+0st';

    if (!ssml && !text) {
      return res.status(400).json({ message: 'TTS_FAILED', error: 'EMPTY_TEXT' });
    }

    // 1) Synthesize (local-first)
    const out = await synthesizeTtsLocalFirst({
      ssml, text, voiceName, speakingRate, pitch: safePitch,
    });

    // Use the deterministic cache key everywhere (matches Cloudinary ids)
    const audioId    = out.cacheKey;
    const streamPath = `/api/ttsAvatar/stream/${audioId}`;

    // If cache hit: DO NOT upload or hot-cache; just return CDN URL
    if (out.cached) {
      return res.json({
        url: out.cdnUrl,
        streamPath,
        words: out.wordsJson,
        visemes: out.visemesJson,
        bookmarks: out.bookmarksJson,
        vtt: out.vttText,
        srt: out.srtText,
        cached: true,
      });
    }

    // Fresh synth -> we have a real buffer
    if (!out.mp3Buffer || !out.mp3Buffer.length) {
      return res.status(502).json({ message: 'TTS_FAILED', error: 'EMPTY_AUDIO' });
    }

    // Prime hot cache for instant local streaming
    putHot(audioId, out.mp3Buffer);

    // Upload MP3 (sidecars upload happens below, non-blocking)
    let secureUrl = null;
    try {
      const mp3Res = await uploadBuf({
        buffer: out.mp3Buffer,
        public_id: audioId,
        resource_type: 'video',
      });
      secureUrl = mp3Res?.secure_url || null;
      if (secureUrl) console.log('[tts] uploaded ok', { url: secureUrl });
    } catch (e) {
      console.warn('[tts] audio upload failed; using CDN placeholder', e?.message);
    }

    if (wantsRaw) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', out.mp3Buffer.length);
      return res.status(200).end(out.mp3Buffer);
    }

    const cdnUrl = secureUrl || cloudinary.url(`tts/${audioId}.mp3`, { resource_type: 'video', secure: true });
    return res.json({
      url: cdnUrl,
      streamPath,
      words: out.wordsJson,
      visemes: out.visemesJson,
      bookmarks: out.bookmarksJson,
      vtt: out.vttText,
      srt: out.srtText,
      cached: false,
    });

  } catch (err) {
    console.error('[tts] speak ERROR', errShape(err), `dur=${msSince(t0).toFixed(0)}ms`);
    const code = err?.code;
    if (code === 'EMPTY_TEXT') return res.status(400).json({ message: 'TTS_FAILED', error: code });
    return res.status(502).json({ message: 'TTS_FAILED', error: code || 'SYNTH_FAILED' });
  }
};

/**
 * GET /api/ttsAvatar/stream/:id
 * Streams from the hot buffer immediately. If gone, 302 to Cloudinary.
 * Includes basic Range support for seeking.
 */
export const streamRobot = async (req, res) => {
  try {
    const { id } = req.params || {};
    const EMPTY_SHA1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
    if (!id || id === EMPTY_SHA1) {
      return res.status(404).json({ error: 'No audio available' });
    }

    const buf = getHot(id);
    if (!buf) {
      const cdnUrl = cloudinary.url(`tts/${id}.mp3`, { resource_type: 'video', secure: true });
      return res.redirect(302, cdnUrl);
    }

    const range = req.headers.range;
    const total = buf.length;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'audio/mpeg');

    if (!range) {
      res.setHeader('Content-Length', total);
      return res.status(200).end(buf);
    }

    const match = /bytes=(\d+)-(\d+)?/.exec(range);
    const start = match ? parseInt(match[1], 10) : 0;
    const end   = match && match[2] ? parseInt(match[2], 10) : total - 1;

    if (start >= total || end >= total || start > end) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    return res.end(buf.subarray(start, end + 1));
  } catch (err) {
    console.error('[tts] stream ERROR', errShape(err));
    res.status(500).end();
  }
};
