'use client';

import { useEffect, useMemo } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';

import { trackPageView } from '@/lib/analytics/events';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

const AnalyticsProvider: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pagePath = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname || '/';
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (typeof window === 'undefined') return;

    window.__cvproAnalytics = window.__cvproAnalytics || {};
    if (window.__cvproAnalytics.lastPagePath === pagePath) return;

    window.__cvproAnalytics.lastPagePath = pagePath;
    trackPageView(pagePath);
  }, [pagePath]);

  useEffect(() => {
    if (!CLARITY_PROJECT_ID || typeof window === 'undefined') return;
    window.__cvproAnalytics = window.__cvproAnalytics || {};
    if (window.__cvproAnalytics.clarityInitialized) return;

    (function (c: Window & typeof globalThis, l: Document, i: string) {
      const win = c as any;
      win.clarity =
        win.clarity ||
        function (...args: any[]) {
          (win.clarity.q = win.clarity.q || []).push(args);
        };
      const t = l.createElement('script') as HTMLScriptElement;
      t.async = true;
      t.src = `https://www.clarity.ms/tag/${i}`;
      const y = l.getElementsByTagName('script')[0];
      y?.parentNode?.insertBefore(t, y);
    })(window, document, CLARITY_PROJECT_ID);

    window.__cvproAnalytics.clarityInitialized = true;
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `,
        }}
      />
    </>
  );
};

export default AnalyticsProvider;
