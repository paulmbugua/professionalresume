'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Moon, Sun, User } from 'lucide-react';
import useTheme from '@cvpro/shared/hooks/useTheme';

const CvTopNav: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl dark:border-white/10 dark:bg-darkBg/85">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 lg:px-8">
        <Link
          href="/"
          aria-label="OneDollarCVPro home"
          className="relative block h-12 w-[260px] shrink-0"
        >
          <Image
            src="/assets/logo.png"
            alt="OneDollarCVPro"
            fill
            priority
            className="object-contain object-left"
          />
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/builder/new?templateId=ats-minimal"
            className="text-slate-700 transition hover:text-primary dark:text-white/80"
          >
            CV Builder
          </Link>
          <Link
            href="/templates"
            className="text-slate-700 transition hover:text-primary dark:text-white/80"
          >
            Templates
          </Link>
          <Link
            href="/builder"
            className="text-slate-700 transition hover:text-primary dark:text-white/80"
          >
            Drafts
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/profile"
            aria-label="Profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white"
          >
            <User className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default CvTopNav;
