import type { Metadata } from 'next';
import MessagesPage from '../../pages/Messages.web';
import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Private Messages | ProfessionalResume.co.ke',
  'Private account messages.'
);

export default function Page() {
  return <MessagesPage />;
}
