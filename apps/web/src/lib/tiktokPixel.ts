'use client';

const TIKTOK_PURCHASE_PREFIX = 'tiktok:purchase:';

export type TikTokTrackPayload = Record<string, unknown>;

declare global {
  interface Window {
    ttq?: {
      track?: (event: string, payload?: TikTokTrackPayload) => void;
      page?: () => void;
      [key: string]: unknown;
    };
  }
}

function canTrackTikTok(): boolean {
  return typeof window !== 'undefined' && typeof window.ttq?.track === 'function';
}

function markPurchaseTracked(reference: string): boolean {
  if (typeof window === 'undefined' || !reference) return false;
  const key = `${TIKTOK_PURCHASE_PREFIX}${reference}`;
  if (window.sessionStorage.getItem(key) === '1') return true;
  window.sessionStorage.setItem(key, '1');
  return false;
}

export function trackTikTokPurchase(reference: string) {
  const purchaseReference = String(reference || '').trim();
  if (!purchaseReference || markPurchaseTracked(purchaseReference)) return;
  if (!canTrackTikTok()) return;

  window.ttq?.track?.('Purchase', {
    value: 1,
    currency: 'USD',
    contents: [
      {
        content_id: 'resume_export',
        content_type: 'product',
        content_name: 'OneDollarCVPro Resume Purchase',
      },
    ],
  });
}
