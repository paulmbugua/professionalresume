import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Private Print Preview | ProfessionalResume.co.ke',
  'Private document print preview.'
);

export default function PrintLayout({ children }: { children: ReactNode }) {
  return children;
}
