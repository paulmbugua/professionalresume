// packages/shared/hooks/useCertificationSettings.ts

import { useState, useEffect } from 'react';
import {
  getCertificationStatus,
  uploadCertificationDocuments,
  CertificationData,
} from '@mytutorapp/shared/api';

export type UploadableFile =
  | File
  | { uri: string; name: string; type: string };

export default function useCertificationSettings(
  backendUrl: string,
  token: string,
  profileId?: string
) {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [certificationData, setCertificationData] =
    useState<CertificationData | null>(null);

  // Fetch current certification status
  useEffect(() => {
    if (!profileId) return;
    getCertificationStatus(backendUrl, token, profileId)
      .then(setCertificationData)
      .catch((err) =>
        console.error('Error fetching certification status:', err)
      );
  }, [backendUrl, token, profileId]);

  // For web file inputs
  const handleFileChange = (input: File[] | { target: { files: FileList | null } }) => {
    let selected: File[] = [];
    if (Array.isArray(input)) {
      selected = input;
    } else {
      const fl = input.target.files;
      selected = fl ? Array.from(fl) : [];
    }
    setFiles(selected);
  };

  // For React Native assets
  const setMobileFiles = (assets: Array<{ uri: string; name: string; type: string }>) => {
    setFiles(assets);
  };

  // Platform-agnostic submit that goes through shared API
   const handleSubmit = async (): Promise<CertificationData | null> => {
    if (!profileId) {
      console.error('Profile ID is missing.');
      return null;
    }
    if (files.length === 0) {
      console.error('No files selected for upload.');
      return null;
    }

    setUploading(true);
    try {
      // Log payload
      console.log('📤 uploadCertificationDocuments payload:', {
        endpoint: `${backendUrl}/api/profiles/${profileId}/certification`,
        files: files.map((f) =>
          f instanceof File
            ? { name: f.name, size: f.size, type: f.type }
            : f
        ),
      });

      // → HERE: assert to File[] so TS is happy
      const updated = await uploadCertificationDocuments(
        backendUrl,
        token,
        profileId,
        files as unknown as File[]
      );

      setCertificationData(updated);
      return updated;
    } catch (err) {
      console.error('Error uploading certification:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    files,
    uploading,
    certificationData,
    handleFileChange, // for web
    setMobileFiles,   // for RN
    handleSubmit,     // agnostic
  };
}
