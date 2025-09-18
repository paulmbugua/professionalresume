import axios from 'axios';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';
import {
  getAccessToken,
  mpesaTimestamp,
  mpesaPassword,
  shortcode,
  MPESA_BASE,
} from '../utils/mpesa.js';

/**
 * STK Push for Organization Subscription
 * Mirrors student flow but scoped to org_subscription_payments.
 *
 * @param {Object} params
 * @param {string} params.phone              - Admin payer MSISDN (any accepted format; will be normalized)
 * @param {number} params.amount             - Integer KES amount
 * @param {string} params.accountReference   - Up to ~12 chars preferred (e.g. ORG:123:PRO)
 * @param {string} params.description        - Transaction description
 * @param {string} [params.callbackUrl]      - Override; defaults to MPESA_ORG_CALLBACK_URL
 * @returns {Promise<Object>}                - Daraja response { MerchantRequestID, CheckoutRequestID, ... }
 */
export async function stkPushOrgSubscription({
  phone,
  amount,
  accountReference,
  description,
  callbackUrl,
}) {
  if (!phone) throw new Error('phone is required');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be a positive number');

  const accessToken = await getAccessToken();
  const ts  = mpesaTimestamp();
  const pwd = mpesaPassword(ts);
  const msisdn = normalizePhoneNumber(phone);

  const payload = {
    BusinessShortCode: shortcode,
    Password: pwd,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.max(1, Math.round(Number(amount))),
    PartyA: msisdn,
    PartyB: shortcode,
    PhoneNumber: msisdn,
    CallBackURL: (callbackUrl || process.env.MPESA_ORG_CALLBACK_URL || '').trim(),
    AccountReference: (accountReference || 'OrgSub').slice(0, 12),
    TransactionDesc: (description || 'Organization subscription').slice(0, 100),
  };

  const url = `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`;
  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return data;
}
