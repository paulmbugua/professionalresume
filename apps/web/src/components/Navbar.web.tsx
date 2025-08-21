// apps/web/src/components/Navbar.web.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faBell, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';

type Props = {
  onSearch?: (query: string) => void;
  avatarUrl?: string;
};

const FALLBACK_AVATAR = (name = 'You') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

const Navbar: React.FC<Props> = ({ onSearch, avatarUrl }) => {
  const { token, backendUrl, profile } = useShopContext();

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

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 dark:bg-darkBg/80 border-b border-gray-200 dark:border-darkCard">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <span className="size-5 text-primary dark:text-darkTextPrimary">
                <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
                  <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
                </svg>
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">Tutorfy</h1>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {/* Hide Home when logged out */}
              {token && (
                <Link to="/home" className="text-sm/6 hover:text-primary transition-colors">
                  Home
                </Link>
              )}
              <Link to="/find-tutor" className="text-sm/6 hover:text-primary transition-colors">
                Find Tutors
              </Link>
              <Link to="/my-courses" className="text-sm/6 hover:text-primary transition-colors">
                  My Courses
                </Link>
              <Link to="/resources" className="text-sm/6 hover:text-primary transition-colors">
                Resources
              </Link>
            </nav>
          </div>

          {/* Search + Bell + Avatar */}
          <div className="flex flex-1 justify-end items-center gap-3 sm:gap-4">
            <label className="flex w-full max-w-lg h-10">
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

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl h-10 w-10 bg-gray-100 dark:bg-[#172534] ring-1 ring-gray-200 dark:ring-darkCard hover:ring-primary transition"
              aria-label="Notifications"
            >
              <FontAwesomeIcon icon={faBell as IconProp} />
            </button>

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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
