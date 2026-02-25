'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getCvPrintHtml } from '@cvpro/shared/api';

export default function CvPrintPage() {
  const params = useParams();
  const draftId = (params as any)?.draftId as string | undefined;
  const { backendUrl, token } = useShopContext() as any;
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!backendUrl || !token || !draftId) return;
      try {
        const res = await getCvPrintHtml(backendUrl, token, draftId);
        setHtml(res.html || '');
      } catch (e: any) {
        setError(e?.message || 'Failed to load printable document');
      }
    };
    run();
  }, [backendUrl, token, draftId]);

  return (
    <div className="min-h-screen bg-white">
      {error ? (
        <div className="p-6 text-sm text-rose-600">{error}</div>
      ) : (
        <iframe
          title="CV Print"
          srcDoc={html}
          className="h-screen w-full"
          style={{ border: 0 }}
          onLoad={() => {
            setTimeout(() => window.print(), 250);
          }}
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
}
