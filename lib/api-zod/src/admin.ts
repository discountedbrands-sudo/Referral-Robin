import * as zod from "zod";

// Hand-written, not orval-generated like ./generated/api — there's no
// codegen pipeline wired up in this repo (no orval config committed), so
// generated/api.ts is really just a one-time snapshot at this point. Keeping
// new endpoints out of generated/ rather than hand-editing files whose
// header claims "Do not edit manually".

/**
 * @summary Create a new brand (admin only)
 */
export const CreateBrandBody = zod.object({
  name: zod.string().min(1),
  domain: zod.string().min(1),
  category: zod.string().min(1),
  currentOffer: zod.string().min(1),
});

export const CreateBrandResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  logoUrl: zod.string().nullish(),
  currentOffer: zod.string().nullish(),
  category: zod.string(),
  active: zod.boolean(),
});

/**
 * @summary List all brands, active and inactive (admin only)
 */
export const AdminBrandListItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  logoUrl: zod.string().nullish(),
  currentOffer: zod.string().nullish(),
  category: zod.string(),
  active: zod.boolean(),
});
export const AdminBrandListResponse = zod.array(AdminBrandListItem);

/**
 * @summary Edit a brand (admin only)
 */
export const AdminBrandParams = zod.object({
  brandId: zod.coerce.number(),
});

export const UpdateBrandBody = zod.object({
  name: zod.string().min(1).optional(),
  domain: zod.string().min(1).optional().describe('If provided, regenerates logoUrl. Omit to keep the current logo.'),
  category: zod.string().min(1).optional(),
  currentOffer: zod.string().min(1).optional(),
  active: zod.boolean().optional(),
});

export const UpdateBrandResponse = CreateBrandResponse;

/**
 * @summary Delete a brand (admin only)
 */
export const DeleteBrandResponse = zod.object({
  success: zod.boolean(),
});
