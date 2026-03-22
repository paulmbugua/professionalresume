import React from 'react';
import BaseCoverLetterTemplate from './BaseCoverLetterTemplate';

type Props = { draft: Record<string, unknown> & { templateId?: string } };

export default function SimpleEverydayFormal({ draft }: Props) {
  return <BaseCoverLetterTemplate draft={draft} templateId="simple-everyday-formal" />;
}
