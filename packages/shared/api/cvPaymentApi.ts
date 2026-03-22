import axios from 'axios';

function client(backendUrl: string, token?: string) {
  return axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const toMessage = (err: any) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  (typeof err?.response?.data === 'string' ? err.response.data : '') ||
  err?.message ||
  'Request failed';

export type CvEntitlementResponse = {
  eligible: boolean;
  entitlementKey?: string;
  sourcePaymentId?: number;
  grantedAt?: string;
  reason?: string;
};

export const createCvPaymentIntent = async (
  backendUrl: string,
  token: string,
  payload: { provider: 'MPESA' | 'PAYSTACK'; callbackUrl?: string; phone?: string },
) => {
  if (payload.provider === 'MPESA') {
    return initCvMpesaPayment(backendUrl, token, { phone: payload.phone || '' });
  }
  return createCvPaystackOrder(backendUrl, token, { callbackUrl: payload.callbackUrl || '' });
};

export const initCvMpesaPayment = async (
  backendUrl: string,
  token: string,
  payload: { phone: string },
): Promise<{ transactionId: string; checkoutRequestId: string; message: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/cv/payments/mpesa/init', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const confirmCvMpesaPayment = async (
  backendUrl: string,
  token: string,
  payload: { transactionId?: string; checkoutRequestId?: string; mpesaReceipt?: string },
): Promise<{ status: 'Pending' | 'Completed' | 'Failed'; paymentId: number; message?: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/cv/payments/mpesa/confirm', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const createCvPaystackOrder = async (
  backendUrl: string,
  token: string,
  payload: { callbackUrl: string },
): Promise<{ transactionId: string; reference: string; authorizationUrl: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/cv/payments/paystack/create-order', payload);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const verifyCvPaystackPayment = async (
  backendUrl: string,
  token: string,
  reference: string,
): Promise<{ status: 'Pending' | 'Completed' | 'Failed'; paymentId: number; message?: string }> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get(`/api/cv/payments/paystack/verify/${encodeURIComponent(reference)}`);
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const getCvExportEntitlement = async (
  backendUrl: string,
  token: string,
): Promise<CvEntitlementResponse> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.get('/api/cv/payments/entitlement');
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};

export const ensureCvExportEntitlement = async (
  backendUrl: string,
  token: string,
): Promise<CvEntitlementResponse> => {
  try {
    const api = client(backendUrl, token);
    const res = await api.post('/api/cv/payments/entitlement/ensure');
    return res.data;
  } catch (err: any) {
    throw new Error(toMessage(err));
  }
};
