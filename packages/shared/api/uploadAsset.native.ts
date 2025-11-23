import * as FileSystem from 'expo-file-system';

export async function uploadAsset(
  backendUrl: string,
  token: string,
  uriOrFile: string | { uri?: string },
  type: 'image' | 'video'
): Promise<string> {
  const base = backendUrl.replace(/\/$/, '');
  const endpoint = `${base}/api/profile/upload/${type}`;

  const rnUri =
    typeof uriOrFile === 'string'
      ? uriOrFile
      : (uriOrFile as any)?.uri || (uriOrFile as any);

  // 🔑 Robustly resolve the upload type enum
  const uploadTypeEnum =
    (FileSystem as any).FileSystemUploadType ??
    (FileSystem as any).UploadType ??
    null;

  if (!uploadTypeEnum || uploadTypeEnum.MULTIPART == null) {
    console.warn(
      '[uploadAsset.native] FileSystemUploadType.MULTIPART missing – check expo-file-system version'
    );
    throw new Error(
      'File uploads are not available (expo-file-system upload type missing).'
    );
  }

  const result = await FileSystem.uploadAsync(endpoint, rnUri, {
    httpMethod: 'POST',
    uploadType: uploadTypeEnum.MULTIPART,
    fieldName: 'file',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed (${result.status}) ${result.body || ''}`);
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(result.body);
  } catch {
    // ignore parse errors, handled below
  }

  if (!parsed?.url || typeof parsed.url !== 'string') {
    throw new Error('Upload response missing url.');
  }

  return parsed.url;
}
