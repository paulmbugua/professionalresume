import Joi from 'joi';
import {
  buildPhotoObjectKey,
  createPhotoUploadPresign,
  isAllowedPhotoContentType,
  maxPhotoBytes,
} from '../services/r2UploadService.js';

const presignSchema = Joi.object({
  purpose: Joi.string().valid('cv-photo').required(),
  contentType: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
  ext: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required(),
  sizeBytes: Joi.number().integer().positive().max(maxPhotoBytes).optional(),
});

const confirmSchema = Joi.object({
  key: Joi.string().min(3).max(512).required(),
  publicUrl: Joi.string().uri().required(),
});

export async function presignUpload(req, res) {
  const { error, value } = presignSchema.validate(req.body || {});
  if (error) {
    return res.status(400).json({ error: 'Invalid request payload', details: error.details });
  }

  const { contentType, ext, sizeBytes } = value;
  if (!isAllowedPhotoContentType(contentType)) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }
  if (typeof sizeBytes === 'number' && sizeBytes > maxPhotoBytes) {
    return res.status(400).json({ error: `File too large. Max ${maxPhotoBytes} bytes.` });
  }

  try {
    const key = buildPhotoObjectKey(req.user.id, ext);
    const signed = await createPhotoUploadPresign({ key, contentType });
    return res.json(signed);
  } catch (err) {
    console.error('[uploads] presign failed', err);
    return res.status(500).json({ error: 'Failed to create signed upload URL' });
  }
}

export async function confirmUpload(req, res) {
  const { error, value } = confirmSchema.validate(req.body || {});
  if (error) {
    return res.status(400).json({ error: 'Invalid request payload', details: error.details });
  }

  const { key, publicUrl } = value;
  if (!key.includes(String(req.user.id))) {
    return res.status(403).json({ error: 'Forbidden upload key' });
  }

  return res.json({ ok: true, key, publicUrl });
}
