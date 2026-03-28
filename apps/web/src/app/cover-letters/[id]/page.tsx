import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  redirect(`/cover-letters/editor/${id}`);
}