import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faBell,
  faMagnifyingGlass,
  faBars,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

type Props = {
  onSearch?: (query: string) => void;
  avatarUrl?: string;
};

const FALLBACK_AVATAR = (name = 'You') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

const Navbar: React.FC<Props> = ({ onSearch, avatarUrl }) => {
  const { token, orgToken, backendUrl, profile } = useShopContext() as any;
  const { role } = useOrg(); // 'owner' | 'admin' | 'instructor' | 'learner' | undefined
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement | null>(null);

  const ORG_BTN =
    "shrink-0 inline-flex items-center justify-center rounded-full h-8 px-3 text-xs font-medium whitespace-nowrap \
     bg-emerald-600 text-white ring-1 ring-emerald-700/25 shadow-sm transition \
     hover:bg-emerald-500 hover:ring-emerald-700/40 \
     focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 \
     dark:focus-visible:ring-offset-darkBg";

  // Detect "institution mode" from route or sticky flag
  const isOrg = useMemo(() => {
    const onOrgRoute = location.pathname.startsWith('/org');
    const sticky =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('auth:mode') === 'org';
    return onOrgRoute || sticky;
  }, [location.pathname]);

  // Close sheets when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  // Focus search input when it opens on mobile
  useEffect(() => {
    if (mobileSearchOpen) {
      const t = setTimeout(() => mobileSearchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [mobileSearchOpen]);

  const profileAvatarRaw =
    (avatarUrl ||
      (profile as any)?.avatar ||
      (profile as any)?.photoUrl ||
      (profile as any)?.avatar_url ||
      (Array.isArray((profile as any)?.gallery) ? (profile as any).gallery[0] : undefined)) as
      | string
      | undefined;

  const resolvedAvatar = useMemo(() => {
    if (!profileAvatarRaw || profileAvatarRaw.length === 0) {
      return FALLBACK_AVATAR(profile?.name || 'You');
    }
    if (profileAvatarRaw.startsWith('/') && backendUrl) {
      return `${backendUrl.replace(/\/+$/, '')}${profileAvatarRaw}`;
    }
    return profileAvatarRaw;
  }, [profileAvatarRaw, backendUrl, profile?.name]);

  const avatarHref = token ? '/profile/me' : '/login';

 const myCoursesHref = '/courses';

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 dark:bg-darkBg/80 border-b border-gray-200 dark:border-darkCard">
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-8">
        {/* Top bar */}
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger (mobile) */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-xl h-10 w-10 bg-gray-100 dark:bg-[#172534] ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <FontAwesomeIcon icon={(mobileMenuOpen ? faXmark : faBars) as IconProp} />
            </button>

            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              <span className="size-5 text-primary dark:text-darkTextPrimary">
                <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
                  <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
                </svg>
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">DayBreak</h1>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {token && (
                <Link to="/home" className="text-sm/6 hover:text-primary transition-colors">
                  Home
                </Link>
              )}
              {/* Find Tutors is public */}
              <Link to="/find-tutor" className="text-sm/6 hover:text-primary transition-colors">
                Find Tutors
              </Link>
              {/* 🔑 dynamic: public explorer when logged out */}
              <Link to={myCoursesHref} className="text-sm/6 hover:text-primary transition-colors">
                My Courses
              </Link>
              <Link to="/resources" className="text-sm/6 hover:text-primary transition-colors">
                Resources
              </Link>
              {/* ➕ Learn with A.I */}
              <Link to="/robot-teach" className="text-sm/6 hover:text-primary transition-colors">
                Learn with A.I
              </Link>

              {/* For Institutions */}
              <Link
                to={isOrg && orgToken ? '/org' : '/org/login'}
                state={{ next: '/org' }}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition"
              >
                For Institutions
              </Link>
            </nav>
          </div>

          {/* Right: search + bell + avatar / Institution login-logout */}
          <div className="flex flex-1 justify-end items-center gap-2 sm:gap-3">
            {/* Desktop search */}
            <label className="hidden md:flex w-full max-w-lg h-10">
              <div className="flex w-full items-stretch rounded-xl ring-1 ring-gray-200 dark:ring-darkCard bg-gray-100 dark:bg-[#172534] focus-within:ring-primary transition">
                <div className="text-gray-500 dark:text-darkTextSecondary flex items-center justify-center pl-4">
                  <FontAwesomeIcon icon={faMagnifyingGlass as IconProp} />
                </div>
                <input
                  placeholder="Search"
                  className="w-full bg-transparent h-full px-3 outline-none placeholder:text-gray-500 dark:placeholder:text-darkTextSecondary"
                  onChange={(e) => onSearch?.(e.target.value)}
                />
              </div>
            </label>

            {/* Mobile search button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-xl h-10 w-10 bg-gray-100 dark:bg-[#172534] ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
              onClick={() => setMobileSearchOpen((v) => !v)}
            >
              <FontAwesomeIcon icon={(mobileSearchOpen ? faXmark : faMagnifyingGlass) as IconProp} />
            </button>

            {/* Bell */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl h-10 w-10 bg-gray-100 dark:bg-[#172534] ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
              aria-label="Notifications"
            >
              <FontAwesomeIcon icon={faBell as IconProp} />
            </button>

            {/* Rightmost control */}
            {isOrg ? (
              orgToken ? (
                role === 'learner' ? (
                  <Link to="/org/learn" className={ORG_BTN} title="Org Learner Home">
                    Learner Home
                  </Link>
                ) : (
                  <Link to="/org/profile" className={ORG_BTN} title="Institution profile">
                    Org Profile
                  </Link>
                )
              ) : (
                <Link
                  to="/org/login"
                  state={{ next: '/org' }}
                  className={ORG_BTN}
                  title="Institution login"
                >
                  Login
                </Link>
              )
            ) : (
              <Link
                to={avatarHref}
                className="shrink-0 rounded-full ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
                aria-label={token ? 'Open my profile' : 'Login'}
                title={token ? (profile?.name || 'My profile') : 'Login'}
              >
                <img
                  src={resolvedAvatar}
                  alt={profile?.name ? `${profile.name} avatar` : 'User avatar'}
                  className="size-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search reveal */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3">
            <label className="flex h-10">
              <div className="flex w-full items-stretch rounded-xl ring-1 ring-gray-200 dark:ring-darkCard bg-gray-100 dark:bg-[#172534] focus-within:ring-primary transition">
                <div className="text-gray-500 dark:text-darkTextSecondary flex items-center justify-center pl-4">
                  <FontAwesomeIcon icon={faMagnifyingGlass as IconProp} />
                </div>
                <input
                  ref={mobileSearchRef}
                  placeholder="Search courses, tutors…"
                  className="w-full bg-transparent h-full px-3 outline-none placeholder:text-gray-500 dark:placeholder:text-darkTextSecondary"
                  onChange={(e) => onSearch?.(e.target.value)}
                />
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden border-t border-gray-200 dark:border-darkCard bg-white dark:bg-darkBg transition-[max-height,opacity] duration-200 overflow-hidden ${
          mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="px-3 sm:px-4 py-3 flex flex-col gap-1">
          {token && (
            <Link
              to="/home"
              className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
            >
              Home
            </Link>
          )}
          <Link
            to="/find-tutor"
            className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
          >
            Find Tutors
          </Link>
          {/* 🔑 dynamic here too */}
          <Link
            to={myCoursesHref}
            className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
          >
            My Courses
          </Link>
          <Link
            to="/resources"
            className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
          >
            Resources
          </Link>
          {/* ➕ Learn with A.I (mobile) */}
          <Link
            to="/robot-teach"
            className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
          >
            Learn with A.I
          </Link>
          {/* For Institutions (use orgToken, not token) */}
          <Link
            to={isOrg && orgToken ? '/org' : '/org/login'}
            state={{ next: '/org' }}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition"
          >
            For Institutions
          </Link>
          {orgToken && role === 'learner' && (
            <Link
              to="/org/learn"
              className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#172534]"
            >
              Org Learner Home
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
