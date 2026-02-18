import type { Metadata } from 'next';
import CvTemplatesPage from '../../pages/CvTemplates.web';

export const metadata: Metadata = {
  title: 'Templates | CVPro',
  description: 'Browse ATS-friendly CV templates.',
};

export default function Page() {
  return <CvTemplatesPage />;
}
