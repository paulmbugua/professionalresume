import axios from 'axios';
import {
  getAccessToken,
  password,
  shortcode,
  callbackURL,
  // If your utils export a *function* to compute timestamp, prefer that.
  // Otherwise, we can compute it inline below.
  timestamp as staticTimestamp,
} from '../utils/mpesa.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

/**
 * Fire a pure STK Push for **organisation subscriptions**.
 * - DOES NOT touch your database
 * - DOES NOT expect a packageId
 * - Returns Safaricom's raw response (contains CheckoutRequestID, etc.)
 *
 * @param {Object} params
 * @param {string} params.phone                Safaricom MSISDN (any format; will be normalized)
 * @param {number} params.amount               Amount in KES (integer)
 * @param {string=} params.accountReference    Label shown in M-Pesa (default 'OrgSubscription')
 * @param {string=} params.description         Transaction description (default 'Organisation subscription')
 * @param {string=} params.callbackUrl         Optional override for callback URL
 */
export async function stkPushOrgSubscription({
  phone,
  amount,
  accountReference = 'OrgSubscription',
  description = 'Organisation subscription',
  callbackUrl,
}) {
  if (!phone || !amount) {
    throw new Error('stkPushOrgSubscription: phone and amount are required.');
  }

  const accessToken = await getAccessToken();
  const normalizedPhone = normalizePhoneNumber(phone);

  // Use dynamic timestamp if your utils export a constant
  const ts =
    typeof staticTimestamp === 'function'
      ? staticTimestamp()
      : new Date()
          .toISOString()
          .replace(/[-:TZ.]/g, '')
          .slice(0, 14);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Number(amount),
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL:
      callbackUrl ||
      process.env.MPESA_ORG_CALLBACK_URL ||
      callbackURL, // fallback to your generic callback
    AccountReference: accountReference,
    TransactionDesc: description,
  };

  const base = process.env.MPESA_BASE_URL || 'https://api.safaricom.co.ke';
  const url = `${base}/mpesa/stkpush/v1/processrequest`;

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Example: { MerchantRequestID, CheckoutRequestID, ResponseCode, ... }
  return data;
}

/**
 * Optional: Query STK status for an org subscription by CheckoutRequestID.
 * Useful if you want to poll (not required if your callback saves mpesa_reference).
 */
export async function queryStkPushOrg({ checkoutRequestId }) {
  if (!checkoutRequestId) throw new Error('queryStkPushOrg: checkoutRequestId is required');

  const accessToken = await getAccessToken();

  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    CheckoutRequestID: checkoutRequestId,
  };

  const base = process.env.MPESA_BASE_URL || 'https://api.safaricom.co.ke';
  const url = `${base}/mpesa/stkpushquery/v1/query`;

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return data;
}
