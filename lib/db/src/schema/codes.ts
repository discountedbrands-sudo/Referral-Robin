import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { brandsTable } from "./brands";

export const codesTable = pgTable("codes", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brandsTable.id),
  code: text("code").notNull(),
  ownerId: text("owner_id").notNull(),
  status: text("status").notNull().default("active"), // "active" | "paused" | "removed"
  weight: integer("weight").notNull().default(1),
  // Number of remaining reveals (counts down from 2) where this code jumps
  // ahead of the normal weighted queue instead of waiting its turn — the
  // submit-your-brand incentive. Only ever set >0 at insert time (see
  // POST /codes/submit), and only when the code's owner is the same person
  // who submitted this specific brand — never retroactively adjusted.
  priorityRemaining: integer("priority_remaining").notNull().default(0),
  tier: text("tier").notNull().default("free"), // "free" | "premium"
  timesServed: integer("times_served").notNull().default(0),
  timesCopied: integer("times_copied").notNull().default(0),
  lastServedAt: timestamp("last_served_at", { withTimezone: true }),
  reportCount: integer("report_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertCodeSchema = createInsertSchema(codesTable).omit({
  id: true,
  createdAt: true,
  timesServed: true,
  timesCopied: true,
  reportCount: true,
  lastServedAt: true,
});
export type InsertCode = z.infer<typeof insertCodeSchema>;
export type Code = typeof codesTable.$inferSelect;
