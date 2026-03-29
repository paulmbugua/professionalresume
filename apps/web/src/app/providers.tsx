'use client';

import React, { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

  // Create storage only once; guard window/localStorage just in case.
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

  // ✅ Create QueryClient once per app lifetime (prevents remount issues)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ShopContextProvider backendUrl={backendUrl} storage={storage}>
        <ThemeProvider applyToDocument storageKey="cvpro-theme">
          {children}
        </ThemeProvider>
      </ShopContextProvider>
    </QueryClientProvider>
  );
};

export default Providers;
