import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { blogArticles, getBlogArticle } from '../../../lib/blogArticles';
import { brand } from '../../../lib/brand';
import { absoluteUrl, buildBreadcrumbSchema, buildPageMetadata } from '../../../lib/seo';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) return {};

  const base = buildPageMetadata({
    title: `${article.title} | ${brand.name}`,
    description: article.description,
    path: `/blog/${article.slug}`,
    keywords: article.keywords,
  });

  return {
    ...base,
    authors: [{ name: `${brand.name} Editorial Team`, url: absoluteUrl('/blog') }],
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      section: article.category,
      tags: article.keywords,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) notFound();

  const path = `/blog/${article.slug}`;
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Career Blog', path: '/blog' },
    { name: article.title, path },
  ]);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    mainEntityOfPage: absoluteUrl(path),
    author: {
      '@type': 'Organization',
      name: `${brand.name} Editorial Team`,
      url: absoluteUrl('/blog'),
    },
    publisher: {
      '@type': 'Organization',
      name: brand.name,
      url: absoluteUrl('/'),
      logo: { '@type': 'ImageObject', url: absoluteUrl('/favicon.png') },
    },
    image: absoluteUrl('/opengraph-image'),
    articleSection: article.category,
    keywords: article.keywords.join(', '),
  };

  return (
    <main className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-blue-700 dark:hover:text-sky-300">
            Home
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <Link href="/blog" className="hover:text-blue-700 dark:hover:text-sky-300">
            Career blog
          </Link>
        </nav>

        <header className="mt-7 border-b border-slate-200 pb-8 dark:border-white/10">
          <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{article.category}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
            {article.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{brand.name} Editorial Team</span>
            <time dateTime={article.modifiedAt}>Updated 24 October 2026</time>
            <span>{article.readTime}</span>
          </div>
        </header>

        <div className="py-8 text-base leading-8 text-slate-700 dark:text-slate-200">
          <p className="text-lg leading-8">{article.intro}</p>
          {article.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-2xl font-bold leading-8 text-slate-950 dark:text-white">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4">
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-blue-700 dark:marker:text-sky-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <aside
          className="border-t border-slate-200 py-8 dark:border-white/10"
          aria-label="Related tools"
        >
          <h2 className="text-xl font-bold">Build the next version of your application</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use a structured template, check the vacancy language, and review the final document
            before export.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/templates"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold dark:border-white/15 dark:bg-white/5"
            >
              View CV templates
            </Link>
            <Link
              href="/ats-checker"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold dark:border-white/15 dark:bg-white/5"
            >
              Check ATS fit
            </Link>
            <Link
              href="/builder/new?templateId=ats-minimal"
              className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Build my CV
            </Link>
          </div>
        </aside>
      </article>
    </main>
  );
}
