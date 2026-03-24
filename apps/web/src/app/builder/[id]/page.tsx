import type { Metadata } from 'next';
import CvBuilderPage from '../../../pages/CvBuilderPage.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Builder Workspace | CVPro',
  description: 'Private resume editing workspace for your CVPro draft.',
  path: '/builder/[id]',
  noIndex: true,
});

export default function Page() {
  return <CvBuilderPage />;
}
