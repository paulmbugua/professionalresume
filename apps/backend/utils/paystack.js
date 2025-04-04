import axios from 'axios';
import db from '../config/db.js'; // PostgreSQL DB Connection

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/** ✅ Register Paystack Recipient (Bank or M-Pesa) */
export const registerPaystackRecipient = async (tutor) => {
  try {
    let accountNumber = tutor.mpesaPhoneNumber.trim();

    // ✅ Ensure correct phone number format
    if (accountNumber.startsWith('+254')) {
      accountNumber = accountNumber.replace('+254', '0'); // Convert +254 to 07xxx format
    } else if (accountNumber.startsWith('254')) {
      accountNumber = accountNumber.replace('254', '0'); // Convert 254 to 07xxx
    }

    console.log('🔹 Reformatted Paystack Account Number:', accountNumber);

    const payload = {
      type: 'mobile_money',
      name: tutor.name,
      account_number: accountNumber,
      bank_code: 'MPESA',
      currency: 'KES',
    };

    console.log('🔹 Paystack Recipient Payload:', payload);

    const response = await axios.post(
      'https://api.paystack.co/transferrecipient',
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data && response.data.status) {
      console.log('✅ Paystack Recipient Created:', response.data);

      // ✅ Store recipient in the database (PostgreSQL)
      await db.query(
        `UPDATE tutors SET paystack_recipient_code = $1 WHERE id = $2`,
        [response.data.data.recipient_code, tutor.id],
      );

      return response.data.data.recipient_code;
    } else {
      console.error('❌ Paystack Recipient Error:', response.data);
      return null;
    }
  } catch (error) {
    console.error(
      '❌ Error registering Paystack recipient:',
      error.response?.data || error.message,
    );
    return null;
  }
};

/** ✅ Send Paystack Transfer (Tutor Payment) */
export const sendPaystackTransfer = async (
  recipientCode,
  amount,
  sessionId,
) => {
  try {
    console.log(`🔹 Initiating Paystack Transfer:`, {
      recipientCode,
      amount,
      sessionId,
    });

    // ✅ Fetch the TutorSession from PostgreSQL
    const tutorSessionQuery = await db.query(
      `SELECT * FROM tutor_sessions WHERE id = $1`,
      [sessionId],
    );
    if (tutorSessionQuery.rows.length === 0) {
      console.error(`❌ No TutorSession found with ID: ${sessionId}`);
      return null;
    }

    const tutorSession = tutorSessionQuery.rows[0];
    console.log(`✅ TutorSession verified: ${tutorSession.id}`);

    // ✅ Prepare Paystack transfer payload
    const payload = {
      source: 'balance',
      amount: amount * 100, // Convert KES to kobo
      recipient: recipientCode,
      reason: `Tutor Session Payment for session ID: ${tutorSession.id}`,
    };

    // ✅ Send transfer request to Paystack
    const response = await axios.post(
      'https://api.paystack.co/transfer',
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(`✅ Paystack Transfer Response:`, response.data);

    if (response.data && response.data.status) {
      const paystackReference = response.data.data.reference;

      // ✅ Update TutorSession in PostgreSQL
      await db.query(
        `UPDATE tutor_sessions SET paystack_reference = $1, status = 'Completed' WHERE id = $2`,
        [paystackReference, tutorSession.id],
      );

      console.log(
        '✅ TutorSession updated with Paystack reference:',
        paystackReference,
      );

      return response.data;
    } else {
      console.error('❌ Paystack Transfer Error:', response.data);
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Error processing Paystack transfer:`,
      error.response?.data || error.message,
    );
    return null;
  }
};
