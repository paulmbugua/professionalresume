'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShopContextProvider from '@mytutorapp/shared/context/ShopContext';
import { ThemeProvider } from '@mytutorapp/shared/hooks';

const storage = {
  getItem: async (k: string) => Promise.resolve(localStorage.getItem(k)),
  setItem: async (k: string, v: string) => {
    localStorage.setItem(k, v);
    return Promise.resolve();
  },
  removeItem: async (k: string) => {
    localStorage.removeItem(k);
    return Promise.resolve();
  },
};

const Providers: React.FC<React.PropsWithChildren> = ({ children }) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 2, refetchOnWindowFocus: false },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ShopContextProvider backendUrl={backendUrl} storage={storage}>
        <ThemeProvider>{children}</ThemeProvider>
      </ShopContextProvider>
    </QueryClientProvider>
  );
};

export default Providers;
