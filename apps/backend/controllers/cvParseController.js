import Joi from 'joi';
import { parseCvFileToDraftPartial } from '../services/cvParseService.js';

const modeSchema = Joi.object({
  mode: Joi.string().valid('merge', 'replace').default('merge'),
});

export async function parseCvUpload(req, res) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing file upload' });
    }

    const { value, error } = modeSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }

    const { extracted, diagnostics } = await parseCvFileToDraftPartial({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    });

    return res.json({
      ok: true,
      mode: value.mode,
      extracted,
      diagnostics,
    });
  } catch (err) {
    console.error('parseCvUpload error', err);
    return res.status(400).json({ error: err.message || 'Failed to parse CV upload' });
  }
}
