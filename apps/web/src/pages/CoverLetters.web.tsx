'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import {
  useMyCoverLetterDrafts,
  useDeleteCoverLetterDraft,
  useCreateCoverLetterDraft,
} from '@cvpro/shared/hooks';

const CoverLettersPage: React.FC = () => {
  const router = useRouter();
  const { token, backendUrl } = useShopContext() as any;
  const { data: drafts = [], isLoading, error } = useMyCoverLetterDrafts({ backendUrl, token });
  const deleteDraft = useDeleteCoverLetterDraft({ backendUrl, token });
  const createDraft = useCreateCoverLetterDraft({ backendUrl, token });

  useEffect(() => {
    if (!token) {
      router.replace(`/login?returnTo=${encodeURIComponent('/cover-letters')}`);
    }
  }, [router, token]);

  const duplicateDraft = async (draft: any) => {
    const duplicated = await createDraft.mutateAsync({
      templateId: draft.templateId || 'classic-letter',
      title: `${draft.title || 'Untitled Cover Letter'} (Copy)`,
      data: draft,
    });

    router.push(`/cover-letters/editor/${duplicated.id}`);
  };

  if (!token) return null;

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-10 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-darkBg/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Cover Letters</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
              My Cover Letter Library
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
              Manage your saved drafts, continue editing, or start with a new template design.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cover-letters/templates"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Explore Designs
            </Link>
            <Link
              href="/cover-letters/new"
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              New Cover Letter
            </Link>
          </div>
        </div>

        {isLoading ? <p className="mt-8 text-sm text-slate-500">Loading drafts…</p> : null}
        {error ? <p className="mt-8 text-sm text-rose-500">{error.message}</p> : null}

        {!isLoading && !error && drafts.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-white/20">
            <p className="text-sm text-slate-600 dark:text-white/70">No cover letters yet.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link href="/cover-letters/templates" className="text-sm font-semibold text-primary">
                Explore Designs
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/cover-letters/new" className="text-sm font-semibold text-primary">
                Create your first cover letter
              </Link>
            </div>
          </div>
        ) : null}

        {drafts.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft: any) => (
              <article
                key={draft.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {draft.title || 'Untitled Cover Letter'}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                  Updated {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'just now'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                  Template: {draft.templateId || 'classic-letter'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/cover-letters/editor/${draft.id}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Continue Editing
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicateDraft(draft)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:text-white"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDraft.mutate(draft.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default CoverLettersPage;
