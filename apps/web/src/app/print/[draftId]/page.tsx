'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getCvPrintHtml } from '@cvpro/shared/api';

function buildPrintReadyDocument(html: string) {
  const printRouteEnhancements = `
<style id="cv-print-route-enhancements">
  @page { size: A4; margin: 0; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Loaded /print page should already look like the final print doc */
  body {
    overflow: hidden;
  }

  .page {
    margin: 0 auto !important;
    box-shadow: none !important;
  }

  /* Sidebar templates: preserve color fill in screen + print */
  body[data-template-id="modern-sidebar"],
  body[data-template-id="modern-sidebar-blue"] {
    --cv-sidebar-width: 70mm;
    --cv-page-height: 297mm;
  }

  body[data-template-id="modern-sidebar"] .page,
  body[data-template-id="modern-sidebar-blue"] .page {
    background-image: linear-gradient(
      to right,
      var(--sidebarBg) 0 var(--cv-sidebar-width),
      #fff var(--cv-sidebar-width) 100%
    ) !important;
    background-repeat: no-repeat !important;
    background-size: 100% 100% !important;
    background-position: top left !important;
  }

  body[data-template-id="modern-sidebar"] aside,
  body[data-template-id="modern-sidebar-blue"] aside {
    background: transparent !important;
  }

  @media print {
    html, body {
      overflow: visible !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      margin: 0 !important;
      box-shadow: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
    }

    body[data-template-id="modern-sidebar"] .page,
    body[data-template-id="modern-sidebar-blue"] .page {
      background-repeat: repeat-y !important;
      background-size: 100% var(--cv-page-height) !important;
    }
  }
</style>
<script>
  (function () {
    var title = document.querySelector('h1')?.textContent?.trim();
    if (title) document.title = title + ' - CV';

    window.addEventListener('keydown', function (event) {
      var isPrintShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p';
      if (!isPrintShortcut) return;
      event.preventDefault();
      window.print();
    });

    setTimeout(function () {
      window.print();
    }, 120);
  })();
</script>`;

  if (html.includes('id="cv-print-route-enhancements"')) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${printRouteEnhancements}</head>`);
  }

  return `${printRouteEnhancements}${html}`;
}

export default function CvPrintPage() {
  const params = useParams();
  const draftId = (params as any)?.draftId as string | undefined;
  const { backendUrl, token } = useShopContext() as any;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!backendUrl || !token || !draftId) return;
      try {
        const res = await getCvPrintHtml(backendUrl, token, draftId);
        if (cancelled) return;

        const fullDoc = buildPrintReadyDocument(res.html || '');
        document.open();
        document.write(fullDoc);
        document.close();
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load printable document');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [backendUrl, token, draftId]);

  if (!error) {
    return <div className="p-4 text-sm text-gray-500">Preparing print document…</div>;
  }

  return <div className="p-6 text-sm text-rose-600">{error}</div>;
}
