'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getCoverLetterPrintHtml } from '@cvpro/shared/api';
import type { CoverLetterDraft } from '@cvpro/shared/types';

function decodePayload(raw: string | null): CoverLetterDraft | null {
  if (!raw) return null;
  try {
    const binary = atob(decodeURIComponent(raw));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as CoverLetterDraft;
  } catch {
    return null;
  }
}

export default function CoverLetterPrintPage() {
  const params = useSearchParams();
  const { backendUrl, token } = useShopContext() as any;
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      const payload = decodePayload(params?.get('payload') || null);
      if (!payload || !backendUrl || !token) return;
      try {
        const res = await getCoverLetterPrintHtml(backendUrl, token, { coverLetterJson: payload });
        const html = (res.html || '').replace(
          '</head>',
          `<style>
            @media print {
              nav,header,footer,.app-chrome,[data-app-chrome]{ display:none !important; }
              body { margin:0 !important; background:#fff !important; }
            }
          </style></head>`,
        );
        document.open();
        document.write(html);
        document.close();
        setTimeout(() => window.print(), 120);
      } catch (e: any) {
        setError(e?.message || 'Failed to render print view');
      }
    };
    void run();
  }, [backendUrl, token, params]);

  if (error) return <div className="p-6 text-sm text-rose-600">{error}</div>;
  return <div className="p-4 text-sm text-gray-500">Preparing cover-letter print preview…</div>;
}
