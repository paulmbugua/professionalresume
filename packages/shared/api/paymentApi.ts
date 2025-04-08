// /packages/shared/api/paymentApi.ts
import axios from 'axios';

export const getPaymentPackages = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/payment/packages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Ensure response is an array; sort packages as needed.
  const packagesArray = Array.isArray(response.data) ? response.data : [];
  const order = ['Basic Package', 'Standard Package', 'Premium Package'];
  return packagesArray.sort((a, b) => order.indexOf(a.offer) - order.indexOf(b.offer));
};

export const getRandomProfile = async (backendUrl: string, token: string) => {
  const response = await axios.get(`${backendUrl}/api/profile/random`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getTutorReviews = async (backendUrl: string, token: string, tutorId: string) => {
  const response = await axios.get(`${backendUrl}/api/reviews?tutorId=${tutorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    avgRating: response.data.avgRating,
    totalReviews: response.data.totalReviews,
  };
};

export const initiatePayment = async (
  backendUrl: string,
  token: string,
  payload: { amount: number; packageId: string; paymentMethod: string; phone: string }
) => {
  const response = await axios.post(`${backendUrl}/api/payment/initiate`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const completePayment = async (
  backendUrl: string,
  token: string,
  payload: { transactionReference: string }
) => {
  return axios.put(`${backendUrl}/api/payment/confirm`, payload, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
};


export const updateMpesaReference = async (
  backendUrl: string,
  token: string,
  transactionReference: string,
  mpesaReference: string
) => {
  const response = await axios.put(
    `${backendUrl}/api/payment/update-mpesa`,
    { transactionReference, mpesaReference },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
