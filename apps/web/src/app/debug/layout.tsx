import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Internal Debug Route | ProfessionalResume.co.ke',
  'Internal development and quality-assurance route.'
);

export default function DebugLayout({ children }: { children: ReactNode }) {
  return children;
}
