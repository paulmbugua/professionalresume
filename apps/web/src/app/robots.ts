import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/templates',
          '/cover-letter',
          '/cover-letters/templates',
          '/ats-checker',
          '/career-resources',
          '/pricing',
          '/blog',
        ],
        disallow: [
          '/builder',
          '/builder/',
          '/cover-letters/editor',
          '/cover-letters/new',
          '/login',
          '/register',
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
