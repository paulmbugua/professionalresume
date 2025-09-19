import * as FileSystem from 'expo-file-system';

export async function uploadAsset(
  backendUrl: string,
  token: string,
  uriOrFile: string | { uri?: string },
  type: 'image' | 'video'
): Promise<string> {
  const endpoint = `${backendUrl}/api/profile/upload/${type}`;

  const rnUri =
    typeof uriOrFile === 'string'
      ? uriOrFile
      : (uriOrFile as any)?.uri || (uriOrFile as any);

  const result = await FileSystem.uploadAsync(endpoint, rnUri, {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
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
