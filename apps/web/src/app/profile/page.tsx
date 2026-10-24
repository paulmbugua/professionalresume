import type { Metadata } from 'next';
import React from 'react';
import ProfilePage from '../../pages/ProfilePage.web';
import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Private Account Profile | ProfessionalResume.co.ke',
  'Private account and document dashboard.'
);

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProfilePage />;
}
