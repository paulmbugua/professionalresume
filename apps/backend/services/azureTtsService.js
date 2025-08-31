import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import sdk from 'microsoft-cognitiveservices-speech-sdk';
import { v2 as cloudinary } from 'cloudinary';

const speechKey    = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;

if (!speechKey || !speechRegion) {
  console.warn('[tts] Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION');
}

function enableAzureEvents(config) {
  config.setProperty(sdk.PropertyId.SpeechServiceResponse_SynthesisVisemeEvent, 'true');
  config.setProperty(sdk.PropertyId.SpeechServiceResponse_RequestWordBoundary, 'true');
  config.setProperty(sdk.PropertyId.SpeechServiceResponse_RequestSentenceBoundary, 'true');
}

const ns = 'tts';
const pid = (key, suffix = '') => `${ns}/${key}${suffix}`;

async function findCloudinary(publicId, resource_type) {
  try { return await cloudinary.api.resource(publicId, { resource_type }); }
  catch { return null; }
}

function uploadRawBuffer(buf, publicId, extra={}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'raw', overwrite: true, ...extra },
      (err, res) => err ? reject(err) : resolve(res)
    );
    stream.end(buf);
  });
}

/** Upload a buffer as a video (used for MP3 for streaming) */
function uploadVideoBuffer(buf, publicId, extra={}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'video', overwrite: true, folder: ns, ...extra },
      (err, res) => err ? reject(err) : resolve(res)
    );
    stream.end(buf);
  });
}

function hhmmssmmm(sec){
  const ms = Math.floor((sec % 1) * 1000);
  const sTot = Math.floor(sec);
  const s = sTot % 60;
  const mTot = Math.floor(sTot / 60);
  const m = mTot % 60;
  const h = Math.floor(mTot / 60);
  const pad = (n,w=2)=>String(n).padStart(w,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3,'0')}`;
}
function srtTime(sec){ return hhmmssmmm(sec).replace('.', ','); }

function makeCues(words, bookmarks) {
  const marks = new Set(bookmarks.map(b => b.time));
  const cues = []; let cur = [];
  for (let i=0;i<words.length;i++){
    const w = words[i], prev = words[i-1];
    cur.push(w);
    const gap = prev ? (w.start - prev.end) : 0;
    const tooLong = cur.length >= 6;
    const sentenceEnd = /[.!?]/.test(w.text);
    const marked = marks.has(w.end);
    if (gap > 0.9 || tooLong || sentenceEnd || marked || i === words.length - 1) {
      cues.push({ start: cur[0].start, end: cur[cur.length-1].end, text: cur.map(x=>x.text).join(' ') });
      cur = [];
    }
  }
  return cues;
}

/** Wait until file exists and has a non-zero size (Azure flush safety) */
async function waitForNonZeroFile(filePath, { tries = 10, delayMs = 120 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const st = fs.statSync(filePath);
      if (st.size > 0) return st.size;
    } catch {}
    await new Promise(r => setTimeout(r, delayMs));
  }
  const final = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  return final; // may be 0; caller will handle
}

export async function synthesizeTtsWithVisemes({
  ssml,
  text,
  voiceName = 'en-US-JennyNeural',
  speakingRate = '0%',
  pitch = '0st',
}) {
  const ssmlPayload =
    ssml ||
    `<speak version="1.0" xml:lang="en-US">
       <voice name="${voiceName}">
         <prosody rate="${speakingRate}" pitch="${pitch}">${text ?? ''}</prosody>
       </voice>
     </speak>`;

  const key = crypto.createHash('sha1').update(voiceName + ssmlPayload).digest('hex');

  const audioId = `${ns}/${key}`;
  const vttId   = `${ns}/${key}.vtt`;
  const srtId   = `${ns}/${key}.srt`;
  const visId   = `${ns}/${key}.visemes.json`;

  // ---- Cloudinary cache hit -------------------------------------------------
  const audioHit = await findCloudinary(audioId, 'video');
  const vttHit   = await findCloudinary(vttId,   'raw');
  const srtHit   = await findCloudinary(srtId,   'raw');
  const visHit   = await findCloudinary(visId,   'raw');

  if (audioHit && vttHit && srtHit && visHit) {
    let visemesArr = [];
    try { const r = await fetch(visHit.secure_url); if (r.ok) visemesArr = await r.json(); } catch (e) {}
    return {
      urlPath: audioHit.secure_url,
      subtitleVttUrl: vttHit.secure_url,
      subtitleSrtUrl: srtHit.secure_url,
      visemes: visemesArr,
      cacheKey: key,
      cached: true,
    };
  }

  // ---- Azure synth to temp file --------------------------------------------
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
  const mp3Path = path.join(tmpDir, `${key}.mp3`);

  const config  = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
  enableAzureEvents(config);

  const audioCfg = sdk.AudioConfig.fromAudioFileOutput(mp3Path);
  const synth    = new sdk.SpeechSynthesizer(config, audioCfg);

  const visemes = [];
  const words = [];
  const bookmarks = [];

  synth.visemeReceived = (_s, e) => {
    const t = Number(e.audioOffset)/10_000_000;
    visemes.push({ time: t, id: e.visemeId });
  };
  synth.wordBoundary = (_s, e) => {
    const start = Number(e.audioOffset)/10_000_000;
    const end   = start + ((Number(e.duration)||0)/10_000_000 || 0.12);
    words.push({ start, end, text: e.text });
  };
  synth.bookmarkReached = (_s, e) => {
    const t = Number(e.audioOffset)/10_000_000;
    bookmarks.push({ time: t, text: e.text });
  };

  try {
    await new Promise((resolve, reject) => {
      synth.speakSsmlAsync(
        ssmlPayload,
        () => { synth.close(); resolve(); },
        (err) => { synth.close(); reject(err); },
      );
    });
  } catch (e) {
    console.error('[tts] Azure synth failed:', e);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error('AZURE_SYNTH_FAILED');
  }

  // Ensure file is fully flushed and non-zero
  const size = await waitForNonZeroFile(mp3Path, { tries: 18, delayMs: 120 });
  console.log(`[tts] mp3 size after synth: ${size} bytes`);
  if (!size) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error('AZURE_WROTE_EMPTY_FILE');
  }

  // Build captions
  const cues = makeCues(words, bookmarks);
  let vtt = 'WEBVTT\n\n';
  cues.forEach((c,i)=>{ vtt += `${i+1}\n${hhmmssmmm(c.start)} --> ${hhmmssmmm(c.end)}\n${c.text}\n\n`; });
  let srt = '';
  cues.forEach((c,i)=>{ srt += `${i+1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n\n`; });

  // Read MP3 into buffer and upload via stream (prevents "Empty file")
  let mp3Buffer;
  try {
    mp3Buffer = fs.readFileSync(mp3Path);
  } catch (e) {
    console.error('[tts] readFileSync failed:', e);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error('MP3_READ_FAILED');
  }

  // ---- Upload to Cloudinary via buffers ------------------------------------
  try {
    const audioRes = await uploadVideoBuffer(mp3Buffer, audioId);
    const vttRes   = await uploadRawBuffer(Buffer.from(vtt, 'utf8'), vttId);
    const srtRes   = await uploadRawBuffer(Buffer.from(srt, 'utf8'), srtId);
    await uploadRawBuffer(Buffer.from(JSON.stringify(visemes), 'utf8'), visId);

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    return {
      urlPath: audioRes.secure_url,
      subtitleVttUrl: vttRes.secure_url,
      subtitleSrtUrl: srtRes.secure_url,
      visemes,
      cacheKey: key,
      cached: false,
    };
  } catch (e) {
    console.error('[tts] Cloudinary upload failed:', e);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw new Error('CLOUDINARY_UPLOAD_FAILED');
  }
}
