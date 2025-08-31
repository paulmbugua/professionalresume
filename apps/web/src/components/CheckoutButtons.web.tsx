import React from 'react';

export default function CheckoutButtons({
  priceLabel = 'Certificate: $9',
  onStripe,
  onPayPal,
}: {
  priceLabel?: string;
  onStripe?: () => void;
  onPayPal?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/80 text-sm">{priceLabel}</span>
      <button
        onClick={onStripe}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
      >
        Pay with Stripe
      </button>
      <button
        onClick={onPayPal}
        className="px-3 py-1.5 rounded-lg bg-[#ffc439] hover:bg-[#ffb300] text-black text-sm"
      >
        PayPal
      </button>
    </div>
  );
}
