// services/mpesaOrgService.js
import axios from 'axios';
import {
  getAccessToken,
  // ⚠️ make sure your utils/mpesa.js exports these:
  shortcode,         // e.g. '174379' (sandbox) or your live paybill/till
             // LNMO passkey string
  callbackURL,       // optional global fallback callback
} from '../utils/mpesa.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

/* Helpers */
function buildTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  ); // yyyyMMddHHmmss
}

function buildPassword(sc, pk, ts) {
  if (!sc || !pk) throw new Error('Missing M-Pesa shortcode or passkey');
  return Buffer.from(`${sc}${pk}${ts}`).toString('base64');
}

function mpesaBase() {
  // explicit override wins
  if (process.env.MPESA_BASE_URL && process.env.MPESA_BASE_URL.trim()) {
    return process.env.MPESA_BASE_URL.trim();
  }
  const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
  return env === 'live'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

/**
 * STK push specifically for organisation subscriptions.
 * - no DB writes here
 * - no packageId
 * - returns Safaricom raw response (contains CheckoutRequestID)
 *
 * @param {Object} params
 * @param {string} params.phone
 * @param {number} params.amount  // KES integer
 * @param {string=} params.accountReference
 * @param {string=} params.description
 * @param {string=} params.callbackUrl
 */
export async function stkPushOrgSubscription({
  phone,
  amount,
  accountReference = 'OrgSubscription',
  description = 'Organisation subscription',
  callbackUrl,
}) {
  if (!phone || amount == null) {
    throw new Error('stkPushOrgSubscription: phone and amount are required.');
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const kes = Math.max(1, Math.floor(Number(amount) || 0)); // ensure integer >= 1

  // fresh timestamp & password each time
  const Timestamp = buildTimestamp();
  const Password = buildPassword(String(shortcode), String(passkey), Timestamp);

  const accessToken = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password,
    Timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: kes,
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL:
      callbackUrl ||
      process.env.MPESA_ORG_CALLBACK_URL ||
      callbackURL, // fall back to your global callback
    AccountReference: accountReference,
    TransactionDesc: description,
  };

  const url = `${mpesaBase()}/mpesa/stkpush/v1/processrequest`;

  try {
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // { MerchantRequestID, CheckoutRequestID, ResponseCode, ... }
    return data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg =
      data?.errorMessage ||
      data?.error_description ||
      err?.message ||
      'M-Pesa STK push failed';
    const e = new Error(msg);
    e.status = status;
    e.data = data;
    throw e;
  }
}

/**
 * Optional: query STK status by CheckoutRequestID
 */
export async function queryStkPushOrg({ checkoutRequestId }) {
  if (!checkoutRequestId) {
    throw new Error('queryStkPushOrg: checkoutRequestId is required');
  }

  const Timestamp = buildTimestamp();
  const Password = buildPassword(String(shortcode), String(passkey), Timestamp);
  const accessToken = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password,
    Timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const url = `${mpesaBase()}/mpesa/stkpushquery/v1/query`;

  try {
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg =
      data?.errorMessage ||
      data?.error_description ||
      err?.message ||
      'M-Pesa STK query failed';
    const e = new Error(msg);
    e.status = status;
    e.data = data;
    throw e;
  }
}
