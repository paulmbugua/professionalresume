// apps/web/src/pages/Videos.web.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useWrapOer } from '@mytutorapp/shared/hooks';
import OerAutoPreview from '../components/OerAutoPreview';

type Collection = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  thumbnail_url: string | null;
  items_count: number;
};

type OerItem = {
  slug: string;
  title: string;
  type: 'video'|'text';
  provider: string;
  subject: string;
  grade_level: string;
  thumbnail_url: string | null;
  source_url: string | null;
  embed_url: string | null;
  commercial_allowed: boolean;
  license: string | null;
  license_url: string | null;
  attribution_html: string | null;
};

const CardShell: React.FC<{ thumb?: string|null; onClick?: () => void; children: React.ReactNode }> = ({ thumb, onClick, children }) => (
  <div className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm flex flex-col overflow-hidden">
    <button
      type="button"
      onClick={onClick}
      className="relative group text-left"
      aria-label="Open"
      title="Open"
    >
      {thumb
        ? <img src={thumb} alt="" className="w-full h-40 object-cover" />
        : <div className="w-full h-40 bg-black/70" />
      }
      <span className="absolute inset-0 group-hover:bg-black/15 transition" />
    </button>
    <div className="p-4">{children}</div>
  </div>
);

const VideosPage: React.FC = () => {
  const navigate = useNavigate();
  const { idOrTitle } = useParams();
  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? '';
  const { wrap: wrapOer } = useWrapOer();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<OerItem[]>([]);
  const isList = !idOrTitle;

  useEffect(() => {
    if (!backendUrl) return;
    if (isList) {
      fetch(`${backendUrl}/api/oer/collections?limit=48`)
        .then(r => r.json())
        .then(setCollections)
        .catch(() => setCollections([]));
    } else {
      // Load items for a specific collection
      fetch(`${backendUrl}/api/oer/collections/${encodeURIComponent(idOrTitle!)}/items`)
        .then(r => r.json())
        .then(setItems)
        .catch(() => setItems([]));
    }
  }, [backendUrl, idOrTitle, isList]);

  if (isList) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold">Video Collections</h1>
        <p className="text-sm text-[#49739c] dark:text-darkTextSecondary mb-4">
          Curated free playlists from YouTube/Khan etc., styled like purchased videos.
        </p>
        {collections.length === 0 ? (
          <div className="py-10 text-[#49739c]">No collections yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {collections.map(c => (
              <CardShell key={c.id} thumb={c.thumbnail_url} onClick={() => navigate(`/videos/${c.id}`)}>
                <h3 className="font-semibold line-clamp-2">{c.title}</h3>
                <p className="text-sm text-[#49739c] dark:text-darkTextSecondary mt-1">
                  {c.subject ?? '—'} • {c.items_count} item{c.items_count === 1 ? '' : 's'}
                </p>
                {c.description && (
                  <p className="text-sm text-[#49739c] dark:text-darkTextSecondary line-clamp-2 mt-1">{c.description}</p>
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
      </main>
    );
  }

  // detail view
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
      {items.length === 0 ? (
        <div className="py-10 text-[#49739c]">No items in this collection.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-4">
          {items.map(v => {
            const watchUrl = v.embed_url || v.source_url || '#';
            const badge = `${(v.provider || '').toUpperCase()} • OER`;
            return (
              <div
                key={v.slug}
                className="bg-white dark:bg-[#0f1821] rounded-lg ring-1 ring-[#e7edf4] dark:ring-darkCard shadow-sm flex flex-col overflow-hidden"
              >
                {/* Autoplaying preview (muted) on hover/in-view using OerAutoPreview */}
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
                    {(v.provider || '').toUpperCase()} • {v.subject ?? '—'} {v.grade_level ? `• ${v.grade_level}` : ''}
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
                    {/* Optional: RobotTeacher jump-in */}
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
    </main>
  );
};

export default VideosPage;
