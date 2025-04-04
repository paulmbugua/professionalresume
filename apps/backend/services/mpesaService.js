import axios from 'axios';
import pkg from 'pg';
import {
  getAccessToken,
  password,
  shortcode,
  b2cShortcode,
  callbackURL,
  timeoutURL,
  resultURL,
  timestamp,
  initiatorName,
  securityCredential,
} from '../utils/mpesa.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';

const { Pool } = pkg;

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

/**
 * STK Push (C2B) Payment
 * Handles M-Pesa STK push request for student payments.
 * Inserts a record into the payments table with status "Pending".
 */
export async function stkPush(req, res) {
  console.log('STK Push Request Body:', req.body);

  // Expect payload to include: phone, amount, packageId
  const { phone, amount, packageId } = req.body;
  const normalizedPhone = normalizePhoneNumber(phone);

  // Strictly use authenticated user for userId
  const userId = req.user?.id;
  if (!userId) {
    console.error('User not authenticated. req.user is missing.');
    return res.status(401).json({ error: 'User not authenticated' });
  }
  console.log('Using userId:', userId);

  try {
    const accessToken = await getAccessToken();
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackURL,
      AccountReference: 'TutorAppPayment',
      TransactionDesc: 'Tutor Payment',
    };

    console.log('STK Push Payload:', payload);

    const response = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    console.log('M-Pesa STK Push Response:', response.data);

    // Save payment record in PostgreSQL without phone_number
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO payments 
          (user_id, package_id, amount, payment_method, transaction_id, status)
         VALUES ($1, $2, $3, 'MPESA', $4, 'Pending')`,
        [userId, packageId, amount, response.data.CheckoutRequestID],
      );
      console.log('Payment record inserted for user:', userId);
    } finally {
      client.release();
    }

    return res.status(200).json({
      message: 'STK Push Sent',
      data: response.data,
    });
  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
}

/**
 * B2C Payout (for tutor payouts)
 * Initiates a B2C payment to a tutor's phone number.
 * Inserts a record into the payments table with status "Completed".
 */
export async function initiateB2CPayment(phone, amount, userId) {
  try {
    const accessToken = await getAccessToken();
    const normalizedPhone = normalizePhoneNumber(phone);

    const payload = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'SalaryPayment',
      Amount: amount,
      PartyA: b2cShortcode,
      PartyB: normalizedPhone,
      Remarks: 'Tutor Payment',
      QueueTimeOutURL: timeoutURL,
      ResultURL: resultURL,
      Occasion: 'Tutor Payout',
    };

    const response = await axios.post(
      'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    // Save payout payment record in PostgreSQL without phone_number
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO payments 
          (user_id, amount, payment_method, status, transaction_id)
         VALUES ($1, $2, 'B2C', 'Completed', $3)`,
        [userId, amount, response.data.ConversationID],
      );
    } finally {
      client.release();
    }

    return response.data;
  } catch (error) {
    console.error(
      'B2C Payment initiation error:',
      error.response?.data || error.message,
    );
    throw new Error('B2C Payment initiation failed');
  }
}
