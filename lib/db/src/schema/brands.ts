import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Generated once from `name` at creation time (see POST /brands/submit
  // and lib/db/src/slug.ts) and never changed afterward, even if the name
  // is edited later — the brand page URL is built from this, and changing
  // it after the fact would break any existing bookmarks/indexed links.
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  currentOffer: text("current_offer"),
  offerUpdatedAt: timestamp("offer_updated_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  category: text("category").notNull().default("other"),
  // Explicit going forward — most pre-existing rows predate this column and
  // were UK-only, so they backfill to "UK" via this default rather than
  // needing a one-off script (same trick used for submissionStatus below).
  country: text("country").notNull().default("UK"),
  // "approved" | "auto_approved" | "pending" | "rejected". Defaults to
  // "approved" so every existing row (admin-created, seed scripts) needs no
  // backfill. Admin submissions/edits go straight to "approved"+active.
  // Non-admin submissions that pass the rule-based validation (bare domain,
  // plain-text offer — see lib/api-zod/src/validation.ts) also go active
  // immediately but land as "auto_approved" rather than "approved", so the
  // admin panel can surface them separately for after-the-fact spot-checking
  // without gating publication on a manual review first. "pending" is no
  // longer produced by the submit flow but stays a valid value for
  // historical rows / possible future manual-hold use. Kept distinct from
  // `active` itself because review state and "admin manually hid this via
  // the Live toggle" are different states an admin would want to tell apart.
  submissionStatus: text("submission_status").notNull().default("approved"),
  // Clerk userId of whoever submitted it, admin or not — nullable since
  // older rows (pre-dating this column) and seed-script rows have none.
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBrandSchema = createInsertSchema(brandsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;
