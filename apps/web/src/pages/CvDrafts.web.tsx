'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvDrafts, useDeleteCvDraft } from '@cvpro/shared/hooks';

const CvDraftsPage: React.FC = () => {
  const { backendUrl, token } = useShopContext() as any;
  const router = useRouter();

  React.useEffect(() => {
    if (!token) router.replace(`/login?returnTo=${encodeURIComponent('/builder')}`);
  }, [router, token]);

  const { data: drafts = [], isLoading, error } = useCvDrafts({ backendUrl, token });
  const deleteDraft = useDeleteCvDraft({ backendUrl, token });

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">My Drafts</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Continue editing</h2>
          <p className="text-sm text-gray-500 dark:text-white/60">Access your saved CV drafts.</p>
        </div>
        <Link href="/templates" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">New draft</Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading drafts...</p>}
      {error && <p className="text-sm text-rose-500">{error.message}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <Link href={`/builder/${draft.id}`} className="block">
              <h3 className="text-lg font-semibold text-gray-900">{draft.title || 'Untitled CV'}</h3>
              <p className="mt-2 text-xs text-gray-500">Updated {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'just now'}</p>
            </Link>
            <button
              type="button"
              onClick={() => deleteDraft.mutate(draft.id)}
              className="mt-4 rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CvDraftsPage;
