'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CoverLetterPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cover-letters/new');
  }, [router]);

  return null;
};

export default CoverLetterPage;
