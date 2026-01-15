// packages/shared/hooks/useAppQuery.ts
'use client';

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

export default function useAppQuery<TData, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn,
    ...(options ?? {}),
  });
}
