import Joi from 'joi';
import { importDocumentToCoverLetterData } from '../services/coverLetterImportService.js';

const schema = Joi.object({
  sourceType: Joi.string().valid('cover_letter', 'resume').required(),
});

export async function importCoverLetterDocument(req, res) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing file upload' });
    }

    const { error, value } = schema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }

    const imported = await importDocumentToCoverLetterData({
      sourceType: value.sourceType,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    });

    return res.json({
      ok: true,
      sourceType: value.sourceType,
      data: imported.data,
      diagnostics: imported.diagnostics || {},
    });
  } catch (err) {
    console.error('importCoverLetterDocument error', err);
    return res.status(400).json({ error: err.message || 'Failed to import cover-letter data' });
  }
}
