// packages/shared/api/uploadAsset.ts

/**
 * Upload one image or video to your `/api/profile/upload/:type` endpoint.
 * Works on both web (File) and native (URI string).
 */
export async function uploadAsset(
  backendUrl: string,
  token: string,
  /** on web pass a File; on native pass the asset.uri string */
  uriOrFile: string | File,
  type: 'image' | 'video'
): Promise<string> {
  const endpoint = `${backendUrl}/api/profile/upload/${type}`

  // ——— BROWSER PATH ———
  if (uriOrFile instanceof File) {
    const formData = new FormData()
    formData.append('file', uriOrFile)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload failed (${res.status})`)
    const { url } = await res.json()
    return url as string
  }

  // ——— NATIVE PATH ———
  // Lazy‐load expo-file-system so it never breaks your web bundle
  const { uploadAsync, FileSystemUploadType } =
    await import('expo-file-system')

  const result = await uploadAsync(endpoint, uriOrFile, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: { Authorization: `Bearer ${token}` },
  })

  const { url } = JSON.parse(result.body)
  return url as string
}
