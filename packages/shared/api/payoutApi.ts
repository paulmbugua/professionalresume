import axios from 'axios';

export type WithdrawalCurrency = 'USD' | 'KES';

export interface WithdrawalRequestBody {
  currency: WithdrawalCurrency;
  amount: number;
}

export interface WithdrawalResponse {
  message: string;          // "Withdrawal queued."
  transactionId: number;    // id from transactions row
}

/**
 * Request a withdrawal. Requires a valid JWT and the payout
 * currency to match the tutor's profile.
 */
export const requestWithdrawal = async (
  backendUrl: string,
  token: string,
  body: WithdrawalRequestBody
): Promise<WithdrawalResponse> => {
  const url = `${backendUrl}/api/payouts/withdraw`;

  const res = await axios.post<WithdrawalResponse>(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return res.data;
};
