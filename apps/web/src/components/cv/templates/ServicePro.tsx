import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function ServicePro({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="service-pro" title="Service Pro" />;
}
