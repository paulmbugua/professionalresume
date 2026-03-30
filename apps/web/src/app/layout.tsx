import type { Metadata } from 'next';
import Script from 'next/script';
import '../index.css';
import Providers from './providers';
import CvTopNav from '../components/cv/CvTopNav';
import AnalyticsProvider from '../components/analytics/AnalyticsProvider';
import {
  buildOrganizationSchema,
  buildPageMetadata,
  buildSoftwareApplicationSchema,
  buildWebsiteSchema,
  getSiteUrl,
} from '../lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  ...buildPageMetadata({
    title: 'CVPro | ATS Resume & Cover Letter Builder',
    description:
      'Build ATS-friendly resumes and cover letters in minutes with expert templates, AI writing support, and one-click export.',
    path: '/',
    keywords: [
      'resume builder',
      'ATS resume templates',
      'cover letter builder',
      'CV builder',
      'OneDollarCVPro',
    ],
  }),
  applicationName: 'CVPro',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/site.webmanifest',
};

const tiktokPixelScript = `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");
  n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load('D75753RC77UDH74CISKG');
  ttq.page();
}(window, document, 'ttq');
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInitScript = `
    (function () {
      try {
        var stored = localStorage.getItem('cvpro-theme');
        var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (e) {}
    })();
  `;

  const organizationLd = buildOrganizationSchema();
  const websiteLd = buildWebsiteSchema();
  const softwareLd = buildSoftwareApplicationSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
        />
      </head>
      <body className="app-body">
        <Script
          id="tiktok-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: tiktokPixelScript }}
        />
        <Providers>
          <AnalyticsProvider />
          <div className="app-shell">
            <CvTopNav />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
