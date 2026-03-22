'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useShopContext } from '@cvpro/shared/context';
import { useCoverLetterEntitlement, useExportCoverLetter } from '@cvpro/shared/hooks';
import type { CoverLetterDraft } from '@cvpro/shared/types';

const defaultDraft: CoverLetterDraft = {
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  applicantLocation: '',
  recipientName: '',
  companyName: '',
  roleTitle: '',
  letterBody: '',
  closingLine: 'Sincerely,',
};

export default function CoverLetterPage() {
  const { token, backendUrl } = useShopContext() as any;
  const [draft, setDraft] = useState<CoverLetterDraft>(defaultDraft);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const entitlement = useCoverLetterEntitlement({ backendUrl, token });
  const exportMutation = useExportCoverLetter({ backendUrl, token });

  const printHref = useMemo(() => {
    const bytes = new TextEncoder().encode(JSON.stringify(draft));
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const encoded = encodeURIComponent(btoa(binary));
    return `/cover-letter/print?payload=${encoded}`;
  }, [draft]);

  const update = (key: keyof CoverLetterDraft, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isEligible = entitlement.data?.eligible;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Cover letters are included free after a $1 resume purchase.</p>
        <p className="mt-1">Unlock editor + PDF export instantly once your qualifying payment completes.</p>
      </header>

      {!isEligible && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Cover letter is currently locked.</p>
          <p className="mt-1">Purchase a resume package to unlock this feature.</p>
          <Link href="/templates" className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-2 text-white">
            Go to resume purchase
          </Link>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {['applicantName','applicantEmail','applicantPhone','applicantLocation','recipientName','companyName','roleTitle','closingLine'].map((field) => (
          <label key={field} className="text-sm">
            <span className="mb-1 block capitalize text-slate-600">{field.replace(/([A-Z])/g, ' $1')}</span>
            <input
              disabled={!isEligible}
              value={(draft as any)[field] || ''}
              onChange={(e) => update(field as keyof CoverLetterDraft, e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
          </label>
        ))}
      </section>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-slate-600">Letter body</span>
        <textarea
          disabled={!isEligible}
          rows={12}
          value={draft.letterBody}
          onChange={(e) => update('letterBody', e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          disabled={!isEligible || exportMutation.isPending}
          onClick={async () => {
            const out = await exportMutation.mutateAsync(draft);
            setDownloadUrl(out.signedUrl || out.url || '');
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-slate-400"
        >
          Export PDF
        </button>
        <Link
          className={`rounded-lg px-4 py-2 text-white ${isEligible ? 'bg-slate-700' : 'bg-slate-400 pointer-events-none'}`}
          href={printHref}
          target="_blank"
        >
          Print preview
        </Link>
      </div>

      {!!downloadUrl && (
        <a className="mt-3 block text-sm text-blue-700 underline" href={downloadUrl} target="_blank" rel="noreferrer">
          Open exported file
        </a>
      )}
    </main>
  );
}
