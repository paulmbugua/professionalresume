import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { r2Client } from './r2.js';

const endpoint = process.env.R2_ENDPOINT;
const region = process.env.R2_REGION || 'auto';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

const bucket = process.env.R2_BUCKET_PHOTOS || process.env.R2_BUCKET_DOCS;
const publicBase = (
  process.env.R2_PUBLIC_BASE_URL_PHOTOS ||
  process.env.R2_PUBLIC_BASE_URL_DOCS ||
  ''
).replace(/\/$/, '');
const uploadExpires = Number(process.env.R2_UPLOAD_EXPIRES_SEC || 300);
export const maxPhotoBytes = Number(
  process.env.R2_MAX_PHOTO_BYTES || 3 * 1024 * 1024,
);

const allowedPhotoContentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.warn('[r2UploadService] missing R2 config for uploads');
}

export function isAllowedPhotoContentType(contentType) {
  return allowedPhotoContentTypes.has(String(contentType || '').toLowerCase());
}

export function buildPhotoObjectKey(userId, ext) {
  const normalizedExt = String(ext || 'jpg').toLowerCase();
  return `cv-photos/${userId}/${randomUUID()}.${normalizedExt}`;
}

export function buildGuestPhotoObjectKey(guestSessionId, ext) {
  const normalizedExt = String(ext || 'jpg').toLowerCase();
  const safeGuestId = String(guestSessionId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 80);
  return `cv-photos/guest/${safeGuestId}/${randomUUID()}.${normalizedExt}`;
}

export function getPublicPhotoUrl(key) {
  if (!publicBase) return null;
  return `${publicBase}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
}

export async function createPhotoUploadPresign({ key, contentType }) {
  if (!bucket) throw new Error('R2 bucket is not configured for photo uploads');
  if (!isAllowedPhotoContentType(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: uploadExpires,
  });
  const publicUrl = getPublicPhotoUrl(key);
  if (!publicUrl) {
    throw new Error('Public URL base is not configured for photo uploads');
  }

  return { uploadUrl, publicUrl, key };
}
