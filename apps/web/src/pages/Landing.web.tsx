'use client';

import React from 'react';
import Link from 'next/link';
import { useShopContext } from '@mytutorapp/shared/context';
import { useMyCvDrafts } from '@mytutorapp/shared/hooks';

const Landing: React.FC = () => {
  const { token, backendUrl } = useShopContext() as any;
  const { data: drafts = [] } = useMyCvDrafts({ backendUrl, token });
  const hasDrafts = drafts.length > 0;

  return (
    <div className="bg-softGray dark:bg-darkBg">
      <section className="mx-auto flex w-full max-w-screen-2xl flex-col gap-10 px-4 pb-16 pt-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">CVPro Builder</p>
          <h1 className="text-4xl font-semibold leading-tight text-gray-900 dark:text-white sm:text-5xl">Build a premium CV with live previews, smart layouts, and AI assistance.</h1>
          <p className="text-base text-gray-600 dark:text-white/70">Choose from modern templates, edit in a clean workspace, and export print-ready CVs with perfect A4 formatting.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/templates" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white">Choose a template</Link>
            {token && hasDrafts && <Link href="/builder" className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">Continue editing</Link>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
