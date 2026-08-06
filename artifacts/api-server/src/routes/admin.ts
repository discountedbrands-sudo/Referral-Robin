import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { CreateBrandBody, AdminBrandParams, UpdateBrandBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// Same token/pattern already duplicated in seed.ts and the seed-batch-*.mjs
// scripts — see seed.ts for the logo.dev attribution note.
const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain: string) =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// POST /admin/brands — admin-only: add a new brand directly, no review queue
// yet (idea #8 — "start simple"). Goes live immediately (active: true).
router.post("/admin/brands", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, domain, category, currentOffer } = parsed.data;

  const [brand] = await db
    .insert(brandsTable)
    .values({
      name,
      logoUrl: logoUrl(domain),
      category,
      currentOffer,
      active: true,
    })
    .returning();

  res.status(201).json({
    id: brand.id,
    name: brand.name,
    logoUrl: brand.logoUrl,
    currentOffer: brand.currentOffer,
    category: brand.category,
    active: brand.active,
  });
});

// GET /admin/brands — admin-only: list ALL brands, active and inactive.
// The public GET /brands only ever returns active:true — this is the one
// place the flagged-inactive seeded brands (and anything else hidden) are
// actually visible for review.
router.get("/admin/brands", requireAdmin, async (_req, res): Promise<void> => {
  const brands = await db.select().from(brandsTable).orderBy(brandsTable.name);

  res.json(
    brands.map((b) => ({
      id: b.id,
      name: b.name,
      logoUrl: b.logoUrl,
      currentOffer: b.currentOffer,
      category: b.category,
      active: b.active,
    })),
  );
});

// PATCH /admin/brands/:brandId — admin-only: edit any field. All fields
// optional/partial; `domain` (not logoUrl directly) regenerates the logo,
// consistent with how POST /admin/brands derives it — omit it to leave the
// current logo untouched.
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

  const { name, domain, category, currentOffer, active } = body.data;
  const updates: Partial<typeof brandsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (domain !== undefined) updates.logoUrl = logoUrl(domain);
  if (category !== undefined) updates.category = category;
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
    active: updated.active,
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
