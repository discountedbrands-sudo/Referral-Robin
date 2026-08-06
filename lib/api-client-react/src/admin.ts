import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { ErrorType, BodyType } from './custom-fetch';

// Hand-written, not orval-generated like ./generated/api — see
// @workspace/api-zod's admin.ts for why (no codegen pipeline wired up in
// this repo). Mirrors the same shape/conventions the generated hooks use.

export interface CreateBrandInput {
  name: string;
  domain: string;
  category: string;
  currentOffer: string;
}

export interface CreatedBrand {
  id: number;
  name: string;
  logoUrl?: string | null;
  currentOffer?: string | null;
  category: string;
  active: boolean;
}

export const getCreateBrandUrl = () => `/api/admin/brands`;

/**
 * @summary Create a new brand (admin only)
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
