import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Internal Component Preview | ProfessionalResume.co.ke',
  'Internal component preview route.'
);

export default function ComponentsLayout({ children }: { children: ReactNode }) {
  return children;
}
