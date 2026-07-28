import { Router, type IRouter } from "express";
import { eq, sum } from "drizzle-orm";
import { db, codesTable, brandsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();

// GET /user/codes — authenticated: list user's submitted codes with stats
router.get(
  "/user/codes",
  requireAuth,
  async (req: Request & { userId?: string }, res): Promise<void> => {
    const userId = req.userId!;

    const codes = await db
      .select({
        id: codesTable.id,
        brandId: codesTable.brandId,
        brandName: brandsTable.name,
        code: codesTable.code,
        status: codesTable.status,
        timesServed: codesTable.timesServed,
        timesCopied: codesTable.timesCopied,
        createdAt: codesTable.createdAt,
      })
      .from(codesTable)
      .innerJoin(brandsTable, eq(codesTable.brandId, brandsTable.id))
      .where(eq(codesTable.ownerId, userId))
      .orderBy(codesTable.createdAt);

    res.json(codes);
  },
);

// GET /user/stats — authenticated: lifetime aggregate stats
router.get(
  "/user/stats",
  requireAuth,
  async (req: Request & { userId?: string }, res): Promise<void> => {
    const userId = req.userId!;

    const codes = await db
      .select({
        timesServed: codesTable.timesServed,
        timesCopied: codesTable.timesCopied,
      })
      .from(codesTable)
      .where(eq(codesTable.ownerId, userId));

    const totalCodesSubmitted = codes.length;
    const totalTimesServed = codes.reduce((s, c) => s + c.timesServed, 0);
    const totalTimesCopied = codes.reduce((s, c) => s + c.timesCopied, 0);

    res.json({ totalCodesSubmitted, totalTimesServed, totalTimesCopied });
  },
);

export default router;
