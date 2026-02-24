'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';

type Props = {
  mode: 'consumer' | 'institution';
  consumerAuthedTo?: string; // default: '/builder'
  institutionAuthedTo?: string; // default: '/org/profile'
};

export default function GlobalAuthRedirect({
  mode,
  consumerAuthedTo = '/builder',
  institutionAuthedTo = '/org/profile',
}: Props) {
  const router = useRouter();
  const { token, orgToken, hydrated } = useShopContext() as any;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    if (mode === 'institution') {
      if (!hydrated) return;
      if (orgToken) router.replace(institutionAuthedTo);
      return;
    }

    if (token) {
      router.replace(consumerAuthedTo);
    }
  }, [mode, token, orgToken, hydrated, mounted, router, consumerAuthedTo, institutionAuthedTo]);

  return null;
}