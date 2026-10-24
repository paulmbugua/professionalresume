import type { MetadataRoute } from 'next';
import { blogArticles } from '../lib/blogArticles';
import { absoluteUrl } from '../lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/templates'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/cover-letter'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/ats-checker'), changeFrequency: 'weekly', priority: 0.85 },
    { url: absoluteUrl('/career-resources'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/pricing'), changeFrequency: 'monthly', priority: 0.75 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.8 },
    ...blogArticles.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}`),
      lastModified: new Date(`${article.modifiedAt}T00:00:00.000Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
    {
      url: absoluteUrl('/cover-letters/templates'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: absoluteUrl('/help'), changeFrequency: 'monthly', priority: 0.5 },
    {
      url: absoluteUrl('/cookie-policy'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/anti-spam-policy'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/complaints-feedback'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: absoluteUrl('/fulfillment'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
