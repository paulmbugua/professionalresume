// packages/shared/hooks/usePayPalCheckout.ts
/// <reference types="vite/client" />

import { useEffect, useRef, useState } from 'react';
import * as paypalApi from '@mytutorapp/shared/api/paypalApi';
import { useShopContext } from '@mytutorapp/shared/context';

// ─────────────────────────────────────────────────────────────
// Minimal PayPal SDK typings used by Buttons
// ─────────────────────────────────────────────────────────────
type PayPalLayout = 'vertical' | 'horizontal';
type PayPalLabel = 'pay' | 'paypal' | 'buynow' | 'checkout';

interface PayPalButtonsStyle {
  layout?: PayPalLayout;
  label?: PayPalLabel;
}

interface PayPalOnApproveData {
  orderID: string;
}

interface PayPalButtonsOptions {
  style?: PayPalButtonsStyle;
  createOrder: () => Promise<string> | string;
  onApprove: (data: PayPalOnApproveData) => Promise<void> | void;
  onError?: (err: unknown) => void;
}

interface PayPalButtons {
  render: (container: HTMLElement) => Promise<void>;
}

interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtons;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
    PP_CLIENT_ID?: string;
  }
}

interface UsePayPalCheckoutOptions {
  packageId?: string;
  amountLabel?: string; // display-only; your server decides the real amount
  onApproved?: () => void;
}

export default function usePayPalCheckout(opts: UsePayPalCheckoutOptions) {
  const { packageId, onApproved } = opts;
  const { token, backendUrl } = useShopContext();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PayPal SDK
  useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || window.PP_CLIENT_ID || '';
    if (!clientId) {
      setError('Missing PayPal Client ID (VITE_PAYPAL_CLIENT_ID)');
      return;
    }

    const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture`;

    if (document.querySelector(`script[src="${url}"]`)) {
      setReady(true);
      return;
    }

    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError('Failed to load PayPal SDK');
    document.body.appendChild(s);
  }, []);

  // Render PayPal Buttons
  useEffect(() => {
    if (!ready || !packageId || !containerRef.current) return;

    // must come from context only
    if (!backendUrl) {
      setError('Missing backendUrl from context.');
      return;
    }
    const apiBase = backendUrl.replace(/\/+$/, ''); // normalize only; still context-sourced

    containerRef.current.innerHTML = '';

    const paypal = window.paypal;
    if (!paypal?.Buttons) {
      setError('PayPal Buttons unavailable');
      return;
    }

    const createOrder = async (): Promise<string> => {
      try {
        const { id } = await paypalApi.createOrder(packageId, token, apiBase);
        return id;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'create-order failed';
        setError(msg);
        throw e;
      }
    };

    const onApprove = async (data: PayPalOnApproveData): Promise<void> => {
      try {
        await paypalApi.captureOrder(data.orderID, token, apiBase);
        onApproved?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'capture-order failed';
        setError(msg);
        throw e;
      }
    };

    paypal
      .Buttons({
        style: { layout: 'vertical', label: 'pay' },
        createOrder,
        onApprove,
        onError: (err: unknown) =>
          setError(err instanceof Error ? err.message : 'PayPal error'),
      })
      .render(containerRef.current);
  }, [ready, packageId, onApproved, token, backendUrl]);

  return { containerRef, ready, error };
}
