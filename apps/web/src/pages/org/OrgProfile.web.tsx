// apps/web/src/pages/org/portal/OrgProfile.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { getOrgRoster as apiRoster } from '@mytutorapp/shared/api/orgApi';
import { createOrgMembershipInvite } from '@mytutorapp/shared/api/orgApi';
import { removeOrgMember } from '@mytutorapp/shared/api/orgApi';
import {
  getMyOrgOrBootstrap,
  getOrgUsage,
} from '@mytutorapp/shared/api';

// ⬇️ NEW: theme toggle (path is from /pages/org/portal → /components)
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

const InviteModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (role: 'instructor'|'learner', email?: string) => Promise<{url:string}|void>;
  initialRole?: 'instructor'|'learner';
}> = ({ open, onClose, onCreate, initialRole = 'learner' }) => {
  const [role, setRole] = useState<'instructor'|'learner'>(initialRole);
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (open) {
      setRole(initialRole);
      setEmail('');
      setUrl('');
      setCreating(false);
    }
  }, [open, initialRole]);

  useEffect(()=>{ if (!open){ setEmail(''); setUrl(''); setRole('learner'); setCreating(false);} },[open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3">
      <div className={`${cardBase} w-full max-w-md p-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create invite</h3>
          <button onClick={onClose} className="chip">Close</button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="text-xs text-[#49739c] dark:text-darkTextSecondary mb-1">Role</div>
            <select
              value={role}
              onChange={(e)=>setRole(e.target.value as any)}
              className="w-full rounded-lg ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-[#0f1821] px-3 py-2"
            >
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs text-[#49739c] dark:text-darkTextSecondary mb-1">Email (optional)</div>
            <input
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="name@example.edu"
              className="w-full rounded-lg ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-[#0f1821] px-3 py-2"
            />
          </label>

          {!url && (
            <button
              disabled={creating}
              onClick={async ()=>{
                setCreating(true);
                const r = await onCreate(role, email || undefined);
                if (r?.url) setUrl(r.url);
                setCreating(false);
              }}
              className="inline-flex h-10 px-4 items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {creating ? 'Creating…' : 'Create invite'}
            </button>
          )}

          {!!url && (
            <div className="space-y-2">
              <code className="block w-full text-xs p-3 rounded-lg bg-slate-100 dark:bg-black/40">{url}</code>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(url).catch(()=>{})}
                  className="chip chip-active"
                >
                  Copy
                </button>
                <a className="chip" href={`mailto:?subject=${encodeURIComponent('You’re invited')}&body=${encodeURIComponent(url)}`}>Email</a>
                <a className="chip" href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer noopener">WhatsApp</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-white/10 ${className || ''}`} />
);

const PersonRow: React.FC<{ u: MiniUser; onRemove?: () => Promise<void> | void }> = ({ u, onRemove }) => {
  const msg = `Hi${u.name ? ` ${u.name}` : ''}, I’d like to get in touch.`;
  const [removing, setRemoving] = useState(false);

  const doRemove = async () => {
    if (!onRemove) return;
    if (removing) return;
    setRemoving(true);
    try { await onRemove(); }
    finally { setRemoving(false); }
  };

  return (
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
        <div className="flex items-center gap-1.5">
          <a
            href={`mailto:${u.email}`}
            className="inline-flex h-8 px-3 items-center rounded-lg text-xs font-semibold bg-[#e7edf4] dark:bg-[#172534]"
            title="Email"
          >
            Email
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 px-3 items-center rounded-lg text-xs font-semibold bg-[#e7edf4] dark:bg-[#172534]"
            title="WhatsApp"
          >
            WhatsApp
          </a>
        </div>
      )}

        {onRemove && (
          <button
            disabled={removing}
            onClick={doRemove}
            className="inline-flex h-8 px-3 items-center rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
            title="Remove from organization"
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
    </li>
  );
};

/* ------------------------------- page -------------------------------- */

const OrgProfilePage: React.FC = () => {
  const nav = useNavigate();
  const { backendUrl, orgToken, setOrgToken } = useShopContext() as any;

  const [org, setOrg] = useState<Org | null>(null);
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<MiniUser[]>([]);
  const [learners, setLearners] = useState<MiniUser[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'instructor'|'learner'>('learner');

  type InviteResp = { ok: boolean; invite_code: string; invite_url: string };

const handleCreateMembershipInvite = useCallback(
  async (role: 'instructor' | 'learner', email?: string) => {
    if (!org?.id) throw new Error('Organization is not loaded yet.');
    if (!orgToken) throw new Error('You are not authenticated for this organization.');

    const resp = (await createOrgMembershipInvite(
      backendUrl,
      orgToken,
      org.id,
      { role, email }
    )) as InviteResp;

    const url = resp.invite_url; // ✅ correct property
    if (!url) throw new Error('Invite created but no URL was returned.');

    // best-effort roster refresh
    try {
      const roster = await apiRoster(backendUrl, orgToken, org.id);
      setInstructors(Array.isArray(roster?.instructors) ? roster.instructors : []);
      setLearners(Array.isArray(roster?.learners) ? roster.learners : []);
    } catch {}

    return { url }; // ✅ normalize for the modal
  },
  [backendUrl, org?.id, orgToken]
);

const handleRemoveMember = useCallback(async (u: MiniUser) => {
  if (!org?.id || !orgToken) return;

  const label = u.name || u.email || `User #${u.id}`;
  const ok = window.confirm(`Remove ${label} from ${org?.name || 'this organization'}?\n\nThey will lose portal access.`);
  if (!ok) return;

  try {
    await removeOrgMember(backendUrl, orgToken, org.id, u.id);

    // Optimistic UI updates
    setInstructors(prev => prev.filter(x => String(x.id) !== String(u.id)));
    const wasLearner = learners.some(x => String(x.id) === String(u.id));
    setLearners(prev => prev.filter(x => String(x.id) !== String(u.id)));
    if (wasLearner) setSeatsUsed(s => Math.max(0, (s || 0) - 1));
  } catch (e: any) {
    const msg = e?.response?.data?.message || 'Failed to remove member.';
    alert(msg);
  }
}, [backendUrl, org?.id, org?.name, orgToken, learners]);

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
      if (!orgToken) {
        setLoading(false);
        return;
      }
      try {
        const o = await getMyOrgOrBootstrap(backendUrl, orgToken);
        if (stop) return;
        setOrg(o);
        const cap = seatCap(o?.tier);
        setSeatsMax(cap);
        try {
          const u = await getOrgUsage(backendUrl, orgToken, o.id);
          if (!stop) setSeatsUsed(Number(u?.seats_used ?? 0));
        } catch {
          if (!stop) setSeatsUsed(Number(o?.seats_used ?? 0));
        }
        try {
        const roster = await apiRoster(backendUrl, orgToken, o.id);
        if (!stop) {
          setInstructors(Array.isArray(roster?.instructors) ? roster.instructors : []);
          setLearners(Array.isArray(roster?.learners) ? roster.learners : []);
        }
      } catch {
        // fallback to your existing heuristic
        try {
          const roster = await tryFetchRoster(backendUrl, orgToken, o.id);
          if (!stop) {
            setInstructors(Array.isArray(roster?.instructors) ? roster.instructors : []);
            setLearners(Array.isArray(roster?.learners) ? roster.learners : []);
          }
        } catch {}
      }

      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [backendUrl, orgToken, seatCap]);

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
  const logoutInstitution = async () => {
  try {
    // 1) Clear context (and whatever persistence your provider does)
    await setOrgToken?.('');            // if setOrgToken is sync, drop the await

    // 2) Clear every place that can resurrect org session
    localStorage.removeItem('orgToken');        // <-- use your real key
    localStorage.removeItem('auth:mode');
    localStorage.removeItem('auth:orgId');
    localStorage.removeItem('auth:token');      // legacy/just in case
    sessionStorage.removeItem('auth:returnTo');
    sessionStorage.removeItem('auth:returnTo:org');

    // If your backend also sets an HttpOnly cookie session, call its logout:
    // await fetch(`${backendUrl}/api/institution/logout`, { method: 'POST', credentials: 'include' });
  } catch {}

  // 3) Now navigate (no race)
  // nav('/org/portal/login?logout=1', { replace: true });
  window.location.assign('/org/portal/login?logout=1');
};

  /* --------------------------- unauthenticated --------------------------- */
  if (!orgToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-darkBg">
        <div className={`${cardBase} w-full max-w-md p-6`}>
          <h1 className="text-xl font-bold">Institution Profile</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-darkTextSecondary">
            Please sign in as an institution to continue.
          </p>
          <div className="mt-4">
            <Link
              to="/org/portal/login"
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
                  to="/org/portal"
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
                      to="/org/portal?tab=branding"
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
              <Link
                to="/org/portal?tab=assign"
                className={`text-sm font-semibold underline underline-offset-4 ${!instructors.length ? 'opacity-50 pointer-events-none' : ''}`}
                title={!instructors.length ? 'Add an instructor first' : 'Assign courses'}
              >
                Assign courses →
              </Link>

              <button
              onClick={() => { setInviteRole('instructor'); setInviteOpen(true); }}
              className="text-sm font-semibold underline underline-offset-4"
            >
              Invite instructor →
            </button>
                          
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
                    <PersonRow key={String(u.id)} u={u} onRemove={() => handleRemoveMember(u)} />
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
              
              <button
                onClick={() => { setInviteRole('learner'); setInviteOpen(true); }}
                className="text-sm font-semibold underline underline-offset-4"
              >
                Invite learners →
              </button>
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
                    <PersonRow key={String(u.id)} u={u} onRemove={() => handleRemoveMember(u)} />
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
                to="/org/portal?tab=branding"
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
            to="/org/portal"
            className="inline-flex h-10 px-4 items-center rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Open Portal
          </Link>
          <Link
            to="/org/portal?tab=assign"
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
          {/* Invite modal */}
          <InviteModal
            open={inviteOpen}
            initialRole={inviteRole}
            onClose={() => setInviteOpen(false)}
            onCreate={handleCreateMembershipInvite}
          />

      </div>

      {/* Mobile sticky bar */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-40 space-y-2">
        <div className="rounded-2xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300/30 overflow-hidden">
          <Link
            to="/org/portal"
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
