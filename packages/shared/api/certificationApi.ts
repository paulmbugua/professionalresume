// packages/shared/api/certificationApi.ts
import axios from 'axios';

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
  } catch (error: any) {
    console.error(
      "Error fetching certification status:",
      error.response?.data || error.message
    );
    throw error;
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
  } catch (error: any) {
    console.error(
      "Error uploading certification:",
      error.response?.data || error.message
    );
    throw error;
  }
};
