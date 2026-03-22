import React from 'react';
import BaseCoverLetterTemplate from './BaseCoverLetterTemplate';

type Props = { draft: Record<string, unknown> & { templateId?: string } };

export default function ProfessionalBlueLetterhead({ draft }: Props) {
  return <BaseCoverLetterTemplate draft={draft} templateId="professional-blue-letterhead" />;
}
