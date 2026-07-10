import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function AcademicCompact({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="academic-compact" title="Academic Compact" />;
}
