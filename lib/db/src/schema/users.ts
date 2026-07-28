import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk userId
  email: text("email").notNull(),
  authProvider: text("auth_provider").notNull().default("clerk"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  tier: text("tier").notNull().default("free"), // "free" | "premium"
  premiumExpiresAt: timestamp("premium_expires_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
