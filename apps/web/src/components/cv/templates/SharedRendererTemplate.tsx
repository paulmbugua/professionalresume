import React, { useMemo } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { renderCvHtmlByTemplate } from '@cvpro/shared/cv/renderers/index.js';
import { logScriptProbe, stripScripts } from '../../../utils/sanitizeHtmlForIframe';

type Props = {
  draft: CvDraft;
  templateId: string;
  title: string;
};

export default function SharedRendererTemplate({ draft, templateId, title }: Props) {
  const html = useMemo(
    () => renderCvHtmlByTemplate({ ...(draft || {}), templateId }),
    [draft, templateId]
  );
  const safeHtml = useMemo(() => stripScripts(html), [html]);

  if (process.env.NODE_ENV !== 'production') {
    logScriptProbe(templateId, html);
    console.log('[cv iframe]', { template: title });
  }

  return (
    <iframe
      title={title}
      className="min-h-full h-full w-full rounded-xl border border-gray-200 bg-white"
      sandbox="allow-same-origin"
      scrolling="yes"
      srcDoc={safeHtml}
      style={{ height: '100%', width: '100%', border: 0 }}
    />
  );
}
