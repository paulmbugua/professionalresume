// packages/shared/api/accountApi.ts
import axios from 'axios';
import type {
  SessionFormData,
  EarningsSummary,
  Transaction,
  Payout,
} from '@mytutorapp/shared/types';

/* -----------------------------------------------------------
 * Helpers
 * --------------------------------------------------------- */
const cleaned = (u: string) => u.replace(/\/+$/, '');
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/* -----------------------------------------------------------
 * Account
 * --------------------------------------------------------- */

export const fetchAccountDetails = async (
  backendUrl: string,
  token: string
): Promise<{ user: any; profile: any }> => {
  const base = cleaned(backendUrl);
  const [userResponse, profileResponse] = await Promise.all([
    axios.get(`${base}/api/user/me`, { headers: auth(token) }),
    axios.get(`${base}/api/profile/me`, { headers: auth(token) }),
  ]);
  return { user: userResponse.data, profile: profileResponse.data };
};

export const fetchTransactions = async (
  backendUrl: string,
  token: string
): Promise<Transaction[]> => {
  const base = cleaned(backendUrl);
  try {
    const { data } = await axios.get(`${base}/api/payment/transactions`, {
      headers: auth(token),
    });
    return Array.isArray(data?.data) ? (data.data as Transaction[]) : [];
  } catch (err: unknown) {
    // Return empty list on unauthorized/forbidden to avoid console spam.
    if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
      return [];
    }
    throw err;
  }
};

export const fetchUpdatedTokenBalance = async (
  backendUrl: string,
  token: string
): Promise<number> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.get(`${base}/api/user/me`, { headers: auth(token) });
  return Number(data?.tokens ?? 0);
};

/* -----------------------------------------------------------
 * Sessions
 * --------------------------------------------------------- */

export const fetchSessionsByType = async (
  backendUrl: string,
  token: string,
  type: string
): Promise<any[]> => {
  const base = cleaned(backendUrl);
  try {
    const { data } = await axios.get(`${base}/api/tutor-session/${type}`, {
      headers: auth(token),
    });
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
      return [];
    }
    throw err;
  }
};

export const acceptSession = async (
  backendUrl: string,
  token: string,
  sessionId: string
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.put(
    `${base}/api/tutor-session/${sessionId}/accept`,
    {},
    { headers: auth(token) }
  );
  return data;
};

export const cancelSession = async (
  backendUrl: string,
  token: string,
  sessionId: string,
  reason: string
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.put(
    `${base}/api/tutor-session/${sessionId}/cancel`,
    { reason },
    { headers: auth(token) }
  );
  return data;
};

export const completePendingSession = async (
  backendUrl: string,
  token: string,
  sessionId: string
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.put(
    `${base}/api/tutor-session/session/complete-pending`,
    { sessionId },
    { headers: auth(token) }
  );
  return data;
};

export const confirmSessionCompletion = async (
  backendUrl: string,
  token: string,
  sessionId: string
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.put(
    `${base}/api/tutor-session/session/confirm-completion`,
    { sessionId },
    { headers: auth(token) }
  );
  return data;
};

/* -----------------------------------------------------------
 * Reviews
 * --------------------------------------------------------- */

export const submitReview = async (
  backendUrl: string,
  token: string,
  reviewData: { tutorId: string; sessionId?: string; comment: string; rating: number }
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.post(`${base}/api/reviews`, reviewData, {
    headers: auth(token),
  });
  return data;
};

/* -----------------------------------------------------------
 * Create Session / Zoom
 * --------------------------------------------------------- */

export const createSession = async (
  backendUrl: string,
  token: string,
  formData: SessionFormData
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.post(`${base}/api/tutor-session/session/create`, formData, {
    headers: auth(token),
  });
  return data;
};

export const createZoomLink = async (
  backendUrl: string,
  token: string,
  sessionId: string,
  topic: string,
  startTime: string,
  duration: number,
  tutorName: string
): Promise<any> => {
  const base = cleaned(backendUrl);
  const { data } = await axios.post(
    `${base}/api/tutor-session/create-zoom-link`,
    { sessionId, topic, startTime, duration, tutorName },
    { headers: auth(token) }
  );
  return data;
};

/* -----------------------------------------------------------
 * Earnings
 * --------------------------------------------------------- */

export const fetchEarningsSummary = async (
  backendUrl: string,
  token: string
): Promise<EarningsSummary> => {
  const base = cleaned(backendUrl);
  const url = `${base}/api/earnings/summary`;

  try {
    const { data } = await axios.get(url, { headers: auth(token) });

    const firstBalance = data?.balances?.[0] ?? {
      available_amount: 0,
      pending_amount: 0,
      currency: 'USD',
    };

    return {
      total: Number(data?.lifetime?.[0]?.total ?? 0),
      pending: Number(firstBalance?.pending_amount ?? 0),
      available: Number(firstBalance?.available_amount ?? 0),
      currency: String(firstBalance?.currency ?? 'USD'),
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0;
      // Tutor-only endpoint: return safe defaults on 401/403 to avoid log spam.
      if (status === 401 || status === 403) {
        return { total: 0, pending: 0, available: 0, currency: 'USD' };
      }
    }
    throw err;
  }
};

export const fetchEarningsTransactions = async (
  backendUrl: string,
  token: string
): Promise<Transaction[]> => {
  const base = cleaned(backendUrl);
  try {
    const { data } = await axios.get(`${base}/api/earnings/transactions`, {
      headers: auth(token),
    });
    return Array.isArray(data?.data) ? (data.data as Transaction[]) : [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
      return [];
    }
    throw err;
  }
};

export const fetchEarningsPayouts = async (
  backendUrl: string,
  token: string
): Promise<Payout[]> => {
  const base = cleaned(backendUrl);
  try {
    const { data } = await axios.get(`${base}/api/earnings/payouts`, {
      headers: auth(token),
    });
    return Array.isArray(data?.data) ? (data.data as Payout[]) : [];
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0)) {
      return [];
    }
    throw err;
  }
};
