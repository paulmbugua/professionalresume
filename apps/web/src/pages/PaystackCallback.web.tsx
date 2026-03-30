'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvPayment } from '@cvpro/shared/hooks';
import { restorePendingPaymentReturn } from '../lib/cvGuestSession';
import { trackPurchase } from '../lib/analytics/events';
import { PAYSTACK_KES_AMOUNT } from '../lib/cvPaymentPricing';

const PaystackCallbackPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const [message, setMessage] = useState('Verifying your payment...');
  const reference = searchParams?.get('reference') || '';
  const nextPath = searchParams?.get('next') || '';
  const cvPayment = useCvPayment({ backendUrl, token });
  const pendingReturn = useMemo(() => restorePendingPaymentReturn(), []);

  const safeNextPath = useMemo(() => {
    const target = nextPath || pendingReturn?.returnTo || '/builder';
    if (!target.startsWith('/')) return '/builder';
    const separator = target.includes('?') ? '&' : '?';
    return `${target}${separator}cvpay=success`;
  }, [nextPath, pendingReturn?.returnTo]);

  useEffect(() => {
    const run = async () => {
      if (!token || !backendUrl || !reference) return;
      try {
        const res = await cvPayment.verifyPaystack.mutateAsync(reference);
        if (res.status !== 'Completed') {
          setMessage('Payment verification is still pending. Please try again shortly.');
          return;
        }
        console.info('[cv-payment-return] paystack verified; redirecting', {
          nextPath,
          fallbackReturnTo: pendingReturn?.returnTo || null,
          safeNextPath,
        });
        trackPurchase({
          transaction_id: reference,
          currency: 'KES',
          value: PAYSTACK_KES_AMOUNT,
          purchase_type: 'export_unlock',
          plan_name: 'one_time_unlock',
          product_type: 'resume',
          source_page: pendingReturn?.source || 'paystack_callback',
          items: [{ item_id: 'cvpro-export-unlock', item_name: 'CVPro Export Unlock', price: PAYSTACK_KES_AMOUNT, quantity: 1 }],
        });
        setMessage('Payment verified. Unlock successful. Redirecting...');
        setTimeout(() => {
          router.replace(safeNextPath);
        }, 700);
      } catch (error: any) {
        setMessage(error?.message || 'Payment verification failed.');
      }
    };
    void run();
  }, [token, backendUrl, reference, nextPath, pendingReturn?.returnTo, safeNextPath]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-md items-center justify-center px-6 py-12 text-center">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">CVPro payment callback</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default PaystackCallbackPage;
