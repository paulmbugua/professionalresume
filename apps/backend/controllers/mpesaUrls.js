// apps/backend/controllers/mpesaUrls.js

import pool from '../config/db.js';

export const mpesaCallback = async (req, res) => {
  console.log('🔥 GOT STK CALLBACK (raw body):\n', JSON.stringify(req.body, null, 2));

  let client;
  try {
    client = await pool.connect();
    client.on('error', err => {
      console.error('⚠️ PG CLIENT ERROR (ignored):', err.message);
    });
    await client.query('BEGIN');

    const stkCallback = req.body.Body?.stkCallback;
    if (!stkCallback) {
      console.warn('Invalid STK callback, no Body.stkCallback');
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
    console.log('Received STK Callback:', CheckoutRequestID, 'ResultCode:', ResultCode);

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
      const mpesaReference = receiptItem?.Value || null;
      console.log('✅ Extracted MpesaReference:', mpesaReference);

      const { rowCount, rows } = await client.query(
        `UPDATE payments
           SET mpesa_reference = COALESCE(mpesa_reference, $1),
               status = 'Completed',
               updated_at = NOW()
         WHERE transaction_id = $2
           AND status = 'Pending'
         RETURNING *;`,
        [mpesaReference, CheckoutRequestID]
      );
      if (!rowCount) {
        console.warn('No pending payment found for TX:', CheckoutRequestID);
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Payment not found or already processed.' });
      }
      console.log('💾 Updated payment record:', rows[0]);
    } else {
      const { rows } = await client.query(
        `UPDATE payments
           SET status = 'Failed',
               updated_at = NOW()
         WHERE transaction_id = $1
         RETURNING *;`,
        [CheckoutRequestID]
      );
      console.log('❌ Marked STK payment failed:', rows[0] || CheckoutRequestID);
    }

    await client.query('COMMIT');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error processing STK callback:', err);
    try { await client?.query('ROLLBACK'); } catch {}
    res.status(500).json({ message: 'Failed to process STK callback' });
  } finally {
    client?.release();
  }
};

export const b2cResult = async (req, res) => {
  console.log('📬 B2C Result Callback:', JSON.stringify(req.body, null, 2));

  // Daraja nests payload under "Result"
  const result = req.body.Result;
  if (!result) {
    console.warn('Invalid B2C callback, no Result object');
    return res.status(400).send({ error: 'Invalid callback format' });
  }

  const {
    OriginatorConversationID,
    ConversationID,
    ResultCode,
    ResultDesc,
    TransactionID,            // this is the actual M-Pesa receipt
  } = result;

  const txId = OriginatorConversationID || ConversationID;
  const newStatus = ResultCode === 0 ? 'Completed' : 'Failed';

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const updateSQL = `
      UPDATE payments
         SET status = $2,
             mpesa_reference = COALESCE(mpesa_reference, $3),
             updated_at = NOW()
       WHERE transaction_id = $1
         AND status = 'Pending'
       RETURNING *;
    `;
    const { rows } = await client.query(updateSQL, [
      txId,
      newStatus,
      TransactionID || null,
    ]);

    if (rows.length) {
      console.log(`✅ B2C payment ${newStatus}:`, rows[0]);
    } else {
      console.warn(`No pending B2C payment found for transaction_id=${txId}`);
    }

    await client.query('COMMIT');
    res.status(200).send('OK');
  } catch (err) {
    console.error('📉 Error processing B2C result callback:', err);
    try { await client?.query('ROLLBACK'); } catch {}
    // still return 200 so Safaricom stops retrying
    res.status(200).send('OK');
  } finally {
    client?.release();
  }
};

export const b2cTimeout = async (req, res) => {
  console.log('⏱️ B2C Timeout Callback:', JSON.stringify(req.body, null, 2));

  const result = req.body.Result;
  if (!result) {
    console.warn('Invalid B2C timeout callback, no Result object');
    return res.status(400).send({ error: 'Invalid callback format' });
  }

  const {
    OriginatorConversationID,
    ConversationID,
    ResultDesc,
  } = result;

  const txId = OriginatorConversationID || ConversationID;

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE payments
         SET status = 'Failed',
             updated_at = NOW()
       WHERE transaction_id = $1
         AND status = 'Pending'
       RETURNING *;`,
      [txId]
    );

    if (rowCount) {
      console.log(`⚠️ B2C payment timed out, marked Failed:`, rows[0]);
    } else {
      console.warn(`No pending B2C payment to timeout for transaction_id=${txId}`);
    }

    // always respond 200
    res.status(200).send('OK');
  } catch (err) {
    console.error('📉 Error processing B2C timeout callback:', err);
    res.status(200).send('OK');
  }
};
