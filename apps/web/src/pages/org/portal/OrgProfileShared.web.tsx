// apps/web/src/pages/org/portal/OrgProfileShared.web.tsx
import React, { useState } from 'react';

/* ----------------------------- shared types ----------------------------- */

export type MiniUser = {
  id: string | number;
  name?: string;
  email?: string;

  // optional staff fields (instructors)
  staff_code?: string | null;

  // optional learner fields
  admission_code?: string | null;
  class_label?: string | null;
  guardian_email?: string | null;

  // last issued temp password (instructor or learner)
  temp_password?: string | null;
};


/* ----------------------------- shared helpers ----------------------------- */

const FALLBACK = (n = 'Org') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=047857&color=ffffff`;

export const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK(fallbackName ?? 'Org');
  if (raw.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  return raw;
};

export const getInitials = (name?: string, email?: string) => {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '👤';
};

export const tierBadge = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') return 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30';
  if (tier === 'pro') return 'bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30';
  return 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30';
};

export const cardBase =
  'rounded-2xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821]';

/* -------------------------- shared UI components ------------------------- */

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-white/10 ${className || ''}`} />
);

export const PersonRow: React.FC<{ u: MiniUser; onRemove?: () => Promise<void> | void }> = ({
  u,
  onRemove,
}) => {
  const msg = `Hi${u.name ? ` ${u.name}` : ''}, I’d like to get in touch.`;
  const [removing, setRemoving] = useState(false);

  const doRemove = async () => {
    if (!onRemove) return;
    if (removing) return;
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-[#0b1620]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10 bg-slate-100 dark:bg-white/10 grid place-items-center text-xs font-semibold">
          {getInitials(u.name, u.email)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{u.name || u.email || `User #${u.id}`}</div>
          {u.email && (
            <div className="text-xs text-[#49739c] dark:text-darkTextSecondary truncate">
              {u.email}
            </div>
          )}
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
