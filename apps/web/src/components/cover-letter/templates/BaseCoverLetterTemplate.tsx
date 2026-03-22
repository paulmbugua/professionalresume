import React, { useMemo } from 'react';
import { renderCoverLetterHtmlByTemplate } from '@cvpro/shared/cover-letter/renderers/index.js';

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

  return (
    <div
      className="cover-letter-template-render h-full w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
