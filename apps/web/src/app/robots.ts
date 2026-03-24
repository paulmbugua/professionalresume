import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/templates', '/cover-letter', '/cover-letters/templates'],
        disallow: [
          '/builder',
          '/builder/',
          '/cover-letters/editor',
          '/cover-letters/new',
          '/login',
          '/messages',
          '/profile',
          '/paystack/callback',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
