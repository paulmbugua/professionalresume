// apps/backend/controllers/ttsAvatarController.js
import crypto from 'crypto';
import zlib from 'zlib';
import { v2 as cloudinary } from 'cloudinary';
import { synthesizeTtsLocalFirst } from '../services/azureTtsService.js'; // NEW: raw buffers, no uploads

function sha1(bufOrStr) {
  const b = Buffer.isBuffer(bufOrStr) ? bufOrStr : Buffer.from(String(bufOrStr || ''), 'utf8');
  return crypto.createHash('sha1').update(b).digest('hex');
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

// Tiny hot cache: immediate streaming for the first couple minutes
const HOT_TTL_MS = 2 * 60 * 1000;
const hotAudio = new Map(); // id -> { buf, expiresAt }
const putHot = (id, buf) => {
  hotAudio.set(id, { buf, expiresAt: Date.now() + HOT_TTL_MS });
  setTimeout(() => hotAudio.delete(id), HOT_TTL_MS).unref();
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

/**
 * POST /api/ttsAvatar/speak
 *
 * Now returns immediately:
 *  {
 *    url: "/api/ttsAvatar/stream/<id>"   // ready NOW (local stream)
 *    cdnUrl: "https://res.cloudinary..." // becomes ready when background upload finishes
 *    words, visemes, bookmarks, vtt, srt
 *  }
 *
 * If you still want raw audio streaming via `Accept: audio/mpeg` or `?raw=1`,
 * we stream from the local hot buffer (not Cloudinary) with Range support.
 */
// apps/backend/controllers/ttsAvatarController.js

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
    // out: { mp3Buffer, vttText, srtText, visemesJson, wordsJson, bookmarksJson, cached?: boolean }

    const audioId    = sha1(out.mp3Buffer);
    const streamPath = `/api/ttsAvatar/stream/${audioId}`;
    const cdnUrl     = cloudinary.url(`tts/${audioId}.mp3`, { resource_type: 'video', secure: true });

    // 2) Prime hot cache so /stream/<id> is instant
    putHot(audioId, out.mp3Buffer);

    // 3) Upload MP3 now to get secure_url for SpeakResp.url (sidecars still async)
    let secureUrl = null;
    try {
      const mp3Res = await uploadBuf({
        buffer: out.mp3Buffer,
        public_id: audioId,
        resource_type: 'video',
      });
      secureUrl = mp3Res?.secure_url || null;
      if (secureUrl) {
        console.log('[tts] uploaded ok', { url: secureUrl });
      } else {
        console.warn('[tts] upload returned no secure_url');
      }
    } catch (e) {
      console.warn('[tts] audio upload failed; falling back to cdnUrl placeholder', e?.message);
    }

    // Kick off sidecar uploads in background (non-blocking)
    try {
      const sidecarGz = zlib.gzipSync(Buffer.from(JSON.stringify({
        vtt: out.vttText,
        srt: out.srtText,
        visemes: out.visemesJson,
        words: out.wordsJson,
        bookmarks: out.bookmarksJson,
        voiceName,
        rate: speakingRate,
        pitch: safePitch,
      }), 'utf8'));

      Promise.allSettled([
        uploadBuf({ buffer: sidecarGz, public_id: `${audioId}.sidecars.gz`, resource_type: 'raw' }),
      ]).catch(() => {});
    } catch { /* ignore sidecar prep errors */ }

    // 4a) If they want raw audio, stream bytes immediately from memory
    if (wantsRaw) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      console.log(`[tts] STREAM local id=${audioId} dur=${msSince(t0).toFixed(0)}ms`);
      return res.status(200).end(out.mp3Buffer);
    }

    // 4b) SpeakResp JSON
    // IMPORTANT: `url` is ALWAYS a CDN URL
    //  - fresh synth: secure_url from upload (preferred)
    //  - fallback/local-first: deterministic cdnUrl
    const urlForClient = secureUrl || cdnUrl;

    console.log(
      `[tts] speak OUT id=${audioId} url=cdn visemes=${out.visemesJson?.length ?? 0} ` +
      `vtt=${!!out.vttText} srt=${!!out.srtText} dur=${msSince(t0).toFixed(0)}ms`
    );

    return res.json({
      url: urlForClient,          // <-- always CDN URL (matches SpeakResp.url contract)
      streamPath,                 // <-- keep proxy path for local/short URL
      words: out.wordsJson,
      visemes: out.visemesJson,
      bookmarks: out.bookmarksJson,
      // You currently return inline captions; keep as-is if your client expects text.
      // If/when you switch to URLs, emit subtitleVttUrl/subtitleSrtUrl instead.
      vtt: out.vttText,
      srt: out.srtText,
      cached: Boolean(out.cached),
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
