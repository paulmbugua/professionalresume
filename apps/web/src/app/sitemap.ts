import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/templates'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/cover-letter'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    {
      url: absoluteUrl('/cover-letters/templates'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: absoluteUrl('/help'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: absoluteUrl('/cookie-policy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/anti-spam-policy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/complaints-feedback'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: absoluteUrl('/fulfillment'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
