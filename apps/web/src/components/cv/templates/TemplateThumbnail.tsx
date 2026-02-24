import React from 'react';
import { stripScripts } from '../../../utils/sanitizeHtmlForIframe';

type Props = {
  html?: string;
  label: string;
};

const TemplateThumbnail: React.FC<Props> = ({ html, label }) => {
  if (!html) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-softGray text-xs text-gray-500 dark:border-white/10 dark:from-white/5 dark:to-darkCard">
        Preview unavailable
      </div>
    );
  }

  const safeHtml = stripScripts(html);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cv iframe]', { template: `Thumbnail:${label}` });
  }

  return (
    <div className="relative h-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10">
      <div className="absolute left-0 top-0 h-[1130px] w-[820px] origin-top-left scale-[0.27]">
        <iframe
          title={`${label} thumbnail`}
          srcDoc={safeHtml}
          sandbox="allow-same-origin"
          loading="lazy"
          className="h-[1130px] w-[820px]"
          style={{ border: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
};

export default TemplateThumbnail;
