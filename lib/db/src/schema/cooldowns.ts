import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const deviceCooldownsTable = pgTable(
  "device_cooldowns",
  {
    deviceId: text("device_id").notNull(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brandsTable.id),
    lastCopyAt: timestamp("last_copy_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.deviceId, table.brandId] })],
);

export type DeviceCooldown = typeof deviceCooldownsTable.$inferSelect;
