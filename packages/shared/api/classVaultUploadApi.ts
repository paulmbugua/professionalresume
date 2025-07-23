// packages/shared/api/classVaultUploadApi.ts

import axios from 'axios';

export interface UploadResult { url: string }

// Allow either a browser File or an RN‐style asset
type Asset = File | { uri: string; name: string; type: string };

export const uploadClassVaultAsset = async (
  backendUrl: string,
  token: string,
  file: Asset,
  type: 'video' | 'pdf',
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const formData = new FormData();

  if (file instanceof File) {
    // Browser — append the File directly
    formData.append('file', file);
  } else {
    // React Native — your existing logic
    formData.append(
      'file',
      {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any
    );
  }

  const res = await axios.post<UploadResult>(
    `${backendUrl}/api/classvault/upload/${type}`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        // omit Content-Type so axios adds the correct boundary
      },
      onUploadProgress: (e) => {
        if (onProgress) {
          onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)));
        }
      },
    }
  );

  return res.data;
};
