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

    const { url } = await res.json();
    // Return the full URL exactly as the server sent it
    return url;
  }

  // ——— Native (React Native / Expo) ———
  const FileSystem = require('expo-file-system');
  const { uploadAsync, FileSystemUploadType } = FileSystem;

  const result = await uploadAsync(endpoint, uriOrFile as string, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: { Authorization: `Bearer ${token}` },
  });

  const { url } = JSON.parse(result.body);
  // Return the full URL exactly as the server sent it
  return url;
}
  