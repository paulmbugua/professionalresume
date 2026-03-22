'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvPayment } from '@cvpro/shared/hooks';

const PaystackCallbackPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const [message, setMessage] = useState('Verifying your payment...');
  const reference = searchParams?.get('reference') || '';
  const nextPath = searchParams?.get('next') || '/builder';
  const cvPayment = useCvPayment({ backendUrl, token });

  const safeNextPath = useMemo(() => {
    if (!nextPath.startsWith('/')) return '/builder';
    const separator = nextPath.includes('?') ? '&' : '?';
    return `${nextPath}${separator}cvpay=success`;
  }, [nextPath]);

  useEffect(() => {
    const run = async () => {
      if (!token || !backendUrl || !reference) return;
      try {
        const res = await cvPayment.verifyPaystack.mutateAsync(reference);
        if (res.status !== 'Completed') {
          setMessage('Payment verification is still pending. Please try again shortly.');
          return;
        }
        setMessage('Payment verified. Unlock successful. Redirecting...');
        setTimeout(() => {
          router.replace(safeNextPath);
        }, 700);
      } catch (error: any) {
        setMessage(error?.message || 'Payment verification failed.');
      }
    };
    void run();
  }, [token, backendUrl, reference, safeNextPath]);

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
