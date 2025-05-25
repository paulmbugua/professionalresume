
// apps/backend/controllers/mpesaUrls.js

import pool from '../config/db.js';

export const mpesaCallback = async (req, res) => {
  console.log('🔥 GOT STK CALLBACK (raw body):\n', JSON.stringify(req.body, null, 2));

  let client;
  try {
    client = await pool.connect();
    // prevent client‐level errors from crashing the process
    client.on('error', err => {
      console.error('⚠️ PG CLIENT ERROR (ignored):', err.message);
    });

    await client.query('BEGIN');

    const stkCallback = req.body.Body?.stkCallback;
    if (!stkCallback) {
      console.warn('Invalid callback payload, no Body.stkCallback');
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
    console.log('Received M-Pesa callback for TX:', CheckoutRequestID, 'ResultCode:', ResultCode);

    if (ResultCode === 0) {
      // find the receipt number
      const items = CallbackMetadata?.Item || [];
      const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
      const mpesaReference = receiptItem?.Value ?? null;
      console.log('✅ Extracted M-Pesa reference:', mpesaReference);

      const { rowCount, rows } = await client.query(
        `UPDATE payments
           SET mpesa_reference = COALESCE(mpesa_reference, $1)
         WHERE transaction_id = $2
           AND status = 'Pending'
         RETURNING *;`,
        [mpesaReference, CheckoutRequestID]
      );

      if (rowCount === 0) {
        console.warn('No pending payment updated for transaction:', CheckoutRequestID);
        await client.query('ROLLBACK');
        return res
          .status(404)
          .json({ message: 'Payment record not found or already processed.' });
      }

      console.log('💾 Updated payment record:', rows[0]);
    } else {
      // mark failed
      const { rows } = await client.query(
        `UPDATE payments
           SET status = 'Failed'
         WHERE transaction_id = $1
         RETURNING *;`,
        [CheckoutRequestID]
      );
      console.log('❌ Marked payment failed:', rows[0] || CheckoutRequestID);
    }

    await client.query('COMMIT');
    return res.json({ message: 'Callback processed successfully' });

  } catch (err) {
    console.error('❌ Error processing M-Pesa callback:', err.message || err);
    // attempt rollback
    try { await client?.query('ROLLBACK'); } catch (rbErr) {
      console.error('Rollback failed:', rbErr.message || rbErr);
    }
    return res.status(500).json({
      message: 'Failed to process callback',
      error: err.message,
    });

  } finally {
    client?.release();
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
