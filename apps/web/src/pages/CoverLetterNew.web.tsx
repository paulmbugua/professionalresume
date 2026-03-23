'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCoverLetterDraft } from '@cvpro/shared/hooks';

const CoverLetterNewPage: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { token, backendUrl } = useShopContext() as any;
  const createDraft = useCreateCoverLetterDraft({
    backendUrl: backendUrl || '',
    token: token || '',
  });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      router.replace(`/login?returnTo=${encodeURIComponent('/cover-letters/new')}`);
      return;
    }

    if (!backendUrl) return;

    if (startedRef.current) return;
    startedRef.current = true;

    const templateId = params?.get('templateId') || 'classic-letter';

    createDraft
      .mutateAsync({
        templateKey: templateId,
        title: 'Untitled Cover Letter',
        data: {
          applicantName: '',
          applicantEmail: '',
          applicantPhone: '',
          applicantLocation: '',
          recipientName: '',
          companyName: '',
          roleTitle: '',
          letterBody: '',
          closingLine: '',
        },
      })
      .then((created) => {
        router.replace(`/cover-letters/editor/${created.id}`);
      })
      .catch(() => {
        router.replace('/cover-letters/templates');
      });
  }, [backendUrl, createDraft, params, router, token]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-lg items-center justify-center px-4 py-12 text-center">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Preparing your cover letter workspace...
      </p>
    </div>
  );
};

export default CoverLetterNewPage;
