import React from 'react';
import Link from 'next/link';

import TemplateThumbnail from '../../components/cv/templates/TemplateThumbnail';
import { demoResume } from '../../templates/demoResume';
import { normalizeDraft } from '../../utils/cvDefaults';
import { templateRegistryById } from '../../templates/registry';

import type { AnyTemplate } from './types';

const sectionCardClass =
  'rounded-2xl border border-slate-200/80 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]';

const softCardClass =
  'rounded-2xl border border-slate-200/80 bg-slate-50/95 shadow-sm dark:border-white/10 dark:bg-white/5';

const primaryButtonClass =
  'rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:shadow-[0_10px_24px_rgba(37,99,235,0.35)] dark:hover:bg-blue-400';

const secondaryButtonClass =
  'rounded-xl border border-blue-200 bg-white/95 px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-400/30 dark:bg-white/5 dark:text-blue-100 dark:hover:bg-white/10';

const navButtonClass =
  'absolute top-1/2 z-10 -translate-y-1/2 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2 text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-[#0B1220]/90 dark:text-slate-100 dark:hover:bg-white/10';

function IconChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'emerald' | 'orange' | 'purple' | 'amber' | 'blue';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : tone === 'orange'
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
        : tone === 'purple'
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
          : tone === 'amber'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
            : tone === 'blue'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
              : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200';

  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-xl text-lg ${toneClass}`}
    >
      {children}
    </span>
  );
}

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

export function DotsBg({ isDark = false }: { isDark?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.25]"
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)'
          : 'radial-gradient(rgba(17,24,39,0.10) 1px, transparent 1px)',
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
    <div className="flex items-center gap-10 pr-10 sm:gap-12 sm:pr-12">
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
              className="h-8 w-auto select-none object-contain opacity-95 transition hover:opacity-100 dark:brightness-125 sm:h-10 md:h-11"
              draggable={false}
            />
          ) : (
            <span className="select-none text-sm font-semibold text-slate-400 dark:text-slate-400 sm:text-base">
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
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-site via-site/70 to-transparent dark:from-slate-950 dark:via-slate-950/70 sm:w-14" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-site via-site/70 to-transparent dark:from-slate-950 dark:via-slate-950/70 sm:w-14" />
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
        className={`${navButtonClass} left-0`}
      >
        ‹
      </button>

      <button
        type="button"
        aria-label="Next"
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        disabled={page >= pageCount - 1}
        className={`${navButtonClass} right-0`}
      >
        ›
      </button>

      <div className="mx-9 grid gap-4 sm:mx-10 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((template) => {
          const html = thumbHtmlById.get(template.id) ?? null;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChoose(template)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-0 transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_30px_rgba(0,0,0,0.28)] dark:hover:bg-[#0F172A]"
            >
              <div className="relative">
                <TemplateThumbnail html={html ?? undefined} label={template.name} />
                <div className="pointer-events-none absolute inset-0 bg-slate-950/25 opacity-0 transition group-hover:opacity-100 dark:bg-black/35" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="pointer-events-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm dark:bg-blue-500">
                    Choose template
                  </span>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
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
                ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                : 'border-slate-300 bg-white dark:border-white/20 dark:bg-white/10',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

export function CoverLettersPromoSection({
  onCreateCoverLetter,
  onExploreDesigns,
}: {
  onCreateCoverLetter: () => void;
  onExploreDesigns: () => void;
}) {
  const highlights = [
    {
      title: 'Premium AI support',
      body: 'Use built-in AI assist to tailor every paragraph to your role, tone, and experience in seconds.',
      icon: <IconChip tone="purple">✨</IconChip>,
    },
    {
      title: 'Ready to print or download',
      body: 'Export polished cover letters as print-ready, downloadable files whenever you are ready to apply.',
      icon: <IconChip tone="blue">⬇️</IconChip>,
    },
    {
      title: 'Included after your first resume',
      body: 'Cover letters are included at no extra cost after your first $1 resume purchase.',
      icon: <IconChip tone="emerald">💎</IconChip>,
    },
  ];

  return (
    <section className="bg-site pb-12 pt-2 dark:bg-slate-950 sm:pb-14">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <div className={`${sectionCardClass} overflow-hidden p-5 sm:p-7`}>
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                Premium cover letters
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Turn your resume into a complete application package
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                Create professional cover letters with AI assist, then print or download your final
                version instantly. Once you purchase your first resume for $1, cover letters are
                included for free in your account.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={onCreateCoverLetter} className={primaryButtonClass}>
                  Create Cover Letter
                </button>
                <button type="button" onClick={onExploreDesigns} className={secondaryButtonClass}>
                  Explore Designs
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {highlights.map((item) => (
                <div key={item.title} className={`${softCardClass} p-4 sm:p-5`}>
                  <div className="flex items-start gap-3">
                    {item.icon}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhyChooseSection() {
  const items = [
    {
      title: 'Time-saving solutions',
      body: "Don't believe that resume building can take minutes? Let us prove it and handle the details while you focus on your job hunt.",
      icon: <IconChip tone="neutral">⏱️</IconChip>,
    },
    {
      title: 'HR-approved templates',
      body: 'Make a resume using templates designed with input from hiring professionals who know what works.',
      icon: <IconChip tone="neutral">🧑‍💼</IconChip>,
    },
    {
      title: 'ATS-friendly',
      body: 'Beat the ATS — the system that screens resumes. Get noticed by employers and stand out where it counts!',
      icon: <IconChip tone="emerald">✅</IconChip>,
    },
    {
      title: 'Designs for every level',
      body: 'Explore templates that match your path — for your first job, a career change, or a move into leadership role.',
      icon: <IconChip tone="orange">📄</IconChip>,
    },
    {
      title: 'AI-powered tool',
      body: 'Write faster and better with smart keyword guidance and targeted content suggestions.',
      icon: <IconChip tone="purple">✨</IconChip>,
    },
    {
      title: 'Security first',
      body: 'Keep your personal data protected with our trusted, industry-standard security measures.',
      icon: <IconChip tone="amber">🔒</IconChip>,
    },
  ];

  return (
    <section className="bg-site py-12 dark:bg-slate-950 sm:py-16">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Why choose our AI-powered resume builder
        </h2>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className={`${softCardClass} px-5 py-5 sm:px-6 sm:py-6`}>
              <div className="flex items-start gap-4">
                {it.icon}
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {it.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
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
    <section className="bg-site pb-14 pt-8 dark:bg-slate-950 sm:pb-16 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          4 easy steps to create a resume
        </h2>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)] sm:p-6"
              style={{ transform: 'skewX(-6deg)' }}
            >
              <div style={{ transform: 'skewX(6deg)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white dark:bg-blue-500">
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <div className="text-5xl font-extrabold tracking-tight text-slate-200 dark:text-white/15">
                    {s.n}
                  </div>
                </div>

                <div className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">
                  {s.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button onClick={onCta} className={primaryButtonClass}>
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
    <section className="bg-site pb-16 pt-8 dark:bg-slate-950 sm:pb-20 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Frequently asked questions
        </h2>

        <div className={`mx-auto mt-8 max-w-3xl p-5 sm:mt-10 ${sectionCardClass}`}>
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group border-b border-slate-200/80 py-3 last:border-b-0 dark:border-white/10"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white">
                <div className="flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-slate-400 transition group-open:rotate-45 dark:text-slate-400">
                    +
                  </span>
                </div>
              </summary>
              <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{f.a}</div>
            </details>
          ))}

          <div className="mt-8 flex justify-center">
            <button onClick={onCta} className={primaryButtonClass}>
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
    <footer className="border-t border-slate-200/80 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-[#081120] dark:text-white">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white/10 dark:text-white">
                R
              </span>
              <span>CVPro</span>
            </div>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/70">
              Build a clean, ATS-friendly resume with modern templates and a fast editing workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Contact Us</div>
              <Link
                href="/contact"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                Support
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="/help"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                FAQ
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Legal</div>
              <Link
                href="/privacy"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/cookie-policy"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
              >
                Cookies Policy
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Language</div>
              <span className="text-sm text-slate-600 dark:text-white/70">English</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-500 dark:text-white/60">
          © {new Date().getFullYear()} CVPro.
        </div>
      </div>
    </footer>
  );
}
