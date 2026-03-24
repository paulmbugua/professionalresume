'use client';

export type AnalyticsParams = Record<string, string | number | boolean | undefined | null | object | Array<unknown>>;

type EventName =
  | 'page_view'
  | 'sign_up'
  | 'login'
  | 'begin_checkout'
  | 'purchase'
  | 'template_select'
  | 'cover_letter_template_select'
  | 'resume_download'
  | 'cover_letter_download'
  | 'ai_assist_used'
  | 'upload_cv_started'
  | 'upload_cv_completed'
  | 'builder_started';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
    __cvproAnalytics?: {
      gaInitialized?: boolean;
      lastPagePath?: string;
      trackedPurchases?: Record<string, boolean>;
      clarityInitialized?: boolean;
    };
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
const DEBUG = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === '1';

const isClient = () => typeof window !== 'undefined';

function debugLog(event: string, params?: AnalyticsParams) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.info(`[analytics] ${event}`, params ?? {});
}

function canTrackGa() {
  return isClient() && Boolean(GA_MEASUREMENT_ID) && typeof window.gtag === 'function';
}

export function trackEvent(eventName: EventName, params?: AnalyticsParams) {
  if (!canTrackGa()) {
    debugLog(`skipped:${eventName}`, params);
    return;
  }
  window.gtag?.('event', eventName, params || {});
  debugLog(eventName, params);
}

export function trackPageView(path: string) {
  if (!canTrackGa() || !GA_MEASUREMENT_ID) return;
  window.gtag?.('event', 'page_view', {
    page_title: typeof document !== 'undefined' ? document.title : 'CVPro',
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
  });
  debugLog('page_view', { path });
}

export function trackSignUp(params?: { auth_method?: string; source_page?: string }) {
  trackEvent('sign_up', params);
}

export function trackLogin(params?: { auth_method?: string; source_page?: string }) {
  trackEvent('login', params);
}

export function trackBeginCheckout(params?: {
  currency?: string;
  value?: number;
  plan_name?: string;
  purchase_type?: string;
  product_type?: string;
  source_page?: string;
  items?: Array<Record<string, unknown>>;
}) {
  trackEvent('begin_checkout', params);
}

export function trackPurchase(params: {
  transaction_id: string;
  value?: number;
  currency?: string;
  purchase_type?: string;
  plan_name?: string;
  product_type?: string;
  source_page?: string;
  items?: Array<Record<string, unknown>>;
}) {
  if (!isClient()) return;
  const txn = params.transaction_id?.trim();
  if (!txn) return;

  const key = `analytics:purchase:${txn}`;
  if (window.sessionStorage.getItem(key) === '1') {
    debugLog('purchase_deduped', { transaction_id: txn });
    return;
  }

  window.sessionStorage.setItem(key, '1');
  trackEvent('purchase', params);
}

export function trackTemplateSelect(params: {
  template_id: string;
  template_name?: string;
  source_page?: string;
}) {
  trackEvent('template_select', params);
}

export function trackCoverLetterTemplateSelect(params: {
  template_id: string;
  template_name?: string;
  source_page?: string;
}) {
  trackEvent('cover_letter_template_select', params);
}

export function trackResumeDownload(params?: { source_page?: string; template_id?: string }) {
  trackEvent('resume_download', params);
}

export function trackCoverLetterDownload(params?: { source_page?: string; template_id?: string }) {
  trackEvent('cover_letter_download', params);
}

export function trackAiAssistUsed(params?: { source_page?: string; feature?: string }) {
  trackEvent('ai_assist_used', params);
}

export function trackUploadCvStarted(params?: { source_page?: string; upload_type?: string }) {
  trackEvent('upload_cv_started', params);
}

export function trackUploadCvCompleted(params?: { source_page?: string; upload_type?: string }) {
  trackEvent('upload_cv_completed', params);
}

export function trackBuilderStarted(params?: {
  source_page?: string;
  template_id?: string;
  template_name?: string;
  product_type?: string;
}) {
  trackEvent('builder_started', params);
}
