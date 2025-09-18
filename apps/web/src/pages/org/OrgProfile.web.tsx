// apps/web/src/pages/org/OrgProfile.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import {
  getMyOrgOrBootstrap,
  getOrgUsage,
} from '@mytutorapp/shared/api';

// ⬇️ NEW: theme toggle (path is from /pages/org → /components)
import ThemeToggle from '../../components/ThemeToggle.web';

type Org = {
  id: string;
  name?: string;
  slug?: string;
  logo_url?: string;
  signature_url?: string;
  certificate_title?: string;
  tier?: 'starter' | 'pro' | 'enterprise';
  seats_used?: number;
  owner_email?: string;
  email_domain?: string;
};

type MiniUser = { id: string | number; name?: string; email?: string };

/* ----------------------------- helpers ----------------------------- */

async function tryFetchRoster(backendUrl: string, token: string, orgId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const base = backendUrl.replace(/\/+$/, '');
  const candidates = [
    `${base}/api/orgs/${orgId}/roster`,
    `${base}/api/organizations/${orgId}/roster`,
    `${base}/api/orgs/${orgId}/members`,
    `${base}/api/organizations/${orgId}/members`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return await r.json(); // { instructors: MiniUser[], learners: MiniUser[] }
    } catch {}
  }
  return { instructors: [] as MiniUser[], learners: [] as MiniUser[] };
}

const FALLBACK = (n = 'Org') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=047857&color=ffffff`;

const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK(fallbackName ?? 'Org');
  if (raw.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  return raw;
};

const getInitials = (name?: string, email?: string) => {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '👤';
};

const tierBadge = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') return 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30';
  if (tier === 'pro') return 'bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30';
  return 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30';
};

const cardBase =
  'rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821]';

/* --------------------------- small components --------------------------- */

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-white/10 ${className || ''}`} />
);

const PersonRow: React.FC<{ u: MiniUser }> = ({ u }) => (
  <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-[#0b1620]">
    <div className="flex items-center gap-3 min-w-0">
      <div className="size-9 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10 bg-slate-100 dark:bg-white/10 grid place-items-center text-xs font-semibold">
        {getInitials(u.name, u.email)}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{u.name || u.email || `User #${u.id}`}</div>
        {u.email && <div className="text-xs text-[#49739c] dark:text-darkTextSecondary truncate">{u.email}</div>}
      </div>
    </div>
    {u.email && (
      <a
        href={`mailto:${u.email}`}
        className="inline-flex h-8 px-3 items-center rounded-lg text-xs font-semibold bg-[#e7edf4] dark:bg-[#172534]"
      >
        Contact
      </a>
    )}
  </li>
);

/* ------------------------------- page -------------------------------- */

const OrgProfilePage: React.FC = () => {
  const nav = useNavigate();
  const { backendUrl, token, setToken } = useShopContext() as any;

  const [org, setOrg] = useState<Org | null>(null);
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<MiniUser[]>([]);
  const [learners, setLearners] = useState<MiniUser[]>([]);

  const seatCap = useCallback((tier?: string) => {
    switch ((tier || 'starter').toLowerCase()) {
      case 'enterprise':
        return 5000;
      case 'pro':
        return 500;
      default:
        return 50;
    }
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const o = await getMyOrgOrBootstrap(backendUrl, token);
        if (stop) return;
        setOrg(o);
        const cap = seatCap(o?.tier);
        setSeatsMax(cap);
        try {
          const u = await getOrgUsage(backendUrl, token, o.id);
          if (!stop) setSeatsUsed(Number(u?.seats_used ?? 0));
        } catch {
          if (!stop) setSeatsUsed(Number(o?.seats_used ?? 0));
        }
        try {
          const roster = await tryFetchRoster(backendUrl, token, o.id);
          if (!stop) {
            setInstructors(Array.isArray(roster?.instructors) ? roster.instructors : []);
            setLearners(Array.isArray(roster?.learners) ? roster.learners : []);
          }
        } catch {}
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [backendUrl, token, seatCap]);

  const logo = useMemo(
    () => resolveAsset(org?.logo_url, backendUrl, org?.name),
    [org?.logo_url, backendUrl, org?.name]
  );

  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / (seatsMax || 1)) * 100));

  const logoutOrgMode = () => {
    try {
      localStorage.removeItem('auth:mode');
      localStorage.removeItem('auth:orgId');
      localStorage.removeItem('auth:returnTo:org');
    } catch {}
    nav('/profile/me', { replace: true });
  };

  // full institution logout (clears JWT + org mode and returns to org login)
  const logoutInstitution = () => {
    try {
      localStorage.removeItem('auth:mode');
      localStorage.removeItem('auth:orgId');
      localStorage.removeItem('auth:token');
      sessionStorage.removeItem('auth:returnTo:org');
    } catch {}
    try { setToken?.(''); } catch {}
    window.location.assign('/org/login?logout=1');
  };

  /* --------------------------- unauthenticated --------------------------- */
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-darkBg">
        <div className={`${cardBase} w-full max-w-md p-6`}>
          <h1 className="text-xl font-bold">Institution Profile</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-darkTextSecondary">
            Please sign in as an institution to continue.
          </p>
          <div className="mt-4">
            <Link
              to="/org/login"
              className="inline-flex h-10 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Institution Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------- render -------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-indigo-600 to-cyan-500 opacity-20 dark:opacity-25" />
        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          <div className={`${cardBase} p-4 sm:p-5 lg:p-6 backdrop-blur-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                {loading ? (
                  <Skeleton className="h-16 w-16 rounded-xl" />
                ) : (
                  <img
                    src={logo}
                    alt="Org logo"
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10 bg-white"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                      {loading ? <Skeleton className="h-6 w-48" /> : org?.name || 'Institution'}
                    </h1>
                    {!loading && (
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' +
                          tierBadge(org?.tier)
                        }
                        title="Current plan"
                      >
                        {(org?.tier || 'starter').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#49739c] dark:text-darkTextSecondary">
                    {loading ? <Skeleton className="h-4 w-28 mt-1" /> : org?.slug ? `@${org.slug}` : '—'}
                  </div>
                </div>
              </div>

              {/* Actions (added Theme toggle here for convenience) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>
                <Link
                  to="/org"
                  className="inline-flex h-10 px-4 items-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Open E-Learning Portal
                </Link>
                <button
                  onClick={logoutOrgMode}
                  className="inline-flex h-10 px-4 items-center rounded-xl bg-[#e7edf4] dark:bg-[#172534] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Exit org mode
                </button>
                <button
                  onClick={logoutInstitution}
                  className="inline-flex h-10 px-4 items-center rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  title="Sign out of your institution account"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Seat usage strip */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 dark:bg-[#0b1620] ring-1 ring-black/5 dark:ring-white/10 p-3">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Seats used</div>
                {loading ? (
                  <>
                    <Skeleton className="h-7 w-32 mt-2" />
                    <Skeleton className="h-2 w-full mt-2" />
                  </>
                ) : (
                  <>
                    <div className="mt-1 text-2xl font-extrabold">{seatsUsed}/{seatsMax}</div>
                    <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-[#182534] overflow-hidden">
                      <div
                        className={`h-full ${seatPct >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${seatPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-[#0b1620] ring-1 ring-black/5 dark:ring-white/10 p-3">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Plan</div>
                {loading ? (
                  <Skeleton className="h-7 w-24 mt-2" />
                ) : (
                  <>
                    <div className="mt-1 text-2xl font-extrabold">
                      {(org?.tier || 'starter').toUpperCase()}
                    </div>
                    <Link
                      to="/org"
                      className="mt-2 inline-flex h-8 px-3 items-center rounded-lg bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold"
                    >
                      Manage plan
                    </Link>
                  </>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-[#0b1620] ring-1 ring-black/5 dark:ring-white/10 p-3">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Certificates</div>
                {loading ? (
                  <Skeleton className="h-5 w-48 mt-2" />
                ) : (
                  <>
                    <div className="mt-1 font-semibold line-clamp-1">
                      {org?.certificate_title || 'Certificate of Completion'}
                    </div>
                    <div className="mt-1 text-xs text-[#49739c] dark:text-darkTextSecondary">
                      Signature & pass marks in Branding.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-8">
        {/* People */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Instructors */}
          <section className={`${cardBase} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Instructors</h2>
              <Link to="/org" className="text-sm font-semibold underline underline-offset-4">
                Assign courses →
              </Link>
            </div>

            {loading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : instructors.length ? (
              <>
                <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10 rounded-xl">
                  {instructors.slice(0, 8).map((u) => (
                    <PersonRow key={String(u.id)} u={u} />
                  ))}
                </ul>
                {instructors.length > 8 && (
                  <div className="mt-2 text-xs text-[#49739c] dark:text-darkTextSecondary">
                    Showing 8 of {instructors.length}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#cedbe8] dark:border-white/10 p-6 text-center">
                <div className="text-2xl">👩🏽‍🏫</div>
                <p className="mt-2 text-sm">No instructors listed yet.</p>
                <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                  Invite or assign from the portal.
                </p>
              </div>
            )}
          </section>

          {/* Learners */}
          <section className={`${cardBase} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Learners</h2>
              <Link to="/org" className="text-sm font-semibold underline underline-offset-4">
                Invite learners →
              </Link>
            </div>

            {loading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : learners.length ? (
              <>
                <ul className="mt-3 divide-y divide-black/5 dark:divide-white/10 rounded-xl">
                  {learners.slice(0, 12).map((u) => (
                    <PersonRow key={String(u.id)} u={u} />
                  ))}
                </ul>
                {learners.length > 12 && (
                  <div className="mt-2 text-xs text-[#49739c] dark:text-darkTextSecondary">
                    Showing 12 of {learners.length}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#cedbe8] dark:border-white/10 p-6 text-center">
                <div className="text-2xl">🎓</div>
                <p className="mt-2 text-sm">No learners yet.</p>
                <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                  Share your invite link from the portal.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Branding */}
        <section className="mt-4">
          <div className={`${cardBase} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Branding</h2>
              <Link
                to="/org"
                className="inline-flex h-9 px-3 items-center rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Edit Branding
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl p-3 ring-1 ring-black/5 dark:ring-white/10 bg-slate-50 dark:bg-[#0b1620]">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Logo</div>
                {loading ? (
                  <Skeleton className="h-24 w-24 mt-2 rounded-lg" />
                ) : (
                  <img
                    src={resolveAsset(org?.logo_url, backendUrl)}
                    alt="Logo"
                    className="mt-2 h-24 w-24 object-contain ring-1 ring-black/10 rounded-lg bg-white"
                  />
                )}
              </div>

              <div className="rounded-xl p-3 ring-1 ring-black/5 dark:ring-white/10 bg-slate-50 dark:bg-[#0b1620]">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Registrar Signature</div>
                {loading ? (
                  <Skeleton className="h-24 w-40 mt-2 rounded-lg" />
                ) : (
                  <img
                    src={resolveAsset(org?.signature_url, backendUrl)}
                    alt="Signature"
                    className="mt-2 h-24 max-w-full object-contain ring-1 ring-black/10 rounded-lg bg-white"
                    style={{ imageRendering: 'auto' }}
                  />
                )}
              </div>

              <div className="rounded-xl p-3 ring-1 ring-black/5 dark:ring-white/10 bg-slate-50 dark:bg-[#0b1620]">
                <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">Email domain</div>
                {loading ? (
                  <Skeleton className="h-6 w-40 mt-2" />
                ) : (
                  <div className="mt-2 text-sm font-medium">
                    {org?.email_domain?.trim() || <span className="text-[#49739c]">Not restricted</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
          <Link
            to="/org"
            className="inline-flex h-10 px-4 items-center rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Open Portal
          </Link>
          <Link
            to="/org"
            className="inline-flex h-10 px-4 items-center rounded-xl bg-[#e7edf4] dark:bg-[#172534] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Create Assignment
          </Link>
        </div>

        {/* ⬇️ NEW: App settings (Dark mode toggle, same UX as Profile page) */}
        <section className="mt-4">
          <div className={`${cardBase} p-4 sm:p-5`}>
            <h2 className="text-lg font-bold">App settings</h2>
            <div className="mt-3 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]" />
                  <span>Dark mode</span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile sticky bar */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-40 space-y-2">
        <div className="rounded-2xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300/30 overflow-hidden">
          <Link
            to="/org"
            className="block text-center py-3 font-semibold bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white"
          >
            Manage in Portal
          </Link>
        </div>
        {/* tiny mobile controls: include theme toggle inline for convenience */}
        <div className="flex items-center justify-between rounded-2xl px-3 py-2 ring-1 ring-black/5 dark:ring-white/10 bg-white/90 dark:bg-[#0f1821]/90 backdrop-blur">
          <span className="text-sm">Dark mode</span>
          <ThemeToggle />
        </div>
        <button
          onClick={logoutInstitution}
          className="w-full rounded-2xl py-3 font-semibold bg-rose-600 text-white shadow ring-1 ring-rose-500/40"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default OrgProfilePage;
