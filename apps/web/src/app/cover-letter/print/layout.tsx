import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { buildNoIndexMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Private Cover Letter Print Preview | ProfessionalResume.co.ke',
  'Private cover letter print preview.'
);

export default function CoverLetterPrintLayout({ children }: { children: ReactNode }) {
  return children;
}
