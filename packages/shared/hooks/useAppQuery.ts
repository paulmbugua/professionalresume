// packages/shared/hooks/useAppQuery.ts

import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
  QueryFunction,
} from '@tanstack/react-query'

export default function useAppQuery<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData
>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TQueryFnData, QueryKey>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn,

    // your standard defaults
    staleTime:            1000 * 60 * 5,    // 5 minutes
    gcTime:               1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect:   false,
    refetchOnMount:       false,
    retry:                false,

    ...options,
  })
}
