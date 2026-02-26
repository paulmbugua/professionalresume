'use client';

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

const CvTopNav: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-darkBg/80">
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="size-2 rounded-full bg-primary" />
          CVPro
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/builder/new?templateId=ats-minimal" className="text-gray-700 hover:text-primary dark:text-white/80">
            CV Builder
          </Link>
          <Link href="/templates" className="text-gray-700 hover:text-primary dark:text-white/80">
            Templates
          </Link>
          <Link href="/builder" className="text-gray-700 hover:text-primary dark:text-white/80">
            Drafts
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white"
          >
            <User className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default CvTopNav;
