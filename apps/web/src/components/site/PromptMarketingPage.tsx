import Link from 'next/link';
import React from 'react';

type Section = {
  title: string;
  body: string;
  items?: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  sections: Section[];
};

const primaryButton =
  'inline-flex rounded-lg bg-[#0052CC] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700';

const secondaryButton =
  'inline-flex rounded-lg border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-[#0052CC] transition hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-sky-200 dark:hover:bg-white/10';

export default function PromptMarketingPage({
  eyebrow,
  title,
  description,
  primaryHref = '/builder/new?templateId=ats-minimal',
  primaryLabel = 'Start Building',
  secondaryHref = '/templates',
  secondaryLabel = 'View Templates',
  sections,
}: Props) {
  return (
    <div className="bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0EA5E9]">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={primaryHref} className={primaryButton}>
              {primaryLabel}
            </Link>
            <Link href={secondaryHref} className={secondaryButton}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-screen-xl gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {section.body}
            </p>
            {section.items?.length ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#10B981]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
