'use client';

import React, { useMemo } from 'react';
import { AppQueryProvider } from '@cvpro/shared/utils/queryClient';
import ShopContextProvider from '@cvpro/shared/context/ShopContext';
import { ThemeProvider } from '@cvpro/shared/hooks';
import { logResolvedBackendUrl, resolveBackendUrl } from '../lib/backendUrl';

type AsyncStorageLike = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
};

const Providers = ({ children }: { children: React.ReactNode }) => {
  const backendUrl = resolveBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  logResolvedBackendUrl('providers', backendUrl);

  const storage: AsyncStorageLike = useMemo(
    () => ({
      getItem: async (k: string) =>
        typeof window === 'undefined' ? null : window.localStorage.getItem(k),

      setItem: async (k: string, v: string) => {
        if (typeof window !== 'undefined') window.localStorage.setItem(k, v);
      },

      removeItem: async (k: string) => {
        if (typeof window !== 'undefined') window.localStorage.removeItem(k);
      },
    }),
    []
  );

  return (
    <AppQueryProvider>
      <ShopContextProvider backendUrl={backendUrl} storage={storage}>
        <ThemeProvider applyToDocument storageKey="cvpro-theme">
          {children}
        </ThemeProvider>
      </ShopContextProvider>
    </AppQueryProvider>
  );
};

export default Providers;
