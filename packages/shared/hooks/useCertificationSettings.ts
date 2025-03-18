// packages/shared/hooks/useCertificationSettings.ts
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCertificationStatus, uploadCertificationDocuments, CertificationData } from '../api/certificationApi';

const MAX_FILE_SIZE = 5242880; // 5MB in bytes
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

// Define a union type for file input. On web, you'll receive an event with target.files.
// On mobile, you can pass an array of File objects directly.
type FileInput = File[] | { target: { files: FileList | null } };

export const useCertificationSettings = (
  backendUrl: string,
  token: string,
  profileId: string | undefined
) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null);

  // Fetch certification status when profileId changes.
  useEffect(() => {
    const fetchStatus = async () => {
      if (!profileId) return;
      try {
        const data = await getCertificationStatus(backendUrl, token, profileId);
        setCertificationData(data);
      } catch (error) {
        // Error handling can be done here or in the API function.
      }
    };
    fetchStatus();
  }, [backendUrl, token, profileId]);

  // File change handler accepts either a File[] (for mobile) or a typical web event.
  const handleFileChange = (input: FileInput) => {
    let selectedFiles: File[] = [];
    if (Array.isArray(input)) {
      // Input is an array of File objects (mobile flow).
      selectedFiles = input;
    } else {
      // Web flow: extract files from event.
      selectedFiles = input.target.files ? Array.from(input.target.files) : [];
    }
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`"${file.name}" has an invalid file format.`);
        return false;
      }
      return true;
    });
    setFiles(validFiles);
  };

  // Remove the event parameter; mobile components can simply call handleSubmit.
  const handleSubmit = async () => {
    if (!files.length) {
      toast.error("Please select at least one file to upload.");
      return;
    }
    if (!profileId) {
      toast.error("Profile not loaded properly. Please try again later.");
      return;
    }
    setUploading(true);
    try {
      const updatedCertification = await uploadCertificationDocuments(backendUrl, token, profileId, files);
      setCertificationData(updatedCertification);
      toast.success(
        updatedCertification
          ? "Certification updated successfully and is pending verification."
          : "Certification submitted successfully and is pending verification."
      );
    } catch (error: any) {
      toast.error("Failed to upload certification documents.");
    } finally {
      setUploading(false);
    }
  };

  return { files, uploading, certificationData, handleFileChange, handleSubmit };
};
