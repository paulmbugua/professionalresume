// packages/shared/hooks/usePayPalCheckout.ts
import { useEffect, useRef, useState } from 'react';
import * as paypalApi from '@mytutorapp/shared/api/paypalApi';
import { useShopContext } from '@mytutorapp/shared/context';

interface UsePayPalCheckoutOptions {
  packageId?: string;
  amountLabel?: string;
  onApproved?: () => void;
}

export default function usePayPalCheckout(opts: UsePayPalCheckoutOptions) {
  const { packageId, onApproved } = opts;
  const { token, backendUrl } = useShopContext();          // <- add this
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientId =
      (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID ||
      (window as any)?.PP_CLIENT_ID ||
      '';
    if (!clientId) { setError('Missing PayPal Client ID (VITE_PAYPAL_CLIENT_ID)'); return; }

    const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    if (document.querySelector(`script[src="${url}"]`)) { setReady(true); return; }

    const s = document.createElement('script');
    s.src = url; s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError('Failed to load PayPal');
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !packageId || !containerRef.current) return;
    containerRef.current.innerHTML = '';
    const paypal = (window as any).paypal;
    if (!paypal?.Buttons) { setError('PayPal Buttons unavailable'); return; }

    const createOrder = async () => {
      // 🔐 now sends Authorization to your backend
      const { id } = await paypalApi.createOrder(packageId, token, '');
      return id;
    };

    const onApprove = async (data: any) => {
      await paypalApi.captureOrder(data.orderID, token, '');
      onApproved?.();
    };

    paypal.Buttons({
      style: { layout: 'vertical', label: 'pay' },
      createOrder,
      onApprove,
      onError: () => setError('PayPal error'),
    }).render(containerRef.current);
  }, [ready, packageId, onApproved, token]);

  return { containerRef, ready, error };
}
