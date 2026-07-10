import React from 'react';
import Link from 'next/link';

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

type SupportPageLayoutProps = {
  eyebrow?: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: Section[];
  contactTitle?: string;
  contactDescription?: string;
  children?: React.ReactNode;
};

const sectionCardClass =
  'rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]';

export default function SupportPageLayout({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
  contactTitle = 'Contact support',
  contactDescription = 'Need help with this policy or a support issue?',
  children,
}: SupportPageLayoutProps) {
  return (
    <main className="bg-site text-slate-900 transition-colors dark:text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:pt-12 lg:px-8">
        <header className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.07)] dark:border-white/10 dark:from-[#0B1220] dark:to-[#111B2E] sm:p-8">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            {description}
          </p>
          <p className="mt-5 inline-flex rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className={sectionCardClass}>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        {children}

        <section className="mt-8 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-6 dark:border-blue-400/30 dark:bg-blue-500/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{contactTitle}</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{contactDescription}</p>
          <p className="mt-3 text-sm font-semibold text-blue-700 dark:text-blue-200">
            <a href="mailto:support@professionalresume.co.ke">support@professionalresume.co.ke</a>
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/help" className="text-blue-700 underline underline-offset-4 hover:text-blue-800 dark:text-blue-200 dark:hover:text-blue-100">
              Visit Help Center
            </Link>
            <Link
              href="/complaints-feedback"
              className="text-blue-700 underline underline-offset-4 hover:text-blue-800 dark:text-blue-200 dark:hover:text-blue-100"
            >
              Complaints &amp; Feedback
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
