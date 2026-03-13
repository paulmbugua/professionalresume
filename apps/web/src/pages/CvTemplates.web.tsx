// apps/web/src/pages/CvTemplates.web.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useShopContext } from '@cvpro/shared/context';
import { useCvTemplates } from '@cvpro/shared/hooks';
import type { CvTemplate } from '@cvpro/shared/types';

import TemplateSpotlightModal from '../components/cv/TemplateSpotlightModal';
import TemplateThumbnail from '../components/cv/templates/TemplateThumbnail';

import { demoResume } from '../templates/demoResume';
import { normalizeDraft } from '../utils/cvDefaults';
import { templateRegistryList, templateRegistryById } from '../templates/registry';

type AnyTemplate = CvTemplate;

/**
 * Responsive landing page:
 * - Mobile-first layout
 * - Tablet (md) improvements
 * - Desktop (lg/xl) matches screenshot layout
 * - Uses HTML thumbnail pipeline (TemplateThumbnail) so previews always show
 */

function pickTemplatesById(templates: AnyTemplate[], ids: string[]): AnyTemplate[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const picked = ids.map((id) => byId.get(id)).filter(Boolean) as AnyTemplate[];
  const need = Math.max(0, ids.length - picked.length);
  if (need <= 0) return picked.slice(0, ids.length);
  const fallback = templates.filter((t) => !picked.includes(t)).slice(0, need);
  return [...picked, ...fallback].slice(0, ids.length);
}

function useThumbHtml(templateId?: string) {
  return React.useMemo(() => {
    if (!templateId) return null;
    const demoDraft = normalizeDraft({ ...demoResume, templateId });
    return templateRegistryById[templateId]?.renderHtml?.(demoDraft) ?? null;
  }, [templateId]);
}

function DotsBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.55]"
      style={{
        backgroundImage: 'radial-gradient(rgba(17,24,39,0.10) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        backgroundPosition: '0 0',
        maskImage: 'linear-gradient(to bottom, black, transparent 72%)',
      }}
    />
  );
}

function LogoMarquee({
  items,
  speedSec = 26,
}: {
  items: { label: string; src?: string }[];
  speedSec?: number;
}) {
  const Row = ({ dup }: { dup?: boolean }) => (
    <div className="flex items-center gap-10 sm:gap-12 pr-10 sm:pr-12">
      {items.map((it, idx) => (
        <div key={`${dup ? 'dup-' : ''}${idx}-${it.label}`} className="flex items-center justify-center">
          {it.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.src}
              alt={it.label}
              className="h-8 sm:h-10 md:h-11 w-auto select-none object-contain opacity-95 transition hover:opacity-100"
              draggable={false}
            />
          ) : (
            <span className="select-none text-sm sm:text-base font-semibold text-gray-400">{it.label}</span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="flex w-max items-center" style={{ animation: `cvpro-marquee ${speedSec}s linear infinite` }}>
        <Row />
        <Row dup />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14 bg-gradient-to-r from-[#f7f8fb] via-[#f7f8fb]/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14 bg-gradient-to-l from-[#f7f8fb] via-[#f7f8fb]/70 to-transparent" />
    </div>
  );
}

function TemplatesCarousel({
  templates,
  onChoose,
}: {
  templates: AnyTemplate[];
  onChoose: (t: AnyTemplate) => void;
}) {
  const items = React.useMemo(() => (templates ?? []).filter(Boolean), [templates]);

  // Responsive page size: 1 (mobile), 2 (md), 4 (lg)
  const [pageSize, setPageSize] = React.useState(4);
  React.useEffect(() => {
    const compute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (w < 640) return setPageSize(1);
      if (w < 1024) return setPageSize(2);
      return setPageSize(4);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const [page, setPage] = React.useState(0);
  const pageCount = React.useMemo(() => Math.max(1, Math.ceil(items.length / pageSize)), [items.length, pageSize]);

  React.useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  const visible = React.useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize]
  );

  // ✅ One hook call: build thumbnails for currently visible templates
  const thumbHtmlById = React.useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of visible) {
      const demoDraft = normalizeDraft({ ...demoResume, templateId: t.id });
      const html = templateRegistryById[t.id]?.renderHtml?.(demoDraft) ?? null;
      map.set(t.id, html);
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
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-gray-200/80 px-2 py-2 text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:opacity-40"
      >
        ‹
      </button>

      <button
        type="button"
        aria-label="Next"
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        disabled={page >= pageCount - 1}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-gray-200/80 px-2 py-2 text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:opacity-40"
      >
        ›
      </button>

      <div className="mx-9 sm:mx-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((t) => {
          const html = thumbHtmlById.get(t.id) ?? null;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChoose(t)}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative">
                <TemplateThumbnail html={html ?? undefined} label={t.name} />

                <div className="pointer-events-none absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="pointer-events-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">
                    Choose template
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 text-left">
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
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
              i === page ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

function WhyChooseSection() {
  const items = [
    {
      title: 'Time-saving solutions',
      body: "Don't believe that resume building can take minutes? Let us prove it and handle the details while you focus on your job hunt.",
      icon: <span className="inline-flex size-10 items-center justify-center rounded-full bg-gray-200 text-lg">⏱️</span>,
    },
    {
      title: 'HR-approved templates',
      body: 'Make a resume using templates designed with input from hiring professionals who know what works.',
      icon: <span className="inline-flex size-10 items-center justify-center rounded-full bg-gray-200 text-lg">🧑‍💼</span>,
    },
    {
      title: 'ATS-friendly',
      body: 'Beat the ATS — the system that screens resumes. Get noticed by employers and stand out where it counts!',
      icon: <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-lg">✅</span>,
    },
    {
      title: 'Designs for every level',
      body: 'Explore templates that match your path — for your first job, a career change, or a move into leadership role.',
      icon: <span className="inline-flex size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-lg">📄</span>,
    },
    {
      title: 'AI-powered tool',
      body: 'Write faster and better with smart keyword guidance and targeted content suggestions.',
      icon: <span className="inline-flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-lg">✨</span>,
    },
    {
      title: 'Security first',
      body: 'Keep your personal data protected with our trusted, industry-standard security measures.',
      icon: <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg">🔒</span>,
    },
  ];

  return (
    <section className="bg-[#f7f8fb] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Why choose our AI-powered resume builder
        </h2>

        <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl bg-[#eeeeef] px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
              <div className="flex items-start gap-4">
                {it.icon}
                <div>
                  <div className="text-base font-bold text-gray-900">{it.title}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{it.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection({ onCta }: { onCta: () => void }) {
  const steps = [
    { n: '01', icon: '📄', title: 'Upload your CV or create a new one', body: 'Use your current version or start fresh — we’ll help with suggestions and structure.' },
    { n: '02', icon: '✍️', title: 'Enter your personal details', body: 'Fill in your profile, education, skills, and experience — we’ll handle the layout.' },
    { n: '03', icon: '🧩', title: 'Choose any template you like', body: 'Customize the look — fonts, spacing, and colors — while staying ATS-friendly.' },
    { n: '04', icon: '⬇️', title: 'Download your resume', body: 'Save your final draft — the first step in your job search is already done.' },
  ];

  return (
    <section className="bg-[#f7f8fb] pb-14 sm:pb-16 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          4 easy steps to create a resume
        </h2>

        <div className="mt-8 sm:mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-200"
              style={{ transform: 'skewX(-6deg)' }}
            >
              <div style={{ transform: 'skewX(6deg)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <div className="text-5xl font-extrabold tracking-tight text-gray-200">{s.n}</div>
                </div>
                <div className="mt-5 text-sm font-semibold text-gray-900">{s.title}</div>
                <p className="mt-2 text-sm leading-6 text-gray-600">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button onClick={onCta} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Create my resume
          </button>
        </div>
      </div>
    </section>
  );
}

function FAQSection({ onCta }: { onCta: () => void }) {
  const faqs = [
    { q: 'What is CVPro?', a: 'CVPro helps you create clean, ATS-friendly resumes with modern templates and optional AI writing support.' },
    { q: 'How do I create a resume using CVPro?', a: 'Pick a template, add your details, refine with AI suggestions, then export a PDF.' },
    { q: 'Are CVPro templates ATS-friendly?', a: 'Yes — templates are built with clean structure and consistent headings to parse well.' },
    { q: 'Is CVPro available as subscription or one-time purchase?', a: 'This depends on your plan. You can offer either model and keep access inside your account.' },
    { q: 'Should I build my resume from scratch for every job application?', a: 'Keep your structure, but tailor keywords and achievements to match each role for best results.' },
  ];

  return (
    <section className="bg-[#f7f8fb] pb-16 sm:pb-20 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Frequently asked questions
        </h2>

        <div className="mx-auto mt-8 sm:mt-10 max-w-3xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-gray-100 py-3 last:border-b-0">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-gray-400 transition group-open:rotate-45">+</span>
                </div>
              </summary>
              <div className="mt-2 text-sm leading-6 text-gray-600">{f.a}</div>
            </details>
          ))}

          <div className="mt-8 flex justify-center">
            <button onClick={onCta} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              Create my resume
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const CvTemplatesPage: React.FC = () => {
  const { backendUrl, token } = useShopContext() as any;
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const envBackendUrl = processEnv?.NEXT_PUBLIC_BACKEND_URL?.trim() || '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';

  const { data, isLoading, error } = useCvTemplates({ backendUrl: resolvedBackendUrl });
  const apiTemplates = data?.templates ?? [];
  const hasApiTemplates = Boolean(apiTemplates.length);

  const templates: AnyTemplate[] = React.useMemo(() => {
    if (!hasApiTemplates) return templateRegistryList;
    const apiById = new Map(apiTemplates.map((t: any) => [t.id, t]));
    const merged = [...apiTemplates];
    for (const localTemplate of templateRegistryList) {
      if (!apiById.has(localTemplate.id)) merged.push(localTemplate);
    }
    return merged;
  }, [apiTemplates, hasApiTemplates]);

  const router = useRouter();

  const [spotlightOpen, setSpotlightOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<AnyTemplate | null>(null);

  const openSpotlight = React.useCallback((t: AnyTemplate) => {
    setSelectedTemplate(t);
    setSpotlightOpen(true);
  }, []);
  const closeSpotlight = React.useCallback(() => setSpotlightOpen(false), []);

  const continueWithTemplate = React.useCallback(
    (templateId: string) => {
      setSpotlightOpen(false);
      router.push(`/builder/new?templateId=${encodeURIComponent(templateId)}`);
    },
    [router]
  );

  const topCta = React.useCallback(() => {
    if (!token) {
      router.push(`/login?returnTo=${encodeURIComponent('/templates')}`);
      return;
    }
    router.push('/builder/new?templateId=ats-minimal');
  }, [router, token]);

  // Right visuals (responsive: stack on mobile)
  const floatingTemplates = React.useMemo(
    () => pickTemplatesById(templates ?? [], ['ats-minimal', 'modern-sidebar', 'modern-sidebar-blue']),
    [templates]
  );

  const leftHtml = useThumbHtml(floatingTemplates[0]?.id);
  const rightTopHtml = useThumbHtml(floatingTemplates[1]?.id);
  const rightBottomHtml = useThumbHtml(floatingTemplates[2]?.id);

  const carouselTemplates = React.useMemo(
    () =>
      pickTemplatesById(templates ?? [], [
        'modern-sidebar',
        'modern-teal',
        'ats-minimal',
        'modern-sidebar-blue',
        'ats-compact',
        'modern-bold',
        'modern-sidebar',
        'ats-minimal',
      ]),
    [templates]
  );

  const logos = React.useMemo(
    () => [
      { label: 'Costco', src: '/brands/costco.svg' },
      { label: 'Disney', src: '/brands/disney.svg' },
      { label: "McDonald's", src: '/brands/mcdonalds.svg' },
      { label: 'Nestlé', src: '/brands/nestle.svg' },
      { label: 'Netflix', src: '/brands/netflix.svg' },
      { label: 'PepsiCo', src: '/brands/pepsico.svg' },
      { label: 'Walmart', src: '/brands/walmart.svg' },
      { label: 'Amazon', src: '/brands/amazon.svg' },
      { label: 'Costco', src: '/brands/costco.svg' },
      { label: 'Disney', src: '/brands/disney.svg' },
      { label: "McDonald's", src: '/brands/mcdonalds.svg' },
      { label: 'Nestlé', src: '/brands/nestle.svg' },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-gray-900">
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



      {/* Hero */}
      <section className="relative">
        <DotsBg />

        <div className="mx-auto w-full max-w-screen-2xl px-4 pb-8 pt-8 sm:pt-10 lg:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              {error.message} Showing fallback templates so you can continue.
            </div>
          )}

          <div className="grid items-start gap-8 lg:gap-10 lg:grid-cols-2">
            {/* Left */}
            <div className="pt-2 sm:pt-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                Create a job-winning resume in minutes!
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-6 text-gray-600">
                Create an ATS-friendly, professional resume with our AI-powered builder — trusted by recruiters.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={topCta}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                >
                  Improve my resume
                </button>
                <button
                  onClick={topCta}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Create new resume
                </button>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-5 sm:flex sm:gap-10">
                <div>
                  <div className="text-base sm:text-lg font-semibold">1,311</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">resumes created today</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-semibold">×2.2</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">more interview invitations</div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-semibold">+43%</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">higher chance of getting a job</div>
                </div>
              </div>
            </div>

            {/* Right visuals — responsive stacking */}
            <div className="relative">
              {/* Mobile/tablet: show 1 big + 2 below (no absolute overlap) */}
              <div className="grid gap-4 sm:gap-5 hidden sm:block lg:hidden">
                <div
                  className="rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail html={leftHtml ?? undefined} label={floatingTemplates[0]?.name ?? 'Template'} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                    style={{ animation: 'cvpro-float 4.8s ease-in-out infinite', animationDelay: '0.05s' }}
                  >
                    <div className="overflow-hidden rounded-xl">
                      <TemplateThumbnail html={rightTopHtml ?? undefined} label={floatingTemplates[1]?.name ?? 'Template'} />
                    </div>
                  </div>

                  <div
                    className="rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                    style={{ animation: 'cvpro-float 4.8s ease-in-out infinite', animationDelay: '0.1s' }}
                  >
                    <div className="overflow-hidden rounded-xl">
                      <TemplateThumbnail html={rightBottomHtml ?? undefined} label={floatingTemplates[2]?.name ?? 'Template'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop: exact overlapping arrangement */}
              <div className="hidden lg:block">
                <div
                  className="relative w-[380px] max-w-full rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail html={leftHtml ?? undefined} label={floatingTemplates[0]?.name ?? 'Template'} />
                  </div>
                </div>

                <div
                  className="absolute right-0 top-0 w-[270px] rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite', animationDelay: '0.05s' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail html={rightTopHtml ?? undefined} label={floatingTemplates[1]?.name ?? 'Template'} />
                  </div>
                </div>

                <div
                  className="absolute bottom-0 right-10 w-[270px] rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite', animationDelay: '0.1s' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail html={rightBottomHtml ?? undefined} label={floatingTemplates[2]?.name ?? 'Template'} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width logos */}
<div className="w-full bg-[#f7f8fb] pb-10">
  <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
    <div className="text-center text-xs font-semibold text-gray-500">
      Our customers have been hired at<sup>2</sup>
    </div>

    <div className="mt-2 text-center text-[11px] text-gray-400">
      <sup>2</sup> Company names and logos are used for illustrative purposes only.
    </div>
  </div>

  <div className="mt-6 w-full">
    <LogoMarquee items={logos} speedSec={26} />
  </div>
</div>
      </section>

      {/* Full-width testimonials */}
      <section className="w-full bg-[#f7f8fb] pb-12 pt-2">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold">CVPro, as told by our users</h2>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-200">
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { name: 'Clara Schneider', time: '4 hours ago', body: 'Thank you CVPro! I think I’ve never seen resume building this simple.' },
                { name: 'Arthur James', time: '6 hours ago', body: 'I’ve been writing my own resume for too long... this made it so much easier.' },
                { name: 'Emma Novak', time: '12 hours ago', body: 'Amazing service. Easy to use and great templates.' },
              ].map((t) => (
                <div key={t.name} className="rounded-2xl bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="inline-flex size-4 items-center justify-center rounded bg-emerald-500 text-[11px] font-bold text-white">
                            ★
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">{t.name}</div>
                    </div>
                    <div className="text-[11px] text-gray-400">{t.time}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{t.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={topCta} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Create your resume
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Templates carousel */}
      <section className="bg-[#f7f8fb] pb-12 pt-8">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold">
              Resume templates that get you noticed — and hired
            </h2>
          </div>

          <div className="mt-8 rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-200">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading templates…</p>
            ) : carouselTemplates.length > 0 ? (
              <TemplatesCarousel templates={carouselTemplates} onChoose={(t) => openSpotlight(t)} />
            ) : (
              <p className="text-sm text-gray-500">Templates unavailable.</p>
            )}

            <div className="mt-6 flex items-center justify-end">
              <Link href="/templates/all" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                View all templates →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WhyChooseSection />
      <StepsSection onCta={topCta} />
      <FAQSection onCta={topCta} />

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-[#0b1a3a] py-10 text-white">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white">R</span>
                <span>CVPro</span>
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
                Build a clean, ATS-friendly resume with modern templates and a fast editing workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold">Contact Us</div>
                <Link href="/contact" className="text-sm text-white/70 hover:text-white">Support</Link>
                <Link href="/pricing" className="text-sm text-white/70 hover:text-white">Pricing</Link>
                <Link href="/help" className="text-sm text-white/70 hover:text-white">FAQ</Link>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold">Legal</div>
                <Link href="/privacy" className="text-sm text-white/70 hover:text-white">Privacy Policy</Link>
                <Link href="/terms" className="text-sm text-white/70 hover:text-white">Terms &amp; Conditions</Link>
                <Link href="/cookie-policy" className="text-sm text-white/70 hover:text-white">Cookies Policy</Link>
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

      {/* Spotlight modal */}
      <TemplateSpotlightModal
        isOpen={spotlightOpen}
        template={selectedTemplate}
        onClose={() => setSpotlightOpen(false)}
        onContinue={(templateId: string) => {
          setSpotlightOpen(false);
          router.push(`/builder/new?templateId=${encodeURIComponent(templateId)}`);
        }}
      />
    </div>
  );
};

export default CvTemplatesPage;