import { Router, type IRouter } from "express";
import { db, brandsTable } from "@workspace/db";
import { CreateBrandBody } from "@workspace/api-zod";
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

export default router;
