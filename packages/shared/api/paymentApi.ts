// packages/shared/api/paymentApi.ts
import axios from 'axios';
import type { PaymentPackage } from '@mytutorapp/shared/types';

export const getPaymentPackages = async (
  backendUrl: string,
  token: string,
  currency?: 'USD' | 'KES'
): Promise<PaymentPackage[]> => {
  const url = new URL('/api/payment/packages', backendUrl);
  if (currency) url.searchParams.set('currency', currency);

  const response = await axios.get<PaymentPackage[]>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const packagesArray: PaymentPackage[] = Array.isArray(response.data) ? response.data : [];

  // Sort packages by credits ascending (or any custom order you want)
  return packagesArray.sort(
    (a, b) => Number(a.credits ?? 0) - Number(b.credits ?? 0)
  );
};

export const getRandomProfile = async (
  backendUrl: string,
  token: string
) => {
  const response = await axios.get(`${backendUrl}/api/profile/random`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getTutorReviews = async (
  backendUrl: string,
  token: string,
  tutorId: string
): Promise<{ avgRating: number; totalReviews: number }> => {
  const response = await axios.get(`${backendUrl}/api/reviews?tutorId=${encodeURIComponent(tutorId)}`, {
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
): Promise<{ transactionId?: string }> => {
  const response = await axios.post<{ transactionId?: string }>(
    `${backendUrl}/api/payment/initiate`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const completePayment = async (
  backendUrl: string,
  token: string,
  payload: { transactionReference: string }
) => {
  return axios.put(
    `${backendUrl}/api/payment/confirm`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const updateMpesaReference = async (
  backendUrl: string,
  token: string,
  transactionReference: string,
  mpesaReference: string
): Promise<{ message: string }> => {
  const response = await axios.put<{ message: string }>(
    `${backendUrl}/api/payment/update-mpesa`,
    { transactionReference, mpesaReference },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
