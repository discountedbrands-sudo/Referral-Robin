import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, brandsTable, codesTable } from "@workspace/db";
import { AdminBrandParams, AdminBrandCodesParams, AdminCodeParams, UpdateBrandBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { firstIssueMessage } from "../lib/zodError";
import { rebuildQueue } from "../lib/queue";

const router: IRouter = Router();

// Same token/pattern already duplicated in seed.ts, the seed-batch-*.mjs
// scripts, and brands.ts's POST /brands/submit — see seed.ts for the
// logo.dev attribution note.
const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain: string) =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// GET /admin/brands — admin-only: list ALL brands, active and inactive,
// including pending/rejected submissions. The public GET /brands only ever
// returns active:true — this is the one place everything is visible for
// review.
router.get("/admin/brands", requireAdmin, async (_req, res): Promise<void> => {
  const brands = await db.select().from(brandsTable).orderBy(brandsTable.name);

  res.json(
    brands.map((b) => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logoUrl,
      currentOffer: b.currentOffer,
      category: b.category,
      country: b.country,
      active: b.active,
      submissionStatus: b.submissionStatus,
      createdAt: b.createdAt.toISOString(),
    })),
  );
});

// PATCH /admin/brands/:brandId — admin-only: edit any field. All fields
// optional/partial; `domain` (not logoUrl directly) regenerates the logo —
// omit it to leave the current logo untouched. Doesn't touch
// submissionStatus itself — that's what approve/reject below are for, kept
// separate so editing fields and reviewing a submission are distinct
// actions rather than one overloaded PATCH.
router.patch("/admin/brands/:brandId", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  const body = UpdateBrandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: firstIssueMessage(body.error) });
    return;
  }

  const { name, domain, category, country, currentOffer, active } = body.data;
  const updates: Partial<typeof brandsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (domain !== undefined) updates.logoUrl = logoUrl(domain);
  if (category !== undefined) updates.category = category;
  if (country !== undefined) updates.country = country;
  if (currentOffer !== undefined) updates.currentOffer = currentOffer;
  if (active !== undefined) updates.active = active;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(brandsTable)
    .set(updates)
    .where(eq(brandsTable.id, params.data.brandId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    logoUrl: updated.logoUrl,
    currentOffer: updated.currentOffer,
    category: updated.category,
    country: updated.country,
    active: updated.active,
    submissionStatus: updated.submissionStatus,
    createdAt: updated.createdAt.toISOString(),
  });
});

// POST /admin/brands/:brandId/approve — admin-only: publish a pending
// submission. Sets active:true regardless of prior state, so this also
// works to re-approve something previously rejected.
router.post("/admin/brands/:brandId/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  const [updated] = await db
    .update(brandsTable)
    .set({ submissionStatus: "approved", active: true })
    .where(eq(brandsTable.id, params.data.brandId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    logoUrl: updated.logoUrl,
    currentOffer: updated.currentOffer,
    category: updated.category,
    country: updated.country,
    active: updated.active,
    submissionStatus: updated.submissionStatus,
    createdAt: updated.createdAt.toISOString(),
  });
});

// POST /admin/brands/:brandId/reject — admin-only. Keeps the row (not a
// delete) so there's a record and the admin can still edit/re-approve it
// later rather than the submitter's input being lost outright.
router.post("/admin/brands/:brandId/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  const [updated] = await db
    .update(brandsTable)
    .set({ submissionStatus: "rejected", active: false })
    .where(eq(brandsTable.id, params.data.brandId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json({
    id: updated.id,
    name: updated.name,
    logoUrl: updated.logoUrl,
    currentOffer: updated.currentOffer,
    category: updated.category,
    country: updated.country,
    active: updated.active,
    submissionStatus: updated.submissionStatus,
    createdAt: updated.createdAt.toISOString(),
  });
});

// DELETE /admin/brands/:brandId — admin-only. Hard delete, not a soft
// active:false — if any codes still reference this brand, the FK
// constraint (codes.brand_id -> brands.id, no cascade) rejects it rather
// than silently orphaning or cascading away real submitted codes; surfaced
// as a clear 409 instead of a raw 500.
router.delete("/admin/brands/:brandId", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  try {
    const [deleted] = await db
      .delete(brandsTable)
      .where(eq(brandsTable.id, params.data.brandId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    if ((err as { code?: string })?.code === "23503") {
      res.status(409).json({ error: "Can't delete — referral codes still reference this brand." });
      return;
    }
    throw err;
  }
});

// GET /admin/brands/:brandId/codes — admin-only: every code ever submitted
// for a brand (active, paused/owner-retired, and removed/report-moderated),
// not just the caller's own — for auditing coverage/duplicates/quality.
// Distinct from GET /user/codes, which is scoped to the signed-in user.
router.get("/admin/brands/:brandId/codes", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBrandCodesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  const codes = await db
    .select()
    .from(codesTable)
    .where(eq(codesTable.brandId, params.data.brandId))
    .orderBy(desc(codesTable.createdAt));

  // Owner email isn't stored locally — usersTable exists in the schema but
  // nothing in this codebase ever inserts into it, so the only source of
  // truth for "who submitted this" is Clerk itself. Batch-resolve by the
  // distinct owner ids actually present rather than one Clerk call per code.
  const ownerIds = [...new Set(codes.map((c) => c.ownerId))];
  const emailByOwnerId = new Map<string, string>();
  if (ownerIds.length > 0) {
    try {
      const { data: users } = await clerkClient.users.getUserList({
        userId: ownerIds,
        limit: ownerIds.length,
      });
      for (const u of users) {
        const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress;
        if (email) emailByOwnerId.set(u.id, email);
      }
    } catch {
      // Owner email is a display nicety here, not load-bearing — degrade to
      // the raw owner id (below) rather than failing the whole list.
    }
  }

  res.json(
    codes.map((c) => ({
      id: c.id,
      code: c.code,
      ownerId: c.ownerId,
      ownerEmail: emailByOwnerId.get(c.ownerId) ?? null,
      status: c.status,
      timesServed: c.timesServed,
      timesCopied: c.timesCopied,
      reportCount: c.reportCount,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
    })),
  );
});

// POST /admin/codes/:codeId/remove — admin-only: soft-delete (status set to
// "removed", row kept), pulled from the active rotation immediately via the
// same rebuildQueue() call the report-threshold auto-remove path already
// uses (see POST /codes/:codeId/report) — this is that same mechanism,
// admin-triggered instead of triggered by 3 distinct-device reports. Kept as
// a status flip rather than a hard delete so nothing here is unrecoverable,
// and so backlog item #1's eventual quarantine flow can share this same
// status-based pattern instead of needing a second removal mechanism.
router.post("/admin/codes/:codeId/remove", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: firstIssueMessage(params.error) });
    return;
  }

  const [updated] = await db
    .update(codesTable)
    .set({ status: "removed" })
    .where(eq(codesTable.id, params.data.codeId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Code not found" });
    return;
  }

  await rebuildQueue(updated.brandId);

  res.json({ success: true });
});

// GET /admin/stats — admin-only: site-wide counts, currently just how many
// codes are live in rotation ("online" = status: "active"). Kept as its own
// lightweight query rather than summing GET /admin/brands' per-brand
// codeCount client-side, since that'd mean fetching all ~150 brands just to
// read one number.
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [{ activeCodeCount }] = await db
    .select({ activeCodeCount: sql<number>`cast(count(*) filter (where ${codesTable.status} = 'active') as int)` })
    .from(codesTable);

  res.json({ activeCodeCount });
});

export default router;
