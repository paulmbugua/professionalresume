// packages/shared/api/uploadAsset.ts
export async function uploadAsset(
  backendUrl: string,
  token: string,
  uriOrFile: string | File,
  type: 'image' | 'video'
): Promise<string> {
  const endpoint = `${backendUrl}/api/profile/upload/${type}`;
  const isWeb = typeof window !== 'undefined' && !!window.document;

  if (isWeb) {
    const formData = new FormData();

    const blobOrFile =
      uriOrFile instanceof File
        ? uriOrFile
        : await fetch(uriOrFile, { cache: 'no-store' }).then((r) => {
            if (!r.ok) throw new Error(`Failed to read asset (${r.status})`);
            return r.blob();
          });

    const filename =
      uriOrFile instanceof File
        ? uriOrFile.name
        : type === 'video' ? 'upload.mp4' : 'upload.jpg';

    formData.append('file', blobOrFile as Blob, filename);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 120_000);

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(id);
      if (e?.name === 'AbortError') throw new Error('Upload timed out.');
      throw new Error(`Network error: ${e?.message || e}`);
    }
    clearTimeout(id);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed (${res.status}) ${text}`);
    }
    const json = await res.json().catch(() => ({}));
    if (!json?.url || typeof json.url !== 'string') {
      throw new Error('Upload response missing url.');
    }
    return json.url;
  }

  // React Native / Expo
  const FileSystem = require('expo-file-system');
  const { uploadAsync, FileSystemUploadType } = FileSystem;

  const rnUri =
    typeof uriOrFile === 'string'
      ? uriOrFile
      : (uriOrFile as any)?.uri || (uriOrFile as any);

  const result = await uploadAsync(endpoint, rnUri, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed (${result.status}) ${result.body || ''}`);
  }
  let parsed: any = {};
  try { parsed = JSON.parse(result.body); } catch {}
  if (!parsed?.url || typeof parsed.url !== 'string') {
    throw new Error('Upload response missing url.');
  }
  return parsed.url;
}
