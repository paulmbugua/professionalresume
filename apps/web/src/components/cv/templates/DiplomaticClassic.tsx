import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function DiplomaticClassic({ draft }: Props) {
  return (
    <SharedRendererTemplate
      draft={draft}
      templateId="diplomatic-classic"
      title="Diplomatic Classic"
    />
  );
}
