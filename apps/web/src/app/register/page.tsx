import type { Metadata } from 'next';

import LoginPage from '../../pages/LoginPage.web';
import { brand, seoKeywords } from '../../lib/brand';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Register | ${brand.name}`,
  description:
    'Create your ProfessionalResume.co.ke account to manage CVs, cover letters, ATS reports, downloads, billing, interview practice, and AI career coaching.',
  path: '/register',
  keywords: ['register CV builder Kenya', 'ProfessionalResume account', ...seoKeywords],
  noIndex: true,
});

export default function Page() {
  return <LoginPage />;
}
