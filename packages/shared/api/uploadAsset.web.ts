export type UploadAssetKind = 'image' | 'video' | 'doc';
const GUEST_UPLOAD_SESSION_KEY = 'cvpro:guest-upload-session-id';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const inferImageExt = (mimeType: string, filename = '') => {
  const normalizedType = String(mimeType || '').toLowerCase();
  if (normalizedType === 'image/png') return 'png';
  if (normalizedType === 'image/webp') return 'webp';
  if (normalizedType === 'image/jpeg') return 'jpg';

  const lowerName = String(filename || '').toLowerCase();
  if (lowerName.endsWith('.png')) return 'png';
  if (lowerName.endsWith('.webp')) return 'webp';
  return 'jpg';
};

export async function uploadAsset(
  backendUrl: string,
  token: string | undefined,
  uriOrFile: string | File,
  type: UploadAssetKind
): Promise<string> {
  const base = backendUrl.replace(/\/$/, '');

  if (type !== 'image') {
    throw new Error('Only image uploads are supported for CV profile photos.');
  }

  const blobOrFile =
    uriOrFile instanceof File
      ? uriOrFile
      : await fetch(uriOrFile, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(`Failed to read asset (${r.status})`);
          return r.blob();
        });
  const mimeType = String((blobOrFile as Blob).type || '').toLowerCase();
  const filename = uriOrFile instanceof File ? uriOrFile.name : 'upload.jpg';
  if (!allowedImageTypes.has(mimeType)) {
    throw new Error('Unsupported image type. Use JPG, PNG, or WEBP.');
  }
  const ext = inferImageExt(mimeType, filename);
  const safeToken = String(token || '').trim();
  const guestSessionId =
    !safeToken && typeof window !== 'undefined'
      ? (() => {
          try {
            const existing = window.localStorage.getItem(GUEST_UPLOAD_SESSION_KEY);
            if (existing) return existing;
            const next = (
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
            ).replace(/[^a-zA-Z0-9_-]/g, '');
            window.localStorage.setItem(GUEST_UPLOAD_SESSION_KEY, next);
            return next;
          } catch {
            return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          }
        })()
      : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let presignRes: Response;
  try {
    presignRes = await fetch(`${base}/api/uploads/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(safeToken ? { Authorization: `Bearer ${safeToken}` } : {}),
      },
      body: JSON.stringify({
        purpose: 'cv-photo',
        contentType: mimeType,
        ext,
        sizeBytes: (blobOrFile as Blob).size || undefined,
        ...(guestSessionId ? { guestSessionId } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!presignRes.ok) {
    const text = await presignRes.text().catch(() => '');
    throw new Error(`Upload failed (${presignRes.status}) ${text}`);
  }

  const presignJson = await presignRes.json().catch(() => ({}));
  const uploadUrl: string | undefined = presignJson?.uploadUrl;
  const publicUrl: string | undefined = presignJson?.publicUrl;
  const key: string | undefined = presignJson?.key;
  if (!uploadUrl || !publicUrl || !key) {
    throw new Error('Upload response missing signed upload data.');
  }

  const directUploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blobOrFile as Blob,
  });
  if (!directUploadRes.ok) {
    throw new Error(`Upload transfer failed (${directUploadRes.status}).`);
  }

  const confirmRes = await fetch(`${base}/api/uploads/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(safeToken ? { Authorization: `Bearer ${safeToken}` } : {}),
    },
    body: JSON.stringify({
      key,
      publicUrl,
      ...(guestSessionId ? { guestSessionId } : {}),
    }),
  });
  if (!confirmRes.ok) {
    const text = await confirmRes.text().catch(() => '');
    throw new Error(`Upload confirmation failed (${confirmRes.status}) ${text}`);
  }

  const confirmJson = await confirmRes.json().catch(() => ({}));
  return confirmJson?.publicUrl || confirmJson?.url || publicUrl;
}
