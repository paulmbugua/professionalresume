// apps/backend/controllers/ttsAvatarController.js
import { synthesizeTtsWithVisemes } from '../services/azureTtsService.js';

export const speakRobot = async (req, res) => {
  try {
    const { ssml, text, voiceName, rate, pitch } = req.body || {};
    if (!ssml && !text) return res.status(400).json({ message: 'Provide ssml or text.' });

    const out = await synthesizeTtsWithVisemes({
      ssml,
      text,
      voiceName,
      speakingRate: rate ?? '0%',
      pitch: pitch ?? '0st',
    });

    return res.json({
      url: out.urlPath,                 // absolute Cloudinary URL
      subtitleVttUrl: out.subtitleVttUrl,
      subtitleSrtUrl: out.subtitleSrtUrl,
      visemes: out.visemes,
      cacheKey: out.cacheKey,
      cached: out.cached,
    });
  } catch (err) {
    console.error('[tts] speakRobot error:', err);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ message: 'TTS_FAILED', error: String(err?.message || err) });
    }
    return res.status(500).json({ message: 'TTS_FAILED' });
  }
};
