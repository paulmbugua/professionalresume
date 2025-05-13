import axios, { AxiosError } from 'axios';

export const getTutorProfile = async (backendUrl: string, token: string, tutorId: string) => {
  console.log('🔍 [API Debug] Starting getTutorProfile with:', {
    backendUrl,
    tutorId,
    tokenPresent: !!token
  });

  try {
    console.log('🔗 [API Debug] Attempting request to:', `${backendUrl}/api/profile/${tutorId}`);
    
    const response = await axios.get(`${backendUrl}/api/profile/${tutorId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ [API Debug] Successfully fetched profile:', {
      status: response.status,
      data: response.data
    });
    
    return response.data;
  } catch (err) {
    const error = err as AxiosError; // Type assertion

    console.error('❌ [API Debug] Failed to fetch profile:', {
      errorName: error.name,
      errorMessage: error.message,
      requestConfig: error.config,
      responseData: error.response?.data,
      responseStatus: error.response?.status,
      code: error.code,
      stack: error.stack
    });

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - server not responding');
    }
    
    if (!error.response) {
      throw new Error('Network error - could not reach server');
    }

    if (error.response.status === 401) {
      throw new Error('Unauthorized - invalid token');
    }

    throw error;
  }
};