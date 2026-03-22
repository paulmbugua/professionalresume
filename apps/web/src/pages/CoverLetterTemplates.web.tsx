'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvTemplates } from '@cvpro/shared/hooks';
import type { CvTemplate } from '@cvpro/shared/types';

import TemplateThumbnail from '../components/cv/templates/TemplateThumbnail';
import { demoResume } from '../templates/demoResume';
import { templateRegistryById, templateRegistryList } from '../templates/registry';
import { normalizeDraft } from '../utils/cvDefaults';

const CoverLetterTemplatesPage: React.FC = () => {
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };

  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const envBackendUrl = processEnv?.NEXT_PUBLIC_BACKEND_URL?.trim() || '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';

  const { data, isLoading, error } = useCvTemplates({ backendUrl: resolvedBackendUrl });

  const templates: CvTemplate[] = useMemo(() => {
    const apiTemplates = data?.templates ?? [];
    if (!apiTemplates.length) return templateRegistryList;

    const byId = new Map(apiTemplates.map((template) => [template.id, template]));
    const merged = [...apiTemplates];

    for (const localTemplate of templateRegistryList) {
      if (!byId.has(localTemplate.id)) merged.push(localTemplate);
    }

    return merged;
  }, [data?.templates]);

  const routeWithAuth = React.useCallback(
    (destination: string) => {
      if (!token) {
        router.push(`/login?returnTo=${encodeURIComponent(destination)}`);
        return;
      }
      router.push(destination);
    },
    [router, token]
  );

  const cardPreviewHtml = React.useMemo(() => {
    const htmlById = new Map<string, string | undefined>();
    for (const template of templates) {
      const previewDraft = normalizeDraft({ ...demoResume, templateId: template.id });
      const html = templateRegistryById[template.id]?.renderHtml?.(previewDraft);
      htmlById.set(template.id, html || undefined);
    }
    return htmlById;
  }, [templates]);

  return (
    <main className="min-h-screen bg-site pb-12 pt-8 text-slate-900 dark:text-white">
      <section className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            Cover letter templates
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pick a cover letter layout and start in seconds
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Browse professionally styled templates, then launch your draft from scratch or kick things
            off with AI writing support.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-200">
            {error.message} Showing fallback templates so you can keep going.
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`cover-template-skeleton-${index}`}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="h-[440px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
                  <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
                  <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-white/10" />
                </div>
              ))
            : templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                >
                  <TemplateThumbnail html={cardPreviewHtml.get(template.id)} label={template.name} />

                  <div className="mt-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-white/60">
                      {template.description?.trim() ||
                        'Designed for clear, compelling cover letters that read well and look polished.'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        routeWithAuth(`/builder/new?templateId=${encodeURIComponent(template.id)}`)
                      }
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
                    >
                      Start from scratch
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        routeWithAuth(
                          `/builder/new?templateId=${encodeURIComponent(template.id)}&aiStart=1`
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      AI-assisted start
                    </button>
                  </div>
                </article>
              ))}
        </div>
      </section>
    </main>
  );
};

export default CoverLetterTemplatesPage;
