import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, deviceCooldownsTable } from "@workspace/db";
import { GetCooldownQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /cooldown — check device cooldown status for a brand
router.get("/cooldown", async (req, res): Promise<void> => {
  const parsed = GetCooldownQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { brandId, deviceId } = parsed.data;
  const now = new Date();

  const [cooldown] = await db
    .select()
    .from(deviceCooldownsTable)
    .where(
      and(
        eq(deviceCooldownsTable.deviceId, deviceId),
        eq(deviceCooldownsTable.brandId, brandId),
      ),
    );

  if (!cooldown || cooldown.expiresAt <= now) {
    res.json({ isOnCooldown: false, expiresAt: null, remainingSeconds: null });
    return;
  }

  const remainingSeconds = Math.ceil(
    (cooldown.expiresAt.getTime() - now.getTime()) / 1000,
  );

  res.json({
    isOnCooldown: true,
    expiresAt: cooldown.expiresAt.toISOString(),
    remainingSeconds,
  });
});

export default router;
