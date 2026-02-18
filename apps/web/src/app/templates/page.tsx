"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvTemplates } from '@mytutorapp/shared/hooks';
import TemplateGallery from '../../components/cv/TemplateGallery';
import { templateRegistryList } from '../../templates/registry';

export default function TemplatesPage() {
  const { backendUrl, token } = useShopContext() as any;
  const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';
  const { data, isLoading, error } = useCvTemplates({
    backendUrl: resolvedBackendUrl,
  });
  const router = useRouter();
  const isDev = process.env.NODE_ENV !== 'production';
  const apiTemplates = data?.templates ?? [];
  const hasApiTemplates = Boolean(apiTemplates.length);
  const templates = hasApiTemplates ? apiTemplates : templateRegistryList;
  const usingFallback = !isLoading && (!hasApiTemplates || error);
  const templateSource = data?.source ?? (usingFallback ? 'local' : 'db');
  const showFallbackBanner = usingFallback && templates.length > 0;

  React.useEffect(() => {
    if (!token) {
      router.replace('/login?returnTo=' + encodeURIComponent('/templates'));
    }
  }, [router, token]);


  React.useEffect(() => {
    if (isDev && usingFallback) {
      console.warn('[TemplatesPage] Using local template registry fallback.', {
        backendUrl: resolvedBackendUrl,
        apiTemplates: data?.templates?.length ?? 0,
        error: error?.message,
      });
    }
  }, [data?.templates?.length, error, isDev, usingFallback, resolvedBackendUrl]);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Template Gallery</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Choose a CV template
          </h2>
          <p className="text-sm text-gray-500 dark:text-white/60">
            ATS-friendly layouts with premium typography.
          </p>
          {isDev && (
            <p className="mt-2 text-xs text-gray-400">Backend: {resolvedBackendUrl}</p>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading templates...</p>}
      {error && (
        <p className="text-sm text-rose-500">
          {error.message} Showing local templates so you can continue.
        </p>
      )}
      {showFallbackBanner && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Using local templates (API unavailable).
          {isDev && <span className="ml-2 text-[11px] uppercase">Source: {templateSource}</span>}
        </div>
      )}
      {!isLoading && templates.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-800">No templates available.</p>
          <p className="mt-1 text-xs text-gray-500">
            Please reload or check the backend configuration.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white"
          >
            Reload
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <TemplateGallery
          templates={templates}
          onSelect={(template) => router.push(`/builder/new?templateId=${template.id}`)}
        />
      )}
    </div>
  );
}
