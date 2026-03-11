'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCvDraft } from '@cvpro/shared/hooks';
import { getReturnToFromQuery } from '../lib/returnTo';

const CvBuilderNew: React.FC = () => {
  const params = useSearchParams();
  const templateId = params?.get('templateId')?.trim() || 'ats-minimal';
  const importFromUpload = params?.get('importFrom') === 'upload';

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
        let importedData: any | undefined;
        if (importFromUpload && typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem('cvpro:imported-draft');
          if (raw) {
            importedData = JSON.parse(raw);
            window.sessionStorage.removeItem('cvpro:imported-draft');
          }
        }

        // Helpful dev log
        console.log('[CvBuilderNew] creating draft', { templateId, backendUrl, imported: Boolean(importedData) });

        const draft = await createDraft.mutateAsync({
          templateId,
          title: 'Untitled CV',
          ...(importedData ? { data: importedData } : {}),
        });

        if (cancelled) return;

        console.log('[CvBuilderNew] created draft', { id: draft?.id });
        setStatus('Opening editor...');

        router.replace(`/builder/${draft.id}`);
      } catch (e: any) {
        console.error('[CvBuilderNew] create failed', e);
        if (cancelled) return;

        // Fallback for APIs that don't yet accept newly added template IDs.
        try {
          setStatus('Preparing workspace...');
          const fallbackDraft = await createDraft.mutateAsync({
            templateId: 'ats-minimal',
            title: 'Untitled CV',
            data: { templateId },
          });

          if (cancelled) return;
          router.replace(
            `/builder/${fallbackDraft.id}?templateId=${encodeURIComponent(templateId)}`
          );
          return;
        } catch (fallbackError) {
          console.error('[CvBuilderNew] fallback create failed', fallbackError);
        }

        setStatus(e?.message ? `Failed: ${e.message}` : 'Failed to create draft. Redirecting...');
        router.replace('/templates');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Do NOT include createDraft as a dependency (unstable object)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, importFromUpload, token, backendUrl, router]);

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
