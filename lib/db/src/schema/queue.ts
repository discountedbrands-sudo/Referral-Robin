import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const queueStateTable = pgTable("queue_state", {
  brandId: integer("brand_id").primaryKey().references(() => brandsTable.id),
  orderJson: text("order_json").notNull().default("[]"),
  cursor: integer("cursor").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type QueueState = typeof queueStateTable.$inferSelect;
