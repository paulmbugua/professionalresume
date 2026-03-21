'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { getCvPrintHtml } from '@cvpro/shared/api';

export default function CvPrintPage() {
  const params = useParams();
  const draftId = (params as any)?.draftId as string | undefined;
  const { backendUrl, token } = useShopContext() as any;
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasTriggeredPrintRef = useRef(false);

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

  const waitForPrintableContent = async (frame: HTMLIFrameElement) => {
    const frameWindow = frame.contentWindow;
    const frameDoc = frame.contentDocument;
    if (!frameWindow || !frameDoc) return;

    if ((frameDoc as any).fonts?.ready) {
      try {
        await (frameDoc as any).fonts.ready;
      } catch {
        // ignore font readiness failures
      }
    }

    const images = Array.from(frameDoc.images || []);
    await Promise.all(
      images.map(async (img) => {
        if (img.complete) return;
        try {
          if (typeof (img as any).decode === 'function') {
            await (img as any).decode();
            return;
          }
        } catch {
          // ignore decode errors and fall back to load/error events
        }
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      })
    );

    await new Promise<void>((resolve) => frameWindow.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => frameWindow.requestAnimationFrame(() => resolve()));
  };

  const handleFrameLoad = async () => {
    const frame = iframeRef.current;
    if (!frame || !html || hasTriggeredPrintRef.current) return;

    hasTriggeredPrintRef.current = true;
    await waitForPrintableContent(frame);

    const frameWindow = frame.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <div className="cv-print-root min-h-screen bg-white">
      {error ? (
        <div className="p-6 text-sm text-rose-600">{error}</div>
      ) : (
        <iframe
          ref={iframeRef}
          title="CV Print"
          srcDoc={html}
          className="cv-print-frame h-screen w-full"
          style={{ border: 0 }}
          onLoad={() => {
            void handleFrameLoad();
          }}
          sandbox="allow-same-origin allow-scripts"
        />
      )}
      <style jsx global>{`
        @media print {
          body > * {
            visibility: hidden !important;
          }
          .cv-print-root,
          .cv-print-root * {
            visibility: visible !important;
          }
          .cv-print-root {
            position: fixed !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            background: #fff !important;
          }
          .cv-print-frame {
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
