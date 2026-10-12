import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';
export default function ExecutiveNavyOrange({ draft }: { draft: CvDraft }) {
  return (
    <SharedRendererTemplate
      draft={draft}
      templateId="executive-navy-orange"
      title="Executive Navy & Orange"
    />
  );
}
