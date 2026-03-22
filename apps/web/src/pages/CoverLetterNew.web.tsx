'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getReturnToFromQuery } from '../lib/returnTo';

const CoverLetterNewPage: React.FC = () => {
  const router = useRouter();
  const { token } = useShopContext() as any;

  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(new URLSearchParams({ returnTo: '/cover-letters/new' }), '/cover-letters');
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    const generatedId = `draft-${Date.now()}`;
    router.replace(`/cover-letters/${generatedId}`);
  }, [router, token]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-lg items-center justify-center px-4 py-12 text-center">
      <p className="text-sm text-gray-500">Preparing your cover letter workspace...</p>
    </div>
  );
};

export default CoverLetterNewPage;
