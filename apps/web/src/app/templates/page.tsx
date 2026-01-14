"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvTemplates } from '@mytutorapp/shared/hooks';
import TemplateGallery from '../../components/cv/TemplateGallery';

export default function TemplatesPage() {
  const { backendUrl } = useShopContext() as any;
  const { data: templates = [], isLoading, error } = useCvTemplates({ backendUrl });
  const router = useRouter();

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
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading templates...</p>}
      {error && <p className="text-sm text-rose-500">{error.message}</p>}

      {templates.length > 0 && (
        <TemplateGallery
          templates={templates}
          onSelect={(template) => router.push(`/builder/new?templateId=${template.id}`)}
        />
      )}
    </div>
  );
}
