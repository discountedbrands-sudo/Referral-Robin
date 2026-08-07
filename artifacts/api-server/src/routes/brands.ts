import { Router, type IRouter } from "express";
import type { Request } from "express";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { db, brandsTable, codesTable, uniqueSlug } from "@workspace/db";
import { ListBrandsQueryParams, GetBrandParams, CreateBrandBody } from "@workspace/api-zod";
import { getTrendingBrands } from "../lib/trending";
import { requireAuth, isAdminUser } from "../lib/auth";

const router: IRouter = Router();

// Same token/pattern duplicated in seed.ts, the seed-batch-*.mjs scripts,
// and admin.ts's edit route — see seed.ts for the logo.dev attribution note.
const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain: string) =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

router.get("/brands", async (req, res): Promise<void> => {
  const parsed = ListBrandsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, search, sort } = parsed.data;

  const conditions = [eq(brandsTable.active, true)];
  if (category) conditions.push(eq(brandsTable.category, category));
  if (search) conditions.push(ilike(brandsTable.name, `%${search}%`));

  // Popularity = all-time codesTable.timesServed summed across every code a
  // brand has ever had (not just currently-active ones) — a code being
  // removed later doesn't erase how much it was actually used. Distinct
  // from lib/trending.ts's cached top-5, which is a recent-activity window
  // over codeServesTable rather than an all-time total over every brand.
  const popularity = sql<number>`cast(coalesce(sum(${codesTable.timesServed}), 0) as int)`;

  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      slug: brandsTable.slug,
      logoUrl: brandsTable.logoUrl,
      currentOffer: brandsTable.currentOffer,
      offerUpdatedAt: brandsTable.offerUpdatedAt,
      category: brandsTable.category,
      active: brandsTable.active,
      codeCount: sql<number>`cast(count(${codesTable.id}) filter (where ${codesTable.status} = 'active') as int)`,
      popularity,
    })
    .from(brandsTable)
    .leftJoin(codesTable, eq(codesTable.brandId, brandsTable.id))
    .where(and(...conditions))
    .groupBy(brandsTable.id)
    .orderBy(...(sort === "popular" ? [desc(popularity), brandsTable.name] : [brandsTable.name]));

  res.json(brands);
});

// POST /brands/submit — any signed-in user (idea #8, opened up beyond
// admin-only). Admin submissions go live immediately, matching the
// original admin-only behavior; everyone else's land as pending, invisible
// on the public GET /brands until an admin approves it from the panel.
router.post("/brands/submit", requireAuth, async (req: Request & { userId?: string }, res): Promise<void> => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, domain, category, currentOffer } = parsed.data;
  const userId = req.userId!;
  const admin = await isAdminUser(userId);

  const existingSlugs = await db.select({ slug: brandsTable.slug }).from(brandsTable);
  const slug = uniqueSlug(name, new Set(existingSlugs.map((r) => r.slug)));

  const [brand] = await db
    .insert(brandsTable)
    .values({
      name,
      slug,
      logoUrl: logoUrl(domain),
      category,
      currentOffer,
      active: admin,
      submissionStatus: admin ? "approved" : "pending",
      submittedBy: userId,
    })
    .returning();

  res.status(201).json({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    currentOffer: brand.currentOffer,
    category: brand.category,
    active: brand.active,
    submissionStatus: brand.submissionStatus,
  });
});

// Must come before /brands/:slug — Express would otherwise match
// "trending" as the :slug param on that route instead of reaching this one.
router.get("/brands/trending", async (_req, res): Promise<void> => {
  const brands = await getTrendingBrands();
  res.json(
    brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      currentOffer: b.currentOffer,
      offerUpdatedAt: b.offerUpdatedAt,
      category: b.category,
      active: b.active,
    })),
  );
});

router.get("/brands/:slug", async (req, res): Promise<void> => {
  const parsed = GetBrandParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [brand] = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      slug: brandsTable.slug,
      logoUrl: brandsTable.logoUrl,
      currentOffer: brandsTable.currentOffer,
      offerUpdatedAt: brandsTable.offerUpdatedAt,
      category: brandsTable.category,
      active: brandsTable.active,
      codeCount: sql<number>`cast(count(${codesTable.id}) filter (where ${codesTable.status} = 'active') as int)`,
    })
    .from(brandsTable)
    .leftJoin(codesTable, eq(codesTable.brandId, brandsTable.id))
    .where(and(eq(brandsTable.slug, parsed.data.slug), eq(brandsTable.active, true)))
    .groupBy(brandsTable.id);

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(brand);
});

export default router;
