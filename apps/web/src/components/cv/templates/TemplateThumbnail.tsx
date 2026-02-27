import React from 'react';
import { stripScripts } from '../../../utils/sanitizeHtmlForIframe';

type Props = {
  html?: string;
  label: string;
};

const BASE_W = 820;
const BASE_H = 1130;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const TemplateThumbnail: React.FC<Props> = ({ html, label }) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0.27);

  if (!html) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-softGray text-xs text-gray-500 dark:border-white/10 dark:from-white/5 dark:to-darkCard">
        Preview unavailable
      </div>
    );
  }

  const safeHtml = React.useMemo(() => {
    const cleaned = stripScripts(html);
    // Helps remove default margins/scrollbars that create “fake gaps”
    const injected = `
      <style>
        html, body { margin:0 !important; padding:0 !important; background:#fff; }
        body { overflow:hidden !important; }
        ::-webkit-scrollbar { width:0px; height:0px; }
      </style>
    `;
    return injected + cleaned;
  }, [html]);

  React.useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth || 1;

      // ✅ SCALE TO COVER WIDTH (no right gap).
      // A little cropping top/bottom is fine for a thumbnail.
      const horizontalPadding = 0;
      const usable = Math.max(1, w - horizontalPadding);

      const s = usable / BASE_W;

      // Clamp for sanity
      setScale(clamp(s, 0.15, 0.9));
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cv iframe]', { template: `Thumbnail:${label}` });
  }

  return (
    <div
      ref={frameRef}
      className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10"
    >
      {/* Center the page so no left/right empty side bias */}
      <div
        className="absolute top-2 left-1/2"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
          willChange: 'transform',
        }}
      >
        <iframe
          title={`${label} thumbnail`}
          srcDoc={safeHtml}
          sandbox="allow-same-origin"
          loading="lazy"
          className="h-full w-full"
          style={{ border: 0, pointerEvents: 'none' }}
        />
      </div>

      {/* Premium fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/5 to-transparent dark:from-black/20" />
    </div>
  );
};

export default TemplateThumbnail;