'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getCoverLetterPrintHtml, toCoverLetterExportJson } from '@cvpro/shared/api';
import type { CoverLetterDraft } from '@cvpro/shared/types';

function buildPrintReadyDocument(html: string) {
  const printRouteEnhancements = `
<style id="cover-letter-print-route-enhancements">
  @page { size: A4; margin: 0; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    overflow: hidden;
  }

  .cl-page {
    margin: 0 auto !important;
    box-shadow: none !important;
    width: 210mm !important;
    min-height: 297mm !important;
    overflow: visible !important;
  }

  @media print {
    html, body {
      overflow: visible !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .cl-page {
      margin: 0 !important;
      box-shadow: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
  }
</style>
<script>
  (function () {
    var heading = document.querySelector('.cl-header-name, h1');
    var title = heading && heading.textContent ? heading.textContent.trim() : '';
    if (title) document.title = title + ' - Cover Letter';

    window.addEventListener('keydown', function (event) {
      var isPrintShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p';
      if (!isPrintShortcut) return;
      event.preventDefault();
      window.print();
    });

    var printNow = function () {
      window.requestAnimationFrame(function () {
        window.print();
      });
    };

    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(function () { setTimeout(printNow, 120); });
    } else {
      setTimeout(printNow, 120);
    }
  })();
</script>`;

  if (html.includes('id="cover-letter-print-route-enhancements"')) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${printRouteEnhancements}</head>`);
  }

  return `${printRouteEnhancements}${html}`;
}

function decodePayload(raw: string | null): CoverLetterDraft | Record<string, any> | null {
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
        const res = await getCoverLetterPrintHtml(backendUrl, token, {
          coverLetterJson: toCoverLetterExportJson(payload),
        });
        const html = buildPrintReadyDocument(res.html || '');
        document.open();
        document.write(html);
        document.close();
      } catch (e: any) {
        setError(e?.message || 'Failed to render print view');
      }
    };
    void run();
  }, [backendUrl, token, params]);

  if (error) return <div className="p-6 text-sm text-rose-600">{error}</div>;
  return <div className="p-4 text-sm text-gray-500">Preparing cover-letter print preview…</div>;
}
