// apps/backend/utils/payout.js
export const ALLOWED_CURRENCIES = ['KES', 'USD'];
export const ALLOWED_METHODS    = ['mpesa', 'stripe', 'paypal'];

// Mirror the Joi regex you use on the server
const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;

/** Normalize payout fields from any body shape; return {error} on invalid. */
export function normalizePayoutFromBody(body = {}, role) {
  // Only tutors configure payouts
  if (String(role || '').toLowerCase() !== 'tutor') {
    return {
      payout_currency: null,
      payout_method: null,
      stripe_connect_id: null,
      paypal_email: null,
      mpesa_phone_number: null,
    };
  }

  // Coerce + trim raw inputs
  const rawCurrency = String(body.payoutCurrency ?? body.payout_currency ?? 'USD').toUpperCase().trim();
  const rawMethodIn = String(
    body.payoutMethod ??
    body.payout_method ??
    (rawCurrency === 'USD' ? 'stripe' : 'mpesa')
  ).toLowerCase().trim();

  const payout_currency = ALLOWED_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'USD';
  let   payout_method   = ALLOWED_METHODS.includes(rawMethodIn) ? rawMethodIn : (payout_currency === 'USD' ? 'stripe' : 'mpesa');

  // Clean up IDs/emails/phones
  const stripe_connect_id = (body.stripeConnectId ?? body.stripe_connect_id ?? '').toString().trim() || null;
  const paypal_email      = (body.paypalEmail ?? body.paypal_email ?? '').toString().trim() || null;

  // Normalize phone: strip spaces/dashes/parentheses
  const mpesa_raw = (body.mpesaPhoneNumber ?? body.mpesa_phone_number ?? '').toString().trim();
  const mpesa_phone_number = mpesa_raw.replace(/[()\s-]+/g, '') || null;

  // Cross-field constraints (keep in sync with frontend + Joi)
  if (payout_currency === 'KES') {
    // Force M-Pesa for KES
    payout_method = 'mpesa';
    if (!mpesa_phone_number) {
      return { error: 'M-Pesa phone number is required for KES payouts.' };
    }
    if (!MPESA_REGEX.test(mpesa_phone_number)) {
      return { error: 'Invalid M-Pesa phone number format for KES payouts.' };
    }
  } else if (payout_currency === 'USD') {
    // USD cannot use mpesa (match your client/Joi)
    if (payout_method === 'mpesa') {
      return { error: 'For USD payouts, choose Stripe or PayPal.' };
    }
    if (payout_method === 'stripe' && !stripe_connect_id) {
      return { error: 'Stripe Connect ID is required for USD payouts via Stripe.' };
    }
    if (payout_method === 'paypal' && !paypal_email) {
      return { error: 'PayPal email is required for USD payouts via PayPal.' };
    }
  }

  return {
    payout_currency,
    payout_method,
    stripe_connect_id,
    paypal_email,
    mpesa_phone_number,
  };
}
