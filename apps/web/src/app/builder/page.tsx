"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvDrafts, useDeleteCvDraft } from '@mytutorapp/shared/hooks';
import { getReturnToFromQuery } from '../../lib/returnTo';

export default function DraftsPage() {
  const { backendUrl, token } = useShopContext() as any;
  const router = useRouter();
  React.useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(new URLSearchParams({ returnTo: '/builder' }), '/builder');
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [router, token]);
  const { data: drafts = [], isLoading, error } = useCvDrafts({ backendUrl, token });
  const deleteDraft = useDeleteCvDraft({ backendUrl, token });

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">My Drafts</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Continue editing</h2>
          <p className="text-sm text-gray-500 dark:text-white/60">
            Access your saved CV drafts and keep refining them.
          </p>
        </div>
        <Link
          href="/templates"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          New draft
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading drafts...</p>}
      {error && <p className="text-sm text-rose-500">{error.message}</p>}

      {drafts.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          <p className="text-base font-semibold text-gray-900 dark:text-white">No drafts yet</p>
          <p className="mt-2">Pick a template to start your first CV.</p>
          <Link
            href="/templates"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Browse templates
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
            <Link href={`/builder/${draft.id}`} className="block">
              <p className="text-xs uppercase text-gray-400">{draft.templateId}</p>
              <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{draft.title || 'Untitled CV'}</h3>
              <p className="text-xs text-gray-500 dark:text-white/60">Updated {new Date(draft.updatedAt).toLocaleString()}</p>
            </Link>
            <button type="button" onClick={() => deleteDraft.mutate(draft.id)} className="mt-3 text-xs font-semibold text-rose-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
