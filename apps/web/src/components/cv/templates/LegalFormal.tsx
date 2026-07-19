import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function LegalFormal({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="legal-formal" title="Legal Formal" />;
}
