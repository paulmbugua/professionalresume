import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function ProjectForward({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="project-forward" title="Project Forward" />;
}
