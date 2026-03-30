import type { AppProps } from 'next/app';
import React from 'react';
import Script from 'next/script';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopContextProvider } from '@cvpro/shared/context';

const queryClient = new QueryClient();

const tiktokPixelScript = `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");
  n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load('D75753RC77UDH74CISKG');
  ttq.page();
}(window, document, 'ttq');
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        id="tiktok-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: tiktokPixelScript }}
      />
      <QueryClientProvider client={queryClient}>
        <ShopContextProvider backendUrl={process.env.NEXT_PUBLIC_API_BASE_URL || ''}>
          <Component {...pageProps} />
        </ShopContextProvider>
      </QueryClientProvider>
    </>
  );
}
