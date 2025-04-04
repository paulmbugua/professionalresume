import axios from 'axios';
import db from '../config/db.js'; // PostgreSQL DB Connection

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/** ✅ Initialize Paystack Payment */
export const initializePayment = async (userId, amount, email) => {
  try {
    console.log(`🔹 Initializing Paystack Payment:`, { userId, amount, email });

    // ✅ Prepare the payment payload
    const payload = {
      amount: amount * 100, // Convert to kobo (smallest unit)
      email,
      currency: 'KES',
      callback_url: `${process.env.FRONTEND_URL}/settings?section=account&success=true`,
    };

    // ✅ Send request to Paystack
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.data || !response.data.status) {
      console.error('❌ Paystack Initialization Error:', response.data);
      throw new Error('Failed to initialize payment.');
    }

    console.log('✅ Paystack Payment Initialized:', response.data);

    // ✅ Store transaction in PostgreSQL
    const transactionReference = response.data.data.reference;
    await db.query(
      `INSERT INTO payments (user_id, amount, currency, transaction_reference, status)
             VALUES ($1, $2, $3, $4, $5)`,
      [userId, amount, 'KES', transactionReference, 'Pending'],
    );

    console.log(
      `✅ Payment stored in database with reference: ${transactionReference}`,
    );

    return response.data.data; // Return payment link to frontend
  } catch (error) {
    console.error(
      '❌ Error initializing Paystack payment:',
      error.response?.data || error.message,
    );
    throw new Error('Failed to initialize payment.');
  }
};
