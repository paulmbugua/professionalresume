import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function SkillMatrix({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="skill-matrix" title="Skill Matrix" />;
}
