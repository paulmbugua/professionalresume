import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.R2_ENDPOINT;
const region = process.env.R2_REGION || 'auto';
const bucket = process.env.R2_BUCKET_DOCS;
const publicBase = (process.env.R2_PUBLIC_BASE_URL_DOCS || '').replace(/\/$/, '');
const maxDocBytes = Number(process.env.R2_MAX_DOC_BYTES || 50 * 1024 * 1024);
const signedExpiry = Number(process.env.R2_DOWNLOAD_EXPIRES_SEC || 900);

const allowedDocMimeTypes = new Set([
  'application/pdf',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

if (!endpoint || !bucket) {
  console.warn('[r2] Missing R2 endpoint or bucket config; CV file operations will fail.');
}

export const r2Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const r2Config = {
  bucket,
  publicBase,
  maxDocBytes,
  signedExpiry,
  allowedDocMimeTypes,
};

export function assertAllowedDoc({ bytes, contentType }) {
  if (!allowedDocMimeTypes.has(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  if (bytes > maxDocBytes) {
    throw new Error(`Document exceeds max size of ${maxDocBytes} bytes`);
  }
}

export function getPublicR2Url(key) {
  if (!publicBase) return null;
  return `${publicBase}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
}

export async function putDocObject({ key, body, contentType }) {
  const bytes = Buffer.isBuffer(body) ? body.byteLength : Buffer.byteLength(body);
  assertAllowedDoc({ bytes, contentType });

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return {
    key,
    bytes,
    contentType,
    url: getPublicR2Url(key),
  };
}

export async function deleteDocObject(key) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function signDocGetUrl(key, expiresIn = signedExpiry) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(r2Client, cmd, { expiresIn });
}
