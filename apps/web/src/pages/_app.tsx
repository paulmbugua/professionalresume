import type { AppProps } from 'next/app';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopContextProvider } from '@cvpro/shared/context';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShopContextProvider backendUrl={process.env.NEXT_PUBLIC_API_BASE_URL || ''}>
        <Component {...pageProps} />
      </ShopContextProvider>
    </QueryClientProvider>
  );
}
