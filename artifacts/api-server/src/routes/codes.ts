import { Router, type IRouter } from "express";
import { eq, and, or, isNull, gt, asc } from "drizzle-orm";
import { db, brandsTable, codesTable, queueStateTable, deviceCooldownsTable, codeReportsTable, codeServesTable } from "@workspace/db";
import {
  GetNextCodeBody,
  ConfirmCopyBody,
  SubmitCodeBody,
  UpdateCodeParams,
  UpdateCodeBody,
  ReportCodeParams,
  ReportCodeBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { rebuildQueue } from "../lib/queue";
import type { Request } from "express";

const router: IRouter = Router();

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// POST /codes/next — serve next code in the weighted queue (never exposes raw list)
// requireAuth: browsing brands is public, but revealing a real code must not be —
// deviceId alone is client-supplied and unverified, so it can't be the auth boundary.
router.post("/codes/next", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetNextCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { brandId, deviceId } = parsed.data;
  const now = new Date();

  // 1. Check device cooldown
  const [cooldown] = await db
    .select()
    .from(deviceCooldownsTable)
    .where(
      and(
        eq(deviceCooldownsTable.deviceId, deviceId),
        eq(deviceCooldownsTable.brandId, brandId),
      ),
    );

  if (cooldown && cooldown.expiresAt > now) {
    const remainingSeconds = Math.ceil(
      (cooldown.expiresAt.getTime() - now.getTime()) / 1000,
    );
    res.status(429).json({
      error: "Cooldown active for this brand",
      expiresAt: cooldown.expiresAt.toISOString(),
      remainingSeconds,
    });
    return;
  }

  // 2. Submit-your-brand incentive: a code with priorityRemaining > 0 jumps
  // ahead of the normal weighted queue (oldest such code first) instead of
  // waiting its turn. This is "ahead of" rotation, not part of it — the
  // cursor is left untouched here, so it doesn't skew whose turn is next
  // for everyone else once the priority codes run out.
  const [priorityCode] = await db
    .select()
    .from(codesTable)
    .where(
      and(
        eq(codesTable.brandId, brandId),
        eq(codesTable.status, "active"),
        gt(codesTable.priorityRemaining, 0),
        or(isNull(codesTable.expiresAt), gt(codesTable.expiresAt, now)),
      ),
    )
    .orderBy(asc(codesTable.createdAt))
    .limit(1);

  let codeRow: typeof codesTable.$inferSelect;
  let usedPriority = false;

  if (priorityCode) {
    codeRow = priorityCode;
    usedPriority = true;
  } else {
    // 2b. Get queue state — build if missing
    const [queueState] = await db
      .select()
      .from(queueStateTable)
      .where(eq(queueStateTable.brandId, brandId));

    let order: number[] = queueState ? JSON.parse(queueState.orderJson) : [];

    if (order.length === 0) {
      await rebuildQueue(brandId);
      const [rebuilt] = await db
        .select()
        .from(queueStateTable)
        .where(eq(queueStateTable.brandId, brandId));
      order = rebuilt ? JSON.parse(rebuilt.orderJson) : [];
    }

    if (order.length === 0) {
      res.status(404).json({ error: "No codes available for this brand" });
      return;
    }

    const cursor = queueState?.cursor ?? 0;
    const codeId = order[cursor % order.length];

    const [queuedCode] = await db
      .select()
      .from(codesTable)
      .where(and(eq(codesTable.id, codeId), eq(codesTable.status, "active")));

    if (!queuedCode) {
      // Code was removed since last queue build — rebuild and tell client to retry
      await rebuildQueue(brandId);
      res.status(404).json({ error: "No codes available for this brand" });
      return;
    }

    codeRow = queuedCode;

    const newCursor = (cursor + 1) % order.length;
    await db
      .update(queueStateTable)
      .set({ cursor: newCursor })
      .where(eq(queueStateTable.brandId, brandId));
  }

  const [brand] = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.id, brandId));

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  // 4. Increment timesServed (and consume one priority reveal, if used) atomically
  await Promise.all([
    db
      .update(codesTable)
      .set({
        timesServed: codeRow.timesServed + 1,
        lastServedAt: now,
        ...(usedPriority ? { priorityRemaining: codeRow.priorityRemaining - 1 } : {}),
      })
      .where(eq(codesTable.id, codeRow.id)),
    // Timestamped event, distinct from the cumulative timesServed counter
    // above — this is what makes "requests in the last N days" (trending)
    // computable at all. See lib/trending.ts.
    db.insert(codeServesTable).values({ brandId }),
  ]);

  // 5. Set device cooldown (upsert)
  const expiresAt = new Date(now.getTime() + COOLDOWN_MS);

  await db
    .insert(deviceCooldownsTable)
    .values({ deviceId, brandId, lastCopyAt: now, expiresAt })
    .onConflictDoUpdate({
      target: [deviceCooldownsTable.deviceId, deviceCooldownsTable.brandId],
      set: { lastCopyAt: now, expiresAt },
    });

  res.json({
    codeId: codeRow.id,
    code: codeRow.code,
    brandId: brand.id,
    brandName: brand.name,
    currentOffer: brand.currentOffer,
    cooldownUntil: expiresAt.toISOString(),
  });
});

// POST /codes/confirm-copy — fire when user taps the copy button
router.post("/codes/confirm-copy", async (req, res): Promise<void> => {
  const parsed = ConfirmCopyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { codeId } = parsed.data;

  const [codeRow] = await db
    .select()
    .from(codesTable)
    .where(eq(codesTable.id, codeId));

  if (!codeRow) {
    res.json({ success: true }); // silent — don't reveal code existence
    return;
  }

  await db
    .update(codesTable)
    .set({ timesCopied: codeRow.timesCopied + 1 })
    .where(eq(codesTable.id, codeId));

  res.json({ success: true });
});

// POST /codes/submit — authenticated: submit a new referral code
router.post(
  "/codes/submit",
  requireAuth,
  async (req: Request & { userId?: string }, res): Promise<void> => {
    const parsed = SubmitCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { brandId, code, expiresAt } = parsed.data;
    const userId = req.userId!;

    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(and(eq(brandsTable.id, brandId), eq(brandsTable.active, true)));

    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }

    // Submit-your-brand incentive: the person who submitted this specific
    // brand gets their own code for it served ahead of normal rotation for
    // its first 2 reveals (see POST /codes/next's priority short-circuit
    // below). Scoped to "this exact brand, this exact submitter" so it
    // can't be farmed by adding empty brand listings — the perk only ever
    // activates once a real code follows.
    const priorityRemaining = brand.submittedBy === userId ? 2 : 0;

    const [newCode] = await db
      .insert(codesTable)
      .values({ brandId, code, ownerId: userId, status: "active", weight: 1, tier: "free", priorityRemaining, expiresAt: expiresAt ? new Date(expiresAt) : null })
      .returning();

    // Rebuild queue to include the new code
    await rebuildQueue(brandId);

    res.status(201).json({
      id: newCode.id,
      brandId: newCode.brandId,
      brandName: brand.name,
      code: newCode.code,
      status: newCode.status,
      timesServed: newCode.timesServed,
      timesCopied: newCode.timesCopied,
      createdAt: newCode.createdAt,
      expiresAt: newCode.expiresAt ?? null,
    });
  },
);

// PATCH /codes/:codeId — authenticated: edit a code you own
router.patch(
  "/codes/:codeId",
  requireAuth,
  async (req: Request & { userId?: string }, res): Promise<void> => {
    const params = UpdateCodeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = UpdateCodeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const { codeId } = params.data;
    const userId = req.userId!;

    const [codeRow] = await db
      .select()
      .from(codesTable)
      .where(eq(codesTable.id, codeId));

    if (!codeRow) {
      res.status(404).json({ error: "Code not found" });
      return;
    }

    if (codeRow.ownerId !== userId) {
      res.status(403).json({ error: "You don't own this code" });
      return;
    }

    const updates: { code?: string; expiresAt?: Date | null; status?: "active" | "paused" } = {};
    if (body.data.code !== undefined) updates.code = body.data.code;
    if (body.data.expiresAt !== undefined) updates.expiresAt = body.data.expiresAt;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const [updated] = await db
      .update(codesTable)
      .set(updates)
      .where(eq(codesTable.id, codeId))
      .returning();

    // Status changes affect queue membership (rebuildQueue only pulls
    // status="active" codes) — retiring/reactivating must take effect in
    // the rotation immediately, not just in the owner's own dashboard view.
    if (body.data.status !== undefined && body.data.status !== codeRow.status) {
      await rebuildQueue(updated.brandId);
    }

    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, updated.brandId));

    res.json({
      id: updated.id,
      brandId: updated.brandId,
      brandName: brand?.name ?? "",
      code: updated.code,
      status: updated.status,
      timesServed: updated.timesServed,
      timesCopied: updated.timesCopied,
      createdAt: updated.createdAt,
      expiresAt: updated.expiresAt ?? null,
    });
  },
);

// POST /codes/:codeId/report — report a dead code
// requireAuth: reporting is a destructive action (3 reports auto-removes the
// code, see below), not a read — same reasoning as POST /codes/next. Also
// dedup by deviceId so a single caller can't fast-track that threshold alone;
// ReportCodeBody already required deviceId but the handler never used it.
router.post("/codes/:codeId/report", requireAuth, async (req, res): Promise<void> => {
  const params = ReportCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ReportCodeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { codeId } = params.data;
  const { deviceId } = body.data;

  const [codeRow] = await db
    .select()
    .from(codesTable)
    .where(eq(codesTable.id, codeId));

  if (!codeRow) {
    res.status(404).json({ error: "Code not found" });
    return;
  }

  const [existingReport] = await db
    .select()
    .from(codeReportsTable)
    .where(and(eq(codeReportsTable.deviceId, deviceId), eq(codeReportsTable.codeId, codeId)));

  if (existingReport) {
    // Already reported by this device — idempotent, don't count it again.
    res.json({ success: true });
    return;
  }

  await db.insert(codeReportsTable).values({ deviceId, codeId });

  const newReportCount = codeRow.reportCount + 1;
  const shouldRemove = newReportCount >= 3; // auto-remove after 3 distinct-device reports

  await db
    .update(codesTable)
    .set({
      reportCount: newReportCount,
      ...(shouldRemove ? { status: "removed" } : {}),
    })
    .where(eq(codesTable.id, codeId));

  if (shouldRemove) {
    await rebuildQueue(codeRow.brandId);
  }

  res.json({ success: true });
});

export default router;
