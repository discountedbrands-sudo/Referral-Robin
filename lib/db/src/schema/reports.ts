import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { codesTable } from "./codes";

// One row per (deviceId, codeId) — caps a single device to one report per
// code, so hitting /codes/:codeId/report repeatedly can't fast-track a
// code's reportCount past the auto-removal threshold on its own.
export const codeReportsTable = pgTable(
  "code_reports",
  {
    deviceId: text("device_id").notNull(),
    codeId: integer("code_id")
      .notNull()
      .references(() => codesTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.deviceId, table.codeId] })],
);

export type CodeReport = typeof codeReportsTable.$inferSelect;
