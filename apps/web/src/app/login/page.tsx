import type { Metadata } from 'next';
import LoginPage from '../../pages/LoginPage.web';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Login or Sign Up | CVPro Account Access',
  description:
    'Log in or create your CVPro account to save drafts, continue editing your resume, and complete secure checkout.',
  path: '/login',
  noIndex: true,
});

export default function Page() {
  return <LoginPage />;
}
