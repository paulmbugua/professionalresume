// packages/shared/hooks/useUploadClassVault.ts

import { useState } from 'react'
import { uploadClassVaultAsset } from '@mytutorapp/shared/api/classVaultUploadApi'
import { createVideoJson } from '@mytutorapp/shared/api/classVaultApi'

export interface ClassVaultMetadata {
  title: string
  subject: string
  grade_level: string
  price: string
  duration?: string
  tags?: string[]
  video_url: string
  pdf_url?: string
}

export interface UploadResult { url: string }

export default function useUploadClassVault() {
  const [uploading, setUploading] = useState(false)

  /**
   * Only supports uploading 'video' or 'pdf' now.
   */
  const handleFileUpload = async (
    type: 'video' | 'pdf',
    file: { uri: string; name?: string; type?: string },
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> => {
    return uploadClassVaultAsset(file, type, onProgress)
  }

  /**
   * Submits the metadata JSON (including video_url, optional pdf_url).
   */
  const handleSubmitMetadata = async (
    metadata: ClassVaultMetadata
  ): Promise<void> => {
    setUploading(true)
    try {
      await createVideoJson(metadata)
    } finally {
      setUploading(false)
    }
  }

  return {
    uploading,
    handleFileUpload,
    handleSubmitMetadata,
  }
}
