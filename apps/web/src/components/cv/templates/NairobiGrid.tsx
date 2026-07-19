import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function NairobiGrid({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="nairobi-grid" title="Nairobi Grid" />;
}
