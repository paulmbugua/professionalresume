import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';

type Result = { ok: boolean; collectionId: string; items: number; courseId: string };

export default function OpenStaxIngest() {
  const { backendUrl, adminToken } = useShopContext();

  const [title, setTitle] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [licenseText, setLicenseText] = useState('CC BY 4.0');
  const [licenseUrl, setLicenseUrl] = useState('https://creativecommons.org/licenses/by/4.0/');
  const [desc, setDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

 // Accept /books/<slug> OR /details/books/<slug>
const validOpenStax = (u: string) => {
  const s = (u || '').trim();
  if (!/^https?:\/\/([^/]+\.)?openstax\.org\//i.test(s)) return false;
  try {
    const url = new URL(s);
    return /^\/(?:details\/)?books\/[^/?#]+/i.test(url.pathname);
  } catch {
    return false;
  }
};

function canonicalizeOpenStax(u: string) {
  try {
    const url = new URL(u.trim());
    const m = url.pathname.match(/^\/(?:details\/)?books\/([^/?#]+)/i);
    if (m) {
      url.pathname = `/details/books/${m[1]}`;
      url.search = '';
      url.hash = '';
      return url.toString();
    }
  } catch {}
  return u.trim();
}



  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setResult(null);

  if (!title.trim()) { toast.error('Title is required'); return; }
  if (!validOpenStax(bookUrl)) {
    // try to fix it automatically once
    const fixed = canonicalizeOpenStax(bookUrl);
    if (!validOpenStax(fixed)) {
      toast.error('Paste a valid OpenStax book URL, e.g. https://openstax.org/details/books/<slug>');
      return;
    }
    // update the field so user sees the canonical URL
    setBookUrl(fixed);
  }

  try {
    setLoading(true);
    const cleaned = canonicalizeOpenStax(bookUrl);

    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/oer/ingest/openstax`, {
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
        license: { text: licenseText || undefined, url: licenseUrl || undefined },
        bookUrl: cleaned, // ⬅️ send canonical form
      }),
    });

      if (!res.ok) {
        const txt = await res.text().catch(() => 'Failed to ingest');
        throw new Error(txt);
      }
      const data = (await res.json()) as Result;
      setResult(data);
      toast.success(`Ingested ✔  ${data.items} chapters`);
      // optional reset of fields:
      // setTitle(''); setBookUrl(''); setSubject(''); setThumbnail(''); setDesc('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to ingest OpenStax book');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl pr-4">
      <h1 className="text-2xl font-semibold mb-3">OpenStax Ingest</h1>
      <p className="text-sm text-mutedGray dark:text-darkTextSecondary mb-6">
        Paste an OpenStax “View Online” URL and a title. We’ll scrape the HTML table of contents
        (no PDFs), create a free OER course + collection, and auto-discover the cover if you leave it blank.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          <label className="text-sm font-medium">
            Title <span className="text-red-500">*</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="Algebra and Trigonometry 2e"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="text-sm font-medium">
            OpenStax Book URL (“View Online”) <span className="text-red-500">*</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="https://openstax.org/details/books/algebra-and-trigonometry-2e"
              value={bookUrl}
              onChange={(e) => setBookUrl(e.target.value)}
              required
            />
            <small className="text-xs text-mutedGray dark:text-darkTextSecondary">
              Must match <code>openstax.org/details/books/&lt;slug&gt;</code>
            </small>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">
              Subject (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Math"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium">
              Cover URL (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                placeholder="Leave blank to auto-discover from OpenStax"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm font-medium">
            Description (optional)
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
              placeholder="Short blurb for the course card"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">
              License Text
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                value={licenseText}
                onChange={(e) => setLicenseText(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium">
              License URL
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-darkCard bg-white dark:bg-[#0f1821] px-3 py-2 outline-none"
                value={licenseUrl}
                onChange={(e) => setLicenseUrl(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Ingesting…' : 'Ingest OpenStax Book'}
          </button>
          <span className="text-xs text-mutedGray dark:text-darkTextSecondary">
            This will scrape the HTML ToC and create a free OER course.
          </span>
        </div>
      </form>

      {result && (
        <div className="mt-8 rounded-xl border border-gray-200 dark:border-darkCard p-4 bg-white dark:bg-[#0f1821]">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mb-2">
            <CheckCircle2 className="w-5 h-5" /> Ingest complete
          </div>
          <div className="text-sm grid gap-1">
            <div><b>Chapters:</b> {result.items}</div>
            <div><b>Collection ID:</b> {result.collectionId}</div>
            <div><b>Course ID:</b> {result.courseId}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {/* Useful quick links for validation */}
            <a
              className="underline"
              href={`${backendUrl.replace(/\/$/, '')}/api/oer/courses/${encodeURIComponent(result.courseId)}`}
              target="_blank" rel="noreferrer"
            >
              View Course JSON
            </a>
            <a
              className="underline"
              href={`${backendUrl.replace(/\/$/, '')}/api/oer/collections/${encodeURIComponent(result.collectionId)}/items`}
              target="_blank" rel="noreferrer"
            >
              View Items JSON
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
