import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

// Small cached result table (top few rows at a time — cleared and
// repopulated wholesale on recompute), not queried live. See
// getTrendingBrands() in api-server/src/lib/trending.ts: reads this cache,
// lazily recomputing it first if stale (>24h old) rather than aggregating
// codeServesTable on every request — "recalculate once a day" without
// needing a separate cron/scheduler process.
export const trendingBrandsTable = pgTable("trending_brands", {
  brandId: integer("brand_id")
    .primaryKey()
    .references(() => brandsTable.id),
  requestCount: integer("request_count").notNull(),
  windowDays: integer("window_days").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrendingBrand = typeof trendingBrandsTable.$inferSelect;
