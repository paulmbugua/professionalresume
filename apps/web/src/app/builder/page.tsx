import type { Metadata } from 'next';
import CvDraftsPage from '../../pages/CvDrafts.web';

export const metadata: Metadata = {
  title: 'My Drafts | CVPro',
  description: 'Resume editing drafts and recent CV projects.',
};

export default function Page() {
  return <CvDraftsPage />;
}
