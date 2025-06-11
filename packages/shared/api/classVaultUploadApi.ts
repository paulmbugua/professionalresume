import axios from 'axios'
import { useShopContext } from '@mytutorapp/shared/context'

export interface UploadResult { url: string }

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api/classvault'

export const uploadClassVaultAsset = async (
  file: { uri: string; name?: string; type?: string },
  type: 'video' | 'pdf',      // drop thumbnail/preview if you automate those
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const { token } = useShopContext()

  const formData = new FormData()
  formData.append('file', {
    uri: file.uri,
    name: file.name ?? `${type}-${Date.now()}`,
    type: file.type ?? 'application/octet-stream',
  } as any)

  const res = await axios.post<UploadResult>(
    `${BASE_URL}/upload/${type}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,   // ⚠️ include your JWT!
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
