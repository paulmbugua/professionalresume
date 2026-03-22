import React from 'react';
import BaseCoverLetterTemplate from './BaseCoverLetterTemplate';

type Props = { draft: Record<string, unknown> & { templateId?: string } };

export default function ClassicLetter({ draft }: Props) {
  return <BaseCoverLetterTemplate draft={draft} templateId="classic-letter" />;
}
