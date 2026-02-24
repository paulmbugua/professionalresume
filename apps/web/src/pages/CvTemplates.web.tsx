'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvTemplates } from '@cvpro/shared/hooks';
import TemplateGallery from '../components/cv/TemplateGallery';
import { templateRegistryList } from '../templates/registry';

const CvTemplatesPage: React.FC = () => {
  const { backendUrl, token } = useShopContext() as any;
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const envBackendUrl = processEnv?.NEXT_PUBLIC_BACKEND_URL?.trim() || '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';
  const { data, isLoading, error } = useCvTemplates({ backendUrl: resolvedBackendUrl });
  const apiTemplates = data?.templates ?? [];
  const hasApiTemplates = Boolean(apiTemplates.length);
  const templates = hasApiTemplates ? apiTemplates : templateRegistryList;
  const usingFallback = !isLoading && (!hasApiTemplates || error);
  const templateSource = data?.source ?? (usingFallback ? 'local' : 'db');
  const isDev = processEnv?.NODE_ENV !== 'production';
  const router = useRouter();

  React.useEffect(() => {
    if (isDev && usingFallback) {
      console.warn('[CvTemplates] Using local template registry fallback.', {
        backendUrl: resolvedBackendUrl,
        apiTemplates: data?.templates?.length ?? 0,
        error: error?.message,
      });
    }
  }, [data?.templates?.length, error, isDev, usingFallback, resolvedBackendUrl]);

  React.useEffect(() => {
    if (!token) router.replace(`/login?returnTo=${encodeURIComponent('/templates')}`);
  }, [router, token]);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Template Gallery</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Choose a CV template</h2>
          <p className="text-sm text-gray-500 dark:text-white/60">ATS-friendly layouts with premium typography.</p>
          {isDev && <p className="mt-2 text-xs text-gray-400">Backend: {resolvedBackendUrl}</p>}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading templates...</p>}
      {error && <p className="text-sm text-rose-500">{error.message} Showing local templates so you can continue.</p>}
      {usingFallback && templates.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Using local templates (API unavailable).
          {isDev && <span className="ml-2 text-[11px] uppercase">Source: {templateSource}</span>}
        </div>
      )}

      {templates.length > 0 && (
        <TemplateGallery templates={templates} onSelect={(template) => router.push(`/builder/new?templateId=${template.id}`)} />
      )}
    </div>
  );
};

export default CvTemplatesPage;
