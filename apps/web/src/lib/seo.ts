import type { Metadata } from 'next';

import { brand, paymentMethods, platformCapabilities, seoKeywords } from './brand';

const FALLBACK_SITE_URL = brand.siteUrl;

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.trim()}`
      : '');

  const candidate = fromEnv || FALLBACK_SITE_URL;
  try {
    return new URL(candidate).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function absoluteUrl(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${safePath}`;
}

const DEFAULT_OG_IMAGE = '/assets/ladywithcv.png';

export function buildPageMetadata(params: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(params.path);

  return {
    title: params.title,
    description: params.description,
    keywords: params.keywords,
    alternates: { canonical },
    robots: params.noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title: params.title,
      description: params.description,
      siteName: brand.name,
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: `${brand.name} CV builder preview` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
  };
}

export function buildOrganizationSchema() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    alternateName: brand.shortName,
    url: siteUrl,
    logo: absoluteUrl('/assets/logo.png'),
    sameAs: [],
  };
}

export function buildWebsiteSchema() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name,
    alternateName: brand.shortName,
    url: siteUrl,
    description: brand.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/blog?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${brand.name} AI Career Platform`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    featureList: platformCapabilities,
    keywords: seoKeywords.join(', '),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KES',
      description: `Career document plans with ${paymentMethods.join(', ')} support.`,
    },
    description: brand.description,
    url: absoluteUrl('/'),
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
