import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cover-letters/templates'],
        disallow: [
          '/__routes',
          '/ai-lab',
          '/builder',
          '/builder/',
          '/components',
          '/components/',
          '/cover-letter/print',
          '/cover-letters/editor',
          '/cover-letters/new',
          '/debug',
          '/debug/',
          '/login',
          '/register',
          '/messages',
          '/print',
          '/print/',
          '/profile',
          '/paystack/callback',
          '/routes-debug',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: new URL(siteUrl).host,
  };
}
