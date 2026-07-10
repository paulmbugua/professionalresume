import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import SharedRendererTemplate from './SharedRendererTemplate';

type Props = { draft: CvDraft };

export default function OperationsLedger({ draft }: Props) {
  return <SharedRendererTemplate draft={draft} templateId="operations-ledger" title="Operations Ledger" />;
}
