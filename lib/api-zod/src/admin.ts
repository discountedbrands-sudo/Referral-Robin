import * as zod from "zod";
import { isBareDomain, isPlainOfferText } from "./validation";

// Hand-written, not orval-generated like ./generated/api — there's no
// codegen pipeline wired up in this repo (no orval config committed), so
// generated/api.ts is really just a one-time snapshot at this point. Keeping
// new endpoints out of generated/ rather than hand-editing files whose
// header claims "Do not edit manually".

const DOMAIN_MESSAGE = "Enter just the domain, like monzo.com — not the full URL. Remove https://, www., and anything after the domain.";
const OFFER_MESSAGE = "Offer must be plain text (no links or HTML), 280 characters or fewer";

/**
 * @summary Submit a new brand — any signed-in user. If it passes these
 * rules (bare domain, plain-text offer) it publishes immediately; admin
 * submissions are also held to the same bar.
 */
export const CreateBrandBody = zod.object({
  name: zod.string().min(1),
  domain: zod.string().min(1).refine(isBareDomain, DOMAIN_MESSAGE),
  category: zod.string().min(1),
  // Defaults to "UK" server-side (see brandsTable.country) if omitted.
  country: zod.string().min(1).optional(),
  currentOffer: zod.string().min(1).max(280).refine(isPlainOfferText, OFFER_MESSAGE),
});

export const BrandSubmissionStatus = zod.enum(["approved", "auto_approved", "pending", "rejected"]);

export const CreateBrandResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  logoUrl: zod.string().nullish(),
  currentOffer: zod.string().nullish(),
  category: zod.string(),
  country: zod.string(),
  active: zod.boolean(),
  submissionStatus: BrandSubmissionStatus,
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
  country: zod.string(),
  active: zod.boolean(),
  submissionStatus: BrandSubmissionStatus,
  createdAt: zod.string(),
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
  domain: zod.string().min(1).refine(isBareDomain, DOMAIN_MESSAGE).optional().describe('If provided, regenerates logoUrl. Omit to keep the current logo.'),
  category: zod.string().min(1).optional(),
  country: zod.string().min(1).optional(),
  currentOffer: zod.string().min(1).max(280).refine(isPlainOfferText, OFFER_MESSAGE).optional(),
  active: zod.boolean().optional(),
});

export const UpdateBrandResponse = CreateBrandResponse;

/**
 * @summary Approve or reject a pending brand submission (admin only)
 */
export const ReviewBrandResponse = CreateBrandResponse;

/**
 * @summary Delete a brand (admin only)
 */
export const DeleteBrandResponse = zod.object({
  success: zod.boolean(),
});

/**
 * @summary List every code submitted for a brand (admin only) — full audit
 * view, not scoped to the caller like GET /user/codes.
 */
export const AdminBrandCodesParams = zod.object({
  brandId: zod.coerce.number(),
});

export const CodeStatus = zod.enum(["active", "paused", "removed"]);

export const AdminCodeListItem = zod.object({
  id: zod.number(),
  code: zod.string(),
  ownerId: zod.string(),
  ownerEmail: zod.string().nullable(),
  status: CodeStatus,
  timesServed: zod.number(),
  timesCopied: zod.number(),
  reportCount: zod.number(),
  createdAt: zod.string(),
  expiresAt: zod.string().nullable(),
});
export const AdminBrandCodesResponse = zod.array(AdminCodeListItem);

/**
 * @summary Remove a code (admin only) — soft delete: status becomes
 * "removed" and the code is pulled from rotation immediately, but the row
 * is kept (not a hard delete).
 */
export const AdminCodeParams = zod.object({
  codeId: zod.coerce.number(),
});

export const RemoveCodeResponse = zod.object({
  success: zod.boolean(),
});
