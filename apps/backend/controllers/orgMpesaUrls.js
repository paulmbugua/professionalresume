import pool from '../config/db.js';

/**
 * STK Callback for Organization Subscriptions
 * - Expects Daraja STK callback shape: Body.stkCallback
 * - Stores MpesaReceiptNumber into org_subscription_payments.mpesa_reference
 * - Leaves status as 'pending' (explicit confirmation endpoint will finalize)
 */
export const orgStkCallback = async (req, res) => {
  console.log('🔥 ORG STK CALLBACK:', JSON.stringify(req.body, null, 2));

  let client;
  try {
    client = await pool.connect();
    client.on('error', (err) => {
      console.error('⚠️ PG CLIENT ERROR (ignored):', err.message);
    });
    await client.query('BEGIN');

    const stk = req.body?.Body?.stkCallback;
    if (!stk) {
      console.warn('[org-stk] missing Body.stkCallback');
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stk;
    console.log('[org-stk] CheckoutRequestID:', CheckoutRequestID, 'ResultCode:', ResultCode);

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null;
      console.log('[org-stk] extracted MpesaReceiptNumber:', receipt);

      // Only update reference; keep status pending for explicit confirm
      const { rowCount, rows } = await client.query(
        `UPDATE org_subscription_payments
            SET mpesa_reference = COALESCE(mpesa_reference, $1),
                updated_at = NOW()
          WHERE provider_txn_id = $2
            AND status = 'pending'
          RETURNING id, org_id, tier, cycle, currency, amount_cents, provider, status, mpesa_reference`,
        [receipt, CheckoutRequestID]
      );

      if (!rowCount) {
        console.warn('[org-stk] no pending org payment for CheckoutRequestID=', CheckoutRequestID);
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Payment not found or already processed.' });
      }

      console.log('💾 [org-stk] updated org payment (reference only):', rows[0]);
    } else {
      console.log(`❌ [org-stk] error code ${ResultCode} for ${CheckoutRequestID}`);
      // Optionally: mark failed here if you prefer immediate failure status
      // await client.query(`
      //   UPDATE org_subscription_payments
      //      SET status='failed', updated_at=NOW()
      //    WHERE provider_txn_id=$1 AND status='pending'`,
      //   [CheckoutRequestID]
      // );
    }

    await client.query('COMMIT');
    // Always return 200 so Daraja stops retrying
    return res.status(200).send('OK');
  } catch (err) {
    console.error('❌ [org-stk] error:', err);
    try { await client?.query('ROLLBACK'); } catch {}
    // Still return 200 to stop retries
    return res.status(200).send('OK');
  } finally {
    client?.release();
  }
};
