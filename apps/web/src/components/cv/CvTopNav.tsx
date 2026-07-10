'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Moon, Sun, X } from 'lucide-react';
import useTheme from '@cvpro/shared/hooks/useTheme';
import { brand } from '../../lib/brand';

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
    { href: '/', label: 'Home', active: safePathname === '/' },
    {
      href: '/builder/new?templateId=ats-minimal',
      label: 'Resume Builder',
      active: safePathname === '/builder/new',
    },
    {
      href: '/cover-letter',
      label: 'Cover Letter Builder',
      active: safePathname === '/cover-letter' || safePathname.startsWith('/cover-letters/'),
    },
    { href: '/templates', label: 'CV Templates', active: safePathname === '/templates' },
    { href: '/ats-checker', label: 'ATS Checker', active: safePathname === '/ats-checker' },
    { href: '/career-resources', label: 'Career Resources', active: safePathname === '/career-resources' },
    { href: '/pricing', label: 'Pricing', active: safePathname === '/pricing' },
    { href: '/blog', label: 'Blog', active: safePathname === '/blog' },
    { href: '/login', label: 'Login', active: safePathname === '/login' },
    { href: '/register', label: 'Register', active: safePathname === '/register' },
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
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            href="/"
            aria-label={brand.name + ' home'}
            className="flex shrink-0 items-center gap-2 text-slate-950 dark:text-white"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#0052CC] text-sm font-extrabold text-white">
              PR
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-extrabold">{brand.shortName}</span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">
                {brand.domain}
              </span>
            </span>
          </Link>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <nav className="hidden items-center justify-end gap-4 pr-1 text-xs font-semibold 2xl:flex">
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

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-global-nav"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white 2xl:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-global-nav"
          className="border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-darkBg/95 2xl:hidden"
        >
          <nav className="grid gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={['rounded-lg px-3 py-2', linkClass(link.active)].join(' ')}
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
