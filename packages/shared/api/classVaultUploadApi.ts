// packages/shared/api/classVaultUploadApi.ts

import axios from 'axios'
import { Platform } from 'react-native'

export interface UploadResult { url: string }

// Either a browser File or an RN asset
type Asset = File | { uri: string; name: string; type: string }

export const uploadClassVaultAsset = async (
  backendUrl: string,
  token: string,
  file: Asset,
  type: 'video' | 'pdf',
  onProgress?: (percent: number) => void
): Promise<UploadResult> => {
  const url = `${backendUrl}/api/classvault/upload/${type}`

  // —— BROWSER PATH ——  
  if (file instanceof File) {
    const form = new FormData()
    form.append('file', file)
    const res = await axios.post<UploadResult>(url, form, {
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded * 100) / e.total!))
        }
      },
    })
    return res.data
  }

  // —— REACT-NATIVE PATH ——  
  return await new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()

    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any)

    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    // progress events
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded * 100) / event.total))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText)
          resolve(json as UploadResult)
        } catch (err) {
          reject(new Error('Invalid JSON response'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network request failed'))
    }

    xhr.send(form)
  })
}
