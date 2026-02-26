'use client';

import Link from 'next/link';
import { templateRegistry } from '../../../templates/registry';
import { buildPaginationStressDraft } from '../../../templates/paginationStressDraft';
import { withPreviewEnhancements } from '../../../utils/cvHtmlEnhance';

export default function PaginationDebugPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto mb-6 max-w-6xl rounded-xl bg-white p-4 shadow">
        <h1 className="text-lg font-semibold">Pagination Debug</h1>
        <p className="text-sm text-slate-600">
          Use browser print from this page for template stress testing.
        </p>
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => window.print()}
            className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
          >
            Print this page
          </button>
          <Link href="/builder" className="rounded border border-slate-300 px-3 py-1 text-sm">
            Open Builder
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6">
        {templateRegistry.map((template) => {
          const draft = buildPaginationStressDraft(template.id);
          const html = template.renderHtml
            ? withPreviewEnhancements(template.renderHtml(draft), draft)
            : '';
          return (
            <section key={template.id} className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {template.name}
              </h2>
              {html ? (
                <iframe
                  title={template.name}
                  srcDoc={html}
                  className="h-[1200px] w-full rounded border"
                  style={{ border: '1px solid #e2e8f0' }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <p className="text-sm text-rose-600">No HTML renderer registered.</p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
