export type UploadAssetKind = 'image' | 'video' | 'doc';
const GUEST_UPLOAD_SESSION_KEY = 'cvpro:guest-upload-session-id';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

  const uploadForm = new FormData();
  uploadForm.append('file', blobOrFile, filename);
  if (guestSessionId) uploadForm.append('guestSessionId', guestSessionId);

  let uploadRes: Response;
  try {
    uploadRes = await fetch(`${base}/api/uploads/photo`, {
      method: 'POST',
      headers: {
        ...(safeToken ? { Authorization: `Bearer ${safeToken}` } : {}),
      },
      body: uploadForm,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    throw new Error(`Upload failed (${uploadRes.status}) ${text}`);
  }

  const uploadJson = await uploadRes.json().catch(() => ({}));
  const publicUrl: string | undefined = uploadJson?.publicUrl;
  if (!publicUrl) {
    throw new Error('Upload response missing the public photo URL.');
  }
  return publicUrl;
}
