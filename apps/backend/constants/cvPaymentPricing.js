export const CVPRO_EXPORT_PRICE_USD = 1;
export const MPESA_KES_AMOUNT = 100;
export const PAYSTACK_KES_AMOUNT = 130;

// Paystack remains in older backend flows for backwards compatibility, but the web
// checkout now presents M-Pesa only.
export const PAYSTACK_KES_AMOUNT_MINOR = PAYSTACK_KES_AMOUNT * 100;

export const CV_EXPORT_PURCHASE_KIND = 'cv_export_unlock';
export const LEGACY_CV_EXPORT_ENTITLEMENT_KEY = 'cv_export_unlock';
export const RESUME_EXPORT_ENTITLEMENT_KEY = 'resume_export_unlock';
export const COVER_LETTER_EXPORT_ENTITLEMENT_KEY = 'cover_letter_export_unlock';
export const MONTHLY_ENTITLEMENT_DAYS = 30;

export function entitlementKeyForAction(action) {
  return String(action || '').startsWith('cover_letter')
    ? COVER_LETTER_EXPORT_ENTITLEMENT_KEY
    : RESUME_EXPORT_ENTITLEMENT_KEY;
}

export function productLabelForEntitlement(entitlementKey) {
  if (entitlementKey === COVER_LETTER_EXPORT_ENTITLEMENT_KEY) return 'Cover Letter Builder';
  return 'Resume Builder';
}

export function expectedKesAmountForProvider(provider) {
  if (provider === 'PAYSTACK') return PAYSTACK_KES_AMOUNT;
  if (provider === 'MPESA') return MPESA_KES_AMOUNT;
  return null;
}
