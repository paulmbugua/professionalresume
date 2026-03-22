import React from 'react';
import BaseCoverLetterTemplate from './BaseCoverLetterTemplate';

type Props = { draft: Record<string, unknown> & { templateId?: string } };

export default function MinimalWideNameHeader({ draft }: Props) {
  return <BaseCoverLetterTemplate draft={draft} templateId="minimal-wide-name-header" />;
}
