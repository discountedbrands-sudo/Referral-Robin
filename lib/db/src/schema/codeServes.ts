import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

// Append-only event log — one row per successful /codes/next serve.
// codesTable.timesServed is a lifetime cumulative counter with no
// timestamp history, so it can't answer "how many requests in the last N
// days" on its own — this table exists specifically to make that
// computable (see trending.ts / trendingBrandsTable).
export const codeServesTable = pgTable("code_serves", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id")
    .notNull()
    .references(() => brandsTable.id),
  servedAt: timestamp("served_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CodeServe = typeof codeServesTable.$inferSelect;
