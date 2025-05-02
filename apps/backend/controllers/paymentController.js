import { stkPush } from '../services/mpesaService.js';
import validatePayment from '../validators/paymentValidation.js';
import { normalizePhoneNumber } from '../utils/phoneUtils.js';
import pool from '../config/db.js';

// Fetch available packages
export const getPackages = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packages');
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No packages found' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching packages:', error.message);
    res.status(500).json({ message: 'Failed to fetch packages' });
  }
};

// Initialize M-Pesa payment
export const initializeMpesaPayment = async (req, res) => {
  console.log('Initializing MPESA payment. Original request body:', req.body);

  // Normalize the phone number before validation
  req.body.phone = normalizePhoneNumber(req.body.phone);
  console.log('Normalized phone number:', req.body.phone);

  // Validate payment data
  const { error, value } = validatePayment(req.body);
  if (error) {
    console.error('Validation error:', error.details);
    return res.status(400).json({
      message: 'Validation error',
      details: error.details.map((err) => err.message),
    });
  }

  const { amount, phone, packageId, paymentMethod } = value;
  console.log('Validated payment details:', {
    amount,
    phone,
    packageId,
    paymentMethod,
  });

  // Retrieve the authenticated user's id using optional chaining
  const userId = req.user?.id;
  if (!userId) {
    console.error('Unauthorized access: req.user is undefined or missing id');
    return res
      .status(401)
      .json({ message: 'Unauthorized: User not authenticated' });
  }
  console.log('Authenticated user id:', userId);

  try {
    // Check if the package exists in the database
    const packageResult = await pool.query(
      'SELECT * FROM packages WHERE id = $1',
      [packageId],
    );
    if (packageResult.rows.length === 0) {
      console.error('Package not found for packageId:', packageId);
      return res.status(404).json({ message: 'Package not found' });
    }
    console.log('Package found:', packageResult.rows[0]);

    let paymentResponse;
    let transactionId;

    // Process M-Pesa Payment
    // Inside your initializeMpesaPayment controller:
    if (paymentMethod === 'MPESA') {
      console.log('Processing MPESA payment for user:', userId);
      const stkRequestBody = { phone, amount, packageId };
      console.log('STK Push Request Body:', stkRequestBody);

      // Override req.body with the STK push payload
      req.body = stkRequestBody;

      // Now call stkPush with the full req, which contains req.user
      let responseData;
      try {
        responseData = await stkPush(req, {
          status: () => ({ json: (data) => data }),
        });
        console.log('Raw STK Push response:', responseData);
      } catch (stkError) {
        console.error('Error during stkPush call:', stkError);
        throw stkError;
      }

      paymentResponse = responseData.data;
      transactionId = paymentResponse?.CheckoutRequestID;
      console.log('Parsed STK Push response:', paymentResponse);
    } else {
      console.error('Invalid payment method provided:', paymentMethod);
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (!transactionId) {
      console.error(
        'Failed to initialize payment. M-Pesa response invalid:',
        paymentResponse,
      );
      return res.status(500).json({
        message: 'Failed to initialize payment. M-Pesa response invalid.',
        response: paymentResponse,
      });
    }

    console.log(
      'Payment initialized successfully. Transaction ID:',
      transactionId,
    );
    return res.status(200).json({
      transactionId,
      message:
        'Payment initialized successfully. Complete the transaction on your phone.',
    });
  } catch (err) {
    console.error('Payment initialization error:', err.message);
    return res
      .status(500)
      .json({ message: 'Failed to initialize payment', error: err.message });
  }
};

// Handle successful M-Pesa payment
export const handleMpesaPaymentSuccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    // Check if the user and package exist
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);
    const selectedPackage = await pool.query(
      'SELECT * FROM packages WHERE id = $1',
      [packageId],
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (selectedPackage.rows.length === 0) {
      return res.status(404).json({ message: 'Package not found.' });
    }

    // Update user tokens
    const newTokens = user.rows[0].tokens + selectedPackage.rows[0].credits;
    await pool.query('UPDATE users SET tokens = $1 WHERE id = $2', [
      newTokens,
      userId,
    ]);

    res.status(200).json({
      message: 'Payment successful and tokens updated.',
      tokens: newTokens,
    });
  } catch (error) {
    console.error('Error processing payment success:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Deduct tokens for a service
export const useTokensForService = async (req, res) => {
  const { userId, requiredTokens } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [
      userId,
    ]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.rows[0].tokens < requiredTokens) {
      return res.status(400).json({ message: 'Insufficient tokens.' });
    }

    const newTokens = user.rows[0].tokens - requiredTokens;
    await pool.query('UPDATE users SET tokens = $1 WHERE id = $2', [
      newTokens,
      userId,
    ]);

    res.status(200).json({
      message: 'Tokens deducted successfully.',
      tokens: newTokens,
    });
  } catch (error) {
    console.error('Error deducting tokens:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Fetch user transactions
export const getTransactions = async (req, res) => {
  try {
    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id],
    );
    res.status(200).json({ success: true, data: transactions.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Confirm an M-Pesa payment
export const confirmMpesaPayment = async (req, res) => {
  try {
    // Expect the transaction reference in the request body
    const { transactionReference } = req.body;
    if (!transactionReference) {
      return res
        .status(400)
        .json({ message: 'Missing transaction reference.' });
    }

    // Look up the payment record with status 'Pending'
    const paymentResult = await pool.query(
      "SELECT * FROM payments WHERE transaction_id = $1 AND status = 'Pending'",
      [transactionReference],
    );

    if (paymentResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Payment record not found or already processed.' });
    }
    const payment = paymentResult.rows[0];

    // Check that the mpesa_reference is present
    if (!payment.mpesa_reference) {
      return res.status(400).json({
        message: 'Payment not completed yet. M-Pesa reference is missing.',
      });
    }

    // Update payment status to 'Completed'
    const updateResult = await pool.query(
      `UPDATE payments
       SET status = 'Completed'
       WHERE transaction_id = $1 AND status = 'Pending'
       RETURNING *`,
      [transactionReference],
    );

    // Retrieve package credits from the packages table using payment.package_id.
    const packageResult = await pool.query(
      'SELECT credits FROM packages WHERE id = $1',
      [payment.package_id],
    );
    if (packageResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Package not found for payment.' });
    }
    const packageCredits = packageResult.rows[0].credits;

    // Update the user's token balance by adding the package's credits.
    const updateUserResult = await pool.query(
      `UPDATE users
       SET tokens = tokens + $1
       WHERE id = $2
       RETURNING tokens`,
      [packageCredits, payment.user_id],
    );

    res.status(200).json({
      message: 'Payment confirmed and tokens credited.',
      payment: updateResult.rows[0],
      tokens: updateUserResult.rows[0].tokens,
    });
  } catch (error) {
    console.error('Error completing payment:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateMpesaReference = async (req, res) => {
  try {
    const { transactionReference, mpesaReference } = req.body;
    if (!transactionReference || !mpesaReference) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    // Look up the pending payment record by transaction_reference
    const paymentResult = await pool.query(
      "SELECT * FROM payments WHERE transaction_id = $1 AND status = 'Pending'",
      [transactionReference],
    );
    if (paymentResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Payment record not found or already processed.' });
    }
    const payment = paymentResult.rows[0];

    // Compare the mpesa_reference from the payment record with the one provided by the platform user.
    if (payment.mpesa_reference !== mpesaReference) {
      return res
        .status(400)
        .json({ message: 'M-Pesa reference does not match our records.' });
    }

    // If they match, update the payment status to 'Completed'
    const updateResult = await pool.query(
      `UPDATE payments
       SET status = 'Completed'
       WHERE transaction_id = $1 AND status = 'Pending'
       RETURNING *`,
      [transactionReference],
    );
    if (updateResult.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'Payment record not found or already processed.' });
    }
    const updatedPayment = updateResult.rows[0];
    console.log('Payment updated:', updatedPayment);

    // Retrieve package credits from the packages table using updatedPayment.package_id.
    const packageResult = await pool.query(
      'SELECT credits FROM packages WHERE id = $1',
      [updatedPayment.package_id],
    );
    if (packageResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Package not found for payment.' });
    }
    const packageCredits = packageResult.rows[0].credits;
    console.log('Package credits retrieved:', packageCredits);

    // Update the user's token balance by adding the package's credits.
    const updateUserResult = await pool.query(
      `UPDATE users
       SET tokens = tokens + $1
       WHERE id = $2
       RETURNING tokens`,
      [packageCredits, updatedPayment.user_id],
    );
    console.log('User tokens updated to:', updateUserResult.rows[0].tokens);

    res.status(200).json({
      message:
        'M-Pesa reference verified and payment marked as Completed. Tokens credited.',
      payment: updatedPayment,
      tokens: updateUserResult.rows[0].tokens,
    });
  } catch (error) {
    console.error('Error updating M-Pesa reference:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
