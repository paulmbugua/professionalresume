import crypto from 'crypto';
import axios from 'axios';
import pool from '../config/db.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';
import {
  getAccessToken,
  shortcode,
  mpesaTimestamp,
  mpesaPassword,
  callbackURL,
  MPESA_BASE,
} from '../utils/mpesa.js';

export const CVPRO_EXPORT_PRICE_USD = 1;
export const CVPRO_EXPORT_PRICE_KES = 100;
export const CV_EXPORT_PURCHASE_KIND = 'cv_export_unlock';
export const CV_EXPORT_ENTITLEMENT_KEY = 'cv_export_unlock';

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

export async function initCvMpesaPayment({ userId, phone }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    const err = new Error('Please enter a valid Kenyan phone number.');
    err.statusCode = 400;
    throw err;
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
      CallBackURL: callbackURL,
      AccountReference: 'CVPRO_EXPORT_UNLOCK',
      TransactionDesc: 'CVPro export unlock',
    };

    const response = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const checkoutRequestId = response?.data?.CheckoutRequestID;
    if (!checkoutRequestId) {
      throw new Error('Missing CheckoutRequestID from M-Pesa response');
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
      transactionId: payment.transaction_id,
      checkoutRequestId,
      message: 'STK push sent. Complete payment on your phone.',
    };
  } catch (error) {
    await pool.query(
      `UPDATE cv_payments SET status='Failed', metadata = metadata || $2::jsonb, updated_at=NOW() WHERE id=$1`,
      [payment.id, JSON.stringify({ providerError: error?.response?.data || error.message })],
    );

    const err = new Error('Payment initialization failed for M-Pesa.');
    err.statusCode = 502;
    throw err;
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
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: CVPRO_EXPORT_PRICE_KES * 100,
        email: await getUserEmail(userId),
        currency: 'KES',
        callback_url: callbackUrl,
        metadata: {
          cvPaymentId: payment.id,
          cvTransactionId: payment.transaction_id,
          kind: CV_EXPORT_PURCHASE_KIND,
          sourceProduct: 'cvpro',
        },
      },
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
