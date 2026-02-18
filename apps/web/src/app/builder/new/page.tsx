"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCreateCvDraft } from '@mytutorapp/shared/hooks';

export default function NewBuilderPage() {
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId');
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as any;
  const createDraft = useCreateCvDraft({ backendUrl, token });

  useEffect(() => {
    if (!templateId) {
      router.replace('/templates');
      return;
    }
    if (!token) {
      router.replace('/login?returnTo=' + encodeURIComponent(`/builder/new?templateId=${templateId}`));
      return;
    }

    createDraft
      .mutateAsync({ templateId, title: 'Untitled CV' })
      .then((draft) => router.replace(`/builder/${draft.id}`))
      .catch(() => router.replace('/templates'));
  }, [templateId, token, router, createDraft]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-lg items-center justify-center px-4 py-12 text-center">
      <div>
        <p className="text-sm text-gray-500">Preparing your CV workspace...</p>
      </div>
    </div>
  );
}
