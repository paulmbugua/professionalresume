import React, { useMemo } from 'react';
import { renderCoverLetterHtmlByTemplate } from '@cvpro/shared/cover-letter/renderers/index.js';
import { stripScripts } from '../../../utils/sanitizeHtmlForIframe';

type CoverLetterDraft = Record<string, unknown> & { templateId?: string };

type Props = {
  draft: CoverLetterDraft;
  templateId: string;
};

export default function BaseCoverLetterTemplate({ draft, templateId }: Props) {
  const html = useMemo(
    () =>
      renderCoverLetterHtmlByTemplate({
        ...(draft || {}),
        templateId,
      }),
    [draft, templateId]
  );
  const safeHtml = useMemo(() => stripScripts(html), [html]);

  return (
    <iframe
      title={`Cover letter template ${templateId}`}
      srcDoc={safeHtml}
      sandbox="allow-same-origin"
      className="cover-letter-template-render block aspect-[210/297] w-full"
      style={{ border: 0, background: 'transparent' }}
    />
  );
}
