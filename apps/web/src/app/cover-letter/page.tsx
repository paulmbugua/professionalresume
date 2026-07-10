import type { Metadata } from 'next';
import Link from 'next/link';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Builder | Match Your Resume in Minutes | ProfessionalResume.co.ke',
  description:
    'Create polished cover letters that match your CV. Use templates, AI-assisted writing, and instant export after resume purchase.',
  path: '/cover-letter',
  keywords: ['cover letter builder', 'cover letter templates', 'resume and cover letter', 'job application letter'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Cover Letter Builder', path: '/cover-letter' },
]);

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-screen-xl px-4 py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Build a job-winning cover letter that matches your resume
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          ProfessionalResume.co.ke helps you create tailored cover letters quickly using structured templates and guided sections.
          Pair it with your resume for a complete application package.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cover-letters/templates" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Explore cover letter templates
          </Link>
          <Link href="/templates" className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300">
            Browse resume templates
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="text-base font-semibold">Template-driven structure</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Keep your message clean and easy for recruiters to scan.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="text-base font-semibold">AI-assisted writing</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Improve wording and tailor your letter for each role faster.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="text-base font-semibold">Unified checkout unlock</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">After your first resume unlock payment, cover letter export is included (Paystack card: KES 130, M-Pesa: KES 100).</p>
        </article>
      </section>
    </main>
  );
}
