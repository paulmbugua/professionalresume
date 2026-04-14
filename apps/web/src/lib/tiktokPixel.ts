'use client';

const TIKTOK_PURCHASE_PREFIX = 'tiktok:purchase:';
const TRACKED_EVENT_PREFIX = 'tiktok:event:';
const trackedEventKeys = new Set<string>();

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

function trackTikTokEvent(event: string, payload: TikTokTrackPayload): void {
  if (!canTrackTikTok()) return;
  window.ttq?.track?.(event, payload);
}

function markPurchaseTracked(reference: string): boolean {
  if (typeof window === 'undefined' || !reference) return false;
  const key = `${TIKTOK_PURCHASE_PREFIX}${reference}`;
  if (window.sessionStorage.getItem(key) === '1') return true;
  window.sessionStorage.setItem(key, '1');
  return false;
}

function markEventTracked(eventKey: string): boolean {
  const key = `${TRACKED_EVENT_PREFIX}${eventKey}`;
  if (trackedEventKeys.has(key)) return true;
  trackedEventKeys.add(key);
  return false;
}

export function trackTikTokViewContent(eventKey: string = 'resume_builder'): void {
  if (!eventKey || markEventTracked(`ViewContent:${eventKey}`)) return;
  trackTikTokEvent('ViewContent', {
    content_id: 'resume_builder',
    content_type: 'product',
    content_name: 'OneDollarCVPro Resume Builder',
  });
}

export function trackTikTokInitiateCheckout(): void {
  trackTikTokEvent('InitiateCheckout', {
    content_id: 'resume_export',
    content_type: 'product',
    content_name: 'OneDollarCVPro Resume Purchase',
    currency: 'USD',
    value: 1,
  });
}

export function trackTikTokPurchase(reference: string) {
  const purchaseReference = String(reference || '').trim();
  if (!purchaseReference || markPurchaseTracked(purchaseReference)) return;
  trackTikTokEvent('Purchase', {
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
