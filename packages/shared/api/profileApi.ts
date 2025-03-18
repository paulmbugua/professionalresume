// /packages/shared/api/profileApi.ts
import axios from 'axios';

export const createProfile = async (
  backendUrl: string,
  token: string,
  formData: FormData
) => {
  const response = await axios.post(`${backendUrl}/api/profile`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
};

export const fetchUserRole = async (backendUrl: string, token: string): Promise<string> => {
  const response = await axios.get(`${backendUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.data.success) {
    return response.data.role;
  }
  throw new Error("Failed to fetch user role");
};


export const fetchTutorProfiles = async (backendUrl: string) => {
    const response = await axios.get(`${backendUrl}/api/profile/`);
    // Assuming the response contains an array of profiles under `response.data.profiles`
    const tutorProfiles = response.data.profiles.filter(
      (profile: any) => profile.role === 'tutor'
    );
    return tutorProfiles;
  };

  export const fetchUserProfile = async (
    backendUrl: string,
    token: string
  ): Promise<{ profileExists: boolean; [key: string]: any }> => {
    const response = await axios.get(`${backendUrl}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };