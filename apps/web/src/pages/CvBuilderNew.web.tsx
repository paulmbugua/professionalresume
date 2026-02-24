'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCvDraft } from '@cvpro/shared/hooks';
import { getReturnToFromQuery } from '../lib/returnTo';

const CvBuilderNew: React.FC = () => {
  const params = useSearchParams();
  const templateId = params?.get('templateId') ?? null;

  const router = useRouter();
  const { backendUrl, token } = useShopContext() as any;

  const createDraft = useCreateCvDraft({ backendUrl, token });

  const [status, setStatus] = useState<string>('Preparing your CV workspace...');

  // Create once per templateId
  const startedForTemplateRef = useRef<string | null>(null);

  // If template changes, allow create again
  useEffect(() => {
    startedForTemplateRef.current = null;
  }, [templateId]);

  useEffect(() => {
    if (!templateId) {
      router.replace('/templates');
      return;
    }

    // Wait for backendUrl to exist (common in context hydration)
    if (!backendUrl) {
      setStatus('Loading configuration...');
      return;
    }

    // If not logged in, go to login
    if (!token) {
      const returnTo = getReturnToFromQuery(
        new URLSearchParams({ returnTo: `/builder/new?templateId=${templateId}` }),
        '/builder'
      );
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    // Prevent duplicate creates
    if (startedForTemplateRef.current === templateId) return;
    startedForTemplateRef.current = templateId;

    let cancelled = false;
    setStatus('Creating your draft...');

    (async () => {
      try {
        // Helpful dev log
        console.log('[CvBuilderNew] creating draft', { templateId, backendUrl });

        const draft = await createDraft.mutateAsync({ templateId, title: 'Untitled CV' });

        if (cancelled) return;

        console.log('[CvBuilderNew] created draft', { id: draft?.id });
        setStatus('Opening editor...');

        router.replace(`/builder/${draft.id}`);
      } catch (e: any) {
        console.error('[CvBuilderNew] create failed', e);
        if (cancelled) return;
        setStatus(e?.message ? `Failed: ${e.message}` : 'Failed to create draft. Redirecting...');
        // fallback
        router.replace('/templates');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Do NOT include createDraft as a dependency (unstable object)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, token, backendUrl, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-lg items-center justify-center px-4 py-12 text-center">
      <div>
        <p className="text-sm text-gray-500">{status}</p>
        <p className="mt-2 text-xs text-gray-400">
          {templateId ? `Template: ${templateId}` : 'No template selected'}
        </p>
      </div>
    </div>
  );
};

export default CvBuilderNew;