'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getReturnToFromQuery } from '../lib/returnTo';

const CoverLettersPage: React.FC = () => {
  const router = useRouter();
  const { token } = useShopContext() as any;

  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(new URLSearchParams({ returnTo: '/cover-letters' }), '/cover-letters');
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [router, token]);

  if (!token) return null;

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-darkBg/60">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Cover Letters</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">My Cover Letters</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
          Create and manage targeted cover letters for each application.
        </p>
        <div className="mt-6">
          <Link
            href="/cover-letters/new"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            New Cover Letter
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CoverLettersPage;
