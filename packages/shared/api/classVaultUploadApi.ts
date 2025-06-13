// packages/shared/api/classVaultUploadApi.ts

import axios from 'axios'

export interface UploadResult { url: string }

// No React hooks here!
export const uploadClassVaultAsset = async (
  backendUrl: string,
  token: string,
  file: { uri: string; name: string; type: string },
  type: 'video' | 'pdf',
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const formData = new FormData()
  formData.append(
    'file',
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any
  )
  
  const res = await axios.post<UploadResult>(
    `${backendUrl}/api/classvault/upload/${type}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      onUploadProgress: (e) => {
        if (onProgress) {
          onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
        }
      },
    }
  )
  return res.data
}
