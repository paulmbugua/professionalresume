import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildNoIndexMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata(
  'Private Cover Letter Redirect | ProfessionalResume.co.ke',
  'Private cover letter workspace redirect.'
);

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  redirect(`/cover-letters/editor/${id}`);
}
