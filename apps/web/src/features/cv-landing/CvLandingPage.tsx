'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useShopContext } from '@cvpro/shared/context';
import { useCvTemplates } from '@cvpro/shared/hooks';

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

const CvLandingPage: React.FC<Props> = ({ variant }) => {
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };
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
    <div className="min-h-screen bg-site text-gray-900">
      <LandingKeyframes />

      <section className="relative">
        <DotsBg />

        <div className="mx-auto w-full max-w-screen-2xl px-4 pb-8 pt-8 sm:pt-10 lg:px-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              {error.message} Showing fallback templates so you can continue.
            </div>
          )}

          <div className="grid items-start gap-8 lg:gap-10 lg:grid-cols-2">
            <div className="pt-2 sm:pt-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-6 text-gray-600">
                {copy.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={improveResume}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                >
                  Improve my resume
                </button>
                <button
                  onClick={createNewResume}
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
                  <div className="text-[11px] sm:text-xs text-gray-500">
                    more interview invitations
                  </div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-semibold">+43%</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">
                    higher chance of getting a job
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4 sm:gap-5 hidden sm:block lg:hidden">
                <div
                  className="rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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
                    className="rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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
                    className="rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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
                  className="relative w-[380px] max-w-full rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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
                  className="absolute right-0 top-0 w-[270px] rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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
                  className="absolute bottom-0 right-10 w-[270px] rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] ring-1 ring-gray-200"
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

        <div className="w-full bg-site pb-10">
          <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
            <div className="text-center text-xs font-semibold text-gray-500">
              Our customers have been hired at<sup>1</sup>
            </div>
            <div className="mt-2 text-center text-[11px] text-gray-400">
              <sup>1</sup> Company names and logos are used for illustrative purposes only.
            </div>
          </div>
          <div className="mt-6 w-full">
            <LogoMarquee items={brandLogos} speedSec={26} />
          </div>
        </div>
      </section>

      <section className="w-full bg-site pb-12 pt-2">
        <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold">CVPro, as told by our users</h2>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-screen-2xl px-4 lg:px-8">
          <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-200">
            <div className="grid gap-4 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-2xl bg-gray-50 p-5">
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
                      <div className="mt-2 text-sm font-semibold text-gray-900">{t.name}</div>
                    </div>
                    <div className="text-[11px] text-gray-400">{t.time}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{t.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={createNewResume}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Create your resume
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-site pb-12 pt-8">
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
              <TemplatesCarousel templates={carouselTemplates} onChoose={openSpotlight} />
            ) : (
              <p className="text-sm text-gray-500">Templates unavailable.</p>
            )}
            <div className="mt-6 flex items-center justify-end">
              <Link
                href="/templates/all"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
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
