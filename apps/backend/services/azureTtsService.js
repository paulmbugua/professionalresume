// apps/backend/services/azureTtsService.js
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { v2 as cloudinary } from 'cloudinary';

// ──────────────────────────────────────────────────────────
// Config / constants
// ──────────────────────────────────────────────────────────
const DEBUG = process.env.DEBUG_TTS === '1';
const dlog = (...a) => { if (DEBUG) console.log('[tts/svc]', ...a); };

const speechKey    = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;
if (!speechKey || !speechRegion) {
  console.warn('[tts] Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION');
}

const NS = 'tts';

// Keep your original enum names (these worked in your setup)
const SAFE_FORMAT = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
const HI_FORMAT   = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

const DEFAULT_VOICES = ['en-US-JennyNeural', 'en-US-AriaNeural'];

// Feature flags
const FORCE_PLAINTEXT     = process.env.AZURE_TTS_FORCE_PLAINTEXT === '1';
const DISABLE_VISEME_TAG  = process.env.AZURE_TTS_DISABLE_VISEME === '1';

// Chunking limit (conservative to avoid edge-case failures)
const MAX_CHARS_PER_CHUNK = 4500;

// ──────────────────────────────────────────────────────────
// Small FS debug helpers
// ──────────────────────────────────────────────────────────
function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}
function dumpDebugFile(basename, content) {
  try {
    const dir = path.resolve(process.cwd(), '.debug', 'tts');
    ensureDir(dir);
    const fp = path.join(dir, basename);
    fs.writeFileSync(fp, content, 'utf8');
    return fp;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Cloudinary helpers
// ──────────────────────────────────────────────────────────
async function findCloudinary(publicId, resource_type) {
  try {
    const r = await cloudinary.api.resource(publicId, { resource_type });
    dlog('cache HIT', resource_type, publicId);
    return r;
  } catch {
    dlog('cache MISS', resource_type, publicId);
    return null;
  }
}
function uploadRawBuffer(buf, publicId, extra = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'raw', overwrite: true, ...extra },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(buf);
  });
}
function uploadVideoBuffer(buf, publicId, extra = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'video', overwrite: true, ...extra },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(buf);
  });
}

// ──────────────────────────────────────────────────────────
/** Azure config */
// ──────────────────────────────────────────────────────────
function makeSpeechConfig(outputFormat = SAFE_FORMAT, voiceHint) {
  const cfg = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  cfg.speechSynthesisOutputFormat = outputFormat;

  // Be a bit more patient on long SSML
  cfg.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '20000');

  // Hint voice at connection level as well (not required but harmless)
  if (voiceHint) {
    cfg.setProperty(sdk.PropertyId.SpeechServiceConnection_SynthesisVoiceName, voiceHint);
  }

  // Event enrichers
  cfg.setProperty(sdk.PropertyId.SpeechServiceResponse_SynthesisVisemeEvent, 'true');
  cfg.setProperty(sdk.PropertyId.SpeechServiceResponse_RequestWordBoundary, 'true');
  cfg.setProperty(sdk.PropertyId.SpeechServiceResponse_RequestSentenceBoundary, 'true');
  return cfg;
}

// ──────────────────────────────────────────────────────────
// Caption helpers
// ──────────────────────────────────────────────────────────
function hhmmssmmm(sec) {
  const ms = Math.floor((sec % 1) * 1000);
  const sTot = Math.floor(sec);
  const s = sTot % 60;
  const mTot = Math.floor(sTot / 60);
  const m = mTot % 60;
  const h = Math.floor(mTot / 60);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}
function srtTime(sec) { return hhmmssmmm(sec).replace('.', ','); }

function makeCues(words, bookmarks) {
  const marks = new Set(bookmarks.map(b => b.time));
  const cues = []; let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1];
    cur.push(w);
    const gap = prev ? (w.start - prev.end) : 0;
    const tooLong = cur.length >= 6;
    const sentenceEnd = /[.!?]/.test(w.text);
    const marked = marks.has(w.end);
    if (gap > 0.9 || tooLong || sentenceEnd || marked || i === words.length - 1) {
      cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map(x => x.text).join(' ') });
      cur = [];
    }
  }
  return cues;
}

// ──────────────────────────────────────────────────────────
// SSML helpers (sanitize → chunk → rewrap)
// ──────────────────────────────────────────────────────────
function escapeXmlText(s) {
  return String(s ?? '')
    .replace(/&(?!(?:amp|lt|gt|quot|apos);|#\d+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toSsml({ text, voiceName, speakingRate, pitch }) {
  const safeText = escapeXmlText(String(text ?? '').replace(/\s+/g, ' ').trim());
  const visemeLine = DISABLE_VISEME_TAG ? '' : '    <mstts:viseme type="FacialExpression"/>\n';
  return (
`<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voiceName}">
${visemeLine}    <prosody rate="${speakingRate}" pitch="${pitch}">${safeText}</prosody>
  </voice>
</speak>`
  ).trim();
}

/** Replace or inject the voice name inside an SSML payload safely. */
function retargetVoiceInSsml(ssml, newVoice) {
  if (!ssml) return ssml;

  // 1) Replace existing name= on <voice ...>
  const withReplaced = ssml.replace(
    /<voice([^>]*?)\sname=(["'])(.*?)\2([^>]*)>/i,
    (_m, pre, q, _old, post) => {
      const preFixed  = pre?.length ? pre : '';
      const postFixed = post?.length ? post : '';
      const preSpace  = preFixed && !/\s$/.test(preFixed) ? preFixed + ' ' : preFixed;
      const postSpace = postFixed && !/^\s/.test(postFixed) ? ' ' + postFixed : postFixed;
      return `<voice${preSpace}name=${q}${newVoice}${q}${postSpace}>`;
    }
  );
  if (withReplaced !== ssml) return withReplaced;

  // 2) Inject name if <voice ...> has no name=
  const withInjected = ssml.replace(/<voice\b([^>]*)>/i, (_m, attrs) => {
    const rest = (attrs || '').trim();
    return rest ? `<voice name="${newVoice}" ${rest}>` : `<voice name="${newVoice}">`;
  });
  if (withInjected !== ssml) return withInjected;

  // 3) If there is no <voice>, try to nest one right after <speak>
  const speakOpen = ssml.match(/<speak\b[^>]*>/i)?.[0];
  if (speakOpen) {
    return ssml
      .replace(/<speak\b[^>]*>/i, (m) => `${m}<voice name="${newVoice}">`)
      .replace(/<\/speak>/i, '</voice></speak>');
  }

  // 4) Last resort: wrap the entire payload
  return `<speak version="1.0" xml:lang="en-US"><voice name="${newVoice}">${ssml}</voice></speak>`;
}

function normalizeSsml(ssml) {
  if (!ssml) return ssml;
  let s = ssml.trim();

  s = s.replace(/^\uFEFF/, '').replace(/\s+<\/speak>\s*$/i, '</speak>');

  if (!/xmlns:mstts=/i.test(s)) {
    s = s.replace(/<speak\b([^>]*)>/i, (_m, attrs = '') => `<speak${attrs} xmlns:mstts="http://www.w3.org/2001/mstts">`);
  }
  if (DISABLE_VISEME_TAG) {
    s = s.replace(/<\s*mstts:viseme\b[^>]*\/>/gi, '');
  }
  s = s.replace(/&(?!(?:amp|lt|gt|quot|apos);|#\d+;)/g, '&amp;');

  // Avoid adjacent OR nested voice blocks: drop inner voices
  s = s.replace(/<\/voice>\s*<voice\b/gi, '');
  s = s.replace(/<\/?voice\b[^>]*>/gi, '');

  // Ensure a top-level voice exists (we’ll re-inject a safe default)
  s = s.replace(/<speak\b[^>]*>/i, (m) => `${m}<voice name="en-US-JennyNeural">`)
       .replace(/<\/speak>/i, '</voice></speak>');

  return s;
}


function stripTextFromSsml(ssml) {
  return String(ssml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// New: robust sanitize that guarantees safe pitch/rate and paragraphs
// REPLACE the existing sanitizeSsml with this version
function sanitizeSsml(raw, { voice = 'en-US-JennyNeural', rate = '0%', pitch = '+0st' } = {}) {
  if (!raw) {
    return `<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}"></prosody></voice>
</speak>`;
  }
  let s = String(raw);

  // Normalize + escape naked ampersands
  s = s.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  s = s.replace(/&(?![a-z#]+;)/gi, '&amp;');

  // Remove any existing outer <speak> wrappers
  s = s.replace(/<\/?speak[^>]*>/gi, '');

  // 🔴 NEW: Remove any inner <voice> wrappers to prevent nesting
  s = s.replace(/<\/?voice\b[^>]*>/gi, '');

  // Remove empty paragraphs/sentences
  s = s.replace(/<p>\s*<\/p>/gi, '').replace(/<s>\s*<\/s>/gi, '');

  // Ensure paragraph structure (wrap orphan text blocks)
  if (!/<p[\s>]/i.test(s)) {
    const blocks = s.split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
    s = blocks.map(b => `<p>${b}</p>`).join('\n');
  }

  const visemeLine = DISABLE_VISEME_TAG ? '' : '    <mstts:viseme type="FacialExpression"/>\n';
  return `<speak version="1.0" xml:lang="en-US" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voice}">
${visemeLine}    <prosody rate="${rate}" pitch="${pitch}">
${s}
    </prosody>
  </voice>
</speak>`;
}


// Split on </p> boundaries; rewrap each chunk with sanitizeSsml to keep valid SSML
function chunkSsml(wrapped, { voice = 'en-US-JennyNeural', rate = '0%', pitch = '+0st' } = {}) {
  // strip our wrapper to chunk body
  let body = wrapped
    .replace(/<speak\b[^>]*>/i, '')
    .replace(/<\/speak>\s*$/i, '')
    .replace(/<voice\b[^>]*>/i, '')
    .replace(/<\/voice>\s*$/i, '')
    .replace(/<prosody\b[^>]*>/i, '')
    .replace(/<\/prosody>\s*$/i, '')
    .trim();

  const paras = body.split(/<\/p>\s*/i)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p.endsWith('</p>') ? p : p + '</p>'));

  const chunks = [];
  let curr = '';
  for (const p of paras) {
    if ((curr + p).length > MAX_CHARS_PER_CHUNK) {
      if (curr) chunks.push(curr);
      if (p.length > MAX_CHARS_PER_CHUNK) {
        // hard split by sentence if one paragraph is enormous
        const sentences = p.split(/([.!?]\s+)/);
        let c2 = '';
        for (const seg of sentences) {
          if ((c2 + seg).length > MAX_CHARS_PER_CHUNK) {
            if (c2.trim()) chunks.push(`<p>${c2.trim()}</p>`);
            c2 = seg;
          } else {
            c2 += seg;
          }
        }
        if (c2.trim()) chunks.push(`<p>${c2.trim()}</p>`);
      } else {
        curr = p;
      }
    } else {
      curr += p;
    }
  }
  if (curr) chunks.push(curr);

  return chunks.map(c => sanitizeSsml(c, { voice, rate, pitch }));
}

// Minimal SSML probe for diagnostics
function minimalProbeSsml(voiceName) {
  return `<speak version="1.0" xml:lang="en-US"><voice name="${voiceName}">This is a minimal Azure speech synthesis probe.</voice></speak>`;
}

// ──────────────────────────────────────────────────────────
// Core synth: one chunk per synthesizer; NO manual cancel
// ──────────────────────────────────────────────────────────
function synthChunkToMemory({ ssml, speechConfig }) {
  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const visemes = [];
    const words = [];
    const bookmarks = [];

    synthesizer.synthesisCanceled = (_s, e) => {
      const info = {
        reason: e?.reason,
        errorCode: e?.errorCode,
        errorDetails: e?.errorDetails,
      };
      console.warn('[tts] synthesis not completed', info);
    };
    synthesizer.synthesisCompleted = (_s, e) => {
      dlog('synthesisCompleted', { audioDataBytes: e?.result?.audioData?.byteLength ?? 0 });
    };

    synthesizer.visemeReceived = (_s, e) => {
      const t = Number(e.audioOffset) / 10_000_000;
      visemes.push({ time: t, id: e.visemeId });
    };
    synthesizer.wordBoundary = (_s, e) => {
      const start = Number(e.audioOffset) / 10_000_000;
      const end = start + ((Number(e.duration) || 0) / 10_000_000 || 0.12);
      words.push({ start, end, text: e.text });
    };
    synthesizer.bookmarkReached = (_s, e) => {
      const t = Number(e.audioOffset) / 10_000_000;
      bookmarks.push({ time: t, text: e.text });
    };

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        try {
          const reason = result?.reason;
          const audio = result?.audioData ? Buffer.from(result.audioData) : Buffer.alloc(0);

          synthesizer.visemeReceived = null;
          synthesizer.wordBoundary = null;
          synthesizer.bookmarkReached = null;
          try { synthesizer.close(); } catch {}

          // AFTER (guard for SDKs where SpeechSynthesisCancellationDetails is missing)
          if (reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
            let details = null;
            if (sdk.SpeechSynthesisCancellationDetails && typeof sdk.SpeechSynthesisCancellationDetails.fromResult === 'function') {
              try { details = sdk.SpeechSynthesisCancellationDetails.fromResult(result); } catch {}
            }
            const code = (details && details.errorCode) || 'unknown';
            const msg  = (details && details.errorDetails) || (result && result.errorDetails) || `SYNTH_FAILED (code=${code})`;
            return reject(Object.assign(new Error(msg), { code: 'SYNTH_FAILED' }));
          }

          if (audio.length === 0) {
            return reject(Object.assign(new Error('AZURE_EMPTY_AUDIO'), { code: 'AZURE_EMPTY_AUDIO' }));
          }
          resolve({ audio, visemes, words, bookmarks });
        } catch (err) {
          try { synthesizer.close(); } catch {}
          reject(err);
        }
      },
      (err) => {
        try { synthesizer.close(); } catch {}
        reject(Object.assign(new Error('SPEAK_API_ERROR'), { code: 'SPEAK_API_ERROR', cause: err }));
      }
    );
  });
}

// ──────────────────────────────────────────────────────────
// IDs for cache
// ──────────────────────────────────────────────────────────
function buildIds(key) {
  return {
    audioId: `${NS}/${key}`,
    vttId:   `${NS}/${key}.vtt`,
    srtId:   `${NS}/${key}.srt`,
    visId:   `${NS}/${key}.visemes.json`,
  };
}

// ──────────────────────────────────────────────────────────
// Public API (SANITIZE + CHUNK + SINGLE-PASS SYNTHESIS)
// ──────────────────────────────────────────────────────────
export async function synthesizeTtsWithVisemes({
  ssml,
  text,
  voiceName = 'en-US-JennyNeural',
  speakingRate = '0%',
  pitch = '+0st', // IMPORTANT: keep a leading '+'
}) {
  const t0 = process.hrtime.bigint();

  // Build safe SSML
  const basePayload = ssml
    ? ssml
    : toSsml({ text, voiceName, speakingRate, pitch });

  let ssmlNorm = normalizeSsml(basePayload);

  if (FORCE_PLAINTEXT) {
    const plain = stripTextFromSsml(ssmlNorm);
    ssmlNorm = toSsml({ text: plain, voiceName, speakingRate, pitch });
    dlog('FORCE_PLAINTEXT active');
  }

  // Wrap & sanitize strictly with guaranteed prosody (pitch "+0st")
  const ssmlWrapped = sanitizeSsml(ssmlNorm, { voice: voiceName, rate: speakingRate, pitch });

  // Chunk it so Azure never sees huge blobs
  const chunks = chunkSsml(ssmlWrapped, { voice: voiceName, rate: speakingRate, pitch });

  // Cache key: voice + sanitized SSML (post-sanitize to ensure stable key)
  const key = crypto.createHash('sha1').update(voiceName + ssmlWrapped).digest('hex');
  const { audioId, vttId, srtId, visId } = buildIds(key);

  if (DEBUG) {
    dumpDebugFile('incoming-normalized.ssml', ssmlWrapped);
  }

  dlog('begin', {
    voiceName, speakingRate, pitch,
    textLen: text?.length || 0,
    ssmlLen: (ssml || '').length || 0,
    ssmlHead: (ssml || '').slice(0, 120)
  });

  // cache lookup
  const [audioHit, vttHit, srtHit, visHit] = await Promise.all([
    findCloudinary(audioId, 'video'),
    findCloudinary(vttId, 'raw'),
    findCloudinary(srtId, 'raw'),
    findCloudinary(visId, 'raw'),
  ]);

  if (audioHit && vttHit && srtHit && visHit) {
    dlog('serve from cache', { url: audioHit.secure_url });
    let visemesArr = [];
    try {
      const r = await fetch(visHit.secure_url);
      if (r.ok) visemesArr = await r.json();
    } catch {}
    dlog('done (cache)', { ms: Number(process.hrtime.bigint() - t0) / 1e6 });
    return {
      urlPath: audioHit.secure_url,
      subtitleVttUrl: vttHit.secure_url,
      subtitleSrtUrl: srtHit.secure_url,
      visemes: visemesArr,
      cacheKey: key,
      cached: true,
    };
  }

  // Synthesize all chunks sequentially with a fresh synthesizer per chunk
  const cfg = makeSpeechConfig(SAFE_FORMAT, voiceName);
  const audioParts = [];
  let allVisemes = [];
  let allWords = [];
  let allBookmarks = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      dlog(`azure synth chunk ${i + 1}/${chunks.length}`);
      const r = await synthChunkToMemory({ ssml: chunks[i], speechConfig: cfg });
      audioParts.push(r.audio);
      // Stitch timings with offsets (sum of previous durations)
      const prevDurationSec = allWords.length ? allWords[allWords.length - 1].end : 0;
      const durSoFarSec = audioParts.slice(0, -1).reduce((acc, buf) => acc + (buf.length / (48_000 * (SAFE_FORMAT === HI_FORMAT ? 2 : 1))), 0); // rough; we’ll offset using word timings instead
      // Use last word end as reliable offset
      const offset = allWords.length ? allWords[allWords.length - 1].end : 0;

      allVisemes = allVisemes.concat(r.visemes.map(v => ({ ...v, time: v.time + offset })));
      allBookmarks = allBookmarks.concat(r.bookmarks.map(b => ({ ...b, time: b.time + offset })));
      allWords = allWords.concat(r.words.map(w => ({ ...w, start: w.start + offset, end: w.end + offset })));
    }
  } catch (e) {
    // As a diagnostic, try a tiny probe to distinguish infra vs SSML
    try {
      const probe = await synthChunkToMemory({ ssml: minimalProbeSsml(voiceName), speechConfig: cfg });
      if (probe?.audio?.length > 0) {
        const fp = dumpDebugFile('failing-lesson.ssml', ssmlWrapped);
        console.warn('[tts] Probe succeeded but lesson SSML failed. Dumped lesson to:', fp);
      }
    } catch {}
    throw Object.assign(new Error('SYNTH_FAILED'), { code: 'SYNTH_FAILED', cause: e });
  }

  const audioBuffer = Buffer.concat(audioParts);
  if (!audioBuffer || audioBuffer.length === 0) {
    throw Object.assign(new Error('TTS_EMPTY_AUDIO_AFTER_RETRY'), { code: 'TTS_EMPTY_AUDIO_AFTER_RETRY' });
  }

  // Build captions
  const cues = makeCues(allWords, allBookmarks);
  let vtt = 'WEBVTT\n\n';
  cues.forEach((c, i) => { vtt += `${i + 1}\n${hhmmssmmm(c.start)} --> ${hhmmssmmm(c.end)}\n${c.text}\n\n`; });
  let srt = '';
  cues.forEach((c, i) => { srt += `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n\n`; });

  // Uploads
  let audioRes, vttRes, srtRes;
  try {
    dlog('uploading to cloudinary', { audioId, vttId, srtId, visId });
    [audioRes, vttRes, srtRes] = await Promise.all([
      uploadVideoBuffer(audioBuffer, audioId),
      uploadRawBuffer(Buffer.from(vtt, 'utf8'), vttId),
      uploadRawBuffer(Buffer.from(srt, 'utf8'), srtId),
    ]);
    await uploadRawBuffer(Buffer.from(JSON.stringify(allVisemes), 'utf8'), visId);
    dlog('uploaded ok', { url: audioRes.secure_url });
  } catch (e) {
    console.error('[tts/svc] upload failed', { code: e?.http_code, message: e?.message });
    throw Object.assign(new Error('SYNTH_FAILED'), { code: 'SYNTH_FAILED', cause: e });
  }

  dlog('done', { ms: Number(process.hrtime.bigint() - t0) / 1e6 });

  return {
    urlPath: audioRes.secure_url,
    subtitleVttUrl: vttRes.secure_url,
    subtitleSrtUrl: srtRes.secure_url,
    visemes: allVisemes,
    cacheKey: key,
    cached: false,
  };
}

// Optional: call at server startup to verify Azure path + voice availability.
export async function ttsSelfTest(voiceName = 'en-US-JennyNeural') {
  try {
    const cfg = makeSpeechConfig(SAFE_FORMAT, voiceName);
    const probe = minimalProbeSsml(voiceName);
    const r = await synthChunkToMemory({ ssml: probe, speechConfig: cfg });
    const ok = r?.audio?.length > 0;
    console.log(`[tts/selftest] voice=${voiceName} ok=${ok} bytes=${r?.audio?.length || 0}`);
    return ok;
  } catch (e) {
    console.warn('[tts/selftest] failed', { code: e?.code, msg: e?.message });
    return false;
  }
}
