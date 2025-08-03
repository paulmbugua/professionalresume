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
  return useQuery<TQueryFnData, TError, TData>({
    queryKey,
    queryFn,

    // 1️⃣ Treat data as fresh for 5 minutes
    staleTime: 1000 * 60 * 5,

    // 2️⃣ Never auto‐refetch on mount / window focus / reconnect
    refetchOnMount:       false,
    refetchOnWindowFocus: false,
    refetchOnReconnect:   false,

    // 3️⃣ Retry twice with exponential backoff
    retry:      2,
    retryDelay: attemptIndex =>
      Math.min(1000 * 2 ** attemptIndex, 30_000),

    ...options,
  })
}
