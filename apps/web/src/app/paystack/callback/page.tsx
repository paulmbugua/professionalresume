import type { Metadata } from 'next';
import PaystackCallbackPage from '../../../pages/PaystackCallback.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Payment Verification | ProfessionalResume.co.ke',
  description: 'Secure payment verification callback for ProfessionalResume.co.ke checkout.',
  path: '/paystack/callback',
  noIndex: true,
});

export default function Page() {
  return <PaystackCallbackPage />;
}
