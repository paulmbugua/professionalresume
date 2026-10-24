import Joi from 'joi';
import {
  buildPhotoObjectKey,
  buildGuestPhotoObjectKey,
  createPhotoUploadPresign,
  isAllowedPhotoContentType,
  maxPhotoBytes,
  putPhotoObject,
} from '../services/r2UploadService.js';

const presignSchema = Joi.object({
  purpose: Joi.string().valid('cv-photo').required(),
  contentType: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/webp')
    .required(),
  ext: Joi.string().valid('jpg', 'jpeg', 'png', 'webp').required(),
  sizeBytes: Joi.number().integer().positive().max(maxPhotoBytes).optional(),
  guestSessionId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{8,120}$/)
    .optional(),
});

const confirmSchema = Joi.object({
  key: Joi.string().min(3).max(512).required(),
  publicUrl: Joi.string().uri().required(),
  guestSessionId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{8,120}$/)
    .optional(),
});

const photoUploadSchema = Joi.object({
  guestSessionId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{8,120}$/)
    .optional(),
});

function getPhotoExtension(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadPhoto(req, res) {
  const { error, value } = photoUploadSchema.validate(req.body || {});
  if (error) {
    return res
      .status(400)
      .json({ error: 'Invalid upload session', details: error.details });
  }

  const file = req.file;
  if (!file?.buffer) {
    return res.status(400).json({ error: 'A JPG, PNG, or WEBP photo is required.' });
  }

  const contentType = String(file.mimetype || '').toLowerCase();
  if (!isAllowedPhotoContentType(contentType)) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }
  if (file.size > maxPhotoBytes) {
    return res
      .status(413)
      .json({ error: `File too large. Max ${maxPhotoBytes} bytes.` });
  }

  const userId = req.user?.id ? String(req.user.id) : null;
  const guestSessionId = value.guestSessionId
    ? String(value.guestSessionId).trim()
    : '';

  if (!userId && !guestSessionId) {
    return res.status(401).json({
      error: 'Authentication or guest session is required for uploads.',
    });
  }

  const ext = getPhotoExtension(contentType);
  const key = userId
    ? buildPhotoObjectKey(userId, ext)
    : buildGuestPhotoObjectKey(guestSessionId, ext);

  try {
    const uploaded = await putPhotoObject({
      key,
      body: file.buffer,
      contentType,
    });

    if (!uploaded.url) {
      throw new Error('Public URL base is not configured for photo uploads');
    }

    return res.status(201).json({
      ok: true,
      key: uploaded.key,
      publicUrl: uploaded.url,
      bytes: uploaded.bytes,
      contentType: uploaded.contentType,
    });
  } catch (err) {
    console.error('[uploads] photo upload failed', err);
    return res.status(500).json({ error: 'Failed to upload photo' });
  }
}

export async function presignUpload(req, res) {
  const { error, value } = presignSchema.validate(req.body || {});
  if (error) {
    return res
      .status(400)
      .json({ error: 'Invalid request payload', details: error.details });
  }

  const { contentType, ext, sizeBytes } = value;
  if (!isAllowedPhotoContentType(contentType)) {
    return res.status(400).json({ error: 'Unsupported content type' });
  }
  if (typeof sizeBytes === 'number' && sizeBytes > maxPhotoBytes) {
    return res
      .status(400)
      .json({ error: `File too large. Max ${maxPhotoBytes} bytes.` });
  }

  try {
    const userId = req.user?.id ? String(req.user.id) : null;
    const guestSessionId = value.guestSessionId
      ? String(value.guestSessionId).trim()
      : '';

    if (!userId && !guestSessionId) {
      return res.status(401).json({
        error: 'Authentication or guest session is required for uploads.',
      });
    }

    const key = userId
      ? buildPhotoObjectKey(userId, ext)
      : buildGuestPhotoObjectKey(guestSessionId, ext);
    const signed = await createPhotoUploadPresign({ key, contentType });
    return res.json(signed);
  } catch (err) {
    console.error('[uploads] presign failed', err);
    return res
      .status(500)
      .json({ error: 'Failed to create signed upload URL' });
  }
}

export async function confirmUpload(req, res) {
  const { error, value } = confirmSchema.validate(req.body || {});
  if (error) {
    return res
      .status(400)
      .json({ error: 'Invalid request payload', details: error.details });
  }

  const { key, publicUrl } = value;
  const userId = req.user?.id ? String(req.user.id) : null;
  const guestSessionId = value.guestSessionId
    ? String(value.guestSessionId).trim()
    : '';

  if (userId) {
    if (
      !key.includes(`/cv-photos/${userId}/`) &&
      !key.includes(`cv-photos/${userId}/`)
    ) {
      return res.status(403).json({ error: 'Forbidden upload key' });
    }
  } else {
    if (!guestSessionId) {
      return res.status(401).json({
        error: 'Authentication or guest session is required for uploads.',
      });
    }
    const guestPrefix = `cv-photos/guest/${guestSessionId}/`;
    if (!String(key).startsWith(guestPrefix)) {
      return res.status(403).json({ error: 'Forbidden upload key' });
    }
  }

  return res.json({ ok: true, key, publicUrl });
}
