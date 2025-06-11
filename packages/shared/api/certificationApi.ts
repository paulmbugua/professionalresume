// packages/shared/api/certificationApi.ts

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
    const response = await fetch(
      `${backendUrl}/api/profiles/${profileId}/certification/status`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Status fetch failed (${response.status}): ${text}`);
    }
    const json = await response.json();
    return json.certification || null;
  } catch (err: any) {
    console.error(
      'Error fetching certification status:',
      err.message || err
    );
    throw err;
  }
};

// Upload certification documents for a tutor’s profile
export const uploadCertificationDocuments = async (
  backendUrl: string,
  token: string,
  profileId: string,
  files: Array<
    | File
    | { uri: string; name: string; type: string }
  >
): Promise<CertificationData> => {
  const endpoint = `${backendUrl}/api/profiles/${profileId}/certification`;
  const formData = new FormData();

  files.forEach((file) => {
    // On Web `file` is a File; on RN it’s an object with uri/name/type
    formData.append(
      'certification',
      // cast to any so fetch will accept it
      file as any
    );
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type so the browser/RN runtime
        // can inject the correct multipart boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Upload failed (${response.status}): ${text}`
      );
    }

    const json = await response.json();
    return json.certification as CertificationData;
  } catch (err: any) {
    console.error(
      'Error uploading certification:',
      err.message || err
    );
    throw err;
  }
};
