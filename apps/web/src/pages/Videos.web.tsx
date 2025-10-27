// apps/web/src/pages/Videos.web.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWrapOer } from '@mytutorapp/shared/hooks';
import OerAutoPreview from '../components/OerAutoPreview';

type Collection = {
  id: string | number;
  title: string;
  description?: string | null;
  subject?: string | null;
  thumbnail_url?: string | null;
  items_count?: number;
  content_kind?: string | null; // 'video'
  [k: string]: any;
};

type OerItem = {
  slug: string;
  title: string;
  type: 'video' | 'text';
  provider: string;
  subject: string | null;
  grade_level?: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  embed_url: string | null;
  commercial_allowed: boolean;
  license: string | null;
  license_url: string | null;
  attribution_html: string | null;
};

const CardShell: React.FC<{
  thumb?: string | null;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ thumb, onClick, children }) => (
  <div className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm flex flex-col overflow-hidden">
    <button
      type="button"
      onClick={onClick}
      className="relative group text-left"
      aria-label="Open"
      title="Open"
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-black/70" />
      )}
      <span className="absolute inset-0 group-hover:bg-black/15 transition" />
    </button>
    <div className="p-4">{children}</div>
  </div>
);

/** Normalize any API response into a plain array so .map() is always safe. */
function toArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.data)) return parsed.data;
      return [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data)) return val.data;
  if (Array.isArray(val?.rows)) return val.rows;
  if (typeof val === 'object') {
    // Prefer arrays hidden inside objects (e.g., { collections: [...] })
    for (const k of ['collections', 'results', 'list']) {
      if (Array.isArray((val as any)[k])) return (val as any)[k];
    }
    const vals = Object.values(val);
    return vals.every((v) => typeof v === 'object') ? (vals as T[]) : [];
  }
  return [];
}

const safeNumber = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const VideosPage: React.FC = () => {
  const navigate = useNavigate();
  const { idOrTitle } = useParams();
  const { wrap: wrapOer } = useWrapOer();

  // ── API base with safe fallbacks (env → window → relative)
  const apiBase = useMemo(() => {
    const env = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
    if (env) return env.replace(/\/+$/, '');
    if (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) {
      return String((window as any).__BACKEND_URL__).replace(/\/+$/, '');
    }
    return ''; // same-origin relative
  }, []);
  const url = (path: string) => `${apiBase}${path}`;

  const isList = !idOrTitle;

  // list state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);

  // detail state
  const [items, setItems] = useState<OerItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [errorItems, setErrorItems] = useState<string | null>(null);

  // ✅ Hooks must not be inside conditionals
  const list = useMemo(() => toArray<Collection>(collections), [collections]);
  const itemList = useMemo(() => toArray<OerItem>(items), [items]);

  useEffect(() => {
    let aborted = false;

    async function fetchCollections() {
      setLoadingList(true);
      setErrorList(null);
      try {
        // try kind=video
        let r = await fetch(url('/api/oer/collections?kind=video&limit=48'));
        // if backend expects content_kind
        if (!r.ok) {
          // still throw — will be caught and retried below
          throw new Error(`${r.status} ${r.statusText}`);
        }
        let data = await r.json().catch(() => []);
        let arr = toArray<Collection>(data);

        // fallback: try content_kind=video if empty
        if (arr.length === 0) {
          r = await fetch(url('/api/oer/collections?content_kind=video&limit=48'));
          if (r.ok) {
            data = await r.json().catch(() => []);
            arr = toArray<Collection>(data);
          }
        }

        // last resort: fetch unfiltered and filter client-side
        if (arr.length === 0) {
          r = await fetch(url('/api/oer/collections?limit=48'));
          if (r.ok) {
            data = await r.json().catch(() => []);
            const all = toArray<Collection>(data);
            arr = all.filter(
              (c) =>
                String(c.content_kind || '').toLowerCase().includes('video') ||
                /video/i.test(c.title || '')
            );
          }
        }

        if (!aborted) setCollections(arr);
      } catch (e: any) {
        if (!aborted) {
          setCollections([]);
          setErrorList(String(e?.message || e) || 'Failed to fetch');
        }
      } finally {
        if (!aborted) setLoadingList(false);
      }
    }

    async function fetchItems() {
      setLoadingItems(true);
      setErrorItems(null);
      try {
        const r = await fetch(url(`/api/oer/collections/${encodeURIComponent(idOrTitle!)}/items`));
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const data = await r.json().catch(() => []);
        if (!aborted) setItems(toArray<OerItem>(data));
      } catch (e: any) {
        if (!aborted) {
          setItems([]);
          setErrorItems(String(e?.message || e) || 'Failed to fetch');
        }
      } finally {
        if (!aborted) setLoadingItems(false);
      }
    }

    if (isList) fetchCollections();
    else fetchItems();

    return () => {
      aborted = true;
    };
  }, [apiBase, idOrTitle, isList]); // apiBase is stable via useMemo

  /* ─────────────────────
     LIST VIEW
     ───────────────────── */
  if (isList) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold">Free Video Collections</h1>
        <p className="text-sm text-[#49739c] dark:text-darkTextSecondary mb-4">
          Curated open educational video playlists (OER).
        </p>

        {loadingList && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard overflow-hidden">
                <div className="w-full h-40 bg-gray-200/70 dark:bg-white/5 animate-pulse" />
                <div className="p-4">
                  <div className="h-4 w-2/3 bg-gray-200/70 dark:bg-white/5 rounded animate-pulse" />
                  <div className="mt-2 h-3 w-1/2 bg-gray-200/70 dark:bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingList && errorList && (
          <div className="py-6 text-red-600 dark:text-red-400">{errorList}</div>
        )}

        {!loadingList && !errorList && (
          <>
            {list.length === 0 ? (
              <div className="py-10 text-[#49739c]">No collections yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {list.map((c) => (
                  <CardShell
                    key={String(c.id)}
                    thumb={c.thumbnail_url ?? undefined}
                    onClick={() => navigate(`/videos/${encodeURIComponent(String(c.id))}`)}
                  >
                    <h3 className="font-semibold line-clamp-2">{c.title}</h3>
                    <p className="text-sm text-[#49739c] dark:text-darkTextSecondary mt-1">
                      {(c.subject ?? '—')} • {safeNumber(c.items_count, 0)} item
                      {safeNumber(c.items_count, 0) === 1 ? '' : 's'}
                    </p>
                    {c.description && (
                      <p className="text-sm text-[#49739c] dark:text-darkTextSecondary line-clamp-2 mt-1">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <button className="h-9 px-4 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-sm font-semibold">
                        View Collection
                      </button>
                    </div>
                  </CardShell>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  /* ─────────────────────
     DETAIL VIEW
     ───────────────────── */
  const startOerRobot = async (slug: string) => {
    try {
      const r = await wrapOer(slug);
      navigate(`/progress/${r.courseId}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to launch RobotTeacher');
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collection</h1>
        <Link to="/videos" className="text-primary hover:underline">All Collections</Link>
      </div>

      {loadingItems && <div className="py-10 text-[#49739c]">Loading…</div>}
      {!loadingItems && errorItems && <div className="py-10 text-red-600 dark:text-red-400">{errorItems}</div>}

      {!loadingItems && !errorItems && (
        <>
          {itemList.length === 0 ? (
            <div className="py-10 text-[#49739c]">No items in this collection.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-4">
              {itemList.map((v) => {
                const watchUrl = v.embed_url || v.source_url || '#';
                const badge = `${(v.provider || '').toUpperCase()} • OER`;
                return (
                  <div
                    key={v.slug}
                    className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm flex flex-col overflow-hidden"
                  >
                    <OerAutoPreview
                      title={v.title}
                      embedUrl={v.embed_url || undefined}
                      thumbnailUrl={v.thumbnail_url || undefined}
                      badge={badge}
                      onClick={() => window.open(watchUrl, '_blank', 'noopener')}
                    />

                    <div className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-2">{v.title}</h3>
                      <p className="text-xs text-[#49739c] dark:text-darkTextSecondary mt-1">
                        {(v.provider || '').toUpperCase()} • {v.subject ?? '—'}{' '}
                        {v.grade_level ? `• ${v.grade_level}` : ''}
                      </p>

                      <div className="mt-3 flex gap-2">
                        {v.source_url && (
                          <a
                            href={v.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 h-9 rounded-lg bg-white dark:bg-[#0f1821] ring-1 ring-[#cedbe8] dark:ring-darkCard text-xs font-semibold flex items-center justify-center"
                            title="View at source"
                          >
                            View at Source
                          </a>
                        )}
                        {v.embed_url && (
                          <a
                            href={v.embed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 h-9 rounded-lg bg-[#3d99f5] text-white text-xs font-semibold hover:brightness-110 flex items-center justify-center"
                            title="Watch"
                          >
                            Watch
                          </a>
                        )}
                        {v.slug && (
                          <button
                            type="button"
                            onClick={() => startOerRobot(v.slug)}
                            className="flex-1 h-9 rounded-lg ring-1 ring-[#cedbe8] dark:ring-darkCard text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#172534]"
                            title="Learn with RobotTeacher"
                          >
                            Learn Course
                          </button>
                        )}
                      </div>

                      {v.license && (
                        <p className="mt-2 text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                          License: {v.license}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default VideosPage;
