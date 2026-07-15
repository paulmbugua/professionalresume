'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, FileText, LogIn, LogOut, Menu, Moon, Settings, Sun, UserPlus, UserRound, X } from 'lucide-react';
import useTheme from '@cvpro/shared/hooks/useTheme';
import { useShopContext } from '@cvpro/shared/context';
import { brand } from '../../lib/brand';

const linkClass = (isActive: boolean) =>
  [
    'rounded-full px-2.5 py-2 text-[15px] font-bold leading-none transition-colors xl:px-3',
    isActive
      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:text-white dark:ring-blue-300/25'
      : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white',
  ].join(' ');

const accountLinkClass = (isActive: boolean) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors',
    isActive
      ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
      : 'text-slate-800 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white',
  ].join(' ');

const CvTopNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const { token, logout, userEmail, profile } = useShopContext() as {
    token?: string | null;
    logout?: () => Promise<void>;
    userEmail?: string | null;
    profile?: { name?: string | null; fullName?: string | null } | null;
  };
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? '';
  const isDark = theme === 'dark';
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  const isAuthenticated = Boolean(token);
  const displayName = profile?.name || profile?.fullName || userEmail || 'Signed in';
  const displayEmail = userEmail || 'ProfessionalResume account';
  const accountInitial = String(displayName || displayEmail || 'U').trim().charAt(0).toUpperCase() || 'U';

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

  const guestAccountLinks = [
    { href: '/login', label: 'Login', active: safePathname === '/login', icon: LogIn },
    { href: '/register', label: 'Register', active: safePathname === '/register', icon: UserPlus },
  ];

  const signedInAccountLinks = [
    { href: '/profile', label: 'Profile', active: safePathname === '/profile', icon: Settings },
    { href: '/builder', label: 'My resumes', active: safePathname === '/builder', icon: FileText },
  ];

  const visibleAccountLinks = isAuthenticated ? signedInAccountLinks : guestAccountLinks;
  const isAccountActive = visibleAccountLinks.some((link) => link.active);

  const handleLogout = React.useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout?.();
      setIsProfileOpen(false);
      router.replace('/');
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, router]);

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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[4.25rem] w-full max-w-screen-2xl items-center gap-3 px-4 py-2 lg:px-8">
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
              <span className="block text-sm font-extrabold text-slate-950 dark:text-white">{brand.shortName}</span>
              <span className="block text-[11px] font-bold text-blue-700 dark:text-blue-200">
                {brand.domain}
              </span>
            </span>
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1 gap-y-2 px-2 lg:flex xl:gap-x-1.5 2xl:flex-nowrap 2xl:gap-x-2">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white"
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
                'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-bold shadow-sm transition',
                isAccountActive || isProfileOpen
                  ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500 dark:text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white',
              ].join(' ')}
            >
              {isAuthenticated ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-extrabold text-blue-700 dark:bg-white/20 dark:text-white">
                  {accountInitial}
                </span>
              ) : (
                <UserRound className="h-4 w-4" />
              )}
              <span className="hidden xl:inline">{isAuthenticated ? 'Profile' : 'Account'}</span>
              <ChevronDown className={['hidden h-3.5 w-3.5 transition sm:block', isProfileOpen ? 'rotate-180' : ''].join(' ')} />
            </button>

            {isProfileOpen && (
              <div
                id="account-menu"
                className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40"
              >
                {isAuthenticated ? (
                  <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-white/10 dark:bg-white/10">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white shadow-sm">
                        {accountInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{displayName}</p>
                        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{displayEmail}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Account
                  </div>
                )}
                {visibleAccountLinks.map((link) => {
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
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-2 flex w-full items-center gap-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-left text-sm font-extrabold text-rose-700 transition hover:border-rose-200 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-70 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-global-nav"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white lg:hidden"
          >
            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-global-nav"
          className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950 lg:hidden"
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

