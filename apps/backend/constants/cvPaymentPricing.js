export const CVPRO_EXPORT_PRICE_USD = 1;
export const MPESA_KES_AMOUNT = 100;
export const PAYSTACK_KES_AMOUNT = 130;

// Paystack initialize/verify APIs in this repo use the provider's smallest currency unit.
// For KES 130.00, send/expect 13000.
export const PAYSTACK_KES_AMOUNT_MINOR = PAYSTACK_KES_AMOUNT * 100;

export const CV_EXPORT_PURCHASE_KIND = 'cv_export_unlock';
export const CV_EXPORT_ENTITLEMENT_KEY = 'cv_export_unlock';

export function expectedKesAmountForProvider(provider) {
  if (provider === 'PAYSTACK') return PAYSTACK_KES_AMOUNT;
  if (provider === 'MPESA') return MPESA_KES_AMOUNT;
  return null;
}
