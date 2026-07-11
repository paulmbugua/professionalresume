import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, FileText, PenLine, Smartphone } from 'lucide-react';

import { brand, seoKeywords } from '../../lib/brand';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Pricing | Resume & Cover Letter Builder | ${brand.name}`,
  description:
    'Build a professional resume or cover letter for Ksh 100 per month and pay securely with M-Pesa.',
  path: '/pricing',
  keywords: ['CV pricing Kenya', 'M-Pesa CV builder', 'resume builder Kenya pricing', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Pricing', path: '/pricing' },
]);

const plans = [
  {
    name: 'Resume Builder',
    description: 'Create, polish, and export a professional resume for job applications.',
    icon: FileText,
    href: '/builder/new?templateId=ats-minimal',
    action: 'Build Resume',
    features: ['Professional resume builder', 'ATS-friendly structure', 'Export-ready document'],
  },
  {
    name: 'Cover Letter Builder',
    description: 'Build a focused cover letter that matches your resume and target role.',
    icon: PenLine,
    href: '/cover-letter',
    action: 'Build Cover Letter',
    features: ['Role-specific cover letter', 'Clean matching format', 'Ready for applications'],
  },
];

const notes = [
  {
    icon: Smartphone,
    title: 'M-Pesa only',
    body: 'M-Pesa is the only payment method for this pricing setup, keeping checkout simple for Kenyan users.',
  },
  {
    icon: CalendarDays,
    title: 'Monthly billing',
    body: 'The billing cycle runs monthly, so access renews every month unless changed by the user.',
  },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                Simple M-Pesa pricing
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
                Build your resume or cover letter for Ksh 100 per month
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-300">
                ProfessionalResume.co.ke currently supports M-Pesa payments only for resume and cover letter products.
                Each builder costs Ksh 100, billed monthly.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/builder/new?templateId=ats-minimal"
                  className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Build Resume
                </Link>
                <Link
                  href="/cover-letter"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Build Cover Letter
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10">
              <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-950">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Monthly price</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">Ksh 100</span>
                  <span className="pb-2 text-sm font-bold text-slate-500 dark:text-slate-400">per builder / month</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  Pay with M-Pesa, build your document, and keep your monthly access active for continued updates.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-10 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <article
                  key={plan.name}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h2 className="text-xl font-extrabold">{plan.name}</h2>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-extrabold">Ksh 100</div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">monthly</div>
                    </div>
                  </div>

                  <ul className="mt-5 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className="mt-6 inline-flex w-full justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100"
                  >
                    {plan.action}
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {notes.map((note) => {
              const Icon = note.icon;
              return (
                <article
                  key={note.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold">{note.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{note.body}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
