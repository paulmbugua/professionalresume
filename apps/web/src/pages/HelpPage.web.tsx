import React from 'react';
import Link from 'next/link';

const lastUpdated = 'March 28, 2026';

const helpGroups = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      'Create an account and sign in to access the builder.',
      'Choose a template that matches your role and experience level.',
      'Start with your core details and fill sections in order for best results.',
    ],
  },
  {
    id: 'creating-resume',
    title: 'Creating a resume/CV',
    items: [
      'Use the CV builder to add work history, education, and key skills.',
      'Keep bullet points concise and achievement-focused for ATS readability.',
      'Use AI assistance to refine phrasing while keeping your details accurate.',
    ],
  },
  {
    id: 'cover-letters',
    title: 'Cover letters',
    items: [
      'Generate role-specific cover letters and tailor tone per application.',
      'Edit generated text before sending so it reflects your real experience.',
      'Save multiple versions for different jobs.',
    ],
  },
  {
    id: 'downloads-printing',
    title: 'Downloads and printing',
    items: [
      'Preview before exporting to confirm formatting and spacing.',
      'Use download/print options available in your account after purchase.',
      'If export fails, refresh and retry from your latest saved draft.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    items: [
      'CVPro is built around affordable $1 resume/CV unlocking for fast job applications.',
      'Ensure checkout details are correct before confirming payment.',
      'Keep your receipt/reference handy in case support follow-up is required.',
    ],
  },
  {
    id: 'account-login',
    title: 'Account and login issues',
    items: [
      'Check that you are signing in with the same email used during purchase.',
      'Use password reset from the login page if needed.',
      'If you cannot access your account, contact support with your registered email.',
    ],
  },
  {
    id: 'technical-troubleshooting',
    title: 'Technical troubleshooting',
    items: [
      'Try the latest version of Chrome, Safari, Edge, or Firefox.',
      'Disable browser extensions that block scripts or storage.',
      'Clear cache and retry if pages fail to save or load correctly.',
    ],
  },
];

const faqItems = [
  {
    question: 'How quickly can I create a resume on CVPro?',
    answer:
      'Most users can create or significantly improve a resume in minutes using templates and guided AI assistance.',
  },
  {
    question: 'Can I edit my resume after paying?',
    answer:
      'Yes. You can continue editing your drafts and export updated versions from your account based on your available access.',
  },
  {
    question: 'Does CVPro support both resume and CV formats?',
    answer:
      'Yes. CVPro supports professional resume/CV creation with flexible sections so you can tailor output by job market and role.',
  },
  {
    question: 'What if my download does not work after payment?',
    answer:
      'Email support@onedollarcvpro.com with your account email and payment reference. We will verify access and help restore export functionality promptly.',
  },
  {
    question: 'How do I report a bug or share product feedback?',
    answer:
      'Use our Complaints & Feedback page or email support directly. Include browser/device details and screenshots for faster investigation.',
  },
];

export default function HelpPage() {
  return (
    <main className="bg-site text-slate-900 transition-colors dark:text-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-12 lg:px-8">
        <header className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.07)] dark:border-white/10 dark:from-[#0B1220] dark:to-[#111B2E] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">Support</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Help Center</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            CVPro helps you create, edit, optimize, and export professional resumes/CVs and cover
            letters quickly at a low cost. Use this page for quick answers and support pathways.
          </p>
          <p className="mt-5 inline-flex rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {helpGroups.map((group) => (
            <article
              key={group.id}
              id={group.id}
              className="rounded-2xl border border-slate-200/80 bg-white/92 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{group.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-blue-200/80 bg-blue-50/80 p-6 dark:border-blue-400/30 dark:bg-blue-500/10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Need direct support?</h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 sm:text-base">
            Email <a className="font-semibold text-blue-700 dark:text-blue-200" href="mailto:support@onedollarcvpro.com">support@onedollarcvpro.com</a>. Include your account email,
            screenshots, and payment reference if relevant so we can respond efficiently.
          </p>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 sm:text-base">
            For formal complaints or detailed service feedback, use the{' '}
            <Link href="/complaints-feedback" className="underline underline-offset-4">
              Complaints &amp; Feedback page
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Useful links</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/builder/new?templateId=ats-minimal" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Start CV Builder
            </Link>
            <Link href="/templates" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Browse Templates
            </Link>
            <Link href="/cover-letters" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Cover Letters
            </Link>
            <Link href="/fulfillment" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Fulfillment Policy
            </Link>
            <Link href="/cookie-policy" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Cookie Policy
            </Link>
            <Link href="/anti-spam-policy" className="rounded-full border border-slate-200/90 px-3 py-1.5 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/10">
              Anti-Spam Policy
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Frequently asked questions</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
