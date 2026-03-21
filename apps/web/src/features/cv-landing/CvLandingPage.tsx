'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useShopContext } from '@cvpro/shared/context';
import { useCvTemplates } from '@cvpro/shared/hooks';
import useTheme from '@cvpro/shared/hooks/useTheme';

import TemplateSpotlightModal from '../../components/cv/TemplateSpotlightModal';
import TemplateThumbnail from '../../components/cv/templates/TemplateThumbnail';
import { templateRegistryList } from '../../templates/registry';

import type { AnyTemplate, LandingVariant } from './types';
import { getLandingCopy, pickTemplatesById, useThumbHtml } from './utils';
import {
  DotsBg,
  FAQSection,
  LandingKeyframes,
  LogoMarquee,
  SiteFooter,
  StepsSection,
  TemplatesCarousel,
  WhyChooseSection,
} from './CvLandingSections';

type Props = {
  variant: LandingVariant;
};

const FEATURED_TEMPLATE_IDS = ['ats-minimal', 'modern-sidebar', 'modern-sidebar-blue'];
const CAROUSEL_TEMPLATE_IDS = [
  'modern-sidebar',
  'modern-teal',
  'ats-minimal',
  'modern-sidebar-blue',
  'ats-compact',
  'modern-bold',
  'modern-sidebar',
  'ats-minimal',
];

const brandLogos = [
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
];

const testimonials = [
  {
    name: 'Clara Schneider',
    time: '4 hours ago',
    body: 'Thank you CVPro! I think I’ve never seen resume building this simple.',
  },
  {
    name: 'Arthur James',
    time: '6 hours ago',
    body: 'I’ve been writing my own resume for too long... this made it so much easier.',
  },
  {
    name: 'Emma Novak',
    time: '12 hours ago',
    body: 'Amazing service. Easy to use and great templates.',
  },
];

const surfaceClass =
  'bg-white/92 ring-1 ring-slate-200/80 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[#0B1220]/88 dark:ring-white/10 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]';

const panelClass =
  'rounded-3xl border border-slate-200/80 bg-white/92 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]';

const softPanelClass =
  'rounded-2xl border border-slate-200/80 bg-slate-50/95 shadow-sm dark:border-white/10 dark:bg-white/5';

const primaryButtonClass =
  'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:shadow-[0_10px_24px_rgba(37,99,235,0.35)] dark:hover:bg-blue-400';

const secondaryButtonClass =
  'rounded-xl border border-blue-200 bg-white/95 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-400/30 dark:bg-white/5 dark:text-blue-100 dark:hover:bg-white/10';

const CvLandingPage: React.FC<Props> = ({ variant }) => {
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const envBackendUrl = processEnv?.NEXT_PUBLIC_BACKEND_URL?.trim() || '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';
  const router = useRouter();

  const { data, isLoading, error } = useCvTemplates({ backendUrl: resolvedBackendUrl });
  const apiTemplates = data?.templates ?? [];
  const hasApiTemplates = Boolean(apiTemplates.length);

  const templates: AnyTemplate[] = React.useMemo(() => {
    if (!hasApiTemplates) return templateRegistryList;

    const apiById = new Map(apiTemplates.map((template) => [template.id, template]));
    const merged = [...apiTemplates];

    for (const localTemplate of templateRegistryList) {
      if (!apiById.has(localTemplate.id)) merged.push(localTemplate);
    }

    return merged;
  }, [apiTemplates, hasApiTemplates]);

  const [spotlightOpen, setSpotlightOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<AnyTemplate | null>(null);

  const returnTo = variant === 'home' ? '/' : '/templates';

  const routeWithAuth = React.useCallback(
    (destination: string, unauthenticatedReturnTo = returnTo) => {
      if (!token) {
        router.push(`/login?returnTo=${encodeURIComponent(unauthenticatedReturnTo)}`);
        return;
      }
      router.push(destination);
    },
    [returnTo, router, token]
  );

  const createNewResume = React.useCallback(() => {
    routeWithAuth('/builder/new?templateId=ats-minimal');
  }, [routeWithAuth]);

  const improveResume = React.useCallback(() => {
    routeWithAuth('/builder', '/builder');
  }, [routeWithAuth]);

  const openSpotlight = React.useCallback((template: AnyTemplate) => {
    setSelectedTemplate(template);
    setSpotlightOpen(true);
  }, []);

  const floatingTemplates = React.useMemo(
    () => pickTemplatesById(templates ?? [], FEATURED_TEMPLATE_IDS),
    [templates]
  );

  const leftHtml = useThumbHtml(floatingTemplates[0]?.id);
  const rightTopHtml = useThumbHtml(floatingTemplates[1]?.id);
  const rightBottomHtml = useThumbHtml(floatingTemplates[2]?.id);

  const carouselTemplates = React.useMemo(
    () => pickTemplatesById(templates ?? [], CAROUSEL_TEMPLATE_IDS),
    [templates]
  );

  const copy = getLandingCopy(variant);

  return (
    <div className="min-h-screen bg-site text-slate-900 transition-colors dark:text-white">
      <LandingKeyframes />

      <section className="relative overflow-hidden">
        <DotsBg isDark={isDark} />

        <div className="mx-auto w-full max-w-screen-2xl px-4 pb-8 pt-8 sm:pt-10 lg:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-xs text-rose-800 shadow-sm dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-200">
              {error.message} Showing fallback templates so you can continue.
            </div>
          )}

          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="pt-2 sm:pt-4">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
                {copy.title}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                {copy.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={improveResume} className={secondaryButtonClass}>
                  Improve my resume
                </button>

                <button onClick={createNewResume} className={primaryButtonClass}>
                  Create new resume
                </button>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-4 sm:flex sm:gap-10">
                {[
                  { value: '1,311', label: 'resumes created today' },
                  { value: '×2.2', label: 'more interview invitations' },
                  { value: '+43%', label: 'higher chance of getting a job' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl px-3 py-2 sm:px-0 sm:py-0">
                    <div className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                      {item.value}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="hidden gap-4 sm:block lg:hidden">
                <div
                  className={`rounded-2xl p-3 ${surfaceClass}`}
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail
                      html={leftHtml ?? undefined}
                      label={floatingTemplates[0]?.name ?? 'Template'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`rounded-2xl p-3 ${surfaceClass}`}
                    style={{
                      animation: 'cvpro-float 4.8s ease-in-out infinite',
                      animationDelay: '0.05s',
                    }}
                  >
                    <div className="overflow-hidden rounded-xl">
                      <TemplateThumbnail
                        html={rightTopHtml ?? undefined}
                        label={floatingTemplates[1]?.name ?? 'Template'}
                      />
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl p-3 ${surfaceClass}`}
                    style={{
                      animation: 'cvpro-float 4.8s ease-in-out infinite',
                      animationDelay: '0.1s',
                    }}
                  >
                    <div className="overflow-hidden rounded-xl">
                      <TemplateThumbnail
                        html={rightBottomHtml ?? undefined}
                        label={floatingTemplates[2]?.name ?? 'Template'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
                <div
                  className={`relative w-[380px] max-w-full rounded-2xl p-3 ${surfaceClass}`}
                  style={{ animation: 'cvpro-float 4.8s ease-in-out infinite' }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail
                      html={leftHtml ?? undefined}
                      label={floatingTemplates[0]?.name ?? 'Template'}
                    />
                  </div>
                </div>

                <div
                  className={`absolute right-0 top-0 w-[270px] rounded-2xl p-3 ${surfaceClass}`}
                  style={{
                    animation: 'cvpro-float 4.8s ease-in-out infinite',
                    animationDelay: '0.05s',
                  }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail
                      html={rightTopHtml ?? undefined}
                      label={floatingTemplates[1]?.name ?? 'Template'}
                    />
                  </div>
                </div>

                <div
                  className={`absolute bottom-0 right-10 w-[270px] rounded-2xl p-3 ${surfaceClass}`}
                  style={{
                    animation: 'cvpro-float 4.8s ease-in-out infinite',
                    animationDelay: '0.1s',
                  }}
                >
                  <div className="overflow-hidden rounded-xl">
                    <TemplateThumbnail
                      html={rightBottomHtml ?? undefined}
                      label={floatingTemplates[2]?.name ?? 'Template'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-site pb-10 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
            <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-300">
              Our customers have been hired at<sup>1</sup>
            </div>
            <div className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              <sup>1</sup> Company names and logos are used for illustrative purposes only.
            </div>
          </div>

          <div className="mt-6 w-full">
            <LogoMarquee items={brandLogos} speedSec={26} />
          </div>
        </div>
      </section>

      <section className="w-full bg-site pb-12 pt-2 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
              CVPro, as told by our users
            </h2>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-screen-2xl px-4 lg:px-8">
          <div className={`${panelClass} p-5 sm:p-6`}>
            <div className="grid gap-4 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className={`${softPanelClass} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className="inline-flex size-4 items-center justify-center rounded bg-emerald-500 text-[11px] font-bold text-white"
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {t.name}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{t.time}</div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {t.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={createNewResume} className={primaryButtonClass}>
                Create your resume
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-site pb-12 pt-8 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
              Resume templates that get you noticed — and hired
            </h2>
          </div>

          <div className={`mt-8 ${panelClass} p-5 sm:p-6`}>
            {isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">Loading templates…</p>
            ) : carouselTemplates.length > 0 ? (
              <TemplatesCarousel templates={carouselTemplates} onChoose={openSpotlight} />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">Templates unavailable.</p>
            )}

            <div className="mt-6 flex items-center justify-end">
              <Link
                href="/templates/all"
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              >
                View all templates →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WhyChooseSection />
      <StepsSection onCta={createNewResume} />
      <FAQSection onCta={createNewResume} />
      <SiteFooter />

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

export default CvLandingPage;