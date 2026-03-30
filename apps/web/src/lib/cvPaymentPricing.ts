export const CVPRO_EXPORT_PRICE_USD = 1;

export const MPESA_KES_AMOUNT = 100;
export const PAYSTACK_KES_AMOUNT = 130;

export const CV_PAYMENT_METHOD_LABELS = {
  paystack: `Paystack (Card - KES ${PAYSTACK_KES_AMOUNT})`,
  mpesa: `M-Pesa (KES ${MPESA_KES_AMOUNT})`,
} as const;
