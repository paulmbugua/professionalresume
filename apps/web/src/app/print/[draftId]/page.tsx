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
    document.body.classList.add('cv-print-route');
    return () => {
      document.body.classList.remove('cv-print-route');
    };
  }, []);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPrintShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
      if (!isPrintShortcut) return;

      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow) return;

      event.preventDefault();
      frameWindow.focus();
      frameWindow.print();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="cv-print-root bg-white">
      {error ? (
        <div className="p-6 text-sm text-rose-600">{error}</div>
      ) : (
        <iframe
          ref={iframeRef}
          title="CV Print"
          srcDoc={html}
          className="cv-print-frame"
          style={{ border: 0 }}
          scrolling="no"
          onLoad={() => {
            void handleFrameLoad();
          }}
          sandbox="allow-same-origin allow-scripts"
        />
      )}
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
        }
        body.cv-print-route {
          overflow: hidden;
          background: #fff !important;
        }
        body.cv-print-route .app-shell {
          min-height: 100dvh;
          background: #fff !important;
        }
        body.cv-print-route .app-shell > header {
          display: none !important;
        }
        body.cv-print-route .app-shell > main {
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
        }
        .cv-print-root {
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: #fff;
        }
        .cv-print-frame {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          overflow: hidden;
          background: #fff;
        }
        @media print {
          html,
          body,
          body.cv-print-route,
          body.cv-print-route .app-shell,
          body.cv-print-route .app-shell > main,
          .cv-print-root,
          .cv-print-frame {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}
