import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { ErrorType, BodyType } from './custom-fetch';

// Hand-written, not orval-generated like ./generated/api — see
// @workspace/api-zod's admin.ts for why (no codegen pipeline wired up in
// this repo). Mirrors the same shape/conventions the generated hooks use.

export type BrandSubmissionStatus = 'approved' | 'auto_approved' | 'pending' | 'rejected';

// --- Submit a brand (any signed-in user — any submission that passes the
// server's rule-based validation, bare domain + plain-text offer, goes live
// immediately; see CreateBrandBody in @workspace/api-zod) ---

export interface CreateBrandInput {
  name: string;
  domain: string;
  category: string;
  /** Defaults to "UK" server-side if omitted. */
  country?: string;
  currentOffer: string;
}

export interface CreatedBrand {
  id: number;
  name: string;
  logoUrl?: string | null;
  currentOffer?: string | null;
  category: string;
  country: string;
  active: boolean;
  submissionStatus: BrandSubmissionStatus;
}

export const getCreateBrandUrl = () => `/api/brands/submit`;

/**
 * @summary Submit a new brand — any signed-in user
 */
export const createBrand = async (
  data: CreateBrandInput,
  options?: Parameters<typeof customFetch>[1],
): Promise<CreatedBrand> => {
  return customFetch<CreatedBrand>(getCreateBrandUrl(), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const useCreateBrand = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<CreatedBrand, TError, { data: BodyType<CreateBrandInput> }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<CreatedBrand, TError, { data: BodyType<CreateBrandInput> }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ data }) => createBrand(data, requestOptions),
    ...mutationOptions,
  });
};

// --- List all brands (admin only — active, inactive, pending, rejected) ---

export type AdminBrand = CreatedBrand & { createdAt: string };

export const getListBrandsAdminUrl = () => `/api/admin/brands`;

/**
 * @summary List all brands, active and inactive (admin only)
 */
export const listBrandsAdmin = async (options?: Parameters<typeof customFetch>[1]): Promise<AdminBrand[]> => {
  return customFetch<AdminBrand[]>(getListBrandsAdminUrl(), { ...options, method: 'GET' });
};

export const getListBrandsAdminQueryKey = () => [`/api/admin/brands`] as const;

export const getListBrandsAdminQueryOptions = <TData = AdminBrand[], TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<AdminBrand[], TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListBrandsAdminQueryKey();
  const queryFn: QueryFunction<AdminBrand[]> = ({ signal }) => listBrandsAdmin({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<AdminBrand[], TError, TData> & { queryKey: QueryKey };
};

export const useListBrandsAdmin = <TData = AdminBrand[], TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<AdminBrand[], TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryOptions = getListBrandsAdminQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
};

// --- Edit a brand (admin only) ---

export interface UpdateBrandInput {
  name?: string;
  domain?: string;
  category?: string;
  country?: string;
  currentOffer?: string;
  active?: boolean;
}

export const getUpdateBrandUrl = (brandId: number) => `/api/admin/brands/${brandId}`;

/**
 * @summary Edit a brand (admin only)
 */
export const updateBrand = async (
  brandId: number,
  data: UpdateBrandInput,
  options?: Parameters<typeof customFetch>[1],
): Promise<AdminBrand> => {
  return customFetch<AdminBrand>(getUpdateBrandUrl(brandId), {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const useUpdateBrand = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<AdminBrand, TError, { brandId: number; data: BodyType<UpdateBrandInput> }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<AdminBrand, TError, { brandId: number; data: BodyType<UpdateBrandInput> }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ brandId, data }) => updateBrand(brandId, data, requestOptions),
    ...mutationOptions,
  });
};

// --- Approve / reject a pending submission (admin only) ---

export const getApproveBrandUrl = (brandId: number) => `/api/admin/brands/${brandId}/approve`;
export const getRejectBrandUrl = (brandId: number) => `/api/admin/brands/${brandId}/reject`;

export const approveBrand = async (
  brandId: number,
  options?: Parameters<typeof customFetch>[1],
): Promise<AdminBrand> => {
  return customFetch<AdminBrand>(getApproveBrandUrl(brandId), { ...options, method: 'POST' });
};

export const rejectBrand = async (
  brandId: number,
  options?: Parameters<typeof customFetch>[1],
): Promise<AdminBrand> => {
  return customFetch<AdminBrand>(getRejectBrandUrl(brandId), { ...options, method: 'POST' });
};

export const useApproveBrand = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<AdminBrand, TError, { brandId: number }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<AdminBrand, TError, { brandId: number }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ brandId }) => approveBrand(brandId, requestOptions),
    ...mutationOptions,
  });
};

export const useRejectBrand = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<AdminBrand, TError, { brandId: number }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<AdminBrand, TError, { brandId: number }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ brandId }) => rejectBrand(brandId, requestOptions),
    ...mutationOptions,
  });
};

// --- Delete a brand (admin only) ---

export const getDeleteBrandUrl = (brandId: number) => `/api/admin/brands/${brandId}`;

/**
 * @summary Delete a brand (admin only)
 */
export const deleteBrand = async (
  brandId: number,
  options?: Parameters<typeof customFetch>[1],
): Promise<{ success: boolean }> => {
  return customFetch<{ success: boolean }>(getDeleteBrandUrl(brandId), { ...options, method: 'DELETE' });
};

export const useDeleteBrand = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<{ success: boolean }, TError, { brandId: number }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<{ success: boolean }, TError, { brandId: number }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ brandId }) => deleteBrand(brandId, requestOptions),
    ...mutationOptions,
  });
};

// --- List every code submitted for a brand (admin only — full audit view,
// not scoped to the caller like useGetUserCodes) ---

export type CodeStatus = 'active' | 'paused' | 'removed';

export interface AdminCode {
  id: number;
  code: string;
  ownerId: string;
  ownerEmail: string | null;
  status: CodeStatus;
  timesServed: number;
  timesCopied: number;
  reportCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export const getListCodesForBrandUrl = (brandId: number) => `/api/admin/brands/${brandId}/codes`;

/**
 * @summary List every code submitted for a brand (admin only)
 */
export const listCodesForBrand = async (
  brandId: number,
  options?: Parameters<typeof customFetch>[1],
): Promise<AdminCode[]> => {
  return customFetch<AdminCode[]>(getListCodesForBrandUrl(brandId), { ...options, method: 'GET' });
};

export const getListCodesForBrandQueryKey = (brandId: number) => [`/api/admin/brands/${brandId}/codes`] as const;

export const getListCodesForBrandQueryOptions = <TData = AdminCode[], TError = ErrorType<unknown>>(
  brandId: number,
  options?: {
    query?: UseQueryOptions<AdminCode[], TError, TData>;
    request?: Parameters<typeof customFetch>[1];
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListCodesForBrandQueryKey(brandId);
  const queryFn: QueryFunction<AdminCode[]> = ({ signal }) =>
    listCodesForBrand(brandId, { signal, ...requestOptions });
  return {
    queryKey,
    queryFn,
    enabled: !!brandId,
    ...queryOptions,
  } as UseQueryOptions<AdminCode[], TError, TData> & { queryKey: QueryKey };
};

export const useListCodesForBrand = <TData = AdminCode[], TError = ErrorType<unknown>>(
  brandId: number,
  options?: {
    query?: UseQueryOptions<AdminCode[], TError, TData>;
    request?: Parameters<typeof customFetch>[1];
  },
): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryOptions = getListCodesForBrandQueryOptions(brandId, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
};

// --- Remove a code (admin only — soft delete: status -> "removed", pulled
// from rotation immediately, row kept — see AdminCode['status']) ---

export const getRemoveCodeUrl = (codeId: number) => `/api/admin/codes/${codeId}/remove`;

/**
 * @summary Remove a code (admin only)
 */
export const removeCode = async (
  codeId: number,
  options?: Parameters<typeof customFetch>[1],
): Promise<{ success: boolean }> => {
  return customFetch<{ success: boolean }>(getRemoveCodeUrl(codeId), { ...options, method: 'POST' });
};

export const useRemoveCode = <TError = ErrorType<void>, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<{ success: boolean }, TError, { codeId: number }, TContext>;
  request?: Parameters<typeof customFetch>[1];
}): UseMutationResult<{ success: boolean }, TError, { codeId: number }, TContext> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  return useMutation({
    mutationFn: ({ codeId }) => removeCode(codeId, requestOptions),
    ...mutationOptions,
  });
};

// --- Site-wide admin stats (admin only — currently just how many codes are
// live in rotation) ---

export interface AdminStats {
  activeCodeCount: number;
}

export const getAdminStatsUrl = () => `/api/admin/stats`;

/**
 * @summary Site-wide admin counts (admin only)
 */
export const getAdminStats = async (options?: Parameters<typeof customFetch>[1]): Promise<AdminStats> => {
  return customFetch<AdminStats>(getAdminStatsUrl(), { ...options, method: 'GET' });
};

export const getAdminStatsQueryKey = () => [`/api/admin/stats`] as const;

export const getAdminStatsQueryOptions = <TData = AdminStats, TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<AdminStats, TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getAdminStatsQueryKey();
  const queryFn: QueryFunction<AdminStats> = ({ signal }) => getAdminStats({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<AdminStats, TError, TData> & { queryKey: QueryKey };
};

export const useAdminStats = <TData = AdminStats, TError = ErrorType<unknown>>(options?: {
  query?: UseQueryOptions<AdminStats, TError, TData>;
  request?: Parameters<typeof customFetch>[1];
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } => {
  const queryOptions = getAdminStatsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
};
