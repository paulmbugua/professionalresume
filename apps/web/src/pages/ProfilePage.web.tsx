'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCvDrafts, useDeleteCvDraft, useCreateCvDraft, useExportCv } from '@cvpro/shared/hooks';
import TemplateThumbnail from '../components/cv/templates/TemplateThumbnail';
import { templateRegistryById } from '../templates/registry';
import { normalizeDraft } from '../utils/cvDefaults';

const ProfilePage: React.FC = () => {
  const { backendUrl, token, user } = useShopContext() as any;
  const router = useRouter();
  const { data: drafts = [], isLoading } = useCvDrafts({ backendUrl, token });
  const del = useDeleteCvDraft({ backendUrl, token });
  const create = useCreateCvDraft({ backendUrl, token });
  const exp = useExportCv({ backendUrl, token });

  React.useEffect(() => {
    if (!token) router.replace(`/login?returnTo=${encodeURIComponent('/profile')}`);
  }, [router, token]);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 lg:px-8">
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">My Profile</p>
        <h1 className="text-2xl font-semibold text-gray-900">{user?.name || 'CV Builder User'}</h1>
        <p className="text-sm text-gray-500">{user?.email || 'Signed in'}</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">My CVs</h2>
        <Link href="/templates" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">New CV</Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading drafts...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => {
          const normalized = normalizeDraft(draft as any);
          const html = templateRegistryById[draft.templateId]?.renderHtml?.(normalized as any);
          return (
            <div key={draft.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <TemplateThumbnail html={html} label={draft.title || 'CV'} />
              <h3 className="mt-3 text-base font-semibold">{draft.title || 'Untitled CV'}</h3>
              <p className="text-xs text-gray-500">{draft.templateId} • {new Date(draft.updatedAt).toLocaleString()}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Link href={`/builder/${draft.id}`} className="rounded border px-2 py-1 text-center">Continue</Link>
                <button className="rounded border px-2 py-1" onClick={async () => {
                  const out = await exp.mutateAsync({ draftId: draft.id, cvJson: draft });
                  const url = out.signedUrl || out.url;
                  if (url) window.open(url, '_blank');
                }}>Export</button>
                <button className="rounded border px-2 py-1" onClick={async () => {
                  const clone = { ...draft, id: undefined, createdAt: undefined, updatedAt: undefined, version: undefined, title: `${draft.title || 'Untitled CV'} (Copy)` } as any;
                  const created = await create.mutateAsync({ templateId: draft.templateId, title: clone.title, data: clone });
                  router.push(`/builder/${created.id}`);
                }}>Duplicate</button>
                <button className="rounded border border-rose-200 px-2 py-1 text-rose-600" onClick={() => del.mutate(draft.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfilePage;
