import type { Metadata } from 'next';
import CvBuilderNewPage from '../../../pages/CvBuilderNew.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Resume Draft | CVPro',
  description: 'Private CVPro draft creation flow.',
  path: '/builder/new',
  noIndex: true,
});

export default function Page() {
  return <CvBuilderNewPage />;
}
