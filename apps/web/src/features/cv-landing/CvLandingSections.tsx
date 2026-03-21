import React from 'react';
import Link from 'next/link';

import TemplateThumbnail from '../../components/cv/templates/TemplateThumbnail';
import { demoResume } from '../../templates/demoResume';
import { normalizeDraft } from '../../utils/cvDefaults';
import { templateRegistryById } from '../../templates/registry';

import type { AnyTemplate } from './types';

export function LandingKeyframes() {
  return (
    <style jsx global>{`
      @keyframes cvpro-marquee {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-50%);
        }
      }
      @keyframes cvpro-float {
        0% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
        100% {
          transform: translateY(0px);
        }
      }
    `}</style>
  );
}

export function DotsBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.25]"
      style={{
        backgroundImage: 'radial-gradient(rgba(17,24,39,0.10) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        backgroundPosition: '0 0',
        maskImage: 'linear-gradient(to bottom, black, transparent 72%)',
      }}
    />
  );
}

export function LogoMarquee({
  items,
  speedSec = 26,
}: {
  items: { label: string; src?: string }[];
  speedSec?: number;
}) {
  const Row = ({ dup }: { dup?: boolean }) => (
    <div className="flex items-center gap-10 sm:gap-12 pr-10 sm:pr-12">
      {items.map((it, idx) => (
        <div
          key={`${dup ? 'dup-' : ''}${idx}-${it.label}`}
          className="flex items-center justify-center"
        >
          {it.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.src}
              alt={it.label}
              className="h-8 sm:h-10 md:h-11 w-auto select-none object-contain opacity-95 transition hover:opacity-100 dark:brightness-125"
              draggable={false}
            />
          ) : (
            <span className="select-none text-sm sm:text-base font-semibold text-gray-400 dark:text-slate-400">
              {it.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max items-center"
        style={{ animation: `cvpro-marquee ${speedSec}s linear infinite` }}
      >
        <Row />
        <Row dup />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14 bg-gradient-to-r from-site via-site/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14 bg-gradient-to-l from-site via-site/70 to-transparent" />
    </div>
  );
}

export function TemplatesCarousel({
  templates,
  onChoose,
}: {
  templates: AnyTemplate[];
  onChoose: (template: AnyTemplate) => void;
}) {
  const items = React.useMemo(() => (templates ?? []).filter(Boolean), [templates]);
  const [pageSize, setPageSize] = React.useState(4);

  React.useEffect(() => {
    const compute = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (width < 640) return setPageSize(1);
      if (width < 1024) return setPageSize(2);
      return setPageSize(4);
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const [page, setPage] = React.useState(0);
  const pageCount = React.useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize]
  );

  React.useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  const visible = React.useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize]
  );

  const thumbHtmlById = React.useMemo(() => {
    const map = new Map<string, string | null>();

    for (const template of visible) {
      const demoDraft = normalizeDraft({ ...demoResume, templateId: template.id });
      const html = templateRegistryById[template.id]?.renderHtml?.(demoDraft) ?? null;
      map.set(template.id, html);
    }

    return map;
  }, [visible]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Previous"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page <= 0}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-gray-200/80 px-2 py-2 text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:opacity-40 dark:bg-white/15 dark:text-slate-100 dark:hover:bg-white/20"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        disabled={page >= pageCount - 1}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-gray-200/80 px-2 py-2 text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:opacity-40 dark:bg-white/15 dark:text-slate-100 dark:hover:bg-white/20"
      >
        ›
      </button>

      <div className="mx-9 sm:mx-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((template) => {
          const html = thumbHtmlById.get(template.id) ?? null;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChoose(template)}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md dark:bg-white/10 dark:ring-white/10"
            >
              <div className="relative">
                <TemplateThumbnail html={html ?? undefined} label={template.name} />
                <div className="pointer-events-none absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="pointer-events-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">
                    Choose template
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 text-left">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {template.name}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPage(i)}
            aria-label={`Go to page ${i + 1}`}
            className={[
              'size-2.5 rounded-full border transition',
              i === page
                ? 'border-blue-600 bg-blue-600'
                : 'border-gray-300 bg-white dark:border-white/20 dark:bg-white/10',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

export function WhyChooseSection() {
  const items = [
    {
      title: 'Time-saving solutions',
      body: "Don't believe that resume building can take minutes? Let us prove it and handle the details while you focus on your job hunt.",
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-gray-200 text-lg">
          ⏱️
        </span>
      ),
    },
    {
      title: 'HR-approved templates',
      body: 'Make a resume using templates designed with input from hiring professionals who know what works.',
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-gray-200 text-lg">
          🧑‍💼
        </span>
      ),
    },
    {
      title: 'ATS-friendly',
      body: 'Beat the ATS — the system that screens resumes. Get noticed by employers and stand out where it counts!',
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-lg">
          ✅
        </span>
      ),
    },
    {
      title: 'Designs for every level',
      body: 'Explore templates that match your path — for your first job, a career change, or a move into leadership role.',
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-lg">
          📄
        </span>
      ),
    },
    {
      title: 'AI-powered tool',
      body: 'Write faster and better with smart keyword guidance and targeted content suggestions.',
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-lg">
          ✨
        </span>
      ),
    },
    {
      title: 'Security first',
      body: 'Keep your personal data protected with our trusted, industry-standard security measures.',
      icon: (
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg">
          🔒
        </span>
      ),
    },
  ];

  return (
    <section className="bg-site py-12 sm:py-16">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Why choose our AI-powered resume builder
        </h2>
        <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl bg-[#eeeeef] px-5 sm:px-6 py-5 sm:py-6 shadow-sm dark:bg-white/10"
            >
              <div className="flex items-start gap-4">
                {it.icon}
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {it.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-slate-300">
                    {it.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsSection({ onCta }: { onCta: () => void }) {
  const steps = [
    {
      n: '01',
      icon: '📄',
      title: 'Upload your CV or create a new one',
      body: 'Use your current version or start fresh — we’ll help with suggestions and structure.',
    },
    {
      n: '02',
      icon: '✍️',
      title: 'Enter your personal details',
      body: 'Fill in your profile, education, skills, and experience — we’ll handle the layout.',
    },
    {
      n: '03',
      icon: '🧩',
      title: 'Choose any template you like',
      body: 'Customize the look — fonts, spacing, and colors — while staying ATS-friendly.',
    },
    {
      n: '04',
      icon: '⬇️',
      title: 'Download your resume',
      body: 'Save your final draft — the first step in your job search is already done.',
    },
  ];

  return (
    <section className="bg-site pb-14 sm:pb-16 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          4 easy steps to create a resume
        </h2>
        <div className="mt-8 sm:mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10"
              style={{ transform: 'skewX(-6deg)' }}
            >
              <div style={{ transform: 'skewX(6deg)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <div className="text-5xl font-extrabold tracking-tight text-gray-200 dark:text-white/20">
                    {s.n}
                  </div>
                </div>
                <div className="mt-5 text-sm font-semibold text-gray-900 dark:text-white">
                  {s.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={onCta}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Create my resume
          </button>
        </div>
      </div>
    </section>
  );
}

export function FAQSection({ onCta }: { onCta: () => void }) {
  const faqs = [
    {
      q: 'What is CVPro?',
      a: 'CVPro helps you create clean, ATS-friendly resumes with modern templates and optional AI writing support.',
    },
    {
      q: 'How do I create a resume using CVPro?',
      a: 'Pick a template, add your details, refine with AI suggestions, then export a PDF.',
    },
    {
      q: 'Are CVPro templates ATS-friendly?',
      a: 'Yes — templates are built with clean structure and consistent headings to parse well.',
    },
    {
      q: 'Is CVPro available as subscription or one-time purchase?',
      a: 'This depends on your plan. You can offer either model and keep access inside your account.',
    },
    {
      q: 'Should I build my resume from scratch for every job application?',
      a: 'Keep your structure, but tailor keywords and achievements to match each role for best results.',
    },
  ];

  return (
    <section className="bg-site pb-16 sm:pb-20 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Frequently asked questions
        </h2>
        <div className="mx-auto mt-8 sm:mt-10 max-w-3xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-white/10 dark:ring-white/10">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group border-b border-gray-100 py-3 last:border-b-0 dark:border-white/10"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 dark:text-white">
                <div className="flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-gray-400 transition group-open:rotate-45 dark:text-slate-400">
                    +
                  </span>
                </div>
              </summary>
              <div className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{f.a}</div>
            </details>
          ))}
          <div className="mt-8 flex justify-center">
            <button
              onClick={onCta}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create my resume
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-[#0b1a3a] py-10 text-white">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white">
                R
              </span>
              <span>CVPro</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
              Build a clean, ATS-friendly resume with modern templates and a fast editing workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Contact Us</div>
              <Link href="/contact" className="text-sm text-white/70 hover:text-white">
                Support
              </Link>
              <Link href="/pricing" className="text-sm text-white/70 hover:text-white">
                Pricing
              </Link>
              <Link href="/help" className="text-sm text-white/70 hover:text-white">
                FAQ
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Legal</div>
              <Link href="/privacy" className="text-sm text-white/70 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-white/70 hover:text-white">
                Terms &amp; Conditions
              </Link>
              <Link href="/cookie-policy" className="text-sm text-white/70 hover:text-white">
                Cookies Policy
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Language</div>
              <span className="text-sm text-white/70">English</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-white/60">© {new Date().getFullYear()} CVPro.</div>
      </div>
    </footer>
  );
}
