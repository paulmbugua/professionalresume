import type { Metadata } from 'next';
import LoginPage from '../../pages/LoginPage.web';

export const metadata: Metadata = {
  title: 'Login | CVPro',
  description: 'Sign in to CVPro to continue editing your CV drafts.',
  alternates: { canonical: '/login' },
};

export default function Page() {
  return <LoginPage />;
}
