import React from 'react';
import BaseCoverLetterTemplate from './BaseCoverLetterTemplate';

type Props = { draft: Record<string, unknown> & { templateId?: string } };

export default function PremiumElegantBusiness({ draft }: Props) {
  return <BaseCoverLetterTemplate draft={draft} templateId="premium-elegant-business" />;
}
