'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getReturnToFromQuery } from '../lib/returnTo';

function pickParam(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

const CoverLetterPage: React.FC = () => {
  const params = useParams();
  const id = pickParam((params as any)?.id);
  const router = useRouter();
  const { token } = useShopContext() as any;

  useEffect(() => {
    if (!id) router.replace('/cover-letters');
  }, [id, router]);

  useEffect(() => {
    if (!token) {
      const returnTo = getReturnToFromQuery(
        new URLSearchParams({ returnTo: id ? `/cover-letters/${id}` : '/cover-letters' }),
        '/cover-letters',
      );
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [id, router, token]);

  if (!id || !token) return null;

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-darkBg/60">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Cover Letter Draft</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Cover Letter {id}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
          Editor scaffolding is ready for this cover-letter route.
        </p>
      </div>
    </main>
  );
};

export default CoverLetterPage;
