import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { AdminBrandParams, UpdateBrandBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

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
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBrandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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
    res.status(400).json({ error: params.error.message });
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
    res.status(400).json({ error: params.error.message });
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
    res.status(400).json({ error: params.error.message });
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

export default router;
