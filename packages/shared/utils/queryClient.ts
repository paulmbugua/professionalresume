// packages/shared/utils/queryClient.ts
'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2, refetchOnWindowFocus: false },
  },
});

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient);

  return React.createElement(QueryClientProvider, { client }, children);
}
