'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogIn, Menu, Moon, Sun, UserPlus, UserRound, X } from 'lucide-react';
import useTheme from '@cvpro/shared/hooks/useTheme';
import { brand } from '../../lib/brand';

const linkClass = (isActive: boolean) =>
  [
    'rounded-full px-3 py-2 text-sm font-semibold leading-none transition-colors',
    isActive
      ? 'bg-blue-50 text-primary ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-400/20'
      : 'text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white',
  ].join(' ');

const accountLinkClass = (isActive: boolean) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-blue-50 text-primary dark:bg-blue-500/15 dark:text-blue-100'
      : 'text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white',
  ].join(' ');

const CvTopNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);
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
  ];

  const accountLinks = [
    { href: '/login', label: 'Login', active: safePathname === '/login', icon: LogIn },
    { href: '/register', label: 'Register', active: safePathname === '/register', icon: UserPlus },
  ];

  const isAccountActive = accountLinks.some((link) => link.active);

  React.useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMenuOpen && !isProfileOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isMenuOpen, isProfileOpen]);

  React.useEffect(() => {
    if (!isProfileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isProfileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl dark:border-white/10 dark:bg-darkBg/88">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-screen-2xl items-center gap-3 px-4 py-2 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center">
          <Link
            href="/"
            aria-label={brand.name + ' home'}
            className="flex shrink-0 items-center gap-2 text-slate-950 dark:text-white"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0052CC] text-sm font-extrabold text-white shadow-sm">
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

        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1.5 gap-y-2 px-2 lg:flex xl:gap-x-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={[linkClass(link.active), 'whitespace-nowrap'].join(' ')}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-controls="account-menu"
              aria-label="Open account menu"
              title="Account"
              className={[
                'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold shadow-sm transition',
                isAccountActive || isProfileOpen
                  ? 'border-blue-200 bg-blue-50 text-primary dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white',
              ].join(' ')}
            >
              <UserRound className="h-4 w-4" />
              <span className="hidden xl:inline">Account</span>
              <ChevronDown className={['hidden h-3.5 w-3.5 transition sm:block', isProfileOpen ? 'rotate-180' : ''].join(' ')} />
            </button>

            {isProfileOpen && (
              <div
                id="account-menu"
                className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/30"
              >
                <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Account
                </div>
                {accountLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={accountLinkClass(link.active)}
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-global-nav"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-darkBg/40 dark:text-white/80 dark:hover:text-white lg:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-global-nav"
          className="border-t border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-darkBg/95 lg:hidden"
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

