'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Sun, User, X } from 'lucide-react';
import useTheme from '@cvpro/shared/hooks/useTheme';

const linkClass = (isActive: boolean) =>
  [
    'transition',
    isActive
      ? 'text-primary dark:text-primary'
      : 'text-slate-700 hover:text-primary dark:text-white/80',
  ].join(' ');

const CvTopNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const safePathname = pathname ?? '';
  const isDark = theme === 'dark';
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  const navLinks = [
    {
      href: '/builder/new?templateId=ats-minimal',
      label: 'CV Builder',
      active: safePathname === '/builder/new',
    },
    { href: '/templates', label: 'Templates', active: safePathname === '/templates' },
    {
      href: '/builder',
      label: 'Drafts',
      active: safePathname === '/builder' || safePathname.startsWith('/builder/'),
    },
    {
      href: '/cover-letters',
      label: 'Cover Letters',
      active: safePathname === '/cover-letters' || safePathname.startsWith('/cover-letters/'),
    },
    {
      href: '/help',
      label: 'Help',
      active: safePathname === '/help',
    },
  ];

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl dark:border-white/10 dark:bg-darkBg/85">
      <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl items-center gap-3 px-4 lg:px-8">
        {/* Left: Logo */}
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            href="/"
            aria-label="OneDollarCVPro home"
            className="relative block h-10 w-[170px] shrink-0 sm:h-11 sm:w-[220px] lg:h-12 lg:w-[260px]"
          >
            <Image
              src="/assets/logo.png"
              alt="OneDollarCVPro"
              fill
              priority
              sizes="(max-width: 640px) 170px, (max-width: 1024px) 220px, 260px"
              className="object-contain object-left"
            />
          </Link>
        </div>

        {/* Right cluster: Desktop nav links close to theme/profile icons */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <nav className="hidden items-center justify-end gap-6 pr-1 text-sm font-medium xl:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.active)}>
                {link.label}
              </Link>
            ))}
          </nav>

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

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-global-nav"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white xl:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-global-nav"
          className="border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-darkBg/95 xl:hidden"
        >
          <nav className="grid gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 ${linkClass(link.active)}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default CvTopNav;
