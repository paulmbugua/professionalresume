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

const SAFE_FORMAT = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
const HI_FORMAT   = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

const DEFAULT_VOICES = ['en-US-JennyNeural', 'en-US-AriaNeural'];

// Feature flags
const FORCE_PLAINTEXT     = process.env.AZURE_TTS_FORCE_PLAINTEXT === '1';
const DISABLE_VISEME_TAG  = process.env.AZURE_TTS_DISABLE_VISEME === '1';

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
function makeSpeechConfig(outputFormat = HI_FORMAT, voiceHint) {
  const cfg = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  cfg.speechSynthesisOutputFormat = outputFormat;

  // Be a bit more patient on long SSML
  cfg.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '20000');

  // Hint the voice at the connection level too (besides SSML)
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
// SSML helpers
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

  // Remove BOM and trailing whitespace before </speak>
  s = s.replace(/^\uFEFF/, '').replace(/\s+<\/speak>\s*$/i, '</speak>');

  // Ensure mstts namespace for visemes if missing
  if (!/xmlns:mstts=/i.test(s)) {
    s = s.replace(
      /<speak\b([^>]*)>/i,
      (_m, attrs = '') => `<speak${attrs} xmlns:mstts="http://www.w3.org/2001/mstts">`
    );
  }

  // Optionally remove the <mstts:viseme/> tag if flagged
  if (DISABLE_VISEME_TAG) {
    s = s.replace(/<\s*mstts:viseme\b[^>]*\/>/gi, '');
  }

  // Fix stray ampersands (not entities)
  s = s.replace(/&(?!(?:amp|lt|gt|quot|apos);|#\d+;)/g, '&amp;');

  // Avoid accidental duplicated adjacent voice blocks
  s = s.replace(/<\/voice>\s*<voice\b/gi, '');

  // Ensure we have a <voice> wrapper
  if (!/<voice\b/i.test(s)) {
    s = s.replace(/<speak\b[^>]*>/i, (m) => `${m}<voice name="en-US-JennyNeural">`)
         .replace(/<\/speak>/i, '</voice></speak>');
  }

  return s;
}

function stripTextFromSsml(ssml) {
  return String(ssml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Very lightweight SSML sanity checks (not a full XML validator)
function basicSsmlChecks(ssml) {
  const errors = [];

  if (!/<speak\b[^>]*>[\s\S]*<\/speak>/i.test(ssml)) {
    errors.push('Missing or malformed <speak> root.');
  }
  const voiceOpen = ssml.match(/<voice\b[^>]*>/ig) || [];
  const voiceClose = ssml.match(/<\/voice>/ig) || [];
  if (voiceOpen.length !== voiceClose.length) {
    errors.push(`Mismatched <voice> tags (open=${voiceOpen.length}, close=${voiceClose.length}).`);
  }
  if (voiceOpen.length < 1) errors.push('No <voice> element found.');

  // Stray ampersands (not entities)
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/i.test(ssml)) {
    errors.push('Stray "&" found (not an entity).');
  }

  // Mismatched <prosody>
  const prosodyOpen = (ssml.match(/<prosody\b[^>]*>/ig) || []).length;
  const prosodyClose = (ssml.match(/<\/prosody>/ig) || []).length;
  if (prosodyOpen !== prosodyClose) {
    errors.push(`Mismatched <prosody> tags (open=${prosodyOpen}, close=${prosodyClose}).`);
  }

  return errors;
}

// Minimal SSML that should *always* work if infra/voice is OK
function minimalProbeSsml(voiceName) {
  return `<speak version="1.0" xml:lang="en-US">
  <voice name="${voiceName}">This is a minimal Azure speech synthesis probe.</voice>
</speak>`;
}

// ──────────────────────────────────────────────────────────
// Core synth (one attempt to memory)
// ──────────────────────────────────────────────────────────
function synthOnceToMemory({ ssml, speechConfig }) {
  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    const visemes = [];
    const words = [];
    const bookmarks = [];

    // Extra diagnostics
    synthesizer.synthesisCanceled = (_s, e) => {
      const info = {
        reason: e?.reason,
        errorCode: e?.errorCode,
        errorDetails: e?.errorDetails,
      };
      console.warn('[tts] synthesisCanceled', info);
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

          // Cancellation details (another channel)
          let cancelInfo = {};
          try {
            if (sdk.SpeechSynthesisCancellationDetails && result) {
              const details = sdk.SpeechSynthesisCancellationDetails.fromResult(result);
              cancelInfo = {
                reason: details?.reason,
                errorCode: details?.errorCode,
                errorDetails: details?.errorDetails,
              };
            }
          } catch {}

          synthesizer.visemeReceived = null;
          synthesizer.wordBoundary = null;
          synthesizer.bookmarkReached = null;
          try { synthesizer.close(); } catch {}

          if (reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
            console.warn('[tts] azure cancel', cancelInfo);
            const msg = cancelInfo.errorDetails || `SYNTH_FAILED (code=${cancelInfo.errorCode ?? 'unknown'})`;
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
// Public API
// ──────────────────────────────────────────────────────────
export async function synthesizeTtsWithVisemes({
  ssml,
  text,
  voiceName = 'en-US-JennyNeural',
  speakingRate = '0%',
  pitch = '0st',
}) {
  const t0 = process.hrtime.bigint();

  // Build initial payload
  const ssmlPayload = ssml || toSsml({ text, voiceName, speakingRate, pitch });
  let ssmlNorm = normalizeSsml(ssmlPayload);

  if (DEBUG) {
    const fp = dumpDebugFile('incoming-normalized.ssml', ssmlNorm);
    if (fp) dlog('SSML normalized written to', fp);
    const issues = basicSsmlChecks(ssmlNorm);
    if (issues.length) {
      console.warn('[tts] SSML basic checks found issues:', issues);
      dumpDebugFile('incoming-normalized.issues.txt', issues.join('\n'));
    }
  }

  // Force plain text if flagged
  if (FORCE_PLAINTEXT) {
    const plain = stripTextFromSsml(ssmlNorm);
    ssmlNorm = toSsml({ text: plain, voiceName, speakingRate, pitch });
    dlog('FORCE_PLAINTEXT active');
  }

  const key = crypto.createHash('sha1').update(voiceName + ssmlNorm).digest('hex');
  const { audioId, vttId, srtId, visId } = buildIds(key);

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

  // azure synth #1 (requested voice, hi format)
  let audioBuffer = null;
  let visemes = [];
  let words = [];
  let bookmarks = [];
  let lastErr = null;

  try {
    dlog('azure try #1 (hi format, requested voice)');
    const cfg = makeSpeechConfig(HI_FORMAT, voiceName);
    const r1 = await synthOnceToMemory({ ssml: ssmlNorm, speechConfig: cfg });
    audioBuffer = r1.audio; visemes = r1.visemes; words = r1.words; bookmarks = r1.bookmarks;
    dlog('azure #1 ok', { audioBytes: audioBuffer.length, visemes: visemes.length, words: words.length });
  } catch (e) {
    lastErr = e;
    dlog('azure #1 failed', { code: e?.code, message: e?.message });
  }

  // azure synth #2 (fallback voice + safe format)
  if (!audioBuffer || audioBuffer.length === 0) {
    try {
      dlog('azure try #2 (safe format/voice)');
      const fallbackVoice = DEFAULT_VOICES.find(v => v !== voiceName) || DEFAULT_VOICES[0] || voiceName;

      const fallbackSsml = ssml
        ? retargetVoiceInSsml(ssmlNorm, fallbackVoice)
        : toSsml({ text, voiceName: fallbackVoice, speakingRate, pitch });

      const cfg = makeSpeechConfig(SAFE_FORMAT, fallbackVoice);
      const r2 = await synthOnceToMemory({ ssml: normalizeSsml(fallbackSsml), speechConfig: cfg });
      audioBuffer = r2.audio; visemes = r2.visemes; words = r2.words; bookmarks = r2.bookmarks;
      dlog('azure #2 ok', { audioBytes: audioBuffer.length, visemes: visemes.length, words: words.length });
    } catch (e2) {
      lastErr = e2;
      dlog('azure #2 failed', { code: e2?.code, message: e2?.message });
    }
  }

  // azure synth #3 (plain text fallback)
  if ((!audioBuffer || audioBuffer.length === 0) && ssml) {
    try {
      dlog('azure try #3 (plain text, safe format/voice)');
      const fallbackVoice = DEFAULT_VOICES.find(v => v !== voiceName) || DEFAULT_VOICES[0] || voiceName;
      const plain = stripTextFromSsml(ssmlNorm);
      if (plain) {
        const cfg3 = makeSpeechConfig(SAFE_FORMAT, fallbackVoice);
        const r3 = await synthOnceToMemory({
          ssml: toSsml({ text: plain, voiceName: fallbackVoice, speakingRate, pitch }),
          speechConfig: cfg3
        });
        audioBuffer = r3.audio; visemes = r3.visemes; words = r3.words; bookmarks = r3.bookmarks;
        dlog('azure #3 ok', { audioBytes: audioBuffer.length, visemes: visemes.length, words: words.length });
      }
    } catch (e3) {
      lastErr = e3;
      dlog('azure #3 failed', { code: e3?.code, message: e3?.message });
    }
  }

  // azure synth #4 (minimal SSML probe → infra/voice sanity)
  if (!audioBuffer || audioBuffer.length === 0) {
    try {
      dlog('azure try #4 (minimal SSML probe)');
      const probeCfg = makeSpeechConfig(SAFE_FORMAT, voiceName);
      const rProbe = await synthOnceToMemory({
        ssml: minimalProbeSsml(voiceName),
        speechConfig: probeCfg
      });
      if (rProbe?.audio?.length > 0) {
        const fp = dumpDebugFile('failing-lesson.ssml', ssmlNorm);
        console.warn('[tts] Probe succeeded but lesson SSML failed. Dumped lesson to:', fp);
      } else {
        console.warn('[tts] Probe returned empty audio — infra/voice issue likely.');
      }
    } catch (e4) {
      lastErr = e4;
      console.warn('[tts] Minimal probe also failed', { code: e4?.code, msg: e4?.message });
    }
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    const code = lastErr?.code || 'TTS_EMPTY_AUDIO_AFTER_RETRY';
    throw Object.assign(new Error('TTS_EMPTY_AUDIO_AFTER_RETRY'), { code, cause: lastErr });
  }

  // Build captions
  const cues = makeCues(words, bookmarks);
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
    await uploadRawBuffer(Buffer.from(JSON.stringify(visemes), 'utf8'), visId);
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
    visemes,
    cacheKey: key,
    cached: false,
  };
}

// Optional: call at server startup to verify Azure path + voice availability.
export async function ttsSelfTest(voiceName = 'en-US-JennyNeural') {
  try {
    const cfg = makeSpeechConfig(SAFE_FORMAT, voiceName);
    const probe = minimalProbeSsml(voiceName);
    const r = await synthOnceToMemory({ ssml: probe, speechConfig: cfg });
    const ok = r?.audio?.length > 0;
    console.log(`[tts/selftest] voice=${voiceName} ok=${ok} bytes=${r?.audio?.length || 0}`);
    return ok;
  } catch (e) {
    console.warn('[tts/selftest] failed', { code: e?.code, msg: e?.message });
    return false;
  }
}
