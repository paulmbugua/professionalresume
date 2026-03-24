import crypto from 'crypto';
import axios from 'axios';
import pool from '../config/db.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';
import {
  getAccessToken,
  shortcode,
  mpesaTimestamp,
  mpesaPassword,
  resolveStkCallbackUrl,
  getMpesaConfigHealth,
  MPESA_ENV,
  MPESA_BASE,
} from '../utils/mpesa.js';

export const CVPRO_EXPORT_PRICE_USD = 1;
export const CVPRO_EXPORT_PRICE_KES = 100;
export const CV_EXPORT_PURCHASE_KIND = 'cv_export_unlock';
export const CV_EXPORT_ENTITLEMENT_KEY = 'cv_export_unlock';

class PaymentInitError extends Error {
  constructor(message, statusCode, code, providerMessage) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    if (providerMessage) this.providerMessage = providerMessage;
  }
}

function baseMeta() {
  return {
    kind: CV_EXPORT_PURCHASE_KIND,
    resumeExportUnlocked: true,
    coverLetterExportUnlocked: true,
    sourceProduct: 'cvpro',
    usdAmount: CVPRO_EXPORT_PRICE_USD,
    kesAmount: CVPRO_EXPORT_PRICE_KES,
  };
}

function readCallbackItem(items, name) {
  return items.find((item) => item?.Name === name)?.Value ?? null;
}

export async function getCvExportEntitlement(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, entitlement_key, source_payment_id, granted_at, metadata
     FROM user_entitlements
     WHERE user_id=$1 AND entitlement_key=$2
     LIMIT 1`,
    [Number(userId), CV_EXPORT_ENTITLEMENT_KEY],
  );

  if (!rows[0]) {
    return { eligible: false, entitlementKey: CV_EXPORT_ENTITLEMENT_KEY, reason: 'payment_required' };
  }

  return {
    eligible: true,
    entitlementKey: rows[0].entitlement_key,
    sourcePaymentId: rows[0].source_payment_id,
    grantedAt: rows[0].granted_at,
    metadata: rows[0].metadata || {},
  };
}

export async function grantCvExportEntitlement({ userId, paymentId, client = pool }) {
  const meta = baseMeta();
  await client.query(
    `INSERT INTO user_entitlements (user_id, entitlement_key, source_payment_id, metadata)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (user_id, entitlement_key)
     DO UPDATE SET source_payment_id = COALESCE(user_entitlements.source_payment_id, EXCLUDED.source_payment_id),
                   metadata = user_entitlements.metadata || EXCLUDED.metadata,
                   updated_at = NOW()`,
    [Number(userId), CV_EXPORT_ENTITLEMENT_KEY, paymentId || null, JSON.stringify(meta)],
  );
}

async function createCvPaymentIntent({ userId, provider, paymentMethod, amount, currency, metadata = {} }) {
  const transactionId = crypto.randomUUID();
  const mergedMeta = { ...baseMeta(), ...metadata };
  const { rows } = await pool.query(
    `INSERT INTO cv_payments
      (user_id, provider, payment_method, status, amount, currency, transaction_id, metadata)
     VALUES ($1,$2,$3,'Pending',$4,$5,$6,$7::jsonb)
     RETURNING *`,
    [Number(userId), provider, paymentMethod, amount, currency, transactionId, JSON.stringify(mergedMeta)],
  );
  return rows[0];
}

export async function initCvMpesaPayment({ userId, phone, requestBaseUrl }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    const err = new PaymentInitError(
      'Please enter a valid Kenyan phone number in 2547XXXXXXXX format.',
      400,
      'INVALID_PHONE',
    );
    throw err;
  }

  const callbackUrl = resolveStkCallbackUrl({ product: 'cvpro' });
  if (!callbackUrl) {
    throw new PaymentInitError(
      'M-Pesa callback URL is not configured for CVPro.',
      500,
      'MPESA_CALLBACK_URL_MISSING',
    );
  }

  const health = getMpesaConfigHealth();
  if (!health.ok) {
    throw new PaymentInitError(
      'M-Pesa credentials are incomplete. Please configure MPESA keys, shortcode, and passkey.',
      500,
      'MPESA_CONFIG_INCOMPLETE',
    );
  }

  const payment = await createCvPaymentIntent({
    userId,
    provider: 'MPESA',
    paymentMethod: 'MPESA_STK',
    amount: CVPRO_EXPORT_PRICE_KES,
    currency: 'KES',
    metadata: { normalizedPhone },
  });

  try {
    const accessToken = await getAccessToken();
    const timestamp = mpesaTimestamp();
    const payload = {
      BusinessShortCode: shortcode,
      Password: mpesaPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: CVPRO_EXPORT_PRICE_KES,
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: 'CVPRO_EXPORT_UNLOCK',
      TransactionDesc: 'CVPro export unlock',
    };

    console.log('[cv/mpesa/init] sending stk push', {
      paymentId: payment.id,
      userId: Number(userId),
      amount: CVPRO_EXPORT_PRICE_KES,
      phone: normalizedPhone,
      callbackUrl,
      mpesaEnv: MPESA_ENV,
      mpesaBase: MPESA_BASE,
    });

    const response = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    console.log('[cv/mpesa/init] stk response summary', {
      paymentId: payment.id,
      responseCode: response?.data?.ResponseCode,
      responseDescription: response?.data?.ResponseDescription,
      customerMessage: response?.data?.CustomerMessage,
      merchantRequestId: response?.data?.MerchantRequestID,
      checkoutRequestId: response?.data?.CheckoutRequestID,
    });

    const checkoutRequestId = response?.data?.CheckoutRequestID;
    if (!checkoutRequestId) {
      const providerMessage = response?.data?.errorMessage || response?.data?.ResponseDescription;
      throw new PaymentInitError(
        'M-Pesa did not return a CheckoutRequestID. STK request was not accepted.',
        502,
        'MPESA_CHECKOUT_ID_MISSING',
        providerMessage,
      );
    }

    await pool.query(
      `UPDATE cv_payments
       SET checkout_request_id=$2, provider_reference=$3, phone_number=$4,
           metadata = metadata || $5::jsonb,
           updated_at=NOW()
       WHERE id=$1`,
      [
        payment.id,
        checkoutRequestId,
        response?.data?.MerchantRequestID || null,
        normalizedPhone,
        JSON.stringify({ stkInitResponse: response.data }),
      ],
    );

    return {
      paymentId: payment.id,
      transactionId: payment.transaction_id,
      checkoutRequestId,
      amount: CVPRO_EXPORT_PRICE_KES,
      currency: 'KES',
      message: 'STK push sent. Complete payment on your phone.',
    };
  } catch (error) {
    const providerPayload = error?.response?.data || null;
    const providerMessage =
      providerPayload?.errorMessage ||
      providerPayload?.ResponseDescription ||
      providerPayload?.errorCode ||
      error?.providerMessage ||
      error?.message;

    await pool.query(
      `UPDATE cv_payments SET status='Failed', metadata = metadata || $2::jsonb, updated_at=NOW() WHERE id=$1`,
      [
        payment.id,
        JSON.stringify({
          providerError: providerPayload || error.message,
          normalizedPhone,
          callbackUrl,
          mpesaEnv: MPESA_ENV,
        }),
      ],
    );
    console.error('[cv/mpesa/init] failed', {
      paymentId: payment.id,
      code: error?.code || 'MPESA_STK_INIT_FAILED',
      message: error?.message,
      providerMessage,
      status: error?.response?.status,
      providerPayload,
    });

    if (error instanceof PaymentInitError) {
      throw error;
    }

    throw new PaymentInitError(
      'Payment initialization failed for M-Pesa.',
      502,
      'MPESA_STK_INIT_FAILED',
      providerMessage,
    );
  }
}

export async function confirmCvMpesaPayment({ userId, transactionId, checkoutRequestId, mpesaReceipt }) {
  if (!transactionId && !checkoutRequestId) {
    const err = new Error('transactionId or checkoutRequestId is required');
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT * FROM cv_payments
     WHERE user_id=$1 AND provider='MPESA'
       AND (transaction_id=$2 OR checkout_request_id=$3)
     ORDER BY created_at DESC
     LIMIT 1`,
    [Number(userId), transactionId || null, checkoutRequestId || null],
  );

  if (!rows[0]) {
    const err = new Error('Payment intent not found');
    err.statusCode = 404;
    throw err;
  }

  const payment = rows[0];
  if (payment.status === 'Completed') {
    await grantCvExportEntitlement({ userId, paymentId: payment.id });
    return { status: 'Completed', paymentId: payment.id, entitlementGranted: true };
  }

  if (mpesaReceipt) {
    await pool.query(
      `UPDATE cv_payments
       SET status='Completed', mpesa_receipt=$2, completed_at=NOW(), updated_at=NOW(),
           metadata = metadata || $3::jsonb
       WHERE id=$1`,
      [payment.id, mpesaReceipt, JSON.stringify({ manualReceiptUpdate: true })],
    );
    await grantCvExportEntitlement({ userId, paymentId: payment.id });
    return { status: 'Completed', paymentId: payment.id, entitlementGranted: true };
  }

  if (!payment.checkout_request_id) {
    return { status: 'Pending', paymentId: payment.id, message: 'Awaiting checkout request id.' };
  }

  try {
    const accessToken = await getAccessToken();
    const timestamp = mpesaTimestamp();
    const queryResponse = await axios.post(
      `${MPESA_BASE}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: shortcode,
        Password: mpesaPassword(timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: payment.checkout_request_id,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const resultCode = String(queryResponse?.data?.ResultCode ?? '');
    if (resultCode === '0') {
      await pool.query(
        `UPDATE cv_payments
         SET status='Completed', completed_at=NOW(), updated_at=NOW(),
             metadata = metadata || $2::jsonb
         WHERE id=$1`,
        [payment.id, JSON.stringify({ stkQueryResponse: queryResponse.data })],
      );
      await grantCvExportEntitlement({ userId, paymentId: payment.id });
      return { status: 'Completed', paymentId: payment.id, entitlementGranted: true };
    }

    if (['1032', '1037', '2001', '1'].includes(resultCode)) {
      await pool.query(
        `UPDATE cv_payments
         SET status='Failed', updated_at=NOW(), metadata = metadata || $2::jsonb
         WHERE id=$1`,
        [payment.id, JSON.stringify({ stkQueryResponse: queryResponse.data })],
      );
      return { status: 'Failed', paymentId: payment.id, message: queryResponse?.data?.ResultDesc || 'Payment failed' };
    }

    await pool.query(
      `UPDATE cv_payments
       SET metadata = metadata || $2::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [payment.id, JSON.stringify({ stkQueryResponse: queryResponse.data })],
    );
    return { status: 'Pending', paymentId: payment.id, message: 'Waiting for M-Pesa confirmation' };
  } catch (error) {
    const err = new Error('Unable to verify M-Pesa payment right now.');
    err.statusCode = 502;
    throw err;
  }
}

export async function handleCvMpesaCallback(callbackPayload = {}) {
  const stkCallback = callbackPayload?.Body?.stkCallback;
  if (!stkCallback) {
    console.warn('[cv/mpesa/callback] invalid payload: missing Body.stkCallback');
    return { processed: false, reason: 'missing_stk_callback' };
  }

  const checkoutRequestId = stkCallback.CheckoutRequestID || null;
  const resultCode = Number(stkCallback.ResultCode ?? -1);
  const resultDesc = stkCallback.ResultDesc || null;
  const callbackItems = Array.isArray(stkCallback.CallbackMetadata?.Item)
    ? stkCallback.CallbackMetadata.Item
    : [];
  const mpesaReceipt = readCallbackItem(callbackItems, 'MpesaReceiptNumber');
  const amount = Number(readCallbackItem(callbackItems, 'Amount') || 0);

  if (!checkoutRequestId) {
    console.warn('[cv/mpesa/callback] missing CheckoutRequestID');
    return { processed: false, reason: 'missing_checkout_request_id' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT *
       FROM cv_payments
       WHERE provider='MPESA' AND checkout_request_id=$1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [checkoutRequestId],
    );
    const payment = rows[0];

    if (!payment) {
      console.warn('[cv/mpesa/callback] payment not found', { checkoutRequestId });
      await client.query('COMMIT');
      return { processed: false, reason: 'payment_not_found' };
    }

    const callbackMeta = {
      stkCallbackRaw: stkCallback,
      checkoutRequestId,
      resultCode,
      resultDesc,
      mpesaReceipt,
      amount,
      callbackMetadata: stkCallback.CallbackMetadata || null,
      callbackProcessedAt: new Date().toISOString(),
    };

    // Idempotency: if already completed/failed, keep status and only merge callback metadata.
    if (payment.status === 'Completed' || payment.status === 'Failed') {
      await client.query(
        `UPDATE cv_payments
         SET mpesa_receipt = COALESCE(mpesa_receipt, $2),
             metadata = metadata || $3::jsonb,
             updated_at = NOW()
         WHERE id=$1`,
        [payment.id, mpesaReceipt, JSON.stringify({ lastCallback: callbackMeta })],
      );
      if (payment.status === 'Completed') {
        await grantCvExportEntitlement({ userId: payment.user_id, paymentId: payment.id, client });
      }
      await client.query('COMMIT');
      return { processed: true, paymentId: payment.id, status: payment.status, idempotent: true };
    }

    if (resultCode === 0) {
      await client.query(
        `UPDATE cv_payments
         SET status='Completed',
             mpesa_receipt=COALESCE($2, mpesa_receipt),
             amount=CASE WHEN $3 > 0 THEN $3 ELSE amount END,
             completed_at=COALESCE(completed_at, NOW()),
             metadata = metadata || $4::jsonb,
             updated_at=NOW()
         WHERE id=$1`,
        [
          payment.id,
          mpesaReceipt,
          amount,
          JSON.stringify({
            lastCallback: callbackMeta,
            callbackResultCode: resultCode,
            callbackResultDesc: resultDesc,
          }),
        ],
      );
      await grantCvExportEntitlement({ userId: payment.user_id, paymentId: payment.id, client });
      await client.query('COMMIT');
      return { processed: true, paymentId: payment.id, status: 'Completed' };
    }

    await client.query(
      `UPDATE cv_payments
       SET status='Failed',
           metadata = metadata || $2::jsonb,
           updated_at=NOW()
       WHERE id=$1`,
      [
        payment.id,
        JSON.stringify({
          lastCallback: callbackMeta,
          callbackResultCode: resultCode,
          callbackResultDesc: resultDesc,
          failureReason: resultDesc || 'M-Pesa callback failure',
        }),
      ],
    );
    await client.query('COMMIT');
    return { processed: true, paymentId: payment.id, status: 'Failed' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[cv/mpesa/callback] failed', {
      message: error?.message,
      checkoutRequestId,
      resultCode,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getUserEmail(userId) {
  const { rows } = await pool.query('SELECT email FROM users WHERE id=$1 LIMIT 1', [Number(userId)]);
  return rows[0]?.email || `user${userId}@cvpro.local`;
}

export async function createCvPaystackOrder({ userId, callbackUrl }) {
  const payment = await createCvPaymentIntent({
    userId,
    provider: 'PAYSTACK',
    paymentMethod: 'PAYSTACK_HOSTED',
    amount: CVPRO_EXPORT_PRICE_KES,
    currency: 'KES',
  });

  try {
    const initializePayload = {
      amount: CVPRO_EXPORT_PRICE_KES * 100,
      email: await getUserEmail(userId),
      currency: 'KES',
      callback_url: callbackUrl,
      channels: ['card'],
      metadata: {
        cvPaymentId: payment.id,
        cvTransactionId: payment.transaction_id,
        kind: CV_EXPORT_PURCHASE_KIND,
        sourceProduct: 'cvpro',
        restrictedChannels: ['card'],
      },
    };

    console.log('[cv/paystack/init] creating hosted checkout order', {
      paymentId: payment.id,
      userId: Number(userId),
      amountMinor: initializePayload.amount,
      currency: initializePayload.currency,
      callbackUrl,
      channels: initializePayload.channels,
    });

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      initializePayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const reference = response?.data?.data?.reference;
    const authorizationUrl = response?.data?.data?.authorization_url;
    if (!reference || !authorizationUrl) {
      throw new Error('Invalid Paystack initialize response');
    }

    console.log('[cv/paystack/init] hosted checkout url generated', {
      paymentId: payment.id,
      reference,
      hasAuthorizationUrl: Boolean(authorizationUrl),
      channels: initializePayload.channels,
    });

    await pool.query(
      `UPDATE cv_payments
       SET provider_reference=$2, metadata = metadata || $3::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [payment.id, reference, JSON.stringify({ paystackInitialize: response.data })],
    );

    return {
      transactionId: payment.transaction_id,
      reference,
      authorizationUrl,
    };
  } catch (error) {
    console.error('[cv/paystack/init] failed', {
      paymentId: payment.id,
      userId: Number(userId),
      callbackUrl,
      channels: ['card'],
      status: error?.response?.status,
      providerMessage:
        error?.response?.data?.message ||
        error?.response?.data?.data?.message ||
        error?.message,
    });

    await pool.query(
      `UPDATE cv_payments SET status='Failed', metadata=metadata || $2::jsonb, updated_at=NOW() WHERE id=$1`,
      [payment.id, JSON.stringify({ providerError: error?.response?.data || error.message })],
    );

    const err = new Error('Payment initialization failed for Paystack.');
    err.statusCode = 502;
    throw err;
  }
}

export async function verifyCvPaystackPayment({ userId, reference }) {
  if (!reference) {
    const err = new Error('Paystack reference is required');
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `SELECT * FROM cv_payments
     WHERE user_id=$1 AND provider='PAYSTACK' AND provider_reference=$2
     ORDER BY created_at DESC
     LIMIT 1`,
    [Number(userId), reference],
  );

  if (!rows[0]) {
    const err = new Error('Payment intent not found');
    err.statusCode = 404;
    throw err;
  }

  const payment = rows[0];
  if (payment.status === 'Completed') {
    await grantCvExportEntitlement({ userId, paymentId: payment.id });
    return { status: 'Completed', paymentId: payment.id, entitlementGranted: true };
  }

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const data = response?.data?.data || {};
    const amount = Number(data.amount || 0);
    const currency = String(data.currency || '').toUpperCase();

    if (String(data.status || '').toLowerCase() !== 'success') {
      await pool.query(
        `UPDATE cv_payments SET status='Failed', metadata = metadata || $2::jsonb, updated_at=NOW() WHERE id=$1`,
        [payment.id, JSON.stringify({ paystackVerify: response.data })],
      );
      return { status: 'Failed', paymentId: payment.id, message: 'Payment not successful yet' };
    }

    if (amount !== CVPRO_EXPORT_PRICE_KES * 100 || currency !== 'KES') {
      const err = new Error('Paystack amount/currency mismatch');
      err.statusCode = 502;
      throw err;
    }

    await pool.query(
      `UPDATE cv_payments
       SET status='Completed', completed_at=NOW(), updated_at=NOW(),
           metadata = metadata || $2::jsonb
       WHERE id=$1`,
      [payment.id, JSON.stringify({ paystackVerify: response.data })],
    );
    await grantCvExportEntitlement({ userId, paymentId: payment.id });
    return { status: 'Completed', paymentId: payment.id, entitlementGranted: true };
  } catch (error) {
    const err = new Error('Unable to verify Paystack payment right now.');
    err.statusCode = error.statusCode || 502;
    throw err;
  }
}

export async function ensureCvExportEntitlement({ userId }) {
  const entitlement = await getCvExportEntitlement(userId);
  if (entitlement.eligible) return entitlement;

  const { rows } = await pool.query(
    `SELECT id FROM cv_payments
     WHERE user_id=$1 AND status='Completed' AND entitlement_key=$2
     ORDER BY completed_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [Number(userId), CV_EXPORT_ENTITLEMENT_KEY],
  );

  if (rows[0]?.id) {
    await grantCvExportEntitlement({ userId, paymentId: rows[0].id });
    return getCvExportEntitlement(userId);
  }

  return entitlement;
}
