"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvTemplates } from '@mytutorapp/shared/hooks';
import TemplateGallery from '../../components/cv/TemplateGallery';

export default function TemplatesPage() {
  const { backendUrl } = useShopContext() as any;
  const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';
  const { data: templates = [], isLoading, error } = useCvTemplates({
    backendUrl: resolvedBackendUrl,
  });
  const router = useRouter();
  const isDev = process.env.NODE_ENV !== 'production';

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
      {error && <p className="text-sm text-rose-500">{error.message}</p>}
      {!isLoading && !error && templates.length === 0 && (
        <p className="text-sm text-gray-500">
          No templates found. Add templates in the backend to get started.
        </p>
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
