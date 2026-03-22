import React from 'react';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import { coverLetterTemplateRegistryById } from '../../templates/coverLetterRegistry';

type Props = { draft: CoverLetterDraft };

const CoverLetterPreview: React.FC<Props> = ({ draft }) => {
  const template = coverLetterTemplateRegistryById[draft.templateId];
  const Template = template.component;
  return <Template draft={draft} />;
};

export default CoverLetterPreview;
