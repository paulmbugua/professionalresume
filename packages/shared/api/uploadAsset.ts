// packages/shared/api/uploadAsset.ts

export async function uploadAsset(
  backendUrl: string,
  token: string,
  uriOrFile: string | File,
  type: 'image' | 'video'
): Promise<string> {
  const endpoint = `${backendUrl}/api/profile/upload/${type}`;

  // ——— Browser (Web) ———
  if (typeof window !== 'undefined' && window.document) {
    const formData = new FormData();
    const file =
      uriOrFile instanceof File
        ? uriOrFile
        : await fetch(uriOrFile).then((r) => r.blob());
    formData.append('file', file);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);

    const { url: returnedPath } = await res.json();

    // ALWAYS return the relative path:
    if (returnedPath.startsWith('/')) {
      return returnedPath;
    }
    // If somehow a full URL slipped through, extract its pathname:
    try {
      return new URL(returnedPath).pathname;
    } catch {
      // Fallback: strip backendUrl prefix if present
      return returnedPath.replace(backendUrl, '');
    }
  }

  // ——— Native (React Native / Expo) ———
  const FileSystem = require('expo-file-system');
  const { uploadAsync, FileSystemUploadType } = FileSystem;

  const result = await uploadAsync(endpoint, uriOrFile as string, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: { Authorization: `Bearer ${token}` },
  });

  const { url: returnedPath } = JSON.parse(result.body);

  if (returnedPath.startsWith('/')) {
    return returnedPath;
  }
  try {
    return new URL(returnedPath).pathname;
  } catch {
    return returnedPath.replace(backendUrl, '');
  }
}
