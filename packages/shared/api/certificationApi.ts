// packages/shared/api/certificationApi.ts
import axios, { AxiosError } from 'axios';

export interface CertificationData {
  status: string;
  // Add other certification-related fields if needed
}

// Fetch certification status for a tutor’s profile
export const getCertificationStatus = async (
  backendUrl: string,
  token: string,
  profileId: string
): Promise<CertificationData | null> => {
  try {
    const response = await axios.get(
      `${backendUrl}/api/profiles/${profileId}/certification/status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.certification || null;
  } catch (error) {
    const err = error as AxiosError<{ message: string }>;
    console.error(
      "Error fetching certification status:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// Upload certification documents for a tutor’s profile
export const uploadCertificationDocuments = async (
  backendUrl: string,
  token: string,
  profileId: string,
  files: File[]
): Promise<CertificationData> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('certification', file));

  try {
    const response = await axios.post(
      `${backendUrl}/api/profiles/${profileId}/certification`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.certification;
  } catch (error) {
    const err = error as AxiosError<{ message: string }>;
    console.error(
      "Error uploading certification:",
      err.response?.data || err.message
    );
    throw err;
  }
};
