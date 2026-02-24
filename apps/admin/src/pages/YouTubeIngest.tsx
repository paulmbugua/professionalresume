import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useShopContext } from '@cvpro/shared/context/ShopContext';

type Result = { ok: boolean; collectionId: string; items: number };

function splitUrls(input: string): string[] {
  return String(input || '')
    .split(/[\n,]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function YouTubeIngest() {
  const { backendUrl, adminToken } = useShopContext();

  const [title, setTitle] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [desc, setDesc] = useState('');
  const [slugPrefix, setSlugPrefix] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const urlCount = useMemo(() => splitUrls(urlsText).length, [urlsText]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const urls = splitUrls(urlsText);
    if (urls.length === 0) {
      toast.error('Paste at least one YouTube URL or ID');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/oer/ingest/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          collection: {
            title: title.trim(),
            description: desc || '',
            subject: subject || null,
            thumbnail_url: thumbnail || null,
          },
          grade_level: grade || null,
          urls,
          slug_prefix: slugPrefix || undefined,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => 'Failed to ingest');
        throw new Error(txt);
      }

      const data = (await res.json()) as Result;
      setResult(data);
      toast.success(`Ingested ✔  ${data.items} video${data.items === 1 ? '' : 's'}`);
      // Optional reset:
      // setTitle(''); setUrlsText(''); setSubject(''); setGrade(''); setThumbnail(''); setDesc(''); setSlugPrefix('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to ingest YouTube videos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl pr-4">
      <h1 className="text-2xl font-semibold mb-3">YouTube Ingest</h1>
      <p className="text-sm text-mutedGray dark:text-darkTextSecondary mb-6">
        Paste YouTube URLs or IDs (comma and/or newline separated). We’ll create/update a collection and
        upsert each video into <code>third_party_catalog</code> and link with <code>catalog_collection_items</code>.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium">
            Collection Title <span className="text-red-500">*</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="Middle school physics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="text-sm font-medium">
            YouTube URLs or IDs (comma/newline separated) <span className="text-red-500">*</span>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="https://www.youtube.com/watch?v=79FTQY9LoQU, https://youtu.be/W6Ar0ls6tVA, nIGEp5x0Ab4"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              required
            />
            <small className="text-xs text-mutedGray dark:text-darkTextSecondary">
              Detected: <b>{urlCount}</b> item{urlCount === 1 ? '' : 's'}
            </small>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">
              Subject (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label className="text-sm font-medium">
              Grade level (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Middle school"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">
              Collection Cover URL (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Optional cover for the collection card"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
              />
            </label>

            <label className="text-sm font-medium">
              Slug prefix (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Defaults from title (e.g., 'msp')"
                value={slugPrefix}
                onChange={(e) => setSlugPrefix(e.target.value)}
              />
              <small className="text-xs text-mutedGray dark:text-darkTextSecondary">
                Final slug format: <code>yt-&lt;prefix&gt;-&lt;videoId&gt;</code>
              </small>
            </label>
          </div>

          <label className="text-sm font-medium">
            Description (optional)
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="Short blurb for the collection"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Ingesting…' : 'Ingest YouTube Videos'}
          </button>
          <span className="text-xs text-mutedGray dark:text-darkTextSecondary">
            We’ll upsert into <code>third_party_catalog</code> and link to this collection.
          </span>
        </div>
      </form>

      {result && (
        <div className="mt-8 rounded-xl border border-gray-200 dark:border-darkCard p-4 bg-white dark:bg-[#0f1821]">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mb-2">
            <CheckCircle2 className="w-5 h-5" /> Ingest complete
          </div>
          <div className="text-sm grid gap-1">
            <div><b>Videos added/updated:</b> {result.items}</div>
            <div><b>Collection ID:</b> {result.collectionId}</div>
          </div>
          <div className="mt-3 text-xs text-mutedGray dark:text-darkTextSecondary">
            Titles saved like <code>{title} - #01</code>, <code>#{String(2).padStart(2,'0')}</code>, etc.
          </div>
        </div>
      )}
    </div>
  );
}
