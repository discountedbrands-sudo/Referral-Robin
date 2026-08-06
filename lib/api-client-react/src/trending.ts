import { useQuery } from '@tanstack/react-query';
import type { QueryFunction, QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { ErrorType } from './custom-fetch';
import type { Brand } from './generated/api.schemas';

// Hand-written, not orval-generated — see @workspace/api-zod's admin.ts for
// why. Public endpoint (unlike admin.ts's hooks) — trending brands are
// shown on the homepage to signed-out visitors too.

export const getGetTrendingBrandsUrl = () => `/api/brands/trending`;

/**
 * @summary Top brands by request volume in the last 7 (or 30) days,
 * recalculated once a day server-side.
 */
export const getTrendingBrands = async (options?: Parameters<typeof customFetch>[1]): Promise<Brand[]> => {
  return customFetch<Brand[]>(getGetTrendingBrandsUrl(), { ...options, method: 'GET' });
};

export const getGetTrendingBrandsQueryKey = () => [`/api/brands/trending`] as const;

export const getGetTrendingBrandsQueryOptions = <TData = Brand[], TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<Brand[], TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetTrendingBrandsQueryKey();
  const queryFn: QueryFunction<Brand[]> = ({ signal }) => getTrendingBrands({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Brand[], TError, TData> & { queryKey: QueryKey };
};

export const useGetTrendingBrands = <TData = Brand[], TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<Brand[], TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryOptions = getGetTrendingBrandsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
};
