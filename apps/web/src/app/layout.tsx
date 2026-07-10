import type { Metadata } from 'next';
import Script from 'next/script';
import '../index.css';
import Providers from './providers';
import CvTopNav from '../components/cv/CvTopNav';
import AnalyticsProvider from '../components/analytics/AnalyticsProvider';
import TikTokPixel from '../components/analytics/TikTokPixel';
import { brand, seoKeywords } from '../lib/brand';
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
    title: `${brand.name} | AI CV Builder Kenya`,
    description:
      `${brand.tagline} Build Kenya-ready CVs, resumes, cover letters, ATS reports, and career documents for local and international jobs.`,
    path: '/',
    keywords: [
      ...seoKeywords,
      'AI cover letter generator Kenya',
      'Kenya CV templates',
      'M-Pesa CV builder',
    ],
  }),
  applicationName: brand.name,
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
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
  const softwareLd = buildSoftwareApplicationSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="cvpro-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
          id="cvpro-software-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
        />
      </head>
      <body className="app-body">
        <TikTokPixel />
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
