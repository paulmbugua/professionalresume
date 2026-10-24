import type { Metadata } from 'next';
import Link from 'next/link';

import { blogArticles } from '../../lib/blogArticles';
import { brand, seoKeywords } from '../../lib/brand';
import { absoluteUrl, buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Kenya Career Blog | CV, ATS & Job Application Guides | ${brand.name}`,
  description:
    'Practical Kenyan career guides for writing CVs, passing ATS screening, preparing cover letters, and applying for graduate, NGO, UN, and private-sector roles.',
  path: '/blog',
  keywords: ['CV writing Kenya blog', 'Kenya jobs guide', 'NGO jobs Kenya CV', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Career Blog', path: '/blog' },
]);

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'ProfessionalResume.co.ke Career Blog',
  description:
    'Practical Kenyan career guides for CV writing, ATS screening, cover letters, and job applications.',
  url: absoluteUrl('/blog'),
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: blogArticles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: article.title,
      url: absoluteUrl(`/blog/${article.slug}`),
    })),
  },
};

export default function Page() {
  return (
    <main className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
            Career blog
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">
            Practical career guidance for Kenyan job seekers
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Clear, useful guidance for building credible applications for Kenyan employers,
            government bodies, NGOs, UN agencies, and international opportunities.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {blogArticles.map((article) => (
            <article
              key={article.slug}
              className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="text-sky-700 dark:text-sky-300">{article.category}</span>
                <span>{article.readTime}</span>
              </div>
              <h2 className="mt-4 text-xl font-bold leading-7">
                <Link
                  href={`/blog/${article.slug}`}
                  className="hover:text-blue-700 dark:hover:text-sky-300"
                >
                  {article.title}
                </Link>
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {article.description}
              </p>
              <Link
                href={`/blog/${article.slug}`}
                className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline dark:text-sky-300"
              >
                Read guide{' '}
                <span aria-hidden="true" className="ml-1">
                  →
                </span>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-8 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold">Put the guidance into practice</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Start with an ATS-friendly template, then tailor every section to the vacancy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/templates"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-white"
            >
              Browse templates
            </Link>
            <Link
              href="/builder/new?templateId=ats-minimal"
              className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Build my CV
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
