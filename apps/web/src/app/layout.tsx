import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Suspense } from 'react';
import '../index.css';
import Providers from './providers';
import CvTopNav from '../components/cv/CvTopNav';
import AnalyticsProvider from '../components/analytics/AnalyticsProvider';
import TikTokPixel from '../components/analytics/TikTokPixel';
import { brand, seoKeywords } from '../lib/brand';
import {
  buildOrganizationSchema,
  buildPageMetadata,
  buildCareerServiceSchema,
  buildWebsiteSchema,
  getSiteUrl,
} from '../lib/seo';

const inter = localFont({
  src: '../assets/inter-latin.woff2',
  display: 'swap',
  variable: '--font-inter',
  weight: '100 900',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#101a23' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  ...buildPageMetadata({
    title: `${brand.name} | AI CV Builder Kenya`,
    description: `${brand.tagline} Build Kenya-ready CVs, resumes, cover letters, ATS reports, and career documents for local and international jobs.`,
    path: '/',
    keywords: [
      ...seoKeywords,
      'AI cover letter generator Kenya',
      'Kenya CV templates',
      'M-Pesa CV builder',
    ],
  }),
  applicationName: brand.name,
  creator: brand.name,
  publisher: brand.name,
  category: 'career services',
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

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
  const serviceLd = buildCareerServiceSchema();

  return (
    <html lang="en-KE" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script
          id="cvpro-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <Script
          id="cvpro-organization-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <Script
          id="cvpro-website-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <Script
          id="cvpro-career-service-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
        />
      </head>
      <body className={`${inter.className} app-body`}>
        <TikTokPixel />
        <Providers>
          <Suspense fallback={null}>
            <AnalyticsProvider />
          </Suspense>
          <div className="app-shell">
            <CvTopNav />
            <Suspense fallback={null}>
              <div id="page-content">{children}</div>
            </Suspense>
          </div>
        </Providers>
      </body>
    </html>
  );
}
