import pool from '../config/db.js';

export const mpesaCallback = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Received M-Pesa callback:', req.body);

    // Extract the STK callback details from the payload
    const stkCallback = req.body.Body?.stkCallback;
    if (!stkCallback) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

    if (ResultCode === 0) {
      // Extract MpesaReceiptNumber from CallbackMetadata
      const receiptItem = CallbackMetadata?.Item.find(
        (item) => item.Name === 'MpesaReceiptNumber',
      );
      const mpesaReference = receiptItem ? receiptItem.Value : null;
      console.log('Extracted M-Pesa reference from callback:', mpesaReference);

      // Update the payment record with the M-Pesa reference only if it hasn't been set already.
      const updatePaymentQuery = `
        UPDATE payments
        SET mpesa_reference = COALESCE(mpesa_reference, $1)
        WHERE transaction_id = $2 AND status = 'Pending'
        RETURNING *;
      `;
      const paymentResult = await client.query(updatePaymentQuery, [
        mpesaReference,
        CheckoutRequestID,
      ]);

      if (paymentResult.rows.length === 0) {
        console.warn(
          'No payment record was updated. It may have already been processed.',
        );
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Payment record not found or already processed.' });
      }
      const payment = paymentResult.rows[0];
      console.log(
        'Payment updated with mpesa_reference:',
        payment.mpesa_reference,
      );
      console.log('Updated payment record:', payment);

      // Optional: Warn if the mpesa_reference was already set (if desired)
      if (payment.mpesa_reference !== mpesaReference) {
        console.warn(
          'Warning: M-Pesa reference was already set. Existing value:',
          payment.mpesa_reference,
        );
      }
    } else {
      // For a failed transaction, update payment status to 'Failed'
      const failPaymentQuery = `
        UPDATE payments
        SET status = 'Failed'
        WHERE transaction_id = $1
        RETURNING *;
      `;
      await client.query(failPaymentQuery, [CheckoutRequestID]);
      console.log('Payment failed with ResultCode:', ResultCode);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Callback processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing M-Pesa callback:', error.message || error);
    res
      .status(500)
      .json({ message: 'Failed to process callback', error: error.message });
  } finally {
    client.release();
  }
};

export const b2cResult = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Received B2C Result Callback:', req.body);

    const { ConversationID, ResultCode, ResultDesc, ResultParameters } =
      req.body;

    if (ResultCode === 0) {
      const updateQuery = `
        UPDATE payments
        SET status = 'Completed'
        WHERE transaction_id = $1 AND status = 'Pending'
        RETURNING *;
      `;
      const updateResult = await client.query(updateQuery, [ConversationID]);
      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Payment record not found or already updated.' });
      }
      console.log(
        'B2C Payment processed successfully. Payment record:',
        updateResult.rows[0],
      );
    } else {
      const failQuery = `
        UPDATE payments
        SET status = 'Failed'
        WHERE transaction_id = $1
        RETURNING *;
      `;
      await client.query(failQuery, [ConversationID]);
      console.log(
        'B2C Payment failed. ResultCode:',
        ResultCode,
        'ResultDesc:',
        ResultDesc,
      );
    }

    await client.query('COMMIT');
    return res
      .status(200)
      .json({ message: 'B2C result processed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'Error processing B2C result callback:',
      error.message || error,
    );
    return res.status(500).json({
      message: 'Failed to process B2C callback',
      error: error.message,
    });
  } finally {
    client.release();
  }
};
