'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const TIKTOK_PIXEL_ID = 'D75753RC77UDH74CISKG';

const tiktokPixelScript = `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");
  n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load('${TIKTOK_PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');
`;

declare global {
  interface Window {
    __cvproTikTokPixelStatus?: 'loaded' | 'missing';
    ttq?: {
      page?: () => void;
      track?: (event: string, payload?: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
  }
}

const TikTokPixel: React.FC = () => {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const hasTtq = typeof window.ttq === 'object' && typeof window.ttq?.page === 'function';
      window.__cvproTikTokPixelStatus = hasTtq ? 'loaded' : 'missing';

      if (!hasTtq && process.env.NODE_ENV !== 'production') {
        console.warn('[analytics] TikTok Pixel is not available on window.ttq');
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <Script
      id="tiktok-pixel-base"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: tiktokPixelScript }}
    />
  );
};

export default TikTokPixel;
