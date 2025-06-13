// packages/shared/hooks/useUploadClassVault.ts

import { useState, useEffect } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import { fetchUserRole } from '@mytutorapp/shared/api/profileApi'
import { uploadClassVaultAsset } from '@mytutorapp/shared/api/classVaultUploadApi'
import { createVideoJson } from '@mytutorapp/shared/api/classVaultApi'
import type { RecordedVideo } from '@mytutorapp/shared/types'

// Pick the fields needed to create a new RecordedVideo
export type CreateRecordedVideoPayload = Pick<
  RecordedVideo,
  | 'title'
  | 'subject'
  | 'grade_level'
  | 'price'
  | 'duration'
  | 'tags'
  | 'video_url'
  | 'pdf_url'
>

export interface UploadResult { url: string }

export default function useUploadClassVault() {
  const { token, backendUrl } = useShopContext()

  // 🔍 log the values right away
  console.log('useUploadClassVault → backendUrl:', backendUrl, 'token:', token)

  const [role, setRole] = useState<string>('')
  const [uploading, setUploading] = useState(false)

  // fetch the user role once we have a token
  useEffect(() => {
    if (!token || !backendUrl) {
      console.warn('Skipping role fetch; missing token or backendUrl')
      return
    }
    fetchUserRole(backendUrl, token)
      .then(setRole)
      .catch((err) =>
        console.error('Error fetching role in useUploadClassVault:', err)
      )
  }, [token, backendUrl])

  function ensureTutor() {
    if (role !== 'tutor') {
      throw new Error('Only tutors may upload ClassVault content.')
    }
  }

  const handleFileUpload = async (
    fileType: 'video' | 'pdf',
    file: { uri: string; name: string; type: string },
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> => {
    ensureTutor()
    return uploadClassVaultAsset(
      // pass values explicitly
      backendUrl,
      token,
      file,
      fileType,
      onProgress
    )
  }

  const handleSubmitMetadata = async (
    metadata: CreateRecordedVideoPayload
  ): Promise<void> => {
    ensureTutor()
    setUploading(true)
    try {
      await createVideoJson(
        // pass values explicitly
        backendUrl,
        token,
        metadata
      )
    } finally {
      setUploading(false)
    }
  }

  return {
    role,
    uploading,
    handleFileUpload,
    handleSubmitMetadata,
  }
}
